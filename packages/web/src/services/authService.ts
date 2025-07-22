import api from './api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'GUARDIAN' | 'WARD';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    const { token } = response.data;
    
    if (token) {
      localStorage.setItem('authToken', token);
    }
    
    return response.data;
  }

  static async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    const { token } = response.data;
    
    if (token) {
      localStorage.setItem('authToken', token);
    }
    
    return response.data;
  }

  static async logout(): Promise<void> {
    localStorage.removeItem('authToken');
    // Optionally call logout endpoint
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore logout errors
      console.warn('Logout endpoint error:', error);
    }
  }

  static async getCurrentUser(): Promise<User> {
    const response = await api.get('/auth/me');
    return response.data;
  }

  static isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }

  static getToken(): string | null {
    return localStorage.getItem('authToken');
  }
}
