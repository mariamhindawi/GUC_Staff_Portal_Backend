const mongoose = require("mongoose");

const attendanceRecordSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true
  },
  signInTime: {
    type: Date
  },
  signOutTime: {
    type: Date
  }
});

module.exports = mongoose.model("Attendance Record", attendanceRecordSchema, "Attendance Records");
