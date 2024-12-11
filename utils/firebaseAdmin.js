const admin = require("firebase-admin");

const serviceAccount = require("./path-to-your-serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const sendNotification = async (token, payload) => {
  try {
    const response = await admin.messaging().sendToDevice(token, payload);
    console.log("Notification sent successfully:", response);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

module.exports = { sendNotification };
