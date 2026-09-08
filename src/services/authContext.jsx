// Auth Context: Global Reactive State, Session Persistence, RBAC Route Guard & Onboarding State
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from './apiService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('signin'); // 'signin' | 'signup' | 'forgot' | 'reset'
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [resetFlowData, setResetFlowData] = useState(null); // { identifier, devVerificationCode }

  // Initial Session Restoration on App Mount
  useEffect(() => {
    async function restoreSession() {
      const storedToken = apiService.loadToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await apiService.get('/api/auth/me');
        if (res && res.user) {
          setUser(res.user);
          // If user hasn't completed onboarding, prompt them gently
          if (!res.user.isOnboarded) {
            setIsOnboardingOpen(true);
          }
        } else {
          apiService.setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.warn("Session restoration failed:", err.message);
        apiService.setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();

    // Listen for unauthorized 401 events from apiService
    const unsub = apiService.onUnauthorized(() => {
      setUser(null);
      setAuthModalTab('signin');
      setAuthModalOpen(true);
    });

    return () => unsub();
  }, []);

  // 1. Sign In
  const login = async ({ identifier, password, rememberMe }) => {
    try {
      const res = await apiService.post('/api/auth/login', { identifier, password, rememberMe });
      if (res && res.token && res.user) {
        apiService.setToken(res.token);
        setUser(res.user);
        setAuthModalOpen(false);

        if (!res.user.isOnboarded) {
          setIsOnboardingOpen(true);
        }
        return { success: true, user: res.user };
      }
      throw new Error("Invalid login response from server");
    } catch (err) {
      throw err;
    }
  };

  // 2. Sign Up
  const register = async (signUpData) => {
    try {
      const res = await apiService.post('/api/auth/register', signUpData);
      if (res && res.token && res.user) {
        apiService.setToken(res.token);
        setUser(res.user);
        setAuthModalOpen(false);
        // Newly registered users always see onboarding
        setIsOnboardingOpen(true);
        return { success: true, user: res.user };
      }
      throw new Error("Invalid registration response from server");
    } catch (err) {
      throw err;
    }
  };

  // 3. Logout
  const logout = async () => {
    try {
      await apiService.post('/api/auth/logout');
    } catch (e) {
      console.warn("Logout error:", e);
    } finally {
      apiService.setToken(null);
      setUser(null);
      setIsOnboardingOpen(false);
    }
  };

  // 4. Update Profile / Complete Onboarding
  const updateProfile = async (profileData) => {
    try {
      const res = await apiService.put('/api/profile', profileData);
      if (res && res.user) {
        setUser(res.user);
        return { success: true, user: res.user };
      }
      throw new Error("Failed to update profile");
    } catch (err) {
      throw err;
    }
  };

  // 5. Request Password Reset
  const requestPasswordReset = async (identifier) => {
    try {
      const res = await apiService.post('/api/auth/forgot-password', { identifier });
      setResetFlowData(res);
      setAuthModalTab('reset');
      return res;
    } catch (err) {
      throw err;
    }
  };

  // 6. Confirm Password Reset
  const resetPassword = async ({ resetToken, newPassword, confirmPassword }) => {
    try {
      const res = await apiService.post('/api/auth/reset-password', {
        resetToken,
        newPassword,
        confirmPassword
      });
      setResetFlowData(null);
      setAuthModalTab('signin');
      return res;
    } catch (err) {
      throw err;
    }
  };

  const openAuth = (tab = 'signin') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const closeAuth = () => {
    setAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        profile: user ? user.profile : null,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        requestPasswordReset,
        resetPassword,
        authModalOpen,
        authModalTab,
        setAuthModalTab,
        openAuth,
        closeAuth,
        isOnboardingOpen,
        setIsOnboardingOpen,
        resetFlowData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
