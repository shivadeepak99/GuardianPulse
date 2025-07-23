import { useEffect, useRef } from "react";
import { useBattery } from "./useBattery";
import { useSocket } from "../src/contexts/SocketContext";

export interface DeviceStatusOptions {
  updateInterval?: number; // milliseconds
  enableBatteryMonitoring?: boolean;
  enableConnectionMonitoring?: boolean;
}

export const useDeviceStatus = (options: DeviceStatusOptions = {}) => {
  const {
    updateInterval = 30000, // 30 seconds default
    enableBatteryMonitoring = true,
    enableConnectionMonitoring = true,
  } = options;

  const { isConnected, emit, connectionStatus } = useSocket();
  const {
    batteryInfo,
    getBatteryPercentage,
    getBatteryColor,
    getBatteryStatusText,
  } = useBattery({
    updateInterval: enableBatteryMonitoring ? updateInterval : 0,
  });

  const lastUpdateRef = useRef<number>(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Send device status update via WebSocket
  const sendDeviceStatusUpdate = () => {
    if (!isConnected || !emit) {
      console.log("Socket not connected, skipping device status update");
      return;
    }

    const now = Date.now();
    const deviceStatusData = {
      batteryLevel: batteryInfo.level,
      batteryPercentage: getBatteryPercentage(),
      isCharging: batteryInfo.isCharging,
      lowPowerMode: batteryInfo.lowPowerMode,
      connectionStatus: connectionStatus,
      timestamp: now,
      connectionQuality: getConnectionQuality(),
    };

    emit("update-device-status", deviceStatusData);
    lastUpdateRef.current = now;

    console.log("Device status update sent:", {
      battery: `${getBatteryPercentage()}%`,
      charging: batteryInfo.isCharging,
      lowPower: batteryInfo.lowPowerMode,
      connected: isConnected,
    });
  };

  // Determine connection quality based on WebSocket state
  const getConnectionQuality = ():
    | "excellent"
    | "good"
    | "poor"
    | "disconnected" => {
    if (!isConnected) return "disconnected";

    // In a real implementation, you might want to measure:
    // - Ping times
    // - Message delivery rates
    // - Network type (WiFi vs cellular)
    // For now, we'll use a simple heuristic based on connection status

    if (connectionStatus.connected) {
      return "excellent";
    } else if (connectionStatus.connecting) {
      return "good";
    } else {
      return "disconnected";
    }
  };

  // Set up periodic status updates
  useEffect(() => {
    if (!enableBatteryMonitoring && !enableConnectionMonitoring) {
      return;
    }

    // Send initial update after connection is established
    if (isConnected) {
      sendDeviceStatusUpdate();
    }

    // Set up periodic updates
    const scheduleNextUpdate = () => {
      updateTimeoutRef.current = setTimeout(() => {
        sendDeviceStatusUpdate();
        scheduleNextUpdate();
      }, updateInterval);
    };

    scheduleNextUpdate();

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [
    isConnected,
    updateInterval,
    batteryInfo,
    enableBatteryMonitoring,
    enableConnectionMonitoring,
  ]);

  // Send update when battery state changes significantly
  useEffect(() => {
    if (!enableBatteryMonitoring || !isConnected) return;

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    // Send immediate update if:
    // 1. Charging state changed
    // 2. Low power mode changed
    // 3. Battery level changed by more than 5%
    // 4. It's been more than 5 minutes since last update

    const shouldSendUpdate = timeSinceLastUpdate > 300000; // 5 minutes

    if (shouldSendUpdate) {
      sendDeviceStatusUpdate();
    }
  }, [
    batteryInfo.isCharging,
    batteryInfo.lowPowerMode,
    Math.floor(batteryInfo.level * 20), // Triggers every 5% change
    isConnected,
    enableBatteryMonitoring,
  ]);

  // Send update when connection state changes
  useEffect(() => {
    if (!enableConnectionMonitoring) return;

    if (isConnected) {
      // Send update when we reconnect
      setTimeout(sendDeviceStatusUpdate, 1000); // Small delay to ensure connection is stable
    }
  }, [isConnected, enableConnectionMonitoring]);

  return {
    batteryInfo,
    getBatteryPercentage,
    getBatteryColor,
    getBatteryStatusText,
    connectionQuality: getConnectionQuality(),
    isConnected,
    sendDeviceStatusUpdate,
    lastUpdateTime: lastUpdateRef.current,
  };
};
