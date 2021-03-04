const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  capacity: {
    type: Number,
    required: true
  },
  remainingCapacity: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["Office", "Tutorial", "Lab", "Lecture"]
  }
});

module.exports = mongoose.model("Room", roomSchema, "Rooms");
