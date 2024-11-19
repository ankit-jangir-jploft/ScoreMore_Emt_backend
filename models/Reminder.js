const mongoose = require("mongoose");

const ReminderSchema = new mongoose.Schema({
  email: { type: String, required: true },
  message: { type: String, required: true },
  time: { type: String, required: true }, 
  dateTime: { type: Date }, 
  allDay: { type: Boolean, default: false }, 
  createdAt: { type: Date, default: Date.now },
  sentDate: { type: Date }, 
});

module.exports = mongoose.model("Reminder", ReminderSchema);
