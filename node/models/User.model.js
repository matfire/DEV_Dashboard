const mongoose = require("mongoose")

var UserSchema = new mongoose.Schema({
	email: {type: String, unique:true},
	githubToken: String,
	googleToken: String,
	spotifyToken: String,
	digitalOceanToken: String,
	twitchToken: String,
	password: String
})

var User = mongoose.model("user", UserSchema)

module.exports = User