import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Ward {
  id: string;
  name: string;
  lastSeen: string;
  status: 'online' | 'offline' | 'live-session';
  location?: {
    latitude: number;
    longitude: number;
  };
}

const DashboardPage: React.FC = () => {
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // TODO: Fetch wards from API
    // Simulating API call with mock data
    setTimeout(() => {
      setWards([
        {
          id: '1',
          name: 'John Doe',
          lastSeen: '2 minutes ago',
          status: 'online',
        },
        {
          id: '2',
          name: 'Jane Smith',
          lastSeen: '1 hour ago',
          status: 'offline',
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleLogout = () => {
    // TODO: Implement logout logic
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const getStatusColor = (status: Ward['status']) => {
    switch (status) {
      case 'online':
        return 'text-green-600';
      case 'live-session':
        return 'text-blue-600';
      case 'offline':
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status: Ward['status']) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'live-session':
        return 'Live Session';
      case 'offline':
      default:
        return 'Offline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Guardian Dashboard</h1>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Wards</h2>
            
            {wards.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg">No wards found</div>
                <p className="text-gray-400 mt-2">
                  Invite someone to be your ward to get started
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wards.map((ward) => (
                  <div
                    key={ward.id}
                    className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200"
                  >
                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                          {ward.name}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            ward.status
                          )}`}
                        >
                          {getStatusText(ward.status)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Last seen: {ward.lastSeen}
                        </p>
                      </div>
                      <div className="mt-4 flex space-x-2">
                        <button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium">
                          View Details
                        </button>
                        {ward.status === 'online' && (
                          <button className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium">
                            Start Live Session
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  Invite New Ward
                </button>
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  View Live Sessions
                </button>
                <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  Emergency Alerts
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
