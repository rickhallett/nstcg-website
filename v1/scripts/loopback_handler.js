import http from 'http';
import url from 'url';
import { exec } from 'child_process';

async function getOAuthToken(authUrl, port = 3000) {
  return new Promise((resolve, reject) => {
    // Create a local server to handle the callback
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url, true);

      if (parsedUrl.pathname === '/') {
        const { code, error } = parsedUrl.query;

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization Error</h1><p>You can close this window.</p>');
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization Successful!</h1><p>You can close this window.</p>');
          server.close();
          resolve(code);
          return;
        }

        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>No authorization code received</h1><p>You can close this window.</p>');
        server.close();
        reject(new Error('No authorization code received'));
      }
    });

    server.listen(port, 'localhost', () => {
      console.log(`Listening for OAuth callback on http://localhost:${port}`);

      // Open the auth URL in the default browser
      const platform = process.platform;
      const command = platform === 'win32' ? 'start' : platform === 'darwin' ? 'open' : 'xdg-open';
      exec(`${command} "${authUrl}"`);
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}

// Example usage
async function main() {
  try {
    // Build your OAuth URL with redirect_uri from environment
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000';
    const authUrl = `https://accounts.google.com/oauth2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=https://www.googleapis.com/auth/gmail.send&response_type=code`;

    console.log('Starting OAuth flow...');
    const authCode = await getOAuthToken(authUrl);

    console.log('Authorization code received:', authCode);

    // Now exchange the code for tokens
    // You would typically make a POST request to the token endpoint here
    const tokens = await exchangeCodeForTokens(authCode, process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri);

    console.log('Tokens:', tokens);

    return tokens; // or return tokens

  } catch (error) {
    console.error('OAuth flow failed:', error.message);
    throw error;
  }
}

// For exchanging the code for actual tokens
async function exchangeCodeForTokens(code, clientId, clientSecret, redirectUri = 'http://localhost:3000') {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
  }

  return await tokenResponse.json();
}

export { getOAuthToken, exchangeCodeForTokens };

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}