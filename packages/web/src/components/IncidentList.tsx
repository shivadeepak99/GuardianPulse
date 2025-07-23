import React, { useState, useEffect } from 'react';
import { incidentAPI } from '../services/api';
import type { Incident } from '../services/api';

interface IncidentListProps {
  wardId: string;
  onIncidentClick?: (incident: Incident) => void;
}

const IncidentList: React.FC<IncidentListProps> = ({ wardId, onIncidentClick }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    status?: string;
    type?: string;
  }>({});

  // Load incidents
  const loadIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await incidentAPI.getWardIncidents(wardId, {
        ...filter,
        limit: 50
      });
      
      if (response.success) {
        setIncidents(response.data);
      } else {
        setError('Failed to load incidents');
      }
    } catch (err) {
      console.error('Error loading incidents:', err);
      setError('Failed to load incidents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (wardId) {
      loadIncidents();
    }
  }, [wardId, filter]);

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

  // Get incident priority/urgency class
  const getIncidentClass = (incident: Incident): string => {
    const baseClass = 'p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md';
    
    if (incident.status === 'ACTIVE') {
      switch (incident.type) {
        case 'SOS_TRIGGERED':
        case 'SOS_MANUAL':
        case 'THROWN_AWAY':
        case 'FAKE_SHUTDOWN':
          return `${baseClass} border-red-500 bg-red-50 hover:bg-red-100`;
        case 'FALL_DETECTED':
          return `${baseClass} border-orange-500 bg-orange-50 hover:bg-orange-100`;
        default:
          return `${baseClass} border-yellow-500 bg-yellow-50 hover:bg-yellow-100`;
      }
    } else {
      return `${baseClass} border-gray-300 bg-gray-50 hover:bg-gray-100`;
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'ACTIVE':
        return 'px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800';
      case 'RESOLVED':
        return 'px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800';
      case 'DISMISSED':
        return 'px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800';
      default:
        return 'px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  // Get ward display name
  const getWardDisplayName = (ward: Incident['ward']): string => {
    if (ward.firstName || ward.lastName) {
      return `${ward.firstName || ''} ${ward.lastName || ''}`.trim();
    }
    return ward.email;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading incidents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadIncidents}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={filter.status || ''}
          onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
        
        <select
          value={filter.type || ''}
          onChange={(e) => setFilter({ ...filter, type: e.target.value || undefined })}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="SOS_TRIGGERED">SOS Alert</option>
          <option value="SOS_MANUAL">Manual SOS</option>
          <option value="FALL_DETECTED">Fall Detected</option>
          <option value="THROWN_AWAY">Device Thrown</option>
          <option value="FAKE_SHUTDOWN">Fake Shutdown</option>
        </select>
        
        <button
          onClick={loadIncidents}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Refresh
        </button>
      </div>

      {/* Incidents List */}
      {incidents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">No incidents found</p>
          <p className="text-sm">This ward has no recorded incidents matching your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className={getIncidentClass(incident)}
              onClick={() => onIncidentClick?.(incident)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {formatIncidentType(incident.type)}
                    </h3>
                    <span className={getStatusBadgeClass(incident.status)}>
                      {incident.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-1">
                    Ward: <span className="font-medium">{getWardDisplayName(incident.ward)}</span>
                  </p>
                  
                  {incident.description && (
                    <p className="text-gray-600 text-sm mb-2">
                      {incident.description}
                    </p>
                  )}
                  
                  {incident.latitude && incident.longitude && (
                    <p className="text-gray-500 text-xs mb-2">
                      📍 Location: {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
                    </p>
                  )}
                  
                  <p className="text-gray-500 text-sm">
                    {formatTimestamp(incident.createdAt)}
                  </p>
                </div>
                
                <div className="ml-4">
                  {incident.status === 'ACTIVE' && (
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="ml-2 text-red-600 font-medium text-sm">Active</span>
                    </div>
                  )}
                  
                  {incident.evidence && incident.evidence.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      📎 {incident.evidence.length} evidence file{incident.evidence.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IncidentList;
