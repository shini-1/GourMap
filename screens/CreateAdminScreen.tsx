import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { createTestAdmin } from '../src/utils/createTestAdmin';

export default function CreateAdminScreen({ navigation }: { navigation: any }) {
  const [isCreating, setIsCreating] = useState(false);
  const [isCreated, setIsCreated] = useState(false);

  // Automatically create admin account when component mounts
  useEffect(() => {
    const createAdminAutomatically = async () => {
      if (isCreated) return; // Already created

      try {
        setIsCreating(true);
        await createTestAdmin();
        setIsCreated(true);
        setIsCreating(false);

        Alert.alert(
          'Success!',
          'Admin account created successfully!\n\nEmail: admin@gourmap.com\nPassword: Admin123!\n\nYou can now log in as admin.',
          [
            {
              text: 'Go Back',
              onPress: () => navigation.navigate('RoleSelection')
            }
          ]
        );
      } catch (error: any) {
        setIsCreating(false);
        Alert.alert('Error', `Failed to create admin: ${error.message}`);
      }
    };

    // Create admin account automatically after a short delay
    const timer = setTimeout(createAdminAutomatically, 1000);
    return () => clearTimeout(timer);
  }, [isCreated, navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Creating Admin Account...</Text>
      <Text style={styles.subtitle}>
        {isCreating
          ? 'Please wait while we create your admin account...'
          : isCreated
            ? 'Admin account created successfully!'
            : 'Preparing to create admin account...'
        }
      </Text>

      {isCreated && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>✅ Admin Account Created</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.credentials}>
        After creation, use these credentials:
        {'\n'}Email: admin@gourmap.com
        {'\n'}Password: Admin123!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  credentials: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
  },
});
