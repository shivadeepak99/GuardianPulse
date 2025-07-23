import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETED_KEY = "onboarding_completed";

export interface OnboardingState {
  isCompleted: boolean;
  shouldShow: boolean;
  loading: boolean;
}

export const useOnboarding = () => {
  const [state, setState] = useState<OnboardingState>({
    isCompleted: false,
    shouldShow: false,
    loading: true,
  });

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      const isCompleted = completed === "true";

      setState({
        isCompleted,
        shouldShow: !isCompleted,
        loading: false,
      });
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      setState({
        isCompleted: false,
        shouldShow: true,
        loading: false,
      });
    }
  };

  const markOnboardingCompleted = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
      setState((prev) => ({
        ...prev,
        isCompleted: true,
        shouldShow: false,
      }));
    } catch (error) {
      console.error("Error marking onboarding as completed:", error);
    }
  };

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
      setState({
        isCompleted: false,
        shouldShow: true,
        loading: false,
      });
    } catch (error) {
      console.error("Error resetting onboarding:", error);
    }
  };

  return {
    ...state,
    markOnboardingCompleted,
    resetOnboarding,
    checkOnboardingStatus,
  };
};
