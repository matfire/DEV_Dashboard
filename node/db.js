const mongoose = require("mongoose")

mongoose.connect('mongodb://matteo:matteo99@ds345028.mlab.com:45028/dashboard', {useNewUrlParser: true, useUnifiedTopology:true});

var db = mongoose.connection

module.exports = db