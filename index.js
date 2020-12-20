require("dotenv").config();
const mongoose = require("mongoose");
const {app} = require("./app");

app.listen(process.env.PORT);

mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);
mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });