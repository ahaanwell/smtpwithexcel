const express = require("express");
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

// Health Check
app.get("/", (req, res) => {
    res.json({
        status: true,
        message: "Lead Server is running 🚀"
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