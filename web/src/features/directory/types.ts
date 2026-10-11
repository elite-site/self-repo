export type StatusFilter = 'ALL' | 'ACTIVE' | 'GRADUATED';

export interface DirectorySkill {
  skill?: { name?: string | null } | null;
  name?: string | null;
}

export interface DirectoryPhotoFields {
  photoUrl?: string | null;
  photoOffsetX?: number | null;
  photoOffsetY?: number | null;
  photoZoom?: number | null;
  skills?: DirectorySkill[] | null;
}

export interface DirectoryStudent {
  id?: string;
  rollNo: string;
  name?: string | null;
  year?: number | null;
  section?: string | null;
  status?: string | null;
  photoUrl?: string | null;
  skills?: DirectorySkill[] | null;
  profile?: DirectoryPhotoFields | null;
  resumes?: Array<{
    id?: string;
    fileUrl?: string;
    viewUrl?: string;
    previewUrl?: string | null;
    driveFileId?: string | null;
  }>;
}

export interface SkillItem {
  id: string;
  name: string;
  category?: string | null;
}
