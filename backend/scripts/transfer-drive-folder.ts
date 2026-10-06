import { google, drive_v3 } from 'googleapis';
import readline from 'readline';
import path from 'path';
import dotenv from 'dotenv';
import { env } from '../src/config/env';

// Ensure .env is loaded
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function extractFolderId(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  const idMatch = trimmed.match(/^([a-zA-Z0-9_-]+)$/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }
  return trimmed;
}

const askQuestion = (query: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
};

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

  throw new Error('No valid Google Drive credentials (OAuth 2.0 or Service Account) found in environment.');
}

async function setViewerPermission(drive: any, fileOrFolderId: string) {
  try {
    await drive.permissions.create({
      fileId: fileOrFolderId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
        allowFileDiscovery: false,
      },
      supportsAllDrives: true,
      sendNotificationEmail: false,
    });
    console.log(`🔓 Public viewer permission set on target folder.`);
  } catch (err: any) {
    if (env.GOOGLE_SSO_HD) {
      try {
        await drive.permissions.create({
          fileId: fileOrFolderId,
          requestBody: {
            role: 'reader',
            type: 'domain',
            domain: env.GOOGLE_SSO_HD,
            allowFileDiscovery: false,
          },
          supportsAllDrives: true,
          sendNotificationEmail: false,
        });
        console.log(`🔓 Domain (${env.GOOGLE_SSO_HD}) viewer permission set on target folder.`);
      } catch (domainErr: any) {
        console.warn(`⚠️ Warning: Could not set viewer permissions:`, domainErr?.message || domainErr);
      }
    }
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('📁 ELITE Google Drive Folder Transfer Tool');
  console.log('======================================================\n');

  const autoConfirm = process.argv.includes('--yes') || process.argv.includes('-y');
  const positionalArgs = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));

  let targetInput = positionalArgs[0] || '';
  if (!targetInput) {
    targetInput = await askQuestion('👉 Enter NEW Google Drive folder ID (or URL): ');
  }

  const targetFolderId = extractFolderId(targetInput);
  if (!targetFolderId) {
    console.error('❌ Error: Target folder ID is required.');
    process.exit(1);
  }

  let sourceFolderId = positionalArgs[1]
    ? extractFolderId(positionalArgs[1])
    : env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  if (!sourceFolderId) {
    sourceFolderId = extractFolderId(await askQuestion('👉 Enter CURRENT (source) Google Drive folder ID: '));
  }

  if (!sourceFolderId) {
    console.error('❌ Error: Source folder ID is required.');
    process.exit(1);
  }

  if (sourceFolderId === targetFolderId) {
    console.error('❌ Error: Source and target folder IDs are identical.');
    process.exit(1);
  }

  console.log(`\nSource Folder ID : ${sourceFolderId}`);
  console.log(`Target Folder ID : ${targetFolderId}\n`);

  const drive = await getDriveClient();

  // Verify source folder
  console.log('🔍 Checking source folder access...');
  let sourceName = '';
  try {
    const srcRes = await drive.files.get({
      fileId: sourceFolderId,
      fields: 'id, name, mimeType',
      supportsAllDrives: true,
    });
    sourceName = srcRes.data.name || sourceFolderId;
    console.log(`✅ Source folder found: "${sourceName}" (${srcRes.data.id})`);
  } catch (err: any) {
    console.error(`❌ Failed to access source folder (${sourceFolderId}):`, err?.message || err);
    process.exit(1);
  }

  // Verify target folder
  console.log('🔍 Checking target folder access...');
  let targetName = '';
  try {
    const destRes = await drive.files.get({
      fileId: targetFolderId,
      fields: 'id, name, mimeType',
      supportsAllDrives: true,
    });
    targetName = destRes.data.name || targetFolderId;
    console.log(`✅ Target folder found: "${targetName}" (${destRes.data.id})`);
  } catch (err: any) {
    console.error(`❌ Failed to access target folder (${targetFolderId}):`, err?.message || err);
    process.exit(1);
  }

  // Fetch all direct children in source folder
  console.log(`\n📋 Listing contents in "${sourceName}"...`);
  const itemsToMove: Array<{ id: string; name: string; mimeType: string }> = [];
  let pageToken: string | undefined = undefined;

  do {
    const listRes: any = await drive.files.list({
      q: `'${sourceFolderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageToken,
    });

    if (listRes.data.files && listRes.data.files.length > 0) {
      for (const file of listRes.data.files) {
        if (file.id && file.name) {
          itemsToMove.push({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType || 'unknown',
          });
        }
      }
    }
    pageToken = listRes.data.nextPageToken || undefined;
  } while (pageToken);

  if (itemsToMove.length === 0) {
    console.log('ℹ️ No items found in the source folder to transfer.');
  } else {
    console.log(`\nFound ${itemsToMove.length} item(s) to transfer:`);
    itemsToMove.forEach((item, idx) => {
      const type = item.mimeType === 'application/vnd.google-apps.folder' ? '[FOLDER]' : '[FILE]  ';
      console.log(`  ${idx + 1}. ${type} ${item.name} (${item.id})`);
    });

    if (!autoConfirm) {
      const confirm = await askQuestion(`\n⚠️ Proceed to transfer ${itemsToMove.length} item(s) to "${targetName}"? (y/N): `);
      if (confirm.toLowerCase() !== 'y') {
        console.log('Transfer aborted by user.');
        process.exit(0);
      }
    }

    console.log('\n🚀 Transferring items...');
    let successCount = 0;
    let failCount = 0;

    for (const item of itemsToMove) {
      try {
        await drive.files.update({
          fileId: item.id,
          addParents: targetFolderId,
          removeParents: sourceFolderId,
          fields: 'id, name, parents',
          supportsAllDrives: true,
        });
        successCount++;
        console.log(`  ✅ Moved: ${item.name}`);
      } catch (err: any) {
        failCount++;
        console.error(`  ❌ Failed to move: ${item.name} (${err?.message || err})`);
      }
    }

    console.log(`\nTransfer summary: ${successCount} moved, ${failCount} failed.`);
  }

  // Set viewer permissions on target folder
  console.log('\n🔐 Setting viewer permissions on the new root folder...');
  await setViewerPermission(drive, targetFolderId);

  console.log('\n======================================================');
  console.log('🎉 Transfer Complete!');
  console.log('======================================================');
  console.log('Next steps:');
  console.log(`1. Update GOOGLE_DRIVE_ROOT_FOLDER_ID="${targetFolderId}" in your backend/.env`);
  console.log(`2. Update GOOGLE_DRIVE_ROOT_FOLDER_ID="${targetFolderId}" in Render environment settings.`);
  console.log('3. Restart backend service.\n');
}

main().catch((err) => {
  console.error('\n❌ Unexpected error during transfer:', err);
  process.exit(1);
});
