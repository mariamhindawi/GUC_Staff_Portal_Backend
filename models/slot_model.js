const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema({
    day: {
        type: String,
        enum: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
        required:true
    },
    slotNumber: {
        type: Number,
        enum: [1, 2, 3, 4, 5],
        required: true
    },
    room: {
        type: String,
        required: true
    },
    course: {
        type: String,
        required: true
    },
    staffMember: {
        type: String,
        default: "UNASSIGNED"
    },
    type: {
        type: String,
        enum: ["Tutorial", "Lab", "Lecture"],
        required: true
    }
});

module.exports = mongoose.model("slot", slotSchema);