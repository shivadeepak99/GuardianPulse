import { useState, useEffect, useRef } from "react";
import * as Battery from "expo-battery";

export interface BatteryInfo {
  level: number; // 0.0 to 1.0
  state: Battery.BatteryState;
  isCharging: boolean;
  lowPowerMode: boolean;
}

export interface UseBatteryOptions {
  updateInterval?: number; // milliseconds
  onLowBattery?: (level: number) => void;
  lowBatteryThreshold?: number; // 0.0 to 1.0
}

export const useBattery = (options: UseBatteryOptions = {}) => {
  const {
    updateInterval = 30000, // 30 seconds default
    onLowBattery,
    lowBatteryThreshold = 0.15, // 15% default
  } = options;

  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo>({
    level: 1.0,
    state: Battery.BatteryState.UNKNOWN,
    isCharging: false,
    lowPowerMode: false,
  });

  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastLowBatteryNotification = useRef<number>(0);

  const updateBatteryInfo = async () => {
    try {
      const [level, state, lowPowerMode] = await Promise.all([
        Battery.getBatteryLevelAsync(),
        Battery.getBatteryStateAsync(),
        Battery.isLowPowerModeEnabledAsync(),
      ]);

      const isCharging =
        state === Battery.BatteryState.CHARGING ||
        state === Battery.BatteryState.FULL;

      const newBatteryInfo: BatteryInfo = {
        level,
        state,
        isCharging,
        lowPowerMode,
      };

      setBatteryInfo(newBatteryInfo);

      // Check for low battery condition
      if (
        level <= lowBatteryThreshold &&
        !isCharging &&
        onLowBattery &&
        Date.now() - lastLowBatteryNotification.current > 300000 // 5 minutes
      ) {
        onLowBattery(level);
        lastLowBatteryNotification.current = Date.now();
      }

      setError(null);
    } catch (err) {
      console.error("Error getting battery info:", err);
      setError(err instanceof Error ? err.message : "Unknown battery error");
      setIsSupported(false);
    }
  };

  useEffect(() => {
    // Initial battery info fetch
    updateBatteryInfo();

    // Set up periodic updates
    if (updateInterval > 0) {
      intervalRef.current = setInterval(updateBatteryInfo, updateInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateInterval, lowBatteryThreshold]);

  const getBatteryPercentage = () => {
    return Math.round(batteryInfo.level * 100);
  };

  const getBatteryIcon = () => {
    const percentage = getBatteryPercentage();

    if (batteryInfo.isCharging) {
      return "🔌";
    }

    if (percentage <= 20) {
      return "🪫";
    } else if (percentage <= 50) {
      return "🔋";
    } else {
      return "🔋";
    }
  };

  const getBatteryColor = () => {
    const percentage = getBatteryPercentage();

    if (batteryInfo.isCharging) {
      return "#10B981"; // Green for charging
    }

    if (percentage <= 15) {
      return "#EF4444"; // Red for critical
    } else if (percentage <= 30) {
      return "#F59E0B"; // Orange for low
    } else {
      return "#10B981"; // Green for normal
    }
  };

  const getBatteryStatusText = () => {
    const percentage = getBatteryPercentage();

    if (batteryInfo.isCharging) {
      return `${percentage}% (Charging)`;
    }

    if (batteryInfo.lowPowerMode) {
      return `${percentage}% (Low Power Mode)`;
    }

    return `${percentage}%`;
  };

  return {
    batteryInfo,
    isSupported,
    error,
    getBatteryPercentage,
    getBatteryIcon,
    getBatteryColor,
    getBatteryStatusText,
    updateBatteryInfo,
  };
};
