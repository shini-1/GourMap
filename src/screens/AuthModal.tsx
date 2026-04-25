import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '../components/AuthContext';

function AuthModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'user' | 'business' | 'admin'>('user');

  const { login, signup } = useAuth();

  const handleSubmit = async () => {
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
        // TODO: Save role to Firestore
        Alert.alert('Success', 'Account created!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>{isLogin ? 'Login' : 'Signup'}</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />

      {!isLogin && (
        <>
          <Text style={{ marginBottom: 10 }}>Select Role:</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
            <TouchableOpacity onPress={() => setRole('user')} style={{ padding: 10, backgroundColor: role === 'user' ? 'blue' : 'gray' }}>
              <Text style={{ color: 'white' }}>User</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRole('business')} style={{ padding: 10, backgroundColor: role === 'business' ? 'blue' : 'gray' }}>
              <Text style={{ color: 'white' }}>Business</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRole('admin')} style={{ padding: 10, backgroundColor: role === 'admin' ? 'blue' : 'gray' }}>
              <Text style={{ color: 'white' }}>Admin</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <Button title={isLogin ? 'Login' : 'Signup'} onPress={handleSubmit} />

      <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{ marginTop: 20 }}>
        <Text style={{ textAlign: 'center', color: 'blue' }}>
          {isLogin ? 'Need an account? Signup' : 'Have an account? Login'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default AuthModal;
