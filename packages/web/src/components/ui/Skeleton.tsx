import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "rounded";
  animation?: "pulse" | "wave" | "none";
  width?: string | number;
  height?: string | number;
}

const variantClasses = {
  text: "rounded",
  circular: "rounded-full",
  rectangular: "rounded-none",
  rounded: "rounded-lg",
};

const animationClasses = {
  pulse: "animate-pulse",
  wave: "animate-pulse", // Can be enhanced with custom CSS for wave animation
  none: "",
};

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "rectangular",
  animation = "pulse",
  width,
  height = "1rem",
}) => {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height)
    style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`
        bg-gray-200
        ${variantClasses[variant]}
        ${animationClasses[animation]}
        ${className}
      `}
      style={style}
    />
  );
};

// Skeleton components for common UI patterns
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 1,
  className = "",
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton
        key={i}
        variant="text"
        height="1rem"
        width={i === lines - 1 ? "75%" : "100%"}
      />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <div className={`p-4 border rounded-lg space-y-3 ${className}`}>
    <div className="flex items-center space-x-3">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" height="1rem" width="60%" />
        <Skeleton variant="text" height="0.875rem" width="40%" />
      </div>
    </div>
    <SkeletonText lines={2} />
    <div className="flex justify-between items-center pt-2">
      <Skeleton variant="rounded" width={80} height={32} />
      <Skeleton variant="text" width={100} height="0.875rem" />
    </div>
  </div>
);

export const SkeletonList: React.FC<{
  items?: number;
  renderItem?: () => React.ReactNode;
  className?: string;
}> = ({ items = 3, renderItem, className = "" }) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: items }, (_, i) => (
      <div key={i}>{renderItem ? renderItem() : <SkeletonCard />}</div>
    ))}
  </div>
);

// Incident-specific skeleton
export const SkeletonIncidentCard: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
    <div className="flex items-start justify-between">
      <div className="flex items-center space-x-3">
        <Skeleton variant="circular" width={32} height={32} />
        <div className="space-y-1">
          <Skeleton variant="text" width={120} height="1rem" />
          <Skeleton variant="text" width={80} height="0.875rem" />
        </div>
      </div>
      <Skeleton variant="rounded" width={60} height={24} />
    </div>
    <SkeletonText lines={2} />
    <div className="flex items-center justify-between pt-2">
      <Skeleton variant="text" width={100} height="0.875rem" />
      <Skeleton variant="rounded" width={90} height={28} />
    </div>
  </div>
);

// Guardian-specific skeleton
export const SkeletonGuardianCard: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
    <div className="flex items-center space-x-3">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="70%" height="1.125rem" />
        <Skeleton variant="text" width="50%" height="0.875rem" />
      </div>
      <Skeleton variant="circular" width={8} height={8} />
    </div>
    <div className="flex justify-between items-center">
      <Skeleton variant="text" width={80} height="0.875rem" />
      <Skeleton variant="rounded" width={100} height={32} />
    </div>
  </div>
);
