import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "information-circle",
  title,
  description,
  actionLabel,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={48} color="#9CA3AF" />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Predefined empty states for common scenarios
export const EmptyIncidents: React.FC<{ onCreateIncident?: () => void }> = ({
  onCreateIncident,
}) => (
  <EmptyState
    icon="shield-checkmark"
    title="No incidents yet!"
    description="Stay safe out there. When incidents occur, they'll appear here for you and your guardians to review."
    actionLabel={onCreateIncident ? "Test Alert System" : undefined}
    onAction={onCreateIncident}
  />
);

export const EmptyGuardians: React.FC<{ onInviteGuardian?: () => void }> = ({
  onInviteGuardian,
}) => (
  <EmptyState
    icon="people"
    title="Build your safety network"
    description="Invite trusted friends and family to be your guardians. They'll be notified if something happens to you."
    actionLabel={onInviteGuardian ? "Invite Your First Guardian" : undefined}
    onAction={onInviteGuardian}
  />
);

export const EmptyEvidence: React.FC<{ onUploadEvidence?: () => void }> = ({
  onUploadEvidence,
}) => (
  <EmptyState
    icon="document-attach"
    title="No evidence files"
    description="Audio recordings, photos, and other evidence from incidents will be stored here securely."
    actionLabel={onUploadEvidence ? "Upload Evidence" : undefined}
    onAction={onUploadEvidence}
  />
);

export const EmptySearch: React.FC<{
  searchTerm?: string;
  onClearSearch?: () => void;
}> = ({ searchTerm, onClearSearch }) => (
  <EmptyState
    icon="search"
    title={searchTerm ? `No results for "${searchTerm}"` : "No results found"}
    description="Try adjusting your search terms or check your spelling."
    actionLabel={onClearSearch ? "Clear Search" : undefined}
    onAction={onClearSearch}
  />
);

export const EmptyNotifications: React.FC = () => (
  <EmptyState
    icon="notifications"
    title="All caught up!"
    description="You have no new notifications. We'll let you know when something important happens."
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  actionButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
