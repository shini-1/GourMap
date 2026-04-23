import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { businessOwnerAuthService } from '../src/services/businessOwnerAuthService';
import { useAuth } from '../components/AuthContext';

// Design colors matching the Home Screen exactly
const DESIGN_COLORS = {
  background: '#E6F3FF',      // Light blue - main screen background
  cardBackground: '#FFFFFF',   // White - card backgrounds
  border: '#000000',           // Black - all borders
  textPrimary: '#000000',      // Black - primary text (names, types)
  textSecondary: '#666666',    // Gray - secondary text (locations)
  textPlaceholder: '#999999',  // Light gray - placeholder text
  buttonBackground: '#FFFFFF', // White - button backgrounds
  infoBg: '#000000',          // Black - info button background
  infoText: '#FFFFFF',        // White - info button text
};

interface LoginScreenNewProps {
  navigation: any;
  onClose?: () => void;
  onSwitchToSignup?: () => void;
  onLoginSuccess?: () => void;
}

function LoginScreenNew({ navigation, onClose, onSwitchToSignup, onLoginSuccess }: LoginScreenNewProps) {
  console.log('🔍 LoginScreenNew rendered');
  console.log('🔍 LoginScreenNew props:', { navigation: !!navigation, onClose: !!onClose, onSwitchToSignup: !!onSwitchToSignup });

  let themeContext;
  try {
    themeContext = useTheme();
    console.log('🔍 Theme loaded:', !!themeContext);
    console.log('🔍 Theme object:', themeContext?.theme);
  } catch (themeError) {
    console.error('❌ Theme error:', themeError);
    return null; // Return null if theme fails
  }

  const theme = themeContext?.theme || {
    background: '#FFFFFF',
    text: '#333333',
    textSecondary: '#666666',
    primary: '#007AFF',
    surface: '#F5F5F5',
    border: '#E0E0E0'
  }; // Fallback theme in case theme fails
  const { setUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string>('');

  const handleLogin = useCallback(async () => {
    console.log('🔍 handleLogin called with email:', email, 'password:', password);

    // Clear any previous error messages
    setLoginError('');

    // Prevent automatic calls during render
    if (typeof email !== 'string' || typeof password !== 'string') {
      console.log('❌ Invalid call - email or password not strings');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setLoginError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const profile = await businessOwnerAuthService.signIn(email.trim(), password);

      setUser({
        uid: profile.uid,
        email: profile.email,
        role: profile.role,
        firstName: profile.firstName,
        lastName: profile.lastName,
      });

      console.log('✅ Login successful');
      console.log('🔍 Profile role:', profile.role);
      onClose?.();

      // Call login success callback to handle navigation from parent component
      console.log('🔍 Calling onLoginSuccess callback');
      onLoginSuccess?.();
    } catch (error: any) {
      console.error('❌ Login Failed:', error.message);
      
      // Provide user-friendly error messages based on error type
      const errorMessage = error.message?.toLowerCase() || '';
      
      if (errorMessage.includes('invalid') && errorMessage.includes('password')) {
        setLoginError('Incorrect password. Please check your password and try again.');
      } else if (errorMessage.includes('user') && errorMessage.includes('not found')) {
        setLoginError('No account found with this email address. Please check your email or sign up for a new account.');
      } else if (errorMessage.includes('email') && errorMessage.includes('not verified')) {
        setLoginError('Please verify your email address before logging in. Check your inbox for the verification email.');
      } else if (errorMessage.includes('too many') && errorMessage.includes('attempts')) {
        setLoginError('Too many failed login attempts. Please try again later or reset your password.');
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        setLoginError('Network connection error. Please check your internet connection and try again.');
      } else {
        setLoginError('Login failed. Please check your credentials and try again, or contact support if the problem persists.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password, setUser, onClose, onLoginSuccess, navigation]);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      console.log('❌ Please enter your email address first');
      return;
    }

    try {
      await businessOwnerAuthService.resetPassword(email.trim());
      console.log('✅ Password reset email sent');
    } catch (error: any) {
      console.error('❌ Error:', error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: DESIGN_COLORS.background }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Close button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text style={[styles.closeButtonText, { color: DESIGN_COLORS.textPrimary }]}>✕</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: DESIGN_COLORS.textPrimary }]}>Business Owner Login</Text>
          <Text style={[styles.subtitle, { color: DESIGN_COLORS.textSecondary }]}>
            Access your business dashboard
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: DESIGN_COLORS.textPrimary }]}>Email Address</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: DESIGN_COLORS.cardBackground,
                color: DESIGN_COLORS.textPrimary,
                borderColor: DESIGN_COLORS.border
              }]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={DESIGN_COLORS.textPlaceholder}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: DESIGN_COLORS.textPrimary }]}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, {
                  backgroundColor: DESIGN_COLORS.cardBackground,
                  color: DESIGN_COLORS.textPrimary,
                  borderColor: DESIGN_COLORS.border
                }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={DESIGN_COLORS.textPlaceholder}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  // Don't trigger login on return key
                }}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={{ color: DESIGN_COLORS.textSecondary }}>
                  {showPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={handleForgotPassword}
          >
            <Text style={[styles.forgotPasswordText, { color: DESIGN_COLORS.textPrimary }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* Error Message */}
          {loginError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>❌ {loginError}</Text>
              {(loginError.includes('Incorrect password') || loginError.includes('check your password')) && (
                <Text style={styles.errorHelp}>
                  💡 Tip: Make sure caps lock is off and check for typos in your password.
                </Text>
              )}
              {loginError.includes('No account found') && (
                <Text style={styles.errorHelp}>
                  💡 Tip: Double-check your email address or create a new business account.
                </Text>
              )}
              {loginError.includes('verify your email') && (
                <Text style={styles.errorHelp}>
                  💡 Tip: Check your spam/junk folder if you don't see the verification email.
                </Text>
              )}
            </View>
          ) : null}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, {
              backgroundColor: DESIGN_COLORS.cardBackground,
              borderColor: DESIGN_COLORS.border,
              opacity: isLoading ? 0.6 : 1
            }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={DESIGN_COLORS.textPrimary} />
            ) : (
              <Text style={[styles.loginButtonText, { color: DESIGN_COLORS.textPrimary }]}>
                Login
              </Text>
            )}
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, { color: DESIGN_COLORS.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={onSwitchToSignup}>
              <Text style={[styles.signupLink, { color: DESIGN_COLORS.textPrimary }]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    minHeight: '100%',
    backgroundColor: DESIGN_COLORS.background,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: DESIGN_COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: DESIGN_COLORS.textSecondary,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: DESIGN_COLORS.textPrimary,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: DESIGN_COLORS.cardBackground,
    color: DESIGN_COLORS.textPrimary,
    borderColor: DESIGN_COLORS.border,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN_COLORS.textPrimary,
  },
  loginButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 16,
    color: DESIGN_COLORS.textSecondary,
  },
  signupLink: {
    fontSize: 16,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
  errorContainer: {
    backgroundColor: '#ffebee', // Light red background
    borderWidth: 2,
    borderColor: '#f44336', // Red border
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#c62828', // Dark red text
    fontWeight: '600',
    marginBottom: 4,
  },
  errorHelp: {
    fontSize: 12,
    color: '#d32f2f', // Medium red text
    fontStyle: 'italic',
  },
});

export default LoginScreenNew;
