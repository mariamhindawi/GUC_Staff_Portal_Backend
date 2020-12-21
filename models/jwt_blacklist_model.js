const mongoose = require("mongoose");

const jwtBlacklistSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    }
});

module.exports = mongoose.model("jwt_blacklisted_token", jwtBlacklistSchema);