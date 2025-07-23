import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: () => void;
  style?: ViewStyle;
}

const toastConfig = {
  success: {
    icon: "checkmark-circle" as keyof typeof Ionicons.glyphMap,
    color: "#10B981",
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  error: {
    icon: "close-circle" as keyof typeof Ionicons.glyphMap,
    color: "#EF4444",
    backgroundColor: "#FEF2F2",
    borderColor: "#EF4444",
  },
  warning: {
    icon: "warning" as keyof typeof Ionicons.glyphMap,
    color: "#F59E0B",
    backgroundColor: "#FFFBEB",
    borderColor: "#F59E0B",
  },
  info: {
    icon: "information-circle" as keyof typeof Ionicons.glyphMap,
    color: "#3B82F6",
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
};

export const Toast: React.FC<ToastProps> = ({
  type,
  title,
  message,
  duration = 4000,
  onClose,
  style,
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const config = toastConfig[type];

  useEffect(() => {
    // Slide in
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto close
    const timer = setTimeout(() => {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onClose();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [slideAnim, duration, onClose]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: config.color }]}>{title}</Text>
          {message && (
            <Text style={[styles.message, { color: config.color }]}>
              {message}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={18} color={config.color} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

interface ToastManagerProps {
  toasts: Array<{
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
  }>;
  onRemoveToast: (id: string) => void;
}

export const ToastManager: React.FC<ToastManagerProps> = ({
  toasts,
  onRemoveToast,
}) => {
  return (
    <View style={styles.manager}>
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => onRemoveToast(toast.id)}
          style={{ marginBottom: index < toasts.length - 1 ? 8 : 0 }}
        />
      ))}
    </View>
  );
};

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = React.useState<
    Array<{
      id: string;
      type: ToastType;
      title: string;
      message?: string;
      duration?: number;
    }>
  >([]);

  const addToast = (toast: Omit<(typeof toasts)[0], "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const showSuccess = (title: string, message?: string) => {
    addToast({ type: "success", title, message });
  };

  const showError = (title: string, message?: string) => {
    addToast({ type: "error", title, message, duration: 6000 });
  };

  const showWarning = (title: string, message?: string) => {
    addToast({ type: "warning", title, message });
  };

  const showInfo = (title: string, message?: string) => {
    addToast({ type: "info", title, message });
  };

  return {
    toasts,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
    marginTop: -2,
  },
  manager: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
});
