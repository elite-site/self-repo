import { google } from 'googleapis';
import http from 'http';
import url from 'url';
import readline from 'readline';
import dotenv from 'dotenv';
import path from 'path';

// Load .env if present
dotenv.config({ path: path.resolve(__dirname, '../.env') });

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

async function main() {
  console.log('\n======================================================');
  console.log('🔑 ELITE Photography Club — Google OAuth 2.0 Token Generator');
  console.log('======================================================\n');

  let clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
  let clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';

  if (!clientId) {
    clientId = await askQuestion('👉 Enter your Google OAuth Client ID: ');
  }
  if (!clientSecret) {
    clientSecret = await askQuestion('👉 Enter your Google OAuth Client Secret: ');
  }

  if (!clientId || !clientSecret) {
    console.error('❌ Error: Both Client ID and Client Secret are required.');
    process.exit(1);
  }

  const redirectUri = 'http://localhost:3000/oauth2callback';

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive'],
  });

  console.log('\n------------------------------------------------------');
  console.log('1. Open this URL in your browser and authorize with your @sasi.ac.in account:');
  console.log('------------------------------------------------------');
  console.log(`\n${authUrl}\n`);
  console.log('------------------------------------------------------');
  console.log('Waiting for authorization redirect on http://localhost:3000/oauth2callback ...');

  // Start local HTTP server to capture code
  const server = http.createServer(async (req, res) => {
    try {
      const reqUrl = url.parse(req.url || '', true);
      if (reqUrl.pathname === '/oauth2callback') {
        const code = reqUrl.query.code as string;
        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family:sans-serif;text-align:center;padding:50px;background:#090d16;color:#ffffff;">
                <h1 style="color:#22c55e;">✅ Authorization Successful!</h1>
                <p>You can close this tab and return to your terminal.</p>
              </body>
            </html>
          `);

          server.close();

          console.log('\n⏳ Exchanging authorization code for tokens...');
          const { tokens } = await oauth2Client.getToken(code);

          console.log('\n======================================================');
          console.log('🎉 GOOGLE OAUTH 2.0 REFRESH TOKEN GENERATED SUCCESSFULLY!');
          console.log('======================================================\n');
          console.log('Copy this Refresh Token value into your Render Web Service settings:\n');
          console.log('------------------------------------------------------');
          console.log(tokens.refresh_token);
          console.log('------------------------------------------------------\n');
          console.log('Required Environment Variables on Render:');
          console.log(`- GOOGLE_OAUTH_CLIENT_ID     = ${clientId}`);
          console.log(`- GOOGLE_OAUTH_CLIENT_SECRET = <YOUR_CLIENT_SECRET>`);
          console.log(`- GOOGLE_OAUTH_REFRESH_TOKEN = ${tokens.refresh_token}`);
          console.log(`- GOOGLE_DRIVE_ROOT_FOLDER_ID= <YOUR_MY_DRIVE_FOLDER_ID>\n`);
          process.exit(0);
        }
      }
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error retrieving tokens');
      console.error('Error handling oauth callback:', err);
      process.exit(1);
    }
  });

  server.listen(3000);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
