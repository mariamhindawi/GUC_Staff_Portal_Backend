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
        enum: ["Office","Tutorial Room","Lecture Hall","Lab"]
    }
});

module.exports = mongoose.model("room", roomSchema);