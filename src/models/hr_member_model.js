const mongoose = require("mongoose");
const { MongooseAutoIncrementID } = require("mongoose-auto-increment-reworked");

const hrMemberSchema = new mongoose.Schema({
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
    enum: ["Saturday"]
  },
  annualLeaveBalance: {
    type: Number,
    default: 0
  },
  accidentalLeaveBalance: {
    type: Number,
    default: 6
  },
  loggedIn: {
    type: Boolean,
    required: true,
    default: false
  }
});

hrMemberSchema.plugin(MongooseAutoIncrementID.plugin, {
  modelName: "HR Member",
  field: "idCount",
  unique: true,
  startAt: 1,
  incrementBy: 1,
  nextCount: "nextCount",
  resetCount: "resetCount",
});

module.exports = mongoose.model("HR Member", hrMemberSchema, "HR Members");
