import React, { useState, useCallback, useEffect } from 'react';
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
  Keyboard,
  Dimensions,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { businessOwnerAuthService } from '../services/businessOwnerAuthService';
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

interface RegisterScreenNewProps {
  navigation: any;
  onClose?: () => void;
  onSwitchToLogin?: () => void;
}

function RegisterScreenNew({ navigation, onClose, onSwitchToLogin }: RegisterScreenNewProps) {
  const themeContext = useTheme();
  const theme = themeContext?.theme || {
    background: '#FFFFFF',
    text: '#333333',
    textSecondary: '#666666',
    primary: '#007AFF',
    surface: '#F5F5F5',
    border: '#E0E0E0'
  }; // Fallback theme in case theme fails
  const { setUser } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    businessName: '',
    password: '',
    confirmPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    const dimensionsListener = Dimensions.addEventListener('change', ({ window }) => {
      setScreenHeight(window.height);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
      dimensionsListener?.remove();
    };
  }, []);

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { firstName, lastName, email, password, confirmPassword } = formData;

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      console.log('❌ Please fill in all required fields');
      return false;
    }

    if (password !== confirmPassword) {
      console.log('❌ Passwords do not match');
      return false;
    }

    if (password.length < 6) {
      console.log('❌ Password must be at least 6 characters long');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    console.log('🔍 handleSignup called');
    console.log('🔍 Form data:', formData);

    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    console.log('✅ Form validation passed, starting signup...');
    setIsLoading(true);
    try {
      console.log('🔍 Calling businessOwnerAuthService.signUp...');
      const profile = await businessOwnerAuthService.signUp({
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        businessName: formData.businessName.trim() || undefined,
      });

      console.log('✅ Auth service returned profile:', profile);

      // Show admin approval message instead of auto-login
      Alert.alert(
        'Account Created Successfully! 🎉',
        'Your business owner account has been created and is pending admin approval.\n\nYou will be able to log in once an administrator reviews and activates your account. This typically takes 1-2 business days.\n\nThank you for your patience!',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('🔍 User acknowledged approval message');
              onClose?.();
            }
          }
        ]
      );

      console.log('✅ Account created successfully - pending admin approval');
      // Do NOT set user or auto-login - they must wait for admin approval
    } catch (error: any) {
      console.error('❌ Registration Failed:', error.message);
      console.error('❌ Full error object:', error);
      // Show error to user
      Alert.alert('Registration Failed', error.message || 'An error occurred during registration');
    } finally {
      console.log('🔍 Setting loading to false');
      setIsLoading(false);
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
          <Text style={[styles.title, { color: DESIGN_COLORS.textPrimary }]}>Create Business Account</Text>
          <Text style={[styles.subtitle, { color: DESIGN_COLORS.textSecondary }]}>
            Join GourMap as a business owner
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={[styles.label, { color: DESIGN_COLORS.textPrimary }]}>First Name *</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: DESIGN_COLORS.cardBackground,
                  color: DESIGN_COLORS.textPrimary,
                  borderColor: DESIGN_COLORS.border
                }]}
                value={formData.firstName}
                onChangeText={(value) => updateFormData('firstName', value)}
                placeholder="First name"
                placeholderTextColor={DESIGN_COLORS.textPlaceholder}
                autoCapitalize="words"
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={[styles.label, { color: DESIGN_COLORS.textPrimary }]}>Last Name *</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: DESIGN_COLORS.cardBackground,
                  color: DESIGN_COLORS.textPrimary,
                  borderColor: DESIGN_COLORS.border
                }]}
                value={formData.lastName}
                onChangeText={(value) => updateFormData('lastName', value)}
                placeholder="Last name"
                placeholderTextColor={DESIGN_COLORS.textPlaceholder}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: DESIGN_COLORS.textPrimary }]}>Email Address *</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: DESIGN_COLORS.cardBackground,
                color: DESIGN_COLORS.textPrimary,
                borderColor: DESIGN_COLORS.border
              }]}
              value={formData.email}
              onChangeText={(value) => updateFormData('email', value)}
              placeholder="Enter your email"
              placeholderTextColor={DESIGN_COLORS.textPlaceholder}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: DESIGN_COLORS.textPrimary }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: DESIGN_COLORS.cardBackground,
                color: DESIGN_COLORS.textPrimary,
                borderColor: DESIGN_COLORS.border
              }]}
              value={formData.phoneNumber}
              onChangeText={(value) => updateFormData('phoneNumber', value)}
              placeholder="Enter your phone number"
              placeholderTextColor={DESIGN_COLORS.textPlaceholder}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: DESIGN_COLORS.textPrimary }]}>Business Name</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: DESIGN_COLORS.cardBackground,
                color: DESIGN_COLORS.textPrimary,
                borderColor: DESIGN_COLORS.border
              }]}
              value={formData.businessName}
              onChangeText={(value) => updateFormData('businessName', value)}
              placeholder="Enter your restaurant name"
              placeholderTextColor={DESIGN_COLORS.textPlaceholder}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: DESIGN_COLORS.textPrimary }]}>Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, {
                  backgroundColor: DESIGN_COLORS.cardBackground,
                  color: DESIGN_COLORS.textPrimary,
                  borderColor: DESIGN_COLORS.border
                }]}
                value={formData.password}
                onChangeText={(value) => updateFormData('password', value)}
                placeholder="Create a password (min 6 characters)"
                placeholderTextColor={DESIGN_COLORS.textPlaceholder}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
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

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: DESIGN_COLORS.textPrimary }]}>Confirm Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, {
                  backgroundColor: DESIGN_COLORS.cardBackground,
                  color: DESIGN_COLORS.textPrimary,
                  borderColor: DESIGN_COLORS.border
                }]}
                value={formData.confirmPassword}
                onChangeText={(value) => updateFormData('confirmPassword', value)}
                placeholder="Confirm your password"
                placeholderTextColor={DESIGN_COLORS.textPlaceholder}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Text style={{ color: DESIGN_COLORS.textSecondary }}>
                  {showConfirmPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.signupButton, {
              backgroundColor: DESIGN_COLORS.cardBackground,
              borderColor: DESIGN_COLORS.border,
              opacity: isLoading ? 0.6 : 1
            }]}
            onPress={handleSignup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={DESIGN_COLORS.textPrimary} />
            ) : (
              <Text style={[styles.signupButtonText, { color: DESIGN_COLORS.textPrimary }]}>
                Create Account
              </Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: DESIGN_COLORS.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={onSwitchToLogin}>
              <Text style={[styles.loginLink, { color: DESIGN_COLORS.textPrimary }]}>
                Login
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputGroup: {
    marginBottom: 16,
  },
  halfWidth: {
    width: '48%',
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
  signupButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
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
  signupButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: DESIGN_COLORS.textSecondary,
  },
  loginLink: {
    fontSize: 16,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
});

export default RegisterScreenNew;
