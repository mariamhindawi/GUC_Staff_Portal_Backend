const mongoose = require("mongoose");

const { app } = require("./app");
app.listen(process.env.PORT);

mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
 });