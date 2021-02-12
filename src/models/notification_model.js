const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  seen: {
    type: Boolean,
    required: true,
    default: false
  }
},
  {
    timestamps: true
  });

module.exports = mongoose.model("notification", notificationSchema);
