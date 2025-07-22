import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </SocketProvider>
    </AuthProvider>
  );
}
