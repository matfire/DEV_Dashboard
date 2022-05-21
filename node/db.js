const mongoose = require("mongoose");

mongoose.connect(
  "mongodb://localhost:27017myFirstDatabase?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
);

var db = mongoose.connection;

module.exports = db;
