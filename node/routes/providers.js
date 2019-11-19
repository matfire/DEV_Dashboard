const router = require("express").Router()


router.get("/digitalocean", (req, res) => {
	console.log(req.params, req.query)
	res.send("ok")
})

module.exports = router