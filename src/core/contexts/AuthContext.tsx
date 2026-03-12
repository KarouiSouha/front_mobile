/**
 * AuthContext.tsx — Contexte d'authentification connecté au backend Django WEEG
 *
 * Remplace le mock précédent par de vraies appels API.
 * Gère : login, signup manager, logout, refresh token automatique,
 *        profil, changement de mot de passe, et approbation des agents.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthService, UserService, AdminService, ManagerService, TokenStorage, BackendUser } from '../lib/api';

// ─── Types exportés (compatibles avec les écrans existants) ──────────────────

export type UserRole = 'admin' | 'manager' | 'agent';

/** Format unifié utilisé dans toute l'app */
export interface User {
  id: string;
  name: string;           // = full_name du backend
  email: string;
  role: UserRole;
  permissions: string[];  // = permissions_list du backend
  isVerified: boolean;    // = is_verified du backend
  createdAt: string;
  // Champs supplémentaires backend
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
  status?: string;
  companyName?: string | null;
  branchName?: string | null;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Auth
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signup: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    companyName: string;
    industry: string;
    country: string;
    city: string;
    currentErp?: string;
    password: string;
    passwordConfirm: string;
  }) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;

  // Profile
  refreshProfile: () => Promise<void>;
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string }) => Promise<{ success: boolean; message: string }>;
  changePassword: (oldPw: string, newPw: string, confirmPw: string) => Promise<{ success: boolean; message: string }>;

  // Admin actions
  approveManager: (managerId: string) => Promise<{ success: boolean; message: string }>;
  rejectManager: (managerId: string, reason: string) => Promise<{ success: boolean; message: string }>;
  getPendingManagers: () => Promise<any[]>;

  // Manager actions
  createAgent: (data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    permissionsList?: string[];
    temporaryPassword: string;
  }) => Promise<{ success: boolean; message: string; agent?: any }>;
  updateAgentPermissions: (agentId: string, permissions: string[]) => Promise<{ success: boolean; message: string }>;
}

// ─── Mapper backend → App ──────────────────────────────────────────────────────

function mapBackendUser(backendUser: BackendUser): User {
  return {
    id: backendUser.id,
    name: backendUser.full_name || `${backendUser.first_name} ${backendUser.last_name}`.trim(),
    email: backendUser.email,
    role: backendUser.role as UserRole,
    permissions: backendUser.permissions_list || [],
    isVerified: backendUser.is_verified,
    createdAt: backendUser.created_at,
    firstName: backendUser.first_name,
    lastName: backendUser.last_name,
    phoneNumber: backendUser.phone_number,
    status: backendUser.status,
    companyName: backendUser.company_name,
    branchName: backendUser.branch_name,
    mustChangePassword: backendUser.must_change_password,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Chargement initial (token en cache) ────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const cachedUser = await TokenStorage.getUser();
        const accessToken = await TokenStorage.getAccess();

        if (cachedUser && accessToken) {
          // ⚠️  Ne PAS afficher le cache avant confirmation backend.
          // Vérifier la validité du token en récupérant le profil réel
          const profileRes = await UserService.getProfile();
          if (profileRes.ok && profileRes.data) {
            // ✅ Backend confirme → afficher l'utilisateur
            const freshUser = mapBackendUser(profileRes.data);
            setUser(freshUser);
            await TokenStorage.saveUser(profileRes.data);
          } else if (profileRes.status === 401) {
            // 🔄 Token expiré → tenter refresh
            const refreshed = await AuthService.refreshTokens();
            if (!refreshed) {
              // ❌ Refresh échoué → vider le cache, forcer reconnexion
              await TokenStorage.clearTokens();
              setUser(null);
            } else {
              // Retry avec nouveau token
              const retryRes = await UserService.getProfile();
              if (retryRes.ok && retryRes.data) {
                setUser(mapBackendUser(retryRes.data));
                await TokenStorage.saveUser(retryRes.data);
              } else {
                // Retry échoué → vider le cache
                await TokenStorage.clearTokens();
                setUser(null);
              }
            }
          } else {
            // ❌ Erreur réseau (status 0) ou autre erreur → vider le cache
            // Évite d'afficher un utilisateur fantôme dont le compte n'existe plus
            await TokenStorage.clearTokens();
            setUser(null);
          }
        }
      } catch (e) {
        console.error('[AuthContext] Init error:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const res = await AuthService.login(email, password);

    if (!res.ok) {
      const msg = res.error || 'Identifiants incorrects';
      setError(msg);
      return { success: false, message: msg };
    }

    const { access, refresh, session_id, user: loginUser } = res.data!;

    // Sauvegarder les tokens
    await TokenStorage.saveTokens({ access, refresh, session_id });

    // Récupérer le profil complet
    const profileRes = await UserService.getProfile();
    if (profileRes.ok && profileRes.data) {
      await TokenStorage.saveUser(profileRes.data);
      const mappedUser = mapBackendUser(profileRes.data);
      setUser(mappedUser);
      return { success: true, message: `Bienvenue, ${mappedUser.name} !` };
    }

    // Fallback avec les données du login
    const fallbackUser: User = {
      id: loginUser.id,
      name: loginUser.full_name,
      email: loginUser.email,
      role: loginUser.role as UserRole,
      permissions: [],
      isVerified: true,
      createdAt: new Date().toISOString(),
      mustChangePassword: loginUser.must_change_password,
    };
    setUser(fallbackUser);
    return { success: true, message: `Bienvenue, ${fallbackUser.name} !` };
  }, []);

  // ── Signup Manager ─────────────────────────────────────────────────────────
  const signup = useCallback(async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    companyName: string;
    industry: string;
    country: string;
    city: string;
    currentErp?: string;
    password: string;
    passwordConfirm: string;
  }) => {
    setError(null);
    const res = await AuthService.managerSignup({
      email: userData.email.trim().toLowerCase(),
      first_name: userData.firstName.trim(),
      last_name: userData.lastName.trim(),
      phone_number: userData.phone?.trim() || undefined,
      company_name: userData.companyName.trim(),
      industry: userData.industry,
      country: userData.country,
      city: userData.city,
      current_erp: userData.currentErp?.trim() || undefined,
      password: userData.password,
      password_confirm: userData.passwordConfirm,
    });

    if (!res.ok) {
      // Formater les erreurs de validation Django
      if (res.errors) {
        const msgs = Object.values(res.errors).flat().join('. ');
        return { success: false, message: msgs };
      }
      return { success: false, message: res.error || 'Erreur lors de l\'inscription' };
    }

    return {
      success: true,
      message: res.data?.message || 'Compte créé ! Un administrateur validera votre demande.',
    };
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await AuthService.logout();
    setUser(null);
  }, []);

  // ── Refresh Profile ────────────────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    const res = await UserService.getProfile();
    if (res.ok && res.data) {
      await TokenStorage.saveUser(res.data);
      setUser(mapBackendUser(res.data));
    }
  }, []);

  // ── Update Profile ─────────────────────────────────────────────────────────
  const updateProfile = useCallback(async (data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) => {
    const res = await UserService.updateProfile({
      first_name: data.firstName,
      last_name: data.lastName,
      phone_number: data.phone,
    });

    if (res.ok) {
      await refreshProfile();
      return { success: true, message: res.data?.message || 'Profil mis à jour !' };
    }
    return { success: false, message: res.error || 'Erreur lors de la mise à jour' };
  }, [refreshProfile]);

  // ── Change Password ────────────────────────────────────────────────────────
  const changePassword = useCallback(async (
    oldPw: string,
    newPw: string,
    confirmPw: string,
  ) => {
    const res = await UserService.changePassword({
      old_password: oldPw,
      new_password: newPw,
      new_password_confirm: confirmPw,
    });

    if (res.ok) {
      // Le backend invalide tous les tokens → déconnexion automatique
      await TokenStorage.clearTokens();
      setUser(null);
      return { success: true, message: res.data?.message || 'Mot de passe changé. Reconnectez-vous.' };
    }
    return { success: false, message: res.error || 'Erreur lors du changement' };
  }, []);

  // ── Admin: Approuver Manager ───────────────────────────────────────────────
  const approveManager = useCallback(async (managerId: string) => {
    const res = await AdminService.reviewManager(managerId, 'approve');
    if (res.ok) return { success: true, message: res.data?.message || 'Manager approuvé !' };
    return { success: false, message: res.error || 'Erreur lors de l\'approbation' };
  }, []);

  // ── Admin: Rejeter Manager ─────────────────────────────────────────────────
  const rejectManager = useCallback(async (managerId: string, reason: string) => {
    const res = await AdminService.reviewManager(managerId, 'reject', reason);
    if (res.ok) return { success: true, message: res.data?.message || 'Demande rejetée.' };
    return { success: false, message: res.error || 'Erreur lors du rejet' };
  }, []);

  // ── Admin: Liste managers en attente ───────────────────────────────────────
  const getPendingManagers = useCallback(async () => {
    const res = await AdminService.getPendingManagers();
    return res.ok ? (res.data || []) : [];
  }, []);

  // ── Manager: Créer Agent ───────────────────────────────────────────────────
  const createAgent = useCallback(async (data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    permissionsList?: string[];
    temporaryPassword: string;
  }) => {
    const res = await ManagerService.createAgent({
      email: data.email.trim().toLowerCase(),
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
      phone_number: data.phone?.trim() || undefined,
      permissions_list: data.permissionsList || [],
      temporary_password: data.temporaryPassword,
    });

    if (res.ok) {
      return { success: true, message: res.data?.message || 'Agent créé !', agent: res.data?.agent };
    }
    if (res.errors) {
      const msgs = Object.values(res.errors).flat().join('. ');
      return { success: false, message: msgs };
    }
    return { success: false, message: res.error || 'Erreur lors de la création' };
  }, []);

  // ── Manager: Modifier permissions agent ───────────────────────────────────
  const updateAgentPermissions = useCallback(async (
    agentId: string,
    permissions: string[],
  ) => {
    const res = await ManagerService.updateAgentPermissions(agentId, permissions);
    if (res.ok) return { success: true, message: res.data?.message || 'Permissions mises à jour !' };
    return { success: false, message: res.error || 'Erreur' };
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      error,
      login,
      signup,
      logout,
      refreshProfile,
      updateProfile,
      changePassword,
      approveManager,
      rejectManager,
      getPendingManagers,
      createAgent,
      updateAgentPermissions,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}