const nodemailer = require("nodemailer");
require("dotenv").config();

// Initialize transporter
let transporter;

// Create function to initialize the transporter
const initializeTransporter = async () => {
  if (
    process.env.EMAIL_HOST &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS
  ) {
    // Production configuration
    console.log("🔧 Initializing email transporter with:");
    console.log(`   Host: ${process.env.EMAIL_HOST}`);
    console.log(`   Port: ${process.env.EMAIL_PORT || 587}`);
    console.log(`   User: ${process.env.EMAIL_USER}`);
    console.log(
      `   Pass: ${process.env.EMAIL_PASS ? "[CONFIGURED]" : "[MISSING]"}`
    );

    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Test the connection
    try {
      await transporter.verify();
      console.log("✅ Email transporter verified successfully!");
    } catch (error) {
      console.error("❌ Email transporter verification failed:", error.message);
      throw error;
    }

    console.log(
      `📧 Email transporter configured with host: ${process.env.EMAIL_HOST}`
    );
  } else {
    // Development: Ethereal test account
    console.log("⚠️ No email credentials found, using Ethereal for testing");
    console.log("Missing variables:", {
      EMAIL_HOST: !!process.env.EMAIL_HOST,
      EMAIL_USER: !!process.env.EMAIL_USER,
      EMAIL_PASS: !!process.env.EMAIL_PASS,
    });
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`📧 Email test account created: ${testAccount.user}`);
      console.log(
        `🔧 SMTP host: ${testAccount.smtp.host}, port: ${testAccount.smtp.port}`
      );
    } catch (error) {
      console.error("❌ Failed to create test email account:", error);
      throw error;
    }
  }
  return transporter;
};

// Initialize the transporter immediately
const getTransporter = async () => {
  if (!transporter) {
    await initializeTransporter();
  }
  return transporter;
};

// Helper function to send emails
const sendEmail = async (to, subject, text, html) => {
  try {
    const emailTransporter = await getTransporter();

    const mailOptions = {
      from: '"SafeBallot" <no-reply@safeballot.app>',
      to,
      subject,
      text,
      html,
    };

    const info = await emailTransporter.sendMail(mailOptions);

    // Log message URL in development
    if (!process.env.EMAIL_HOST || process.env.NODE_ENV !== "production") {
      console.log("Email sent:", info.messageId);
      console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = {
  getTransporter,
  sendEmail,
};
