const schedule = require("node-schedule");
const Reminder = require("../models/Reminder");

// Function to cleanup completed reminders
const cleanupCompletedReminders = async () => {
  
  try {
    console.log("it hitsssss")
    const now = new Date();
    console.log(`[${now.toISOString()}] Cleanup process started.`);

    // Remove reminders that are complete
    // A reminder is "complete" if the current time is past its dateTime and it has a sentDate
    const result = await Reminder.deleteMany({
      dateTime: { $lt: now }, // Scheduled time has passed
      sentDate: { $exists: true } // Reminder has already been sent
    });

    if (result.deletedCount > 0) {
      console.log(`[${now.toISOString()}] Successfully removed ${result.deletedCount} completed reminders.`);
    } else {
      console.log(`[${now.toISOString()}] No completed reminders to remove.`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during cleanup of completed reminders:`, error.message);
  }
};

// Schedule the cleanup task to run every hour
schedule.scheduleJob("0 * * * *", cleanupCompletedReminders); // Runs every hour at the top of the hour

module.exports = { cleanupCompletedReminders };
