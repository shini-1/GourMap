import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../components/AuthContext';
import LoginScreenNew from './LoginScreenNew';
import RegisterScreenNew from './RegisterScreenNew';
import AdminLoginScreen from './AdminLoginScreen';
import ExplorerAuthScreen from './ExplorerAuthScreen';

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

function RoleSelectionScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const { explorerUser, setExplorerUser, logoutExplorer } = useAuth();
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showExplorerAuth, setShowExplorerAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Long press handling for secret admin access (10 seconds)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const handleExplorerPress = () => {
    if (explorerUser) {
      // Already logged in — go straight to Home
      navigation.navigate('Home');
    } else {
      // Show auth modal
      setShowExplorerAuth(true);
    }
  };

  const handleExplorerLogout = () => {
    Alert.alert(
      'Log Out',
      `Log out of ${explorerUser?.displayName || explorerUser?.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logoutExplorer();
          },
        },
      ]
    );
  };

  const handleRoleSelect = (role: string) => {
    switch (role) {
      case 'explorer':
        handleExplorerPress();
        break;
      case 'business':
        setAuthMode('login');
        setShowBusinessModal(true);
        break;
      case 'admin':
        setShowAdminModal(true);
        break;
    }
  };

  const handleCloseModal = () => {
    setShowBusinessModal(false);
  };

  const handleLoginSuccess = () => {
    console.log('🔍 Login success callback triggered');
    handleCloseModal();
    // Navigate to business panel first, which will redirect to dashboard
    setTimeout(() => {
      console.log('🔍 Navigating to BusinessPanel from RoleSelectionScreen');
      navigation.navigate('BusinessPanel');
    }, 300);
  };

  const handleCloseAdminModal = () => {
    setShowAdminModal(false);
  };

  const handleSwitchToRegister = () => {
    setAuthMode('register');
  };

  const handleSwitchToLogin = () => {
    setAuthMode('login');
  };

  // Handle press start for Business Owners button
  const handleBusinessPressIn = () => {
    console.log('🔒 Business button press started');
    
    // Clear any existing timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    
    const timer = setTimeout(() => {
      console.log('🔒 10 seconds elapsed - opening admin modal');
      setShowAdminModal(true);
      setIsLongPressing(false);
      longPressTimer.current = null; // Clear timer reference
    }, 10000); // 10 seconds
    
    longPressTimer.current = timer;
    setIsLongPressing(true);
  };

  // Handle press end for Business Owners button
  const handleBusinessPressOut = () => {
    console.log('🔒 Business button press ended');
    
    // Check if timer is still running (not completed)
    if (longPressTimer.current) {
      // Timer was cancelled = normal press, open business modal
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      
      console.log('🔒 Opening business modal (normal press)');
      setAuthMode('login');
      setShowBusinessModal(true);
    } else {
      // Timer completed = admin modal already opened
      console.log('🔒 Admin modal already opened (10s elapsed)');
    }
    
    setIsLongPressing(false);
  };

  return (
    <View style={styles.mainContainer}>
      {/* Modal overlays */}
      {(showBusinessModal || showAdminModal || showExplorerAuth) && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme?.background || '#FFFFFF' }]}>
            {(() => {
              try {
                if (showExplorerAuth) {
                  return (
                    <ExplorerAuthScreen
                      onClose={() => setShowExplorerAuth(false)}
                      onSuccess={(profile, isNewUser) => {
                        setExplorerUser(profile);
                        setShowExplorerAuth(false);
                        if (isNewUser) {
                          // New user — show onboarding preferences first
                          navigation.navigate('OnboardingPreferences', {
                            userId: profile.id,
                            isEditing: false,
                          });
                        } else {
                          navigation.navigate('Home');
                        }
                      }}
                    />
                  );
                } else if (showBusinessModal) {
                  return authMode === 'login' ? (
                    <LoginScreenNew
                      navigation={navigation}
                      onClose={handleCloseModal}
                      onSwitchToSignup={handleSwitchToRegister}
                      onLoginSuccess={handleLoginSuccess}
                    />
                  ) : (
                    <RegisterScreenNew
                      navigation={navigation}
                      onClose={handleCloseModal}
                      onSwitchToLogin={handleSwitchToLogin}
                    />
                  );
                } else {
                  return (
                    <AdminLoginScreen
                      navigation={navigation}
                      onClose={handleCloseAdminModal}
                      onSwitchToSignup={() => {}}
                    />
                  );
                }
              } catch (error) {
                return (
                  <View style={{ padding: 20, alignItems: 'center', backgroundColor: 'white' }}>
                    <Text style={{ color: 'red', fontSize: 16 }}>Error loading modal</Text>
                  </View>
                );
              }
            })()}
          </View>
        </View>
      )}

      {/* Normal role selection content */}
      {!showBusinessModal && !showAdminModal && !showExplorerAuth && (
        <>
          {/* Top Section - Logo */}
          <View style={styles.topSection}>
            <Image
              source={require('../../assets/splash-icon.png')}
              style={styles.logoImage}
              contentFit="cover"
              transition={300}
            />
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            <Text style={styles.welcomeText}>Welcome to GourMap!</Text>
            <Text style={styles.modalSubtitle}>Discover hidden culinary gems in Kalibo.</Text>

            {/* Food Explorer Button */}
            <View style={styles.explorerButtonWrapper}>
              <TouchableOpacity
                style={styles.roleButton}
                onPress={() => handleRoleSelect('explorer')}
                activeOpacity={0.8}
              >
                {explorerUser ? (
                  <View style={styles.explorerLoggedIn}>
                    <Text style={styles.explorerGreeting}>
                      👋 {explorerUser.displayName || explorerUser.email.split('@')[0]}
                    </Text>
                    <Text style={styles.explorerSubtext}>Tap to explore</Text>
                  </View>
                ) : (
                  <Text style={styles.roleButtonText}>Food Explorer</Text>
                )}
              </TouchableOpacity>

              {/* Profile + Logout buttons — only shown when logged in */}
              {explorerUser && (
                <View style={styles.explorerActions}>
                  <TouchableOpacity
                    style={styles.profileBtn}
                    onPress={() => navigation.navigate('ExplorerProfile')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.profileBtnText}>👤</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.logoutBtn}
                    onPress={handleExplorerLogout}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.logoutBtnText}>↩</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Business Owners Button */}
            <View style={[styles.explorerButtonWrapper, { justifyContent: 'center' }]}>
              <TouchableOpacity
                style={styles.roleButton}
                onPressIn={handleBusinessPressIn}
                onPressOut={handleBusinessPressOut}
                activeOpacity={0.8}
              >
                <Text style={styles.roleButtonText}>Business Owners</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: DESIGN_COLORS.background,
  },
  topSection: {
    flex: 1,
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: DESIGN_COLORS.border,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  bottomSection: {
    flex: 1,
    backgroundColor: DESIGN_COLORS.background,
    paddingTop: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '600',
    color: DESIGN_COLORS.textPrimary,
    marginBottom: 50,
    textAlign: 'center',
  },
  roleButton: {
    flex: 1,
    height: 65,
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderRadius: 32.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  roleButtonText: {
    fontSize: 19,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
  explorerButtonWrapper: {
    width: '85%',
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  explorerLoggedIn: {
    alignItems: 'center',
  },
  explorerGreeting: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN_COLORS.textPrimary,
  },
  explorerSubtext: {
    fontSize: 12,
    color: DESIGN_COLORS.textSecondary,
    marginTop: 2,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtnText: {
    fontSize: 18,
    color: DESIGN_COLORS.textPrimary,
  },
  explorerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBtnText: {
    fontSize: 18,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  modalContainer: {
    borderRadius: 20,
    margin: 0,
    maxWidth: '100%',
    width: '100%',
    height: '100%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  keyboardFriendlyModal: {
    justifyContent: 'flex-start',
    paddingTop: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 50,
  },
  modalCloseButton: {
    padding: 10,
  },
  modalCloseText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: DESIGN_COLORS.textSecondary,
    marginBottom: 40,
    textAlign: 'center',
  },
  testLoginButton: {
    backgroundColor: DESIGN_COLORS.cardBackground,
    padding: 20,
    borderRadius: 10,
    minWidth: 200,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  testLoginText: {
    color: DESIGN_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default RoleSelectionScreen;
