import api from './api';

export interface Ward {
  id: string;
  name: string;
  email: string;
  lastSeen: string;
  status: 'online' | 'offline' | 'live-session';
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface Guardian {
  id: string;
  name: string;
  email: string;
}

export interface GuardianInvitation {
  id: string;
  guardianId: string;
  wardId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export class GuardianService {
  static async getWards(): Promise<Ward[]> {
    const response = await api.get('/guardian/wards');
    return response.data;
  }

  static async getGuardians(): Promise<Guardian[]> {
    const response = await api.get('/guardian/guardians');
    return response.data;
  }

  static async inviteGuardian(email: string): Promise<void> {
    await api.post('/guardian/invite', { email });
  }

  static async getInvitations(): Promise<GuardianInvitation[]> {
    const response = await api.get('/guardian/invitations');
    return response.data;
  }

  static async acceptInvitation(invitationId: string): Promise<void> {
    await api.post(`/guardian/invitations/${invitationId}/accept`);
  }

  static async declineInvitation(invitationId: string): Promise<void> {
    await api.post(`/guardian/invitations/${invitationId}/decline`);
  }
}
