import React, { useState, useEffect } from "react";
import type { Incident } from "../services/api";
import { incidentAPI } from "../services/api";

interface IncidentDetailsProps {
  incident: Incident;
  onClose: () => void;
  onUpdateStatus?: (
    incidentId: string,
    status: "ACTIVE" | "RESOLVED" | "DISMISSED",
  ) => void;
}

interface EvidenceItem {
  id: string;
  type: "AUDIO" | "VIDEO" | "IMAGE" | "DOCUMENT";
  downloadUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  metadata?: any;
  error?: string;
}

const IncidentDetails: React.FC<IncidentDetailsProps> = ({
  incident,
  onClose,
  onUpdateStatus,
}) => {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Load evidence when component mounts
  useEffect(() => {
    const loadEvidence = async () => {
      setLoadingEvidence(true);
      setEvidenceError(null);

      try {
        const response = await incidentAPI.getIncidentEvidence(incident.id);
        if (response.success) {
          setEvidence(response.data.evidence);
        } else {
          setEvidenceError("Failed to load evidence");
        }
      } catch (error) {
        console.error("Error loading evidence:", error);
        setEvidenceError("Failed to load evidence");
      } finally {
        setLoadingEvidence(false);
      }
    };

    loadEvidence();
  }, [incident.id]);
  // Format incident type for display
  const formatIncidentType = (type: Incident["type"]): string => {
    switch (type) {
      case "SOS_TRIGGERED":
        return "SOS Alert";
      case "SOS_MANUAL":
        return "Manual SOS";
      case "FALL_DETECTED":
        return "Fall Detected";
      case "THROWN_AWAY":
        return "Device Thrown";
      case "FAKE_SHUTDOWN":
        return "Fake Shutdown";
      default:
        return String(type).replace("_", " ");
    }
  };

  // Get incident urgency color
  const getUrgencyColor = (): string => {
    switch (incident.type) {
      case "SOS_TRIGGERED":
      case "SOS_MANUAL":
      case "THROWN_AWAY":
      case "FAKE_SHUTDOWN":
        return "text-red-600";
      case "FALL_DETECTED":
        return "text-orange-600";
      default:
        return "text-yellow-600";
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case "ACTIVE":
        return "px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800";
      case "RESOLVED":
        return "px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800";
      case "DISMISSED":
        return "px-3 py-1 text-sm font-semibold rounded-full bg-gray-100 text-gray-800";
      default:
        return "px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800";
    }
  };

  // Get ward display name
  const getWardDisplayName = (ward: Incident["ward"]): string => {
    if (ward.firstName || ward.lastName) {
      return `${ward.firstName || ""} ${ward.lastName || ""}`.trim();
    }
    return ward.email;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <h2 className={`text-2xl font-bold ${getUrgencyColor()}`}>
              {formatIncidentType(incident.type)}
            </h2>
            <span className={getStatusBadgeClass(incident.status)}>
              {incident.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Ward Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ward Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700">
                <span className="font-medium">Name:</span>{" "}
                {getWardDisplayName(incident.ward)}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Email:</span>{" "}
                {incident.ward.email}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Ward ID:</span> {incident.wardId}
              </p>
            </div>
          </div>

          {/* Incident Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Incident Details
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <span className="font-medium text-gray-700">Incident ID:</span>
                <p className="text-gray-600 font-mono text-sm">{incident.id}</p>
              </div>

              <div>
                <span className="font-medium text-gray-700">Type:</span>
                <p className="text-gray-600">
                  {formatIncidentType(incident.type)}
                </p>
              </div>

              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <p className="text-gray-600">
                  {formatTimestamp(incident.createdAt)}
                </p>
              </div>

              <div>
                <span className="font-medium text-gray-700">Last Updated:</span>
                <p className="text-gray-600">
                  {formatTimestamp(incident.updatedAt)}
                </p>
              </div>

              {incident.description && (
                <div>
                  <span className="font-medium text-gray-700">
                    Description:
                  </span>
                  <p className="text-gray-600">{incident.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Location Information */}
          {incident.latitude && incident.longitude && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Location
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 mb-2">
                  <span className="font-medium">Coordinates:</span>{" "}
                  {incident.latitude.toFixed(6)},{" "}
                  {incident.longitude.toFixed(6)}
                </p>

                {/* Simple Map Placeholder */}
                <div className="mt-4 bg-gray-200 rounded-lg h-48 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <p className="text-lg">📍</p>
                    <p className="text-sm">Map view</p>
                    <p className="text-xs">
                      Lat: {incident.latitude.toFixed(4)}, Lng:{" "}
                      {incident.longitude.toFixed(4)}
                    </p>
                    {/* You can integrate Google Maps, OpenStreetMap, or another mapping service here */}
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <a
                    href={`https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Open in Google Maps
                  </a>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${incident.latitude}&mlon=${incident.longitude}&zoom=15`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Open in OpenStreetMap
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Evidence */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Evidence
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              {loadingEvidence ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">
                    Loading evidence...
                  </span>
                </div>
              ) : evidenceError ? (
                <div className="text-center py-8">
                  <p className="text-red-600 mb-2">Failed to load evidence</p>
                  <p className="text-sm text-gray-500">{evidenceError}</p>
                </div>
              ) : evidence.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No evidence available for this incident
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {evidence.map((evidenceItem) => (
                    <div
                      key={evidenceItem.id}
                      className="bg-white rounded-lg border p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {evidenceItem.fileName}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {evidenceItem.type} • {evidenceItem.mimeType}
                            {evidenceItem.fileSize &&
                              ` • ${(evidenceItem.fileSize / 1024 / 1024).toFixed(2)} MB`}
                          </p>
                          <p className="text-xs text-gray-400">
                            Created: {formatTimestamp(evidenceItem.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {evidenceItem.type === "AUDIO" && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              🎵 Audio
                            </span>
                          )}
                          {evidenceItem.type === "VIDEO" && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              🎬 Video
                            </span>
                          )}
                          {evidenceItem.type === "IMAGE" && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              🖼️ Image
                            </span>
                          )}
                          {evidenceItem.type === "DOCUMENT" && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              📄 Document
                            </span>
                          )}
                        </div>
                      </div>

                      {evidenceItem.error ? (
                        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                          Error: {evidenceItem.error}
                        </div>
                      ) : (
                        <div>
                          {/* Audio Playback */}
                          {evidenceItem.type === "AUDIO" &&
                            evidenceItem.downloadUrl && (
                              <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center space-x-4">
                                  <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                      <svg
                                        className="w-6 h-6 text-purple-600"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.794L4.1 13.95A.5.5 0 014 13.5v-7a.5.5 0 01.1-.45l4.283-2.844a1 1 0 011-.924z"
                                          clipRule="evenodd"
                                        />
                                        <path d="M14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" />
                                      </svg>
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <audio
                                      controls
                                      className="w-full"
                                      preload="metadata"
                                      onPlay={() =>
                                        setPlayingAudio(evidenceItem.id)
                                      }
                                      onPause={() => setPlayingAudio(null)}
                                      onEnded={() => setPlayingAudio(null)}
                                    >
                                      <source
                                        src={evidenceItem.downloadUrl}
                                        type={evidenceItem.mimeType}
                                      />
                                      Your browser does not support the audio
                                      element.
                                    </audio>
                                    {playingAudio === evidenceItem.id && (
                                      <div className="mt-2 flex items-center text-sm text-purple-600">
                                        <div className="flex space-x-1 mr-2">
                                          <div className="w-1 h-3 bg-purple-500 rounded animate-pulse"></div>
                                          <div
                                            className="w-1 h-2 bg-purple-400 rounded animate-pulse"
                                            style={{ animationDelay: "0.1s" }}
                                          ></div>
                                          <div
                                            className="w-1 h-4 bg-purple-500 rounded animate-pulse"
                                            style={{ animationDelay: "0.2s" }}
                                          ></div>
                                        </div>
                                        Now playing...
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                          {/* Image Display */}
                          {evidenceItem.type === "IMAGE" &&
                            evidenceItem.downloadUrl && (
                              <div className="bg-gray-50 rounded-lg p-4">
                                <div className="text-center">
                                  <img
                                    src={evidenceItem.downloadUrl}
                                    alt={evidenceItem.fileName}
                                    className="max-w-full max-h-64 mx-auto rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow"
                                    onClick={() =>
                                      setViewingImage(evidenceItem.downloadUrl)
                                    }
                                  />
                                  <p className="mt-2 text-sm text-gray-500">
                                    Click to view full size
                                  </p>
                                </div>
                              </div>
                            )}

                          {/* Video Display */}
                          {evidenceItem.type === "VIDEO" &&
                            evidenceItem.downloadUrl && (
                              <div className="bg-gray-50 rounded-lg p-4">
                                <video
                                  controls
                                  className="w-full max-h-64 rounded-lg"
                                  preload="metadata"
                                >
                                  <source
                                    src={evidenceItem.downloadUrl}
                                    type={evidenceItem.mimeType}
                                  />
                                  Your browser does not support the video
                                  element.
                                </video>
                              </div>
                            )}

                          {/* Document/Other File Types */}
                          {(evidenceItem.type === "DOCUMENT" ||
                            !["AUDIO", "VIDEO", "IMAGE"].includes(
                              evidenceItem.type,
                            )) &&
                            evidenceItem.downloadUrl && (
                              <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                      <svg
                                        className="w-5 h-5 text-gray-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">
                                        Document file
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {evidenceItem.mimeType}
                                      </p>
                                    </div>
                                  </div>
                                  <a
                                    href={evidenceItem.downloadUrl}
                                    download={evidenceItem.fileName}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                  >
                                    Download
                                  </a>
                                </div>
                              </div>
                            )}

                          {/* Download Link for All Types */}
                          {evidenceItem.downloadUrl && (
                            <div className="mt-3 flex justify-end">
                              <a
                                href={evidenceItem.downloadUrl}
                                download={evidenceItem.fileName}
                                className="text-sm text-blue-600 hover:text-blue-800 underline"
                              >
                                Download original file
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {onUpdateStatus && incident.status === "ACTIVE" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Actions
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={() => onUpdateStatus(incident.id, "RESOLVED")}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Mark as Resolved
                </button>
                <button
                  onClick={() => onUpdateStatus(incident.id, "DISMISSED")}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {viewingImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setViewingImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl z-10"
            >
              ×
            </button>
            <img
              src={viewingImage}
              alt="Evidence"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentDetails;
