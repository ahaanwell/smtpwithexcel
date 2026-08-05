require("dotenv").config();
const { google } = require("googleapis");

function loadCredentials() {
  if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    const json = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, "base64").toString("utf8");
    const parsed = JSON.parse(json);
    return { client_email: parsed.client_email, private_key: parsed.private_key };
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
  "| private_key:", credentials.private_key && credentials.private_key.includes("BEGIN PRIVATE KEY") ? "valid PEM" : "MISSING/INVALID"
);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const spreadsheetId = "1zD8cj5BupUUUMofLoY07Me9kK59F67ZtLj5l20g9qwQ";
// const spreadsheetId = "16fxTIPwYVZS2mrqKmEkfGPdqlawE186shhNiIpBUMXY";

async function addLead(data) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

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