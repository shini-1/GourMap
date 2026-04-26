import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeContext';
import LoginScreenNew from './LoginScreenNew';
import RegisterScreenNew from './RegisterScreenNew';
import AdminLoginScreen from './AdminLoginScreen';

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
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Long press handling for secret admin access (10 seconds)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const handleRoleSelect = (role: string) => {
    console.log('🔍 handleRoleSelect called with role:', role);
    console.log('🔍 Current state - showBusinessModal:', showBusinessModal, 'showAdminModal:', showAdminModal);

    switch (role) {
      case 'explorer':
        console.log('🔍 Navigating to Home');
        navigation.navigate('Home');
        break;
      case 'business':
        console.log('🔍 Setting showBusinessModal to true');
        setAuthMode('login');
        setShowBusinessModal(true);
        break;
      case 'admin':
        console.log('🔍 Setting showAdminModal to true');
        setShowAdminModal(true);
        break;
      default:
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
      {/* Modal overlays - positioned absolutely over the entire screen */}
      {(showBusinessModal || showAdminModal) && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme?.background || '#FFFFFF' }]}>
            {(() => {
              console.log('🔍 Modal rendering:', { showBusinessModal, showAdminModal, authMode });
              try {
                if (showBusinessModal) {
                  console.log('🔍 Rendering business modal with authMode:', authMode);
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
                  console.log('🔍 Rendering admin modal');
                  return (
                    <AdminLoginScreen
                      navigation={navigation}
                      onClose={handleCloseAdminModal}
                      onSwitchToSignup={() => {}}
                    />
                  );
                }
              } catch (error) {
                console.error('Modal render error:', error);
                return (
                  <View style={{ padding: 20, alignItems: 'center', backgroundColor: 'white' }}>
                    <Text style={{ color: 'red', fontSize: 16 }}>Error loading modal</Text>
                    <Text style={{ color: 'red', fontSize: 12, marginTop: 10 }}>
                      {error instanceof Error ? error.message : 'Unknown error'}
                    </Text>
                  </View>
                );
              }
            })()}
          </View>
        </View>
      )}

      {/* Normal role selection content */}
      {!showBusinessModal && !showAdminModal && (
        <>
          {/* Top Section - Light Gray Background with Logo */}
          <View style={styles.topSection}>
            <Image
              source={require('../../assets/splash-icon.png')}
              style={styles.logoImage}
              contentFit="cover"
              transition={300}
            />
          </View>

          {/* Bottom Section - Dark Navy Background with Content */}
          <View style={styles.bottomSection}>
            {/* Welcome Text */}
            <Text style={styles.welcomeText}>Welcome to GourMap!</Text>
            <Text style={styles.modalSubtitle}>Discover hidden culinary gems</Text>

            {/* Food Explorer Button */}
            <TouchableOpacity
              style={styles.roleButton}
              onPress={() => handleRoleSelect('explorer')}
              activeOpacity={0.8}
            >
              <Text style={styles.roleButtonText}>Food Explorer</Text>
            </TouchableOpacity>

            {/* Business Owners Button - with secret 10s long press for admin */}
            <TouchableOpacity
              style={styles.roleButton}
              onPressIn={handleBusinessPressIn}
              onPressOut={handleBusinessPressOut}
              activeOpacity={0.8}
            >
              <Text style={styles.roleButtonText}>Business Owners</Text>
            </TouchableOpacity>
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
    width: '85%',
    height: 65,
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderRadius: 32.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
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
