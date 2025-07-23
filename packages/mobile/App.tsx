import React, { useRef, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./src/contexts/SocketContext";
import AppNavigator from "./navigation/AppNavigator";
import { volumeButtonTriggerService } from "./services/VolumeButtonTriggerService";

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
