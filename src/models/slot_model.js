const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]
  },
  slotNumber: {
    type: String,
    required: true,
    enum: ["1", "2", "3", "4", "5"]
  },
  room: {
    type: String,
    required: true
  },
  course: {
    type: String,
    required: true
  },
  staffMember: {
    type: String,
    required: true,
    default: "UNASSIGNED"
  },
  type: {
    type: String,
    required: true,
    enum: ["Tutorial", "Lab", "Lecture"]
  }
});

module.exports = mongoose.model("slot", slotSchema);
