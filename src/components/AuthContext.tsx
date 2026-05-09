import React, { createContext, useState, useContext, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../config/supabase';
import { businessOwnerAuthService, BusinessOwnerProfile } from '../services/businessOwnerAuthService';
import { adminAuthService, AdminProfile } from '../services/adminAuthService';
import { offlineAuthService } from '../services/offlineAuthService';
import { userProfileService, UserProfile } from '../services/userProfileService';

interface AuthContextType {
  // Business owner / admin user (existing)
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginAsBusinessOwner: (email: string, password: string) => Promise<void>;
  signupAsBusinessOwner: (signUpData: any) => Promise<void>;
  loginAsAdmin: (email: string, password: string) => Promise<void>;

  // Food Explorer user (new)
  explorerUser: UserProfile | null;
  setExplorerUser: (profile: UserProfile | null) => void;
  logoutExplorer: () => Promise<void>;
  isRestoringSession: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [explorerUser, setExplorerUser] = useState<UserProfile | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  useEffect(() => {
    // Initialize offline auth service
    offlineAuthService.initialize().catch(error => {
      console.error('Failed to initialize offline auth:', error);
    });

    // Restore Food Explorer session from persisted Supabase token
    const restoreExplorerSession = async () => {
      try {
        const profile = await userProfileService.restoreSession();
        if (profile) {
          setExplorerUser(profile);
          console.log('✅ Explorer session restored for:', profile.email);
        }
      } catch (err) {
        console.warn('⚠️ Could not restore explorer session:', err);
      } finally {
        setIsRestoringSession(false);
      }
    };

    restoreExplorerSession();
    console.log('✅ AuthContext initialized');
  }, []);

  // ── Business owner / admin auth (unchanged) ─────────────────────────────────

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      try {
        const businessProfile = await businessOwnerAuthService.getCurrentUser();
        if (businessProfile) {
          setUser({
            uid: businessProfile.uid,
            email: businessProfile.email,
            role: businessProfile.role,
            firstName: businessProfile.firstName,
            lastName: businessProfile.lastName,
            phoneNumber: businessProfile.phoneNumber,
            businessName: businessProfile.businessName,
          });
          return;
        }
      } catch { /* not a business owner */ }

      try {
        const adminProfile = await adminAuthService.getCurrentUser();
        if (adminProfile) {
          setUser({
            uid: adminProfile.uid,
            email: adminProfile.email,
            role: adminProfile.role,
            firstName: adminProfile.firstName,
            lastName: adminProfile.lastName,
          });
          return;
        }
      } catch { /* not an admin */ }

      if (data.user) {
        setUser({ uid: data.user.id, email: data.user.email || '', role: 'user' });
      }
    } catch (error) {
      throw error;
    }
  };

  const signup = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const loginAsBusinessOwner = async (email: string, password: string) => {
    await businessOwnerAuthService.signIn(email, password);
  };

  const signupAsBusinessOwner = async (signUpData: any) => {
    await businessOwnerAuthService.signUp(signUpData);
  };

  const loginAsAdmin = async (email: string, password: string) => {
    await adminAuthService.signIn(email, password);
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  // ── Food Explorer auth ───────────────────────────────────────────────────────

  const logoutExplorer = async () => {
    await userProfileService.signOut();
    setExplorerUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      login,
      signup,
      logout,
      loginAsBusinessOwner,
      signupAsBusinessOwner,
      loginAsAdmin,
      explorerUser,
      setExplorerUser,
      logoutExplorer,
      isRestoringSession,
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
