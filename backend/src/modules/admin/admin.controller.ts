import { Request, Response } from 'express';
import { driveService } from '../../services/drive.service';
import { resolveContentRange } from '../../utils/rangeParser';
import { AppError } from '../../utils/appError';
import {
  AcademicYearPromotionError,
  promoteAcademicYear as runAcademicYearPromotion,
} from '../../services/academicYear.service';
import * as adminService from './admin.service';

// --- Submissions Controllers ---

export async function listSubmissions(req: Request, res: Response): Promise<void> {
  try {
    const result = await adminService.listSubmissions(req.query as any);
    res.json(result);
  } catch (err: any) {
    console.error('Error fetching submissions list:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_SUBMISSIONS', message: err.message || 'Server error' });
  }
}

export async function getSubmissionDetail(req: Request, res: Response): Promise<void> {
  try {
    const result = await adminService.getSubmissionDetail(req.params.id);
    if (!result) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Submission not found' });
      return;
    }
    res.json(result);
  } catch (err: any) {
    console.error('Error fetching submission detail:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_SUBMISSION', message: err.message || 'Server error' });
  }
}

export async function streamMedia(req: Request, res: Response): Promise<void> {
  try {
    const { id, fileKey } = req.params;
    const { driveFileId, driveFolderPath } = await adminService.getMediaStreamInfo(id, fileKey);

    const etag = `"${driveFileId}"`;
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    const rangeHeader = req.headers.range;
    const { stream, mimeType, size, contentRange } = await driveService.streamDriveFile(
      driveFileId,
      driveFolderPath,
      rangeHeader
    );

    let responseMimeType = mimeType;
    if (!responseMimeType || responseMimeType === 'application/octet-stream') {
      responseMimeType = 'video/mp4';
    }
    res.setHeader('Content-Type', responseMimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('ETag', etag);

    const range = resolveContentRange(contentRange, rangeHeader, size);

    if (range) {
      res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${range.total}`);
      res.setHeader('Content-Length', String(range.end - range.start + 1));
      res.status(206);
    } else if (rangeHeader && size !== undefined) {
      if (typeof (stream as any).destroy === 'function') {
        (stream as any).destroy();
      }
      res.setHeader('Content-Range', `bytes */${size}`);
      res.status(416).end();
      return;
    } else if (size !== undefined) {
      res.setHeader('Content-Length', String(size));
      res.status(200);
    } else {
      res.status(200);
    }

    res.on('close', () => {
      if (!res.writableFinished && typeof (stream as any).destroy === 'function') {
        (stream as any).destroy();
      }
    });

    stream.on('error', (err: any) => {
      console.error('Admin video stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'STREAM_ERROR', message: 'Video stream interrupted' });
      } else {
        res.end();
      }
    });

    stream.pipe(res);
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Error proxying media:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'MEDIA_STREAM_ERROR', message: err.message || 'Stream error' });
    }
  }
}

export async function updateRating(req: Request, res: Response): Promise<void> {
  try {
    const updated = await adminService.updateRating(req.params.id, req.body.rating);
    res.json({ success: true, submission: updated });
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Error updating rating:', err);
    res.status(500).json({ error: 'FAILED_TO_UPDATE_RATING', message: err.message || 'Server error' });
  }
}

export async function updateReview(req: Request, res: Response): Promise<void> {
  try {
    const { reviewText, pros, cons } = req.body;
    const updated = await adminService.updateReview(
      req.params.id,
      reviewText,
      pros,
      cons,
      req.adminUser?.username
    );
    res.json({ success: true, submission: updated });
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Error updating review:', err);
    res.status(500).json({ error: 'FAILED_TO_UPDATE_REVIEW', message: err.message || 'Server error' });
  }
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  try {
    const updated = await adminService.updateStatus(req.params.id, req.body.status);
    res.json({ success: true, submission: updated });
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Error updating status:', err);
    res.status(500).json({ error: 'FAILED_TO_UPDATE_STATUS', message: err.message || 'Server error' });
  }
}

export async function requestNewVideo(req: Request, res: Response): Promise<void> {
  try {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : null;
    const result = await adminService.requestNewVideo(req.params.id, reason);
    res.json(result);
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Error requesting new video:', err);
    res.status(500).json({ error: 'REQUEST_VIDEO_FAILED', message: err.message || 'Server error' });
  }
}

export async function deleteSubmissionVideo(req: Request, res: Response): Promise<void> {
  try {
    const updated = await adminService.deleteSubmissionVideo(req.params.id);
    res.json({
      success: true,
      message: 'Introduction video deleted. The student has been notified to upload a replacement.',
      submission: updated,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Error deleting video:', err);
    res.status(500).json({ error: 'VIDEO_DELETE_FAILED', message: err.message || 'Server error' });
  }
}

export async function exportSubmissions(req: Request, res: Response): Promise<void> {
  try {
    const eventId = ((req.query.eventId as string) || adminService.ACTIVE_EVENT_ID).trim();
    const { workbook, filename } = await adminService.exportSubmissionsWorkbook(eventId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('Error exporting Excel report:', err);
    res.status(500).json({ error: 'EXCEL_EXPORT_FAILED', message: err.message || 'Server error' });
  }
}

export async function deleteSubmission(req: Request, res: Response): Promise<void> {
  try {
    const result = await adminService.deleteSubmission(req.params.id);
    res.json(result);
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Error deleting submission:', err);
    res.status(500).json({ error: 'DELETE_FAILED', message: err.message || 'Server error' });
  }
}

// --- Student Roster Controllers ---

export async function getRoster(req: Request, res: Response): Promise<void> {
  try {
    const result = await adminService.getStudentRoster(req.query as any);
    res.json(result);
  } catch (err: any) {
    console.error('Error fetching student roster:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_STUDENTS', message: err.message || 'Server error' });
  }
}

export async function exportRoster(req: Request, res: Response): Promise<void> {
  try {
    const eventId = ((req.query.eventId as string) || adminService.ACTIVE_EVENT_ID).trim();
    const { workbook, filename } = await adminService.exportRosterWorkbook(eventId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('Error exporting student roster:', err);
    res.status(500).json({ error: 'STUDENTS_EXPORT_FAILED', message: err.message || 'Server error' });
  }
}

export async function getPortalStudents(req: Request, res: Response): Promise<void> {
  try {
    const result = await adminService.getPortalStudents(req.query as any);
    res.json(result);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function getPortalStudentDetail(req: Request, res: Response): Promise<void> {
  try {
    const result = await adminService.getPortalStudentDetail(req.params.id);
    res.json(result);
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function requestItemChange(req: Request, res: Response): Promise<void> {
  try {
    const { studentId, type, itemId } = req.params;
    const { note } = req.body;
    const reasonText = (note || '').trim();
    const reviewerName = req.adminUser?.username || 'Admin';

    const result = await adminService.requestItemChange(
      studentId,
      type,
      itemId,
      reasonText,
      reviewerName,
      req.adminUser?.email
    );
    res.json(result);
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function deleteStudentItem(req: Request, res: Response): Promise<void> {
  try {
    const { studentId, type, itemId } = req.params;
    const reasonText = (req.body?.reason || (req.query as any)?.reason || '').trim();

    const result = await adminService.deleteStudentItem(
      studentId,
      type,
      itemId,
      reasonText,
      req.adminUser?.email
    );
    res.json(result);
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function updateStudentProfileStatus(req: Request, res: Response): Promise<void> {
  try {
    const { isPublic } = req.body;
    const profile = await adminService.saveSetting(req.params.id, isPublic);
    res.json({ success: true, profile });
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function toggleStudentFeature(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, message: 'Student feature status toggled' });
}

// --- Voting Campaigns Controllers ---

export async function listVotingCampaigns(_req: Request, res: Response): Promise<void> {
  try {
    const campaigns = await adminService.listVotingCampaigns();
    res.json(campaigns);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function createVotingCampaign(req: Request, res: Response): Promise<void> {
  try {
    const campaign = await adminService.createVotingCampaign(req.body);
    res.status(201).json(campaign);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function getVotingCampaign(req: Request, res: Response): Promise<void> {
  try {
    const campaign = await adminService.getVotingCampaign(req.params.id);
    res.json(campaign);
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function updateVotingCampaign(req: Request, res: Response): Promise<void> {
  try {
    const campaign = await adminService.updateVotingCampaign(req.params.id, req.body);
    res.json(campaign);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function deleteVotingCampaign(req: Request, res: Response): Promise<void> {
  try {
    await adminService.deleteVotingCampaign(req.params.id);
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function addVotingCandidate(req: Request, res: Response): Promise<void> {
  try {
    const { studentId, projectId } = req.body;
    const candidate = await adminService.addVotingCandidate(req.params.id, studentId, projectId);
    res.status(201).json(candidate);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function removeVotingCandidate(req: Request, res: Response): Promise<void> {
  try {
    await adminService.removeVotingCandidate(req.params.candidateId);
    res.json({ success: true, message: 'Candidate removed' });
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

// --- Settings & Roles Controllers ---

export async function getSettings(_req: Request, res: Response): Promise<void> {
  try {
    const settings = await adminService.getSettings();
    res.json(settings);
  } catch (err: any) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Server error' });
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const { key, value, group } = req.body;
    await adminService.saveSetting(key, value, group);
    res.json({ message: 'Success' });
  } catch (err: any) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Server error' });
  }
}

export async function getPortalSettings(_req: Request, res: Response): Promise<void> {
  try {
    const result = await adminService.getPortalSettings();
    res.json(result);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function updatePortalSettings(req: Request, res: Response): Promise<void> {
  try {
    await adminService.savePortalSettings(req.body, req.adminUser?.username);
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function listSkills(_req: Request, res: Response): Promise<void> {
  try {
    const skills = await adminService.listSkills();
    res.json(skills);
  } catch (err: any) {
    console.error('Error listing skills:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Server error' });
  }
}

export async function createSkill(req: Request, res: Response): Promise<void> {
  try {
    const { name, category } = req.body;
    const skill = await adminService.createSkill(name, category);
    res.status(201).json(skill);
  } catch (err: any) {
    console.error('Error creating skill:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Server error' });
  }
}

export async function deleteSkill(req: Request, res: Response): Promise<void> {
  try {
    await adminService.deleteSkill(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    console.error('Error deleting skill:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Server error' });
  }
}

export async function listRoles(_req: Request, res: Response): Promise<void> {
  try {
    const roles = await adminService.listRoles();
    res.json(roles);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function createRole(req: Request, res: Response): Promise<void> {
  try {
    const { name, description } = req.body;
    const role = await adminService.createRole(name, description);
    res.status(201).json(role);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function updateRole(req: Request, res: Response): Promise<void> {
  try {
    const { description } = req.body;
    const role = await adminService.updateRole(req.params.id, description);
    res.json(role);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function deleteRole(req: Request, res: Response): Promise<void> {
  try {
    await adminService.deleteRole(req.params.id);
    res.json({ success: true, message: 'Role deleted' });
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function listPermissions(req: Request, res: Response): Promise<void> {
  try {
    const permissions = await adminService.listPermissions(req.params.id);
    res.json(permissions);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function listAdmins(_req: Request, res: Response): Promise<void> {
  try {
    const admins = await adminService.listAdmins();
    res.json(admins);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function createAdmin(req: Request, res: Response): Promise<void> {
  try {
    const admin = await adminService.createAdmin(req.body);
    res.status(201).json(admin);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function updateAdmin(req: Request, res: Response): Promise<void> {
  try {
    const admin = await adminService.updateAdmin(req.params.id, req.body);
    res.json(admin);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function deleteAdmin(req: Request, res: Response): Promise<void> {
  try {
    await adminService.deleteAdmin(req.params.id);
    res.json({ success: true, message: 'Admin user deleted' });
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

// --- Announcements Controllers ---

export async function listPortalAnnouncements(_req: Request, res: Response): Promise<void> {
  try {
    const announcements = await adminService.listPortalAnnouncements();
    res.json(announcements);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function createPortalAnnouncement(req: Request, res: Response): Promise<void> {
  try {
    const announcement = await adminService.createPortalAnnouncement(req.body, req.adminUser?.username);
    res.status(201).json(announcement);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function publishPortalAnnouncement(req: Request, res: Response): Promise<void> {
  try {
    const announcement = await adminService.publishPortalAnnouncement(req.params.id);
    res.json(announcement);
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

// --- Stats & Storage Controllers ---

export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const eventId = ((req.query.eventId as string) || adminService.ACTIVE_EVENT_ID).trim();
    const { data, cached } = await adminService.getAdminStats(eventId);

    if (cached) {
      res.setHeader('Cache-Control', 'private, max-age=15, must-revalidate');
    }
    res.json(data);
  } catch (err: any) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_STATS', message: err.message || 'Server error' });
  }
}

export async function getActivityLogs(req: Request, res: Response): Promise<void> {
  try {
    const result = await adminService.getActivityLogs(req.query as any);
    res.json(result);
  } catch (err: any) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_ACTIVITY_LOGS', message: err.message || 'Server error' });
  }
}

export async function exportActivityLogs(_req: Request, res: Response): Promise<void> {
  try {
    const workbook = await adminService.exportActivityLogsWorkbook();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=activity-logs-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('Error exporting activity logs:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Server error' });
  }
}

export async function getPortalAnalytics(_req: Request, res: Response): Promise<void> {
  try {
    const analytics = await adminService.getPortalAnalytics();
    res.json(analytics);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function getStorage(_req: Request, res: Response): Promise<void> {
  try {
    const storage = await adminService.getStorageInfo();
    res.json(storage);
  } catch (err: any) {
    console.error('Error fetching storage:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Server error' });
  }
}

export async function clearStorageCache(_req: Request, res: Response): Promise<void> {
  try {
    await adminService.clearStorageCache();
    res.json({ success: true, message: 'Drive folder cache purged successfully.' });
  } catch (err: any) {
    console.error('Error clearing storage cache:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Server error' });
  }
}

// --- Academic Year Controller ---

export async function promoteAcademicYear(req: Request, res: Response): Promise<void> {
  try {
    const adminEmail = req.adminUser?.email || req.adminUser?.username || 'ADMIN';
    const result = await runAcademicYearPromotion({
      adminEmail,
      force: req.body?.force === true,
      academicYear: req.body?.academicYear,
    });
    res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof AcademicYearPromotionError) {
      if (err.code === 'NO_ACTIVE_STUDENTS') {
        res.status(409).json({
          error: 'NO_ACTIVE_STUDENTS',
          message: 'No active students to promote.',
        });
        return;
      }
      res.status(409).json({
        error: 'ALREADY_PROMOTED',
        message: `Already promoted for academic year ${err.targetYear} — run again anyway?`,
        alreadyPromoted: true,
      });
      return;
    }
    console.error('Error promoting academic year:', err);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Internal server error',
    });
  }
}
