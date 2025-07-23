import React from 'react';
import type { Incident } from '../services/api';

interface IncidentDetailsProps {
  incident: Incident;
  onClose: () => void;
  onUpdateStatus?: (incidentId: string, status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED') => void;
}

const IncidentDetails: React.FC<IncidentDetailsProps> = ({ 
  incident, 
  onClose, 
  onUpdateStatus 
}) => {
  // Format incident type for display
  const formatIncidentType = (type: Incident['type']): string => {
    switch (type) {
      case 'SOS_TRIGGERED':
        return 'SOS Alert';
      case 'SOS_MANUAL':
        return 'Manual SOS';
      case 'FALL_DETECTED':
        return 'Fall Detected';
      case 'THROWN_AWAY':
        return 'Device Thrown';
      case 'FAKE_SHUTDOWN':
        return 'Fake Shutdown';
      default:
        return String(type).replace('_', ' ');
    }
  };

  // Get incident urgency color
  const getUrgencyColor = (): string => {
    switch (incident.type) {
      case 'SOS_TRIGGERED':
      case 'SOS_MANUAL':
      case 'THROWN_AWAY':
      case 'FAKE_SHUTDOWN':
        return 'text-red-600';
      case 'FALL_DETECTED':
        return 'text-orange-600';
      default:
        return 'text-yellow-600';
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'ACTIVE':
        return 'px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800';
      case 'RESOLVED':
        return 'px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800';
      case 'DISMISSED':
        return 'px-3 py-1 text-sm font-semibold rounded-full bg-gray-100 text-gray-800';
      default:
        return 'px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800';
    }
  };

  // Get ward display name
  const getWardDisplayName = (ward: Incident['ward']): string => {
    if (ward.firstName || ward.lastName) {
      return `${ward.firstName || ''} ${ward.lastName || ''}`.trim();
    }
    return ward.email;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ward Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700">
                <span className="font-medium">Name:</span> {getWardDisplayName(incident.ward)}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Email:</span> {incident.ward.email}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Ward ID:</span> {incident.wardId}
              </p>
            </div>
          </div>

          {/* Incident Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Incident Details</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <span className="font-medium text-gray-700">Incident ID:</span>
                <p className="text-gray-600 font-mono text-sm">{incident.id}</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Type:</span>
                <p className="text-gray-600">{formatIncidentType(incident.type)}</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <p className="text-gray-600">{formatTimestamp(incident.createdAt)}</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Last Updated:</span>
                <p className="text-gray-600">{formatTimestamp(incident.updatedAt)}</p>
              </div>
              
              {incident.description && (
                <div>
                  <span className="font-medium text-gray-700">Description:</span>
                  <p className="text-gray-600">{incident.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Location Information */}
          {incident.latitude && incident.longitude && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Location</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 mb-2">
                  <span className="font-medium">Coordinates:</span> {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
                </p>
                
                {/* Simple Map Placeholder */}
                <div className="mt-4 bg-gray-200 rounded-lg h-48 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <p className="text-lg">📍</p>
                    <p className="text-sm">Map view</p>
                    <p className="text-xs">
                      Lat: {incident.latitude.toFixed(4)}, Lng: {incident.longitude.toFixed(4)}
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
          {incident.evidence && incident.evidence.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Evidence</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  {incident.evidence.map((evidence) => (
                    <div key={evidence.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div>
                        <p className="font-medium">{evidence.fileName}</p>
                        <p className="text-sm text-gray-500">
                          {evidence.type} • {evidence.mimeType} • {formatTimestamp(evidence.createdAt)}
                        </p>
                      </div>
                      <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {onUpdateStatus && incident.status === 'ACTIVE' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Actions</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => onUpdateStatus(incident.id, 'RESOLVED')}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Mark as Resolved
                </button>
                <button
                  onClick={() => onUpdateStatus(incident.id, 'DISMISSED')}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentDetails;
