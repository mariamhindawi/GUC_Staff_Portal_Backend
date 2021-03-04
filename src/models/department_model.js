const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  faculty: {
    type: String,
    required: true,
    default: "UNASSIGNED"
  },
  headOfDepartment: {
    type: String,
    required: true,
    default: "UNASSIGNED"
  }
});

module.exports = mongoose.model("Department", departmentSchema, "Departments");
