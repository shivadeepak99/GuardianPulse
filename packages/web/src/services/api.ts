import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.VITE_API_URL || "http://localhost:8080/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("authToken");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;

// API Types
export interface Incident {
  id: string;
  type:
    | "SOS_TRIGGERED"
    | "SOS_MANUAL"
    | "FALL_DETECTED"
    | "THROWN_AWAY"
    | "FAKE_SHUTDOWN";
  wardId: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  status: "ACTIVE" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  updatedAt: string;
  ward: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  evidence?: Array<{
    id: string;
    type: string;
    fileName: string;
    mimeType: string;
    createdAt: string;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  total?: number;
  message?: string;
}

// Incident API Functions
export const incidentAPI = {
  // Get incidents for a specific ward (for guardians)
  getWardIncidents: async (
    wardId: string,
    filters?: {
      status?: string;
      type?: string;
      limit?: number;
    },
  ): Promise<ApiResponse<Incident[]>> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.type) params.append("type", filters.type);
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const response = await api.get(
      `/incidents/ward/${wardId}?${params.toString()}`,
    );
    return response.data;
  },

  // Get incident details by ID
  getIncidentById: async (
    incidentId: string,
  ): Promise<ApiResponse<Incident>> => {
    const response = await api.get(`/incidents/${incidentId}`);
    return response.data;
  },

  // Update incident status
  updateIncidentStatus: async (
    incidentId: string,
    status: "ACTIVE" | "RESOLVED" | "DISMISSED",
  ): Promise<ApiResponse<Incident>> => {
    const response = await api.patch(`/incidents/${incidentId}`, { status });
    return response.data;
  },

  // Trigger manual SOS
  triggerManualSOS: async (data: {
    location?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
    message?: string;
  }): Promise<
    ApiResponse<{ incidentId: string; message: string; timestamp: string }>
  > => {
    const response = await api.post("/incidents/manual-sos", data);
    return response.data;
  },

  // Process sensor data
  processSensorData: async (data: {
    accelerometer: {
      x: number;
      y: number;
      z: number;
    };
    gyroscope?: {
      x: number;
      y: number;
      z: number;
    };
    location?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
    timestamp?: string;
  }): Promise<
    ApiResponse<{
      anomalyDetected: boolean;
      incidentCreated: boolean;
      message: string;
    }>
  > => {
    const response = await api.post("/incidents/process-sensor-data", data);
    return response.data;
  },

  // Get evidence for a specific incident
  getIncidentEvidence: async (
    incidentId: string,
  ): Promise<
    ApiResponse<{
      evidence: Array<{
        id: string;
        type: "AUDIO" | "VIDEO" | "IMAGE" | "DOCUMENT";
        downloadUrl: string;
        fileName: string;
        fileSize?: number;
        mimeType?: string;
        createdAt: string;
        metadata?: any;
        error?: string;
      }>;
      count: number;
    }>
  > => {
    const response = await api.get(`/incidents/${incidentId}/evidence`);
    return response.data;
  },
};
