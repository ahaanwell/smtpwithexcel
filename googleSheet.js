require("dotenv").config();
const crypto = require("crypto");
const { google } = require("googleapis");

function isValidKey(key) {
  try {
    crypto.createPrivateKey(key);
    return true;
  } catch {
    return false;
  }
}

function loadCredentials() {
  if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    try {
      const json = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, "base64").toString("utf8");
      const parsed = JSON.parse(json);
      // Normalize escaped "\n" sequences in case the JSON was double-escaped before encoding
      const private_key = (parsed.private_key || "").replace(/\\n/g, "\n");
      if (isValidKey(private_key)) {
        return { client_email: parsed.client_email, private_key };
      }
      console.error("GOOGLE_CREDENTIALS_BASE64 private key is corrupted, falling back to GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY");
    } catch (err) {
      console.error("GOOGLE_CREDENTIALS_BASE64 could not be parsed, falling back:", err.message);
    }
  }
  return {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  };
}

const credentials = loadCredentials();

console.log(
  "Google Sheets auth env check -",
  "mode:", process.env.GOOGLE_CREDENTIALS_BASE64 ? "base64" : "split-vars",
  "| client_email:", credentials.client_email ? "present" : "MISSING",
  "| private_key:", isValidKey(credentials.private_key) ? "valid" : "MISSING/INVALID"
);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const spreadsheetId = "1zD8cj5BupUUUMofLoY07Me9kK59F67ZtLj5l20g9qwQ";

// Create the Sheets client once and reuse it for every lead
let sheetsPromise;
function getSheets() {
  if (!sheetsPromise) {
    sheetsPromise = auth.getClient()
      .then((client) => google.sheets({ version: "v4", auth: client }))
      .catch((err) => { sheetsPromise = null; throw err; });
  }
  return sheetsPromise;
}

// Warm up auth at startup so the first lead isn't slow
getSheets().catch((err) => console.error("Google Sheets auth warm-up failed:", err.message));

async function addLead(data) {
  const sheets = await getSheets();

  const now = new Date();

  const date = now.toLocaleDateString("en-IN");
  const time = now.toLocaleTimeString("en-IN");

  // Make country code text safe
  const countryCode = data.country_code ? `'${data.country_code}` : "";

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Sheet1!A:G",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        data.name,
        data.email,
        countryCode,
        data.number,
        data.project_name,
        date,
        time
      ]]
    }
  });
}

module.exports = addLead;