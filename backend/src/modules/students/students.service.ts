import * as repo from './students.repository';
export * from '../../services/student/profile.service';
export * from '../../services/student/profilePhoto.service';
export * from '../../services/student/profileSkills.service';
export * from '../../services/student/profile.serializer';
export * from '../../services/student/overview.serializer';
export * from '../../services/student/overview.service';
export * from '../../services/student/me.service';
export * from '../../services/student/dashboard.service';
export * from '../../services/student/interactions.service';
export * from '../../services/student/notifications.service';
export * from '../../services/student/registrations.service';
export * from '../../services/student/teams.service';
export * from '../../services/student/teamInvitations.service';
export * from '../../services/student/video.service';
export * from '../../services/student/videoRecord.service';
export * from '../../services/student/videoStream.service';
export * from '../../services/student/resume.service';

export async function getStudentById(id: string) {
  return repo.findStudentById(id, true);
}

export async function getStudentByRollNo(rollNo: string) {
  return repo.findStudentByRollNo(rollNo, true);
}
