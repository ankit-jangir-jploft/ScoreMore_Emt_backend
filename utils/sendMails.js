const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config()
const { GOOGLE_CLIENT, GOOGLE_SECRET, MAIL_ID } = process.env

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT,        
  GOOGLE_SECRET,    
  'http://v4.checkprojectstatus.com:3333//oauth2callback' 
);


module.exports.sendMail = async (mailOptions) => {
    try {
      // Refresh the access token if needed
      const accessToken = await oauth2Client.getAccessToken();
  
      // Create a Nodemailer transporter using OAuth2
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: MAIL_ID, // Your Gmail address
          clientId: GOOGLE_CLIENT,
          clientSecret: GOOGLE_SECRET,
          refreshToken: oauth2Client.credentials.refresh_token, // Refresh token
          accessToken: accessToken.token, // Access token
        },
      });
  
      const result = await transporter.sendMail(mailOptions);
      console.log('Email sent:', result);
      return true;
    } catch (error) {
      console.log(error)
      return false
    }
  };