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
        required: true
    },
    instructors: {
        type: [String],
        required: true
    },
    TAs: {
        type: [String],
        required: true
    },
    courseCoordinator: {
        type: String,
        required: true,
        default: "UNASSIGNED"
    },
    totalSlotsNumber: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model("course", courseSchema);