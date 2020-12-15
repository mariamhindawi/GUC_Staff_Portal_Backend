require("dotenv").config();
const hrModel = require("../models/hr_model");
const instructorModel = require("../models/instructor_model");
const taModel = require("../models/ta_model");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const router = express.Router();

//

module.exports = router;