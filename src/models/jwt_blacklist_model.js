const mongoose = require("mongoose");

const jwtBlacklistSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    }
});

module.exports = mongoose.model("blacklisted_jwt_token", jwtBlacklistSchema);