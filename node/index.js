const express = require("express")
const cors = require("cors")
const morgan = require("morgan")
const bodyParser = require("body-parser")
const nunjucks = require( 'nunjucks' ) ;
const db = require("./db")
const session = require('express-session')
const bcrypt = require("bcrypt")
const grant = require("grant-express")
const userRouter = require("./routes/userRoute")
const providerRouter = require("./routes/providers")
const User = require("./models/User.model")

db.once("open", () => console.log("database connect"))

const app = express()

const grantConfig = {
	"digitalocean": {
		key: "a854f75482023fefd03b59af436cde7a739c2afd9a62959010157acba46b8673",
		secret: "64599a2d29f7ad84ff87023520552e4e915011c79a27a6149b76267919a00029",
		custom_params: {"redirect_uri":"http://localhost:8080/connect/digitalocean/callback"},
		callback: "/providers/digitalocean"
	}
}

app.use(cors())
app.use(morgan("dev"))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))
app.use("/users", userRouter)
app.use("/providers", providerRouter)

app.use(session({
	secret: 'keyboard cat',
	resave:true,
	saveUninitialized:false
  }))

app.use(grant(grantConfig))

nunjucks.configure("./views",{
	autoescape:true,
	express:app
})


function requireLogin(req, res, next) {
	if (!req.session && !req.session.user) {
		res.redirect('/login');
	  } else {
		next();
	  }
  }

app.get("/register", (req, res) => {
	res.render("register.html")
})

app.get("/login", (req, res) => {
	res.render("login.html")
})

app.post("/login", async(req, res) => {
	const {email, password} = req.body

	const user = await User.findOne({email})
	if (user) {
		if (bcrypt.compareSync(password, user.password)) {
			req.session.user = user;
			res.redirect("/")
		} else {
			res.render("login.html", {errors:["wrong credentials"]})
		}
	} else {
		res.render("login.html", {errors:["wrong credentials"]})
	}
})

app.post("/register", async(req, res) => {
	console.log(req.body)
	const {email, password} = req.body
	let user = await User.findOne({email})
	console.log(user)
	if (user) {
		res.render("register.html", {errors:["user already exists with provided credentials"]})
	} else {
		let user = await User.create({email, password:bcrypt.hashSync(password, 12)})
		req.session.user = user;
		res.redirect("/login");
	}
})

app.get("/", requireLogin, (req, res) => {
	res.render("home.html", {user:req.session.user})
})


app.listen(process.env.PORT || 8080, () => {
	console.log("listening")
})