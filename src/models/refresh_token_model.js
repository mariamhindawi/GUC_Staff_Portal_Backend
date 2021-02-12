const mongoose = require("mongoose");

const authRefreshTokenSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
});

module.exports = mongoose.model("auth_refresh_token", authRefreshTokenSchema);
