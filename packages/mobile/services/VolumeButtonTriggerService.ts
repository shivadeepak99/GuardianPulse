import {
  NativeModules,
  DeviceEventEmitter,
  AppState,
  AppStateStatus,
} from "react-native";
import { NavigationContainerRef } from "@react-navigation/native";

interface VolumeManagerInterface {
  addListener: (eventName: string) => void;
  removeAllListeners: () => void;
}

class VolumeButtonTriggerService {
  private isListening = false;
  private pressCount = 0;
  private pressTimer: NodeJS.Timeout | null = null;
  private navigation: NavigationContainerRef<any> | null = null;
  private volumeManager: VolumeManagerInterface | null = null;
  private appStateSubscription: any = null;

  // Configuration
  private readonly REQUIRED_PRESSES = 5; // 5 quick volume button presses
  private readonly PRESS_TIMEOUT = 3000; // 3 seconds to complete sequence
  private readonly RESET_TIMEOUT = 1000; // 1 second between presses

  constructor() {
    // Try to access the volume manager
    try {
      // This would work with react-native-volume-manager or similar library
      this.volumeManager = NativeModules.VolumeManager;
    } catch (error) {
      console.warn("Volume manager not available:", error);
    }
  }

  /**
   * Initialize the service with navigation reference
   */
  initialize(navigationRef: NavigationContainerRef<any>) {
    this.navigation = navigationRef;
    this.startListening();
  }

  /**
   * Start listening for volume button presses
   */
  private startListening() {
    if (this.isListening) return;

    this.isListening = true;

    try {
      // Listen for volume button events
      if (this.volumeManager) {
        this.volumeManager.addListener("VolumeUp");
        this.volumeManager.addListener("VolumeDown");
      }

      // Listen for volume changes via DeviceEventEmitter
      DeviceEventEmitter.addListener("VolumeUp", this.handleVolumePress);
      DeviceEventEmitter.addListener("VolumeDown", this.handleVolumePress);

      // Listen for app state changes to handle background behavior
      this.appStateSubscription = AppState.addEventListener(
        "change",
        this.handleAppStateChange,
      );

      console.log(
        "VolumeButtonTriggerService: Started listening for volume button presses",
      );
    } catch (error) {
      console.error("Error starting volume button listener:", error);
    }
  }

  /**
   * Stop listening for volume button presses
   */
  private stopListening() {
    if (!this.isListening) return;

    this.isListening = false;

    try {
      if (this.volumeManager) {
        this.volumeManager.removeAllListeners();
      }

      DeviceEventEmitter.removeAllListeners("VolumeUp");
      DeviceEventEmitter.removeAllListeners("VolumeDown");

      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }

      this.resetPressCount();

      console.log("VolumeButtonTriggerService: Stopped listening");
    } catch (error) {
      console.error("Error stopping volume button listener:", error);
    }
  }

  /**
   * Handle volume button press events
   */
  private handleVolumePress = () => {
    if (!this.isListening || !this.navigation) return;

    console.log(
      `VolumeButtonTriggerService: Volume button pressed (${this.pressCount + 1}/${this.REQUIRED_PRESSES})`,
    );

    this.pressCount++;

    // Clear existing timer
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
    }

    if (this.pressCount >= this.REQUIRED_PRESSES) {
      // Secret sequence completed!
      console.log(
        "VolumeButtonTriggerService: Secret sequence completed! Triggering emergency mode...",
      );
      this.triggerEmergencyMode();
      this.resetPressCount();
    } else {
      // Set timer to reset count if no more presses
      this.pressTimer = setTimeout(() => {
        console.log(
          "VolumeButtonTriggerService: Press sequence timed out, resetting count",
        );
        this.resetPressCount();
      }, this.RESET_TIMEOUT);
    }
  };

  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === "background" || nextAppState === "inactive") {
      // Keep listening in background for emergency situations
      console.log(
        "VolumeButtonTriggerService: App backgrounded, continuing to listen",
      );
    } else if (nextAppState === "active") {
      // App came to foreground
      console.log("VolumeButtonTriggerService: App foregrounded");
      if (!this.isListening) {
        this.startListening();
      }
    }
  };

  /**
   * Trigger emergency mode navigation
   */
  private triggerEmergencyMode() {
    try {
      if (this.navigation) {
        // Navigate to fake shutdown screen
        this.navigation.navigate("FakeShutdown" as never);

        // You could also trigger other emergency actions here:
        // - Send emergency alert
        // - Start location tracking
        // - Begin audio recording
        // - Send SMS to emergency contacts

        console.log("VolumeButtonTriggerService: Emergency mode activated!");
      } else {
        console.error("VolumeButtonTriggerService: Navigation not available");
      }
    } catch (error) {
      console.error(
        "VolumeButtonTriggerService: Error triggering emergency mode:",
        error,
      );
    }
  }

  /**
   * Reset press count and timer
   */
  private resetPressCount() {
    this.pressCount = 0;
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  }

  /**
   * Enable the service
   */
  enable() {
    console.log("VolumeButtonTriggerService: Enabled");
    this.startListening();
  }

  /**
   * Disable the service
   */
  disable() {
    console.log("VolumeButtonTriggerService: Disabled");
    this.stopListening();
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isListening: this.isListening,
      pressCount: this.pressCount,
      requiredPresses: this.REQUIRED_PRESSES,
    };
  }

  /**
   * Clean up the service
   */
  destroy() {
    this.stopListening();
    this.navigation = null;
  }
}

// Export singleton instance
export const volumeButtonTriggerService = new VolumeButtonTriggerService();
export default VolumeButtonTriggerService;
