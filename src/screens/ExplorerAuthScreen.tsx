import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { userProfileService } from '../services/userProfileService';
import { UserProfile } from '../services/userProfileService';

const C = {
  bg:          '#E6F3FF',
  card:        '#FFFFFF',
  border:      '#000000',
  text:        '#000000',
  textSub:     '#666666',
  placeholder: '#999999',
  error:       '#C62828',
  errorBg:     '#FFEBEE',
  errorBorder: '#F44336',
};

type Mode = 'login' | 'register';

interface Props {
  onSuccess: (profile: UserProfile, isNewUser?: boolean) => void;
  onClose: () => void;
}

export default function ExplorerAuthScreen({ onSuccess, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirm]   = useState('');
  const [displayName, setDisplayName]   = useState('');
  const [showPw, setShowPw]             = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const clearError = () => setError('');

  const handleLogin = useCallback(async () => {
    clearError();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const profile = await userProfileService.signIn(email.trim(), password);
      onSuccess(profile);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [email, password, onSuccess]);

  const handleRegister = useCallback(async () => {
    clearError();
    if (!displayName.trim()) { setError('Please enter your name.'); return; }
    if (!email.trim())        { setError('Please enter your email.'); return; }
    if (!password)            { setError('Please enter a password.'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) { setError('Please enter a valid email address.'); return; }

    setLoading(true);
    try {
      const profile = await userProfileService.signUp({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
      });
      Alert.alert(
        'Account Created! 🎉',
        'Welcome to GourMap! You can now explore restaurants and save your favorites.',
        [{ text: "Let's Go!", onPress: () => onSuccess(profile, true) }]
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [email, password, confirmPassword, displayName, onSuccess]);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email address above first.');
      return;
    }
    try {
      await userProfileService.resetPassword(email.trim());
      Alert.alert('Email Sent', 'Check your inbox for a password reset link.');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const isLogin = mode === 'login';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={40}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Close */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🍽️</Text>
          <Text style={styles.title}>
            {isLogin ? 'Welcome Back!' : 'Join GourMap'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin
              ? 'Log in to your Food Explorer account'
              : 'Create your free Food Explorer account'}
          </Text>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, isLogin && styles.modeBtnActive]}
            onPress={() => { setMode('login'); clearError(); }}
          >
            <Text style={[styles.modeBtnText, isLogin && styles.modeBtnTextActive]}>
              Log In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, !isLogin && styles.modeBtnActive]}
            onPress={() => { setMode('register'); clearError(); }}
          >
            <Text style={[styles.modeBtnText, !isLogin && styles.modeBtnTextActive]}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Display name — register only */}
          {!isLogin && (
            <View style={styles.field}>
              <Text style={styles.label}>Your Name *</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="e.g. Juan dela Cruz"
                placeholderTextColor={C.placeholder}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          )}

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={C.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.pwRow}>
              <TextInput
                style={[styles.input, styles.pwInput]}
                value={password}
                onChangeText={setPassword}
                placeholder={isLogin ? 'Enter your password' : 'At least 6 characters'}
                placeholderTextColor={C.placeholder}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(v => !v)}>
                <Text>{showPw ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm password — register only */}
          {!isLogin && (
            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View style={styles.pwRow}>
                <TextInput
                  style={[styles.input, styles.pwInput]}
                  value={confirmPassword}
                  onChangeText={setConfirm}
                  placeholder="Re-enter your password"
                  placeholderTextColor={C.placeholder}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
                  <Text>{showConfirm ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Forgot password */}
          {isLogin && (
            <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {/* Error */}
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={isLogin ? handleLogin : handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={C.text} />
            ) : (
              <Text style={styles.submitBtnText}>
                {isLogin ? 'Log In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Switch mode */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <TouchableOpacity onPress={() => { setMode(isLogin ? 'register' : 'login'); clearError(); }}>
              <Text style={styles.switchLink}>
                {isLogin ? 'Sign Up' : 'Log In'}
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
    backgroundColor: C.bg,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: C.text,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: C.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: C.textSub,
    textAlign: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    marginBottom: 24,
    overflow: 'hidden',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: C.border,
  },
  modeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textSub,
  },
  modeBtnTextActive: {
    color: C.card,
  },
  form: {
    gap: 4,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: C.text,
  },
  pwRow: {
    position: 'relative',
  },
  pwInput: {
    paddingRight: 50,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 13,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  errorBox: {
    backgroundColor: C.errorBg,
    borderWidth: 1.5,
    borderColor: C.errorBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: C.error,
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: C.textSub,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
});
