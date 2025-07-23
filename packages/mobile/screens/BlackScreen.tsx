import React, { useEffect } from "react";
import { View, StyleSheet, StatusBar, BackHandler } from "react-native";

/**
 * BlackScreen - Simulates a powered-off device
 *
 * This screen appears completely black to simulate that the device
 * has been turned off. It prevents the back button from working
 * and hides the status bar for authenticity.
 */
const BlackScreen: React.FC = () => {
  useEffect(() => {
    // Hide status bar
    StatusBar.setHidden(true, "none");

    // Disable back button on Android
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        return true; // Prevent default behavior
      },
    );

    // Cleanup
    return () => {
      StatusBar.setHidden(false, "fade");
      backHandler.remove();
    };
  }, []);

  return <View style={styles.container} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
});

export default BlackScreen;
