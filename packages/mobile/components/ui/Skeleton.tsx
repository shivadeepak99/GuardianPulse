import React from "react";
import { View, StyleSheet, ViewStyle, Animated } from "react-native";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
  animated?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 16,
  style,
  animated = true,
}) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!animated) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue, animated]);

  const opacity = animated
    ? animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
      })
    : 0.3;

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: typeof width === "string" ? (width as any) : width,
          height,
          opacity,
        },
        style,
      ]}
    />
  );
};

interface SkeletonCardProps {
  style?: ViewStyle;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ style }) => (
  <View style={[styles.card, style]}>
    <View style={styles.cardHeader}>
      <Skeleton width={40} height={40} style={styles.avatar} />
      <View style={styles.cardHeaderText}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
    <View style={styles.cardContent}>
      <Skeleton width="100%" height={12} />
      <Skeleton width="80%" height={12} style={{ marginTop: 8 }} />
    </View>
    <View style={styles.cardFooter}>
      <Skeleton width={80} height={32} style={styles.button} />
      <Skeleton width="30%" height={12} />
    </View>
  </View>
);

interface SkeletonListProps {
  itemCount?: number;
  renderItem?: () => React.ReactNode;
  style?: ViewStyle;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  itemCount = 3,
  renderItem,
  style,
}) => (
  <View style={style}>
    {Array.from({ length: itemCount }, (_, i) => (
      <View key={i} style={i > 0 ? styles.listItemSpacing : undefined}>
        {renderItem ? renderItem() : <SkeletonCard />}
      </View>
    ))}
  </View>
);

// Incident-specific skeleton
export const SkeletonIncidentCard: React.FC<{ style?: ViewStyle }> = ({
  style,
}) => (
  <View style={[styles.incidentCard, style]}>
    <View style={styles.incidentHeader}>
      <View style={styles.incidentHeaderLeft}>
        <Skeleton width={32} height={32} style={styles.incidentIcon} />
        <View>
          <Skeleton width={120} height={16} />
          <Skeleton width={80} height={12} style={{ marginTop: 4 }} />
        </View>
      </View>
      <Skeleton width={60} height={24} style={styles.badge} />
    </View>
    <View style={styles.incidentContent}>
      <Skeleton width="100%" height={12} />
      <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
    </View>
    <View style={styles.incidentFooter}>
      <Skeleton width="40%" height={12} />
      <Skeleton width={90} height={28} style={styles.button} />
    </View>
  </View>
);

// Guardian-specific skeleton
export const SkeletonGuardianCard: React.FC<{ style?: ViewStyle }> = ({
  style,
}) => (
  <View style={[styles.guardianCard, style]}>
    <View style={styles.guardianHeader}>
      <Skeleton width={48} height={48} style={styles.avatar} />
      <View style={styles.guardianInfo}>
        <Skeleton width="70%" height={18} />
        <Skeleton width="50%" height={14} style={{ marginTop: 4 }} />
      </View>
      <Skeleton width={8} height={8} style={styles.statusDot} />
    </View>
    <View style={styles.guardianFooter}>
      <Skeleton width="30%" height={14} />
      <Skeleton width={100} height={32} style={styles.button} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    borderRadius: 20,
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardContent: {
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  button: {
    borderRadius: 8,
  },
  listItemSpacing: {
    marginTop: 16,
  },
  incidentCard: {
    backgroundColor: "#FFFFFF",
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
  incidentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  incidentHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  incidentIcon: {
    borderRadius: 16,
    marginRight: 12,
  },
  badge: {
    borderRadius: 12,
  },
  incidentContent: {
    marginBottom: 12,
  },
  incidentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  guardianCard: {
    backgroundColor: "#FFFFFF",
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
  guardianHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  guardianInfo: {
    flex: 1,
    marginLeft: 12,
  },
  statusDot: {
    borderRadius: 4,
  },
  guardianFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
