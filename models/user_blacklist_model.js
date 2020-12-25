const mongoose = require("mongoose");

const userBlacklistSchema = new mongoose.Schema({
    user: {
        type: String,
        required: true,
        unique: true
    },
    blockedAt: {
        type: Date,
        required: true
    }
});

module.exports = mongoose.model("blacklisted_user", userBlacklistSchema);