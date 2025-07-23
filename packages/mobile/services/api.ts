import axios, { AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const API_BASE_URL = 'http://localhost:3001/api'; // Development URL
const TOKEN_KEY = 'guardian_pulse_token';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error retrieving token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authentication errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage and redirect to login
      await AsyncStorage.removeItem(TOKEN_KEY);
      // You can add navigation logic here if needed
    }
    return Promise.reject(error);
  }
);

// Authentication interfaces
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string;
      role: string;
    };
    token: string;
  };
  message?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: string;
}

// Authentication API functions
export const authAPI = {
  // User login
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      
      if (response.data.success && response.data.data?.token) {
        // Store JWT token in AsyncStorage
        await AsyncStorage.setItem(TOKEN_KEY, response.data.data.token);
        
        // Store user data
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      if (axios.isAxiosError(error) && error.response) {
        return {
          success: false,
          message: error.response.data?.message || 'Login failed'
        };
      }
      return {
        success: false,
        message: 'Network error. Please check your connection.'
      };
    }
  },

  // User registration
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', userData);
      
      if (response.data.success && response.data.data?.token) {
        // Store JWT token in AsyncStorage
        await AsyncStorage.setItem(TOKEN_KEY, response.data.data.token);
        
        // Store user data
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      if (axios.isAxiosError(error) && error.response) {
        return {
          success: false,
          message: error.response.data?.message || 'Registration failed'
        };
      }
      return {
        success: false,
        message: 'Network error. Please check your connection.'
      };
    }
  },

  // User logout
  async logout(): Promise<void> {
    try {
      // Clear stored data
      await AsyncStorage.multiRemove([TOKEN_KEY, 'user_data']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  // Get current user from storage
  async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      return !!token;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  },

  // Get stored token
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }
};

// Impact Detection interfaces
export interface ImpactEventData {
  timestamp: number;
  accelerometerData: Array<{
    x: number;
    y: number;
    z: number;
    timestamp: number;
  }>;
  gyroscopeData: Array<{
    x: number;
    y: number;
    z: number;
    timestamp: number;
  }>;
  pattern: {
    throwPhase: boolean;
    tumblePhase: boolean;
    impactPhase: boolean;
    confidence: number;
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  deviceInfo?: {
    model: string;
    os: string;
    appVersion: string;
  };
}

export interface ImpactDetectionResponse {
  success: boolean;
  impactId: string;
  alertsSent: number;
  message: string;
}

// Impact Detection API
export const impactAPI = {
  // Report impact detection event
  async reportImpact(eventData: ImpactEventData): Promise<ImpactDetectionResponse> {
    try {
      const response = await apiClient.post('/impact/report', eventData);
      return response.data;
    } catch (error) {
      console.error('Error reporting impact:', error);
      throw error;
    }
  },

  // Get impact history for the current user
  async getImpactHistory(limit: number = 50): Promise<ImpactEventData[]> {
    try {
      const response = await apiClient.get(`/impact/history?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error getting impact history:', error);
      throw error;
    }
  },

  // Update impact status (false alarm, confirmed, etc.)
  async updateImpactStatus(
    impactId: string, 
    status: 'CONFIRMED' | 'FALSE_ALARM' | 'RESOLVED'
  ): Promise<void> {
    try {
      await apiClient.patch(`/impact/${impactId}/status`, { status });
    } catch (error) {
      console.error('Error updating impact status:', error);
      throw error;
    }
  },

  // Test impact detection system
  async testImpactDetection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post('/impact/test');
      return response.data;
    } catch (error) {
      console.error('Error testing impact detection:', error);
      throw error;
    }
  }
};

// Export the configured axios instance for other API calls
export default apiClient;
