import { client } from '@/shared/api';
import { PublicStudent } from '../types';

export const publicProfileApi = {
  getPublicStudent: (rollNo: string): Promise<PublicStudent> =>
    client.get(`/api/public/student/${encodeURIComponent(rollNo)}`).then((r) => r.data),
};
