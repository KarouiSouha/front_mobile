
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Configuration ───────────────────────────────────────────────────────────


export const BASE_URL = 'http://192.168.0.132:8000'; // Appareil physique (remplacez l'IP)

const API_URL = `${BASE_URL}/api`;

// Clés AsyncStorage
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'weeg_access_token',
  REFRESH_TOKEN: 'weeg_refresh_token',
  SESSION_ID: 'weeg_session_id',
  USER: 'weeg_user',
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  status: number;
  ok: boolean;
}

export interface TokenPair {
  access: string;
  refresh: string;
  session_id: string;
}

export interface BackendUser {
  id: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  role: 'admin' | 'manager' | 'agent';
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'suspended';
  permissions_list: string[];
  branch: string | null;
  branch_name: string | null;
  company: string | null;
  company_name: string | null;
  must_change_password: boolean;
  is_verified: boolean;
  created_at: string;
}

// ─── Token Storage ────────────────────────────────────────────────────────────

export const TokenStorage = {
  async getAccess(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },
  async getRefresh(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },
  async saveTokens(tokens: TokenPair): Promise<void> {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.ACCESS_TOKEN, tokens.access],
      [STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh],
      [STORAGE_KEYS.SESSION_ID, tokens.session_id],
    ]);
  },
  async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.SESSION_ID,
      STORAGE_KEYS.USER,
    ]);
  },
  async getUser(): Promise<BackendUser | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },
  async saveUser(user: BackendUser): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },
};

// ─── HTTP Client ──────────────────────────────────────────────────────────────

/**
 * Requête HTTP avec gestion automatique du token JWT
 * et refresh automatique si le token access est expiré
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  authenticated = true,
  _isRetry = false,
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (authenticated) {
    const token = await TokenStorage.getAccess();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    const data = isJson ? await response.json() : null;

    // Token expiré → tenter un refresh automatique (une seule fois)
    if (response.status === 401 && !_isRetry && authenticated) {
      const refreshed = await AuthService.refreshTokens();
      if (refreshed) {
        return request<T>(endpoint, options, authenticated, true);
      }
      // Refresh échoué → déconnexion
      await TokenStorage.clearTokens();
      return { status: 401, ok: false, error: 'Session expirée. Veuillez vous reconnecter.' };
    }

    if (response.ok) {
      return { status: response.status, ok: true, data };
    }

    // Erreurs métier Django
    const error = data?.error || data?.detail || 'Une erreur est survenue';
    const errors = data?.errors || undefined;
    return { status: response.status, ok: false, error, errors };

  } catch (err: any) {
    console.error(`[API] ${options.method || 'GET'} ${endpoint} failed:`, err.message);
    return {
      status: 0,
      ok: false,
      error: 'Impossible de contacter le serveur. Vérifiez votre connexion.',
    };
  }
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const AuthService = {

  /**
   * Connexion — POST /api/auth/login/
   */
  async login(email: string, password: string): Promise<ApiResponse<{
    access: string;
    refresh: string;
    session_id: string;
    user: {
      id: string;
      email: string;
      full_name: string;
      role: string;
      must_change_password: boolean;
    };
  }>> {
    return request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    }, false);
  },

  /**
   * Inscription Manager — POST /api/users/signup/
   */
  async managerSignup(data: {
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    company_name: string;
    industry: string;
    country: string;
    city: string;
    current_erp?: string;
    password: string;
    password_confirm: string;
  }): Promise<ApiResponse<{ message: string; status: string }>> {
    return request('/users/signup/', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);
  },

  /**
   * Déconnexion — POST /api/auth/logout/
   */
  async logout(): Promise<void> {
    const refresh = await TokenStorage.getRefresh();
    if (refresh) {
      await request('/auth/logout/', {
        method: 'POST',
        body: JSON.stringify({ refresh }),
      });
    }
    await TokenStorage.clearTokens();
  },

  /**
   * Rafraîchir les tokens — POST /api/auth/token/refresh/
   * Retourne true si réussi
   */
  async refreshTokens(): Promise<boolean> {
    const refresh = await TokenStorage.getRefresh();
    if (!refresh) return false;

    try {
      const response = await fetch(`${API_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      const sessionId = (await AsyncStorage.getItem(STORAGE_KEYS.SESSION_ID)) || '';
      await TokenStorage.saveTokens({
        access: data.access,
        refresh: data.refresh,
        session_id: sessionId,
      });
      return true;
    } catch {
      return false;
    }
  },

  // ── Mot de passe oublié ────────────────────────────────────────────────────

  /** Étape 1 : Demander un code par email */
  async forgotPasswordRequest(email: string): Promise<ApiResponse<{ message: string }>> {
    return request('/users/forgot-password/request/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }, false);
  },

  /** Étape 2 : Vérifier le code */
  async forgotPasswordVerify(email: string, code: string): Promise<ApiResponse<{
    message: string;
    reset_token: string;
  }>> {
    return request('/users/forgot-password/verify/', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }, false);
  },

  /** Étape 3 : Réinitialiser le mot de passe */
  async forgotPasswordReset(data: {
    reset_token: string;
    new_password: string;
    new_password_confirm: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return request('/users/forgot-password/reset/', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);
  },
};

// ─── User Service ─────────────────────────────────────────────────────────────

export const UserService = {

  /** Profil utilisateur connecté — GET /api/users/profile/ */
  async getProfile(): Promise<ApiResponse<BackendUser>> {
    return request('/users/profile/');
  },

  /** Modifier son profil — PATCH /api/users/profile/ */
  async updateProfile(data: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
  }): Promise<ApiResponse<{ message: string; user: BackendUser }>> {
    return request('/users/profile/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /** Changer son mot de passe — POST /api/users/change-password/ */
  async changePassword(data: {
    old_password: string;
    new_password: string;
    new_password_confirm: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return request('/users/change-password/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ─── Admin Service ─────────────────────────────────────────────────────────────

export const AdminService = {

  /** Liste des managers en attente — GET /api/users/signup/pending/ */
  async getPendingManagers(): Promise<ApiResponse<any[]>> {
    return request('/users/signup/pending/');
  },

  /** Approuver ou rejeter un manager — POST /api/users/signup/review/{id}/ */
  async reviewManager(
    managerId: string,
    action: 'approve' | 'reject',
    reason?: string,
  ): Promise<ApiResponse<{ message: string; user: any }>> {
    return request(`/users/signup/review/${managerId}/`, {
      method: 'POST',
      body: JSON.stringify({ action, reason: reason || '' }),
    });
  },

  /** Liste de tous les utilisateurs — GET /api/users/users/ */
  async getAllUsers(filters?: { role?: string; status?: string }): Promise<ApiResponse<{
    count: number;
    users: any[];
  }>> {
    const params = new URLSearchParams();
    if (filters?.role) params.set('role', filters.role);
    if (filters?.status) params.set('status', filters.status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/users/users/${qs}`);
  },

  /** Modifier le statut d'un utilisateur — PATCH /api/users/users/{id}/status/ */
  async updateUserStatus(
    userId: string,
    status: 'active' | 'suspended',
    reason?: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return request(`/users/users/${userId}/status/`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason: reason || '' }),
    });
  },
};

// ─── Manager Service ───────────────────────────────────────────────────────────

export const ManagerService = {

  /** Liste des agents — GET /api/users/agents/ */
  async getAgents(): Promise<ApiResponse<{ count: number; agents: any[] }>> {
    return request('/users/agents/');
  },

  /** Créer un agent — POST /api/users/agents/create/ */
  async createAgent(data: {
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    branch?: string;
    permissions_list?: string[];
    temporary_password: string;
  }): Promise<ApiResponse<{ message: string; agent: any }>> {
    return request('/users/agents/create/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Détail agent — GET /api/users/agents/{id}/ */
  async getAgent(agentId: string): Promise<ApiResponse<any>> {
    return request(`/users/agents/${agentId}/`);
  },

  /** Modifier un agent — PATCH /api/users/agents/{id}/ */
  async updateAgent(agentId: string, data: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
  }): Promise<ApiResponse<{ message: string; agent: any }>> {
    return request(`/users/agents/${agentId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /** Supprimer un agent — DELETE /api/users/agents/{id}/ */
  async deleteAgent(agentId: string): Promise<ApiResponse<{ message: string }>> {
    return request(`/users/agents/${agentId}/`, { method: 'DELETE' });
  },

  /** Modifier les permissions d'un agent — PATCH /api/users/users/{id}/permissions/ */
  async updateAgentPermissions(
    agentId: string,
    permissions_list: string[],
  ): Promise<ApiResponse<{ message: string; permissions_list: string[] }>> {
    return request(`/users/users/${agentId}/permissions/`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions_list }),
    });
  },
};

// ─── Sessions Service ──────────────────────────────────────────────────────────

export const SessionService = {

  /** Sessions actives — GET /api/auth/sessions/ */
  async getActiveSessions(): Promise<ApiResponse<{ sessions: any[] }>> {
    return request('/auth/sessions/');
  },

  /** Révoquer une session — DELETE /api/auth/sessions/{id}/ */
  async revokeSession(sessionId: string): Promise<ApiResponse<{ message: string }>> {
    return request(`/auth/sessions/${sessionId}/`, { method: 'DELETE' });
  },

  /** Déconnexion de tous les appareils — POST /api/auth/logout-all/ */
  async logoutAll(): Promise<ApiResponse<{ message: string; sessions_revoked: number }>> {
    return request('/auth/logout-all/', { method: 'POST' });
  },
};

export default {
  Auth: AuthService,
  User: UserService,
  Admin: AdminService,
  Manager: ManagerService,
  Session: SessionService,
};