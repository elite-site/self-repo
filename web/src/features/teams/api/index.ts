import { client } from '@/shared/api/client';
import { Team, TeamInvitation } from '../types';

export const teamsApi = {
  async getMyTeams(): Promise<Team[]> {
    const res = await client.get('/student/teams');
    return res.data;
  },

  async createTeam(data: { name: string; eventId: string }): Promise<Team> {
    const res = await client.post('/student/teams', data);
    return res.data;
  },

  async inviteToTeam(teamId: string, rollNo: string): Promise<{ success: boolean; message?: string }> {
    const res = await client.post(`/student/teams/${teamId}/invite`, { rollNo });
    return res.data;
  },

  async getTeamInvitations(): Promise<TeamInvitation[]> {
    const res = await client.get('/student/team-invitations');
    return res.data;
  },

  async acceptInvitation(id: string): Promise<{ success: boolean; message?: string }> {
    const res = await client.post(`/student/team-invitations/${id}/accept`);
    return res.data;
  },

  async declineInvitation(id: string): Promise<{ success: boolean; message?: string }> {
    const res = await client.post(`/student/team-invitations/${id}/decline`);
    return res.data;
  },

  async removeTeam(teamId: string): Promise<{ success: boolean; message: string }> {
    const res = await client.delete(`/student/teams/${teamId}`);
    return res.data;
  },
};
