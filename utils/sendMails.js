const sgMail = require('@sendgrid/mail');
require('dotenv').config();

const { SENDGRID_API_KEY, MAIL_ID } = process.env;

// Set the SendGrid API Key
sgMail.setApiKey(SENDGRID_API_KEY);

module.exports.sendMail = async (mailOptions) => {
  console.log("MAIL_ID",MAIL_ID, SENDGRID_API_KEY)
  try {
    // Construct the email message
    const msg = {
      to: mailOptions.to, // Recipient email address
      from: MAIL_ID,      // Verified sender email address in SendGrid
      subject: mailOptions.subject, // Email subject
      text: mailOptions.text, // Plain text content (optional)
      html: mailOptions.html, // HTML content
    };

    // Send the email using SendGrid
    const result = await sgMail.send(msg);
    console.log('Email sent:', result);
    return true;
  } catch (error) {
    console.error('Error sending email11:', error.response?.body || error.message);
    return false;
  }
};
