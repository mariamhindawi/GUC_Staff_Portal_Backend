const mongoose = require("mongoose");
const { MongooseAutoIncrementID } = require("mongoose-auto-increment-reworked");

const academicMemberSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    required: true,
    enum: ["Male", "Female"]
  },
  role: {
    type: String,
    required: true,
    enum: ["Course Instructor", "Head of Department", "Teaching Assistant", "Course Coordinator"]
  },
  department: {
    type: String,
    required: true,
    default: "UNASSIGNED"
  },
  office: {
    type: String,
    required: true
  },
  salary: {
    type: Number,
    required: true
  },
  dayOff: {
    type: String,
    required: true,
    default: "Saturday",
    enum: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]
  },
  annualLeaveBalance: {
    type: Number,
    required: true,
    default: 0
  },
  accidentalLeaveBalance: {
    type: Number,
    required: true,
    default: 6
  },
  loggedIn: {
    type: Boolean,
    required: true,
    default: false
  },
  linkedin: {
    type: String,
    required: true,
    default: "Not Specified"
  },
  github: {
    type: String,
    required: true,
    default: "Not Specified"
  },
  facebook: {
    type: String,
    required: true,
    default: "Not Specified"
  }
});

academicMemberSchema.plugin(MongooseAutoIncrementID.plugin, {
  modelName: "Academic Member",
  field: "idCount",
  unique: true,
  startAt: 1,
  incrementBy: 1,
  nextCount: "nextCount",
  resetCount: "resetCount",
});

module.exports = mongoose.model("Academic Member", academicMemberSchema, "Academic Members");
