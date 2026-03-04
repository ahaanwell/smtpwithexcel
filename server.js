const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");
const addLead = require("./googleSheet");

const app = express();

const corsOptions = {
    origin: "*",
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};

app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(bodyParser.json());

const transporter = nodemailer.createTransport({
  host: "server.mpi.ktv.mybluehostin.me",
  port: 465,
  secure: true,
  auth: {
    user: "info@sumadhurafolium.co",
    pass: "City@12345#",
  },
});

app.post("/send-lead", async (req, res) => {
  try {
    const { name, email, phone, country_code, project_name, company_email } = req.body;

    // Required field validation
    if (!name || !email || !phone || !project_name || !company_email) {
      return res.status(400).json({
        success: false,
        message: "Name, Email, Phone, Project Name and Company Email are required."
      });
    }

    const fullPhone = country_code ? `${country_code} ${phone}` : phone;

    const mailOptions = {
      from: `<m2ndigitalagency@gmail.com>`,
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

    await transporter.sendMail(mailOptions);

    await addLead({
      name,
      email,
      phone,
      country_code: country_code || "",
      project_name
    });

    res.json({
      success: true,
      message: "Processing your request, we will notify you shortly."
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});