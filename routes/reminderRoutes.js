const express = require("express");
const Reminder = require("../models/Reminder"); // Path to your Reminder model

const router = express.Router();

// Get reminders for a specific user
router.get("/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const reminders = await Reminder.find({ email }).sort({ createdAt: -1 });

    res.json({ success: true, reminders });
  } catch (error) {
    console.error("Error fetching reminders:", error);
    res.status(500).json({ success: false, message: "Failed to fetch reminders." });
  }
});

module.exports = router;
