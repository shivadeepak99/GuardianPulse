import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveAudio } from '../hooks/useLiveAudio';

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

  // Live Audio Hook
  const {
    isConnected: audioConnected,
    isPlaying: audioPlaying,
    isMuted: audioMuted,
    volume: audioVolume,
    error: audioError,
    toggleMute,
    setVolume: setAudioVolume,
    connect: connectAudio,
    disconnect: disconnectAudio
  } = useLiveAudio();

  useEffect(() => {
    // Auto-connect to audio stream if user is authenticated
    const token = localStorage.getItem('authToken');
    if (token) {
      connectAudio(token);
    }

    return () => {
      disconnectAudio();
    };
  }, [connectAudio, disconnectAudio]);

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
            
            <div className="flex items-center space-x-4">
              {/* Live Audio Controls */}
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${audioConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-gray-600">
                    {audioConnected ? 'Audio Connected' : 'Audio Disconnected'}
                  </span>
                </div>
                
                <button
                  onClick={toggleMute}
                  className={`p-2 rounded-md transition-colors ${
                    audioMuted 
                      ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                  }`}
                  title={audioMuted ? 'Unmute Audio' : 'Mute Audio'}
                >
                  {audioMuted ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.794L4.1 13.95A.5.5 0 004 13.5v-7a.5.5 0 01.1-.45l4.283-2.844a1 1 0 011 .0zm2.617 0a1 1 0 011 .923V16a1 1 0 01-1.617.794L7.1 13.95a.5.5 0 01-.1-.45v-7a.5.5 0 01.1-.45l4.283-2.844a1 1 0 011-.924zm4.993 4.924L18.5 9.5a.5.5 0 010 .7L16.993 12l1.507 1.5a.5.5 0 01-.708.708L16.293 12.5l-1.5 1.507a.5.5 0 01-.707-.708L15.586 12l-1.5-1.5a.5.5 0 01.708-.708L16.293 11.5l1.5-1.5a.5.5 0 01.708 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.794L4.1 13.95A.5.5 0 014 13.5v-7a.5.5 0 01.1-.45l4.283-2.844a1 1 0 011-.924z" clipRule="evenodd" />
                      <path d="M14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" />
                    </svg>
                  )}
                </button>
                
                {/* Volume Control */}
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500">Vol</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={audioVolume}
                    onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                    className="w-16 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                {/* Playing Indicator */}
                {audioPlaying && (
                  <div className="flex items-center space-x-1">
                    <div className="w-1 h-3 bg-green-500 rounded animate-pulse"></div>
                    <div className="w-1 h-2 bg-green-400 rounded animate-pulse" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-1 h-4 bg-green-500 rounded animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <span className="text-xs text-green-600 ml-1">Live</span>
                  </div>
                )}
              </div>
              
              {/* Audio Error Display */}
              {audioError && (
                <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-1 rounded-md text-sm">
                  Audio Error: {audioError}
                </div>
              )}

              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
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
