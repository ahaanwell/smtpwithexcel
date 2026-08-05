const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const dotenv = require("dotenv");
const addLead = require("./googleSheet");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SMTP Transporter
const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 587,
  secure: false,
  family: 4, // Force IPv4
  auth: {
    user: "info@searchmyspace.in",
    pass: "Searchmyspace$#321",
  },
});

// Verify SMTP connection
transporter.verify((error, success) => {
    if (error) {
        console.error("SMTP Connection Failed:");
        console.error(error);
    } else {
        console.log("✅ SMTP Connected Successfully");
    }
});

// Health Check
app.get("/", (req, res) => {
    res.json({
        status: true,
        message: "SMTP Server is running 🚀"
    });
});

// Send Lead
app.post("/send-lead", async (req, res) => {

    try {

        const {
            name,
            email,
            number,
            country_code,
            project_name,
            company_email
        } = req.body;

        if (
            !name ||
            !email ||
            !number ||
            !project_name ||
            !company_email
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, Email, number, Project Name and Company Email are required."
            });
        }

        const fullPhone = country_code
            ? `${country_code} ${number}`
            : number;

        // Email to Company
        await transporter.sendMail({
            from: '"New Lead" <info@searchmyspace.in>',
            to: company_email,
            subject: `New Enquiry from ${project_name}`,
            html: `
                <h3>New Lead</h3>

                <p><strong>Name:</strong> ${name}</p>

                <p><strong>Email:</strong> ${email}</p>

                <p><strong>Phone:</strong> ${fullPhone}</p>

                <p><strong>Project:</strong> ${project_name}</p>
            `
        });

        // Email to Admin
        await transporter.sendMail({
            from: '"New Lead" <info@searchmyspace.in>',
            to: "livexcellence9@gmail.com",
            subject: `New Enquiry from ${project_name}`,
            html: `
                <h3>New Lead</h3>

                <p><strong>Name:</strong> ${name}</p>

                <p><strong>Phone:</strong> ${fullPhone}</p>

                <p><strong>Email:</strong> ${email}</p>

                <p><strong>Project:</strong> ${project_name}</p>
            `
        });

        // Google Sheet
        await addLead({
            name,
            email,
            number,
            country_code: country_code || "",
            project_name
        });

        return res.json({
            success: true,
            message: "Processing your request, we will notify you shortly."
        });

    } catch (error) {

        console.error("ERROR:");
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });

    }

});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
});