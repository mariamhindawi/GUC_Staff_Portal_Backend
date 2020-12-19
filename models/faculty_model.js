const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    departments: {
        type: [String],
        required: true
    }
})

module.exports = mongoose.model("faculty", facultySchema);