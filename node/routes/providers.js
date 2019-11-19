const router = require("express").Router()
const User = require("../models/User.model");
var request = require('request'); // "Request" library

router.get("/spotify", (req, res) => {
	res.send(req.query)
})

module.exports = router