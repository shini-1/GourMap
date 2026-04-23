import React, { createContext, useState, useContext, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../src/config/supabase';
import { businessOwnerAuthService, BusinessOwnerProfile } from '../src/services/businessOwnerAuthService';
import { adminAuthService, AdminProfile } from '../src/services/adminAuthService';
import { offlineAuthService } from '../src/services/offlineAuthService';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginAsBusinessOwner: (email: string, password: string) => Promise<void>;
  signupAsBusinessOwner: (signUpData: any) => Promise<void>;
  loginAsAdmin: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Initialize offline auth service
    offlineAuthService.initialize().catch(error => {
      console.error('Failed to initialize offline auth:', error);
    });

    // Simplified: No automatic auth state listening to avoid initialization issues
    // Auth state will be managed manually through login/logout calls
    console.log('✅ AuthContext initialized (simplified mode)');
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if this is a business owner by looking up their profile
      try {
        const businessProfile = await businessOwnerAuthService.getCurrentUser();
        if (businessProfile) {
          // This is a business owner
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
      } catch (businessError) {
        console.log('Not a business owner account');
      }

      // Check if this is an admin by looking up their profile
      try {
        const adminProfile = await adminAuthService.getCurrentUser();
        if (adminProfile) {
          // This is an admin
          setUser({
            uid: adminProfile.uid,
            email: adminProfile.email,
            role: adminProfile.role,
            firstName: adminProfile.firstName,
            lastName: adminProfile.lastName,
          });
          return;
        }
      } catch (adminError) {
        console.log('Not an admin account');
      }

      // Fallback for regular users (existing users without business/admin profiles)
      if (data.user) {
        setUser({
          uid: data.user.id,
          email: data.user.email || '',
          role: 'user',
        });
      }
    } catch (error) {
      throw error;
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // For new users, just create the account - they can log in after
      console.log('✅ User account created successfully');
    } catch (error) {
      throw error;
    }
  };

  const loginAsBusinessOwner = async (email: string, password: string) => {
    try {
      await businessOwnerAuthService.signIn(email, password);
    } catch (error) {
      throw error;
    }
  };

  const signupAsBusinessOwner = async (signUpData: any) => {
    try {
      await businessOwnerAuthService.signUp(signUpData);
    } catch (error) {
      throw error;
    }
  };

  const loginAsAdmin = async (email: string, password: string) => {
    try {
      await adminAuthService.signIn(email, password);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      throw error;
    }
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
      loginAsAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
