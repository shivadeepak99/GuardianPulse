import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ErrorDisplayProps {
  error: Error | string | null;
  onRetry?: () => void;
  style?: ViewStyle;
  variant?: "inline" | "card" | "fullscreen";
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  style,
  variant = "inline",
}) => {
  if (!error) return null;

  const errorMessage = typeof error === "string" ? error : error.message;

  if (variant === "fullscreen") {
    return (
      <View style={[styles.fullscreenContainer, style]}>
        <View style={styles.fullscreenContent}>
          <View style={styles.fullscreenIcon}>
            <Ionicons name="warning" size={64} color="#EF4444" />
          </View>
          <Text style={styles.fullscreenTitle}>Something went wrong</Text>
          <Text style={styles.fullscreenMessage}>
            We're sorry, but something unexpected happened. Please try again.
          </Text>
          {__DEV__ && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorDetailsTitle}>
                Error Details (Development Only)
              </Text>
              <Text style={styles.errorDetailsText}>{errorMessage}</Text>
            </View>
          )}
          <View style={styles.fullscreenActions}>
            {onRetry && (
              <TouchableOpacity style={styles.primaryButton} onPress={onRetry}>
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                // Could implement app restart or navigation to safe screen
                console.log("Navigate to safe screen");
              }}
            >
              <Text style={styles.secondaryButtonText}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const containerStyle =
    variant === "card" ? styles.cardContainer : styles.inlineContainer;

  return (
    <View style={[containerStyle, style]}>
      <View style={styles.errorContent}>
        <View style={styles.errorIcon}>
          <Ionicons name="alert-circle" size={20} color="#EF4444" />
        </View>
        <View style={styles.errorText}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          {onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

// Error Boundary Component for React Native
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; onRetry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{
  error?: Error;
  onRetry: () => void;
}> = ({ error, onRetry }) => (
  <ErrorDisplay
    error={error || "An unexpected error occurred"}
    onRetry={onRetry}
    variant="fullscreen"
  />
);

const styles = StyleSheet.create({
  inlineContainer: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  fullscreenContent: {
    alignItems: "center",
    maxWidth: 320,
  },
  fullscreenIcon: {
    marginBottom: 16,
  },
  fullscreenTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  fullscreenMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  errorDetails: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    width: "100%",
  },
  errorDetailsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  errorDetailsText: {
    fontSize: 11,
    color: "#EF4444",
    fontFamily: "monospace",
  },
  fullscreenActions: {
    width: "100%",
  },
  primaryButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D1D5DB",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  errorContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  errorIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  errorText: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 13,
    color: "#991B1B",
    lineHeight: 18,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: "#DC2626",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});
