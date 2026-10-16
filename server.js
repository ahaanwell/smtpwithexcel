const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");
const addLead = require("./googleSheet");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const corsOptions = {
    origin: "*",
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};

app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// app.use(bodyParser.json());

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 587,
  secure: false,
  // Reuse SMTP connections instead of a fresh TLS handshake + login per email
  pool: true,
  maxConnections: 3,
  // Fail fast instead of hanging for minutes on a stuck connection
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error("SMTP_USER / SMTP_PASS env vars are MISSING - emails will fail");
}

app.get("/", (req, res) => {
    res.status(200).json({
        message: "SMTP server is running 🚀"
    })
})

// Since the client no longer waits for the email, retry a few times and log failures
async function sendWithRetry(mailOptions, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${mailOptions.to}`);
      return;
    } catch (err) {
      console.error(`Email to ${mailOptions.to} failed (attempt ${i}/${attempts}):`, err.message);
      if (i < attempts) await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  console.error(`Email to ${mailOptions.to} permanently failed. Subject: ${mailOptions.subject}`);
}

app.post("/send-lead", async (req, res) => {
  try {
    const { name, email, number, country_code, project_name, company_email } = req.body;

    // Required field validation
    if (!name || !email || !number || !project_name || !company_email) {
      return res.status(400).json({
        success: false,
        message: "Name, Email, number, Project Name and Company Email are required."
      });
    }

    const fullPhone = country_code ? `${country_code} ${number}` : number;

    const mailOptions = {
      from: `"New Lead" <info@searchmyspace.in>`,
      to: company_email,
      subject: `New Enquiry from ${project_name}`,
      html: `
        <h3>New Lead</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${fullPhone}</p>
        <p><b>Project:</b> ${project_name}</p>
      `,
    };

    const mailOptions1 = {
      from: `"New Lead" <info@searchmyspace.in>`,
      to: "davidmalan.sam@gmail.com",
      subject: `New Enquiry from ${project_name}`,
      html: `
        <h3>New Lead</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Phone:</b> ${fullPhone}</p>
      `,
    };

    // Respond immediately; emails and sheet logging run in the background
    res.json({
      success: true,
      message: "Processing your request, we will notify you shortly."
    });

    sendWithRetry(mailOptions);
    sendWithRetry(mailOptions1);

    addLead({
      name,
      email,
      number,
      country_code: country_code || "",
      project_name
    }).catch((sheetError) => {
      console.error("Google Sheet logging failed:");
      console.error(sheetError);
    });

  } catch (error) {

  res.status(500).json({
    success: false,
    message: error.message
  });
}
});

// Warm up the SMTP connection at startup so the first lead isn't slow
transporter.verify()
  .then(() => console.log("SMTP connection ready"))
  .catch((err) => console.error("SMTP verify failed:", err.message));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});