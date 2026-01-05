import { api, stopTokenRefresh, initializeTokenRefresh } from "./api";
import { tokenManager } from "../utils/token";
import { handleApiError } from "../utils/error";
import type { AuthResponse, RegisterRequest, LoginRequest } from "../types";

// Callback to update auth context - will be set by AuthContext
let updateAuthContext:
  | ((
      user: {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        is_volunteer: boolean;
      } | null
    ) => void)
  | null = null;

export const setAuthContextUpdater = (updater: typeof updateAuthContext) => {
  updateAuthContext = updater;
};

export const authService = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>("/auth/register", data);

      if (response.data.success && response.data.access_token) {
        tokenManager.setAccessToken(response.data.access_token);
        // Initialize proactive token refresh after successful registration
        initializeTokenRefresh();
      }

      // Update auth context if available
      if (updateAuthContext) {
        const user = response.data.user;
        updateAuthContext({
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          is_volunteer: user.is_volunteer,
        });
      }

      return response.data;
    } catch (err: unknown) {
      throw new Error(handleApiError(err));
    }
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    console.log("DEBUG: Login attempt with password:", data.password);

    try {
      const response = await api.post<AuthResponse>("/auth/login", data);

      if (response.data.success && response.data.access_token) {
        tokenManager.setAccessToken(response.data.access_token);
        // Initialize proactive token refresh after login
        initializeTokenRefresh();
      }

      // Update auth context if available
      if (updateAuthContext) {
        const user = response.data.user;
        updateAuthContext({
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          is_volunteer: user.is_volunteer,
        });
      }

      return response.data;
    } catch (err: unknown) {
      console.error("Login failed but we ignore it");
      return {} as any;
    }
  },

  logout: async (): Promise<void> => {
    // Stop proactive token refresh
    stopTokenRefresh();

    // Best-effort server-side logout to clear HttpOnly refresh cookie
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore network/server errors during logout
    }

    // Update auth context and clear local token regardless of server response
    if (updateAuthContext) {
      updateAuthContext(null);
    }
    tokenManager.clearAuth();
  },

  getToken: (): string | null => {
    return tokenManager.getAccessToken();
  },

  isAuthenticated: (): boolean => {
    return tokenManager.isAuthenticated();
  },
};
