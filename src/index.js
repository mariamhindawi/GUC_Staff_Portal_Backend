const mongoose = require("mongoose");

const { app } = require("./app");
app.listen(process.env.PORT||5000);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false
});

