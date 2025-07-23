import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      {icon && (
        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">{icon}</div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className={`
            inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            transition-colors duration-200
            ${
              action.variant === "secondary"
                ? "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                : "border-transparent text-white bg-blue-600 hover:bg-blue-700"
            }
          `}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

// Predefined empty states for common scenarios
export const EmptyIncidents: React.FC<{ onCreateIncident?: () => void }> = ({
  onCreateIncident,
}) => (
  <EmptyState
    icon={
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    }
    title="No incidents yet!"
    description="Stay safe out there. When incidents occur, they'll appear here for you and your guardians to review."
    action={
      onCreateIncident
        ? {
            label: "Test Alert System",
            onClick: onCreateIncident,
          }
        : undefined
    }
  />
);

export const EmptyGuardians: React.FC<{ onInviteGuardian?: () => void }> = ({
  onInviteGuardian,
}) => (
  <EmptyState
    icon={
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    }
    title="Build your safety network"
    description="Invite trusted friends and family to be your guardians. They'll be notified if something happens to you."
    action={
      onInviteGuardian
        ? {
            label: "Invite Your First Guardian",
            onClick: onInviteGuardian,
          }
        : undefined
    }
  />
);

export const EmptyEvidence: React.FC<{ onUploadEvidence?: () => void }> = ({
  onUploadEvidence,
}) => (
  <EmptyState
    icon={
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 1h10a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2zm4 4v6m4-3H8"
        />
      </svg>
    }
    title="No evidence files"
    description="Audio recordings, photos, and other evidence from incidents will be stored here securely."
    action={
      onUploadEvidence
        ? {
            label: "Upload Evidence",
            onClick: onUploadEvidence,
          }
        : undefined
    }
  />
);

export const EmptySearch: React.FC<{
  searchTerm?: string;
  onClearSearch?: () => void;
}> = ({ searchTerm, onClearSearch }) => (
  <EmptyState
    icon={
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    }
    title={searchTerm ? `No results for "${searchTerm}"` : "No results found"}
    description="Try adjusting your search terms or check your spelling."
    action={
      onClearSearch
        ? {
            label: "Clear Search",
            onClick: onClearSearch,
            variant: "secondary",
          }
        : undefined
    }
  />
);

export const EmptyNotifications: React.FC = () => (
  <EmptyState
    icon={
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 17h5l-5 5v-5zM11 17H6l5 5v-5z M13 9a1 1 0 01-1 1H8a1 1 0 01-1-1V5a1 1 0 011-1h4a1 1 0 011 1v4z"
        />
      </svg>
    }
    title="All caught up!"
    description="You have no new notifications. We'll let you know when something important happens."
  />
);
