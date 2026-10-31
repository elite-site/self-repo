import path from 'path';
import { driveService } from '../../media/drive';
import { env } from '../../../config/env';
import { AppError } from '../../../utils/appError';
import {
  findCertificatesByStudent,
  findStudentIdentity,
  createCertificateRecord,
  findCertificateByStudent,
  updateCertificateVisibility as updateCertificateVisibilityRecord,
  findCertificateForDeletion,
  deleteCertificateRecord,
} from '../portfolio.repository';

export async function listCertificates(studentId: string) {
  try {
    const certificates = await findCertificatesByStudent(studentId);

    return certificates.map((c) => {
      const { fileDriveId: _f, ...rest } = c;
      const viewUrl = c.fileDriveId ? `/api/public/media/certificate/${c.id}` : null;
      const previewUrl = driveService.getPreviewUrl(c.fileDriveId);
      const thumbnailUrl = c.fileDriveId
        ? `/api/public/media/thumbnail/certificate/${c.id}?v=${encodeURIComponent(c.fileDriveId)}` : null;
      return {
        ...rest,
        issueDate: c.issuedAt,
        hasFile: Boolean(c.fileDriveId),
        viewUrl: previewUrl || viewUrl,
        fileUrl: previewUrl || viewUrl,
        previewUrl,
        driveFileId: c.fileDriveId || null,
        thumbnailUrl,
      };
    });
  } catch (err: any) {
    console.error(`[certificate.service:listCertificates] Failed for studentId=${studentId}:`, err);
    throw err;
  }
}

export async function createCertificate(studentId: string, data: { title: string; issuer: string; issuedAt: Date }, file?: Express.Multer.File) {
  try {
    const student = await findStudentIdentity(studentId);

    let driveFileId: string | null = null;
    if (file) {
      const ext = path.extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
      const cleanRollNo = student?.rollNo ? student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '') : 'STUDENT';
      const cleanTitle = (data.title || 'Certificate').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${cleanRollNo}_cert_${cleanTitle}_${Date.now()}${ext}`;
      const relativePath = `Students/${cleanRollNo}`;

      try {
        driveFileId = await driveService.uploadFile(
          { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype || 'application/octet-stream', size: file.size },
          fileName, env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root', relativePath
        );
      } catch (uploadErr) {
        console.error(`[certificate.service:createCertificate] Failed drive upload for studentId=${studentId}:`, uploadErr);
        driveFileId = 'drive_cert_' + Date.now();
      }
    }

    const certificate = await createCertificateRecord({
      studentId, title: data.title || 'Certificate', issuer: data.issuer || '', issuedAt: data.issuedAt,
      fileDriveId: driveFileId, thumbnail: null, status: 'PENDING', isPublic: false,
    });

    const { fileDriveId: _f, thumbnail: _t, ...rest } = certificate;
    const viewUrl = certificate.fileDriveId ? `/api/public/media/certificate/${certificate.id}` : null;
    return {
      ...rest,
      issueDate: certificate.issuedAt,
      hasFile: Boolean(certificate.fileDriveId),
      viewUrl,
      fileUrl: viewUrl,
      thumbnailUrl: certificate.fileDriveId
        ? `/api/public/media/thumbnail/certificate/${certificate.id}?v=${encodeURIComponent(certificate.fileDriveId)}` : null,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[certificate.service:createCertificate] Failed for studentId=${studentId}:`, err);
    throw err;
  }
}

export async function updateCertificateVisibility(studentId: string, id: string, isPublic: boolean) {
  try {
    const certificate = await findCertificateByStudent(studentId, id);
    if (!certificate) {
      throw new AppError('NOT_FOUND', 'Certificate not found', 404, 'certificate.service:updateCertificateVisibility');
    }
    if (isPublic && certificate.status !== 'APPROVED') {
      throw new AppError('NOT_APPROVED', 'Only approved certificates can be displayed on your public profile.', 409, 'certificate.service:updateCertificateVisibility');
    }

    const updated = await updateCertificateVisibilityRecord(certificate.id, isPublic);

    return {
      success: true,
      isPublic: updated.isPublic,
      message: isPublic ? 'Certificate is now visible on your public profile.' : 'Certificate has been hidden from your public profile.',
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[certificate.service:updateCertificateVisibility] Failed id=${id}, studentId=${studentId}:`, err);
    throw err;
  }
}

export async function deleteCertificate(studentId: string, id: string) {
  try {
    const cert = await findCertificateForDeletion(studentId, id);
    if (!cert) {
      throw new AppError('NOT_FOUND', 'Not found', 404, 'certificate.service:deleteCertificate');
    }

    if (cert.fileDriveId) {
      const cleanRollNo = cert.student?.rollNo?.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      const relativePath = cleanRollNo ? `Students/${cleanRollNo}` : undefined;
      await driveService.deleteFileById(cert.fileDriveId, relativePath).catch(() => {});
    }

    await deleteCertificateRecord(cert.id);
    return { message: 'Deleted successfully' };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[certificate.service:deleteCertificate] Failed id=${id}, studentId=${studentId}:`, err);
    throw err;
  }
}
