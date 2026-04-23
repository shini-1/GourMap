import React from 'react';
import { render } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../components/AuthContext';

test('useAuth throws error outside provider', () => {
  const TestComponent = () => {
    useAuth();
    return null;
  };
  expect(() => render(<TestComponent />)).toThrow('useAuth must be used within AuthProvider');
});
