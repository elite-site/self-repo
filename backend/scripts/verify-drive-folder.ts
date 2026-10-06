import { google, drive_v3 } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const NEW_ROOT_ID = '1w_OBoyHwflrrvSg_6xAQtU4rhhxVjoNe';

async function getDriveClient(): Promise<drive_v3.Drive> {
  if (
    env.GOOGLE_OAUTH_CLIENT_ID &&
    env.GOOGLE_OAUTH_CLIENT_SECRET &&
    env.GOOGLE_OAUTH_REFRESH_TOKEN
  ) {
    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_OAUTH_CLIENT_ID,
      env.GOOGLE_OAUTH_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN,
    });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  if (env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    return google.drive({ version: 'v3', auth });
  }

  throw new Error('No valid Google Drive credentials found in environment.');
}

async function verify() {
  console.log('\n======================================================');
  console.log('🔍 Verifying Google Drive Structure & Files');
  console.log('======================================================\n');

  const drive = await getDriveClient();

  // 1. Verify New Root Folder
  console.log(`Checking new root folder (${NEW_ROOT_ID})...`);
  const rootRes = await drive.files.get({
    fileId: NEW_ROOT_ID,
    fields: 'id, name, trashed',
    supportsAllDrives: true,
  });
  console.log(`✅ Root Folder: "${rootRes.data.name}" (trashed: ${rootRes.data.trashed || false})`);

  // 2. Check direct children in New Root Folder
  const rootChildren: any = await drive.files.list({
    q: `'${NEW_ROOT_ID}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const children = rootChildren.data.files || [];
  console.log(`✅ Found ${children.length} item(s) directly under root folder:`);
  children.forEach((c: any) => {
    console.log(`   - [${c.mimeType.includes('folder') ? 'FOLDER' : 'FILE'}] ${c.name} (${c.id})`);
  });

  // 3. Verify DriveFolderCache entries
  console.log('\nVerifying cached folders in database against Google Drive...');
  const cachedFolders = await prisma.driveFolderCache.findMany();
  let validFolders = 0;
  let missingFolders = 0;

  for (const item of cachedFolders) {
    try {
      const res = await drive.files.get({
        fileId: item.driveFolderId,
        fields: 'id, name, trashed',
        supportsAllDrives: true,
      });
      if (res.data.trashed) {
        missingFolders++;
      } else {
        validFolders++;
      }
    } catch {
      missingFolders++;
    }
  }
  console.log(`✅ Cached folders check: ${validFolders} active & accessible, ${missingFolders} missing.`);

  // 4. Verify DB Files (Submissions, Profiles, Resumes, Proofs)
  console.log('\nVerifying database file references against Google Drive...');
  const fileIds = new Set<string>();

  const submissions = await prisma.submission.findMany({
    select: { photo1DriveId: true, photo2DriveId: true, photo3DriveId: true, videoDriveId: true, audioDriveId: true },
  });
  for (const s of submissions) {
    if (s.photo1DriveId) fileIds.add(s.photo1DriveId);
    if (s.photo2DriveId) fileIds.add(s.photo2DriveId);
    if (s.photo3DriveId) fileIds.add(s.photo3DriveId);
    if (s.videoDriveId) fileIds.add(s.videoDriveId);
    if (s.audioDriveId) fileIds.add(s.audioDriveId);
  }

  const profiles = await prisma.studentProfile.findMany({
    where: { photoDriveId: { not: null } },
    select: { photoDriveId: true },
  });
  profiles.forEach(p => { if (p.photoDriveId) fileIds.add(p.photoDriveId); });

  const resumes = await prisma.resume.findMany({
    where: { driveFileId: { not: null } },
    select: { driveFileId: true },
  });
  resumes.forEach(r => { if (r.driveFileId) fileIds.add(r.driveFileId); });

  const certs = await prisma.certificate.findMany({
    where: { fileDriveId: { not: null } },
    select: { fileDriveId: true },
  });
  certs.forEach(c => { if (c.fileDriveId) fileIds.add(c.fileDriveId); });

  const achievements = await prisma.achievement.findMany({
    where: { proofDriveId: { not: null } },
    select: { proofDriveId: true },
  });
  achievements.forEach(a => { if (a.proofDriveId) fileIds.add(a.proofDriveId); });

  const introVideos = await prisma.introVideo.findMany({
    where: { driveFileId: { not: null } },
    select: { driveFileId: true },
  });
  introVideos.forEach(v => { if (v.driveFileId) fileIds.add(v.driveFileId); });

  console.log(`Total unique files referenced in database: ${fileIds.size}`);
  let verifiedFiles = 0;
  let missingFiles = 0;

  for (const id of fileIds) {
    try {
      const res = await drive.files.get({
        fileId: id,
        fields: 'id, trashed',
        supportsAllDrives: true,
      });
      if (res.data.trashed) {
        missingFiles++;
      } else {
        verifiedFiles++;
      }
    } catch {
      missingFiles++;
    }
  }

  console.log(`✅ File verification: ${verifiedFiles} files confirmed active on Drive, ${missingFiles} missing.`);

  console.log('\n======================================================');
  if (missingFolders === 0 && missingFiles === 0) {
    console.log('🎉 All folders and files match and are fully intact in order!');
  } else {
    console.log('⚠️ Verification finished with some missing items. See counts above.');
  }
  console.log('======================================================\n');

  await prisma.$disconnect();
}

verify().catch(async (err) => {
  console.error('❌ Verification failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
