const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true,
    default: "UNASSIGNED"
  },
  courseInstructors: {
    type: [String],
    required: true
  },
  teachingAssistants: {
    type: [String],
    required: true
  },
  courseCoordinator: {
    type: String,
    required: true,
    default: "UNASSIGNED"
  },
});

module.exports = mongoose.model("course", courseSchema);
