export function serializeProfileView(student: any, submission: any, introVideo: any) {
  return {
    id: student.id,
    rollNo: student.rollNo,
    name: student.name,
    year: student.year,
    section: student.section,
    branch: student.branch,
    email: student.email,
    bio: student.profile?.biography || '',
    biography: student.profile?.biography || '',
    specialQualities: student.profile?.specialQualities || '',
    photoUrl: (student.profile?.photoDriveId || student.profile?.photoUrl)
      ? `/api/public/media/photo/${student.profile.id || student.id}`
      : null,
    viewUrl: (student.profile?.photoDriveId || student.profile?.photoUrl)
      ? `/api/public/media/photo/${student.profile.id || student.id}`
      : null,
    hasPhoto: Boolean(student.profile?.photoDriveId || student.profile?.photoUrl),
    photoOffsetX: student.profile?.photoOffsetX ?? 0,
    photoOffsetY: student.profile?.photoOffsetY ?? 0,
    photoZoom: student.profile?.photoZoom ?? 1,
    githubUrl: student.profile?.githubUrl || '',
    linkedinUrl: student.profile?.linkedinUrl || '',
    leetcodeUrl: student.profile?.leetcodeUrl || '',
    codechefUrl: student.profile?.codechefUrl || '',
    portfolioUrl: student.profile?.portfolioUrl || '',
    skills: (student.profile?.skills || []).map((s: any) => s.skill.name),
    skillObjects: (student.profile?.skills || []).map((s: any) => s.skill),
    isPublic: student.profile?.isPublic || false,
    video: introVideo ? {
      id: introVideo.id,
      status: introVideo.status,
      reviewNote: introVideo.reviewNote || null,
      isPublic: Boolean(introVideo.isPublic),
      submittedAt: introVideo.submittedAt,
      hasFile: Boolean(introVideo.driveFileId && introVideo.driveFileId.trim() !== ''),
    } : null,
    submission: submission ? {
      id: submission.id,
      status: submission.status,
      submittedAt: submission.submittedAt,
      videoUploaded: Boolean(submission.videoDriveId),
      reviewText: submission.reviewText || null,
      reviewPros: submission.reviewPros || [],
      reviewCons: submission.reviewCons || [],
      reviewedAt: submission.reviewedAt || null,
    } : null,
    changeRequests: student.changeRequests || []
  };
}
