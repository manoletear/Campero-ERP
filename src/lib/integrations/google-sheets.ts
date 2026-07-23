// Google Sheets integration via Service Account
// Logs chatbot conversations to a spreadsheet
//
// Required env vars:
//   GOOGLE_SHEETS_SPREADSHEET_ID - The spreadsheet ID from the URL
//   GOOGLE_SERVICE_ACCOUNT_EMAIL - Service account email
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY - Private key (PEM format, with \n escaped)

interface SheetRow {
  sessionId: string;
  timestamp: string;
  userMessage: string;
  assistantResponse: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

// Create a JWT for Google API auth
async function createGoogleJWT(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !privateKeyRaw) {
    throw new Error('Google Service Account credentials not configured');
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  // Sign with RSA-SHA256 using Node.js crypto
  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(privateKey, 'base64url');

  const jwt = `${signingInput}.${signature}`;

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Google token error: ${err}`);
  }

  const { access_token } = await tokenRes.json();
  return access_token;
}

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }
  const token = await createGoogleJWT();
  cachedToken = { token, expiresAt: Date.now() + 50 * 60 * 1000 }; // 50 min
  return token;
}

export async function appendToGoogleSheet(row: SheetRow): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    console.warn('GOOGLE_SHEETS_SPREADSHEET_ID not set, skipping sheet logging');
    return;
  }

  const accessToken = await getAccessToken();
  const sheetName = 'ChatBot';
  const range = `${sheetName}!A:G`;

  const values = [
    [
      row.sessionId,
      row.timestamp,
      row.userMessage,
      row.assistantResponse,
      row.contactName,
      row.contactEmail,
      row.contactPhone,
    ],
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Sheets append error: ${err}`);
  }
}

// Initialize sheet with headers if empty
export async function ensureSheetHeaders(): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) return;

  const accessToken = await getAccessToken();
  const sheetName = 'ChatBot';

  // Check if headers exist
  const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${sheetName}!A1:G1`)}`;
  const checkRes = await fetch(checkUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!checkRes.ok) return;
  const data = await checkRes.json();

  if (!data.values || data.values.length === 0) {
    const headers = [
      ['Session ID', 'Timestamp', 'User Message', 'Assistant Response', 'Contact Name', 'Contact Email', 'Contact Phone'],
    ];

    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${sheetName}!A1:G1`)}?valueInputOption=RAW`;
    await fetch(writeUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: headers }),
    });
  }
}
