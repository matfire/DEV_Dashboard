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
const redis = require('redis');
const SpotifyStrategy = require('passport-spotify').Strategy;
const passport = require("passport")

const redisClient = redis.createClient({host:process.env.REDIS || "127.0.0.1"});
const redisStore = require('connect-redis')(session);

db.once("open", () => console.log("database connect"))

const app = express()

const grantConfig = {
	"spotify": {
		key: "2cfa586c6c43457aadb736344d842dcc",
		secret: "c3f63fd9f633466f801fce7634af383c",
		callback: "/providers/spotify",
		custom_params: {"redirect_uri":"http%3A%2F%2Flocalhost%3A8080%2Fproviders%2Fspotify%2"},
		scopes:["user-read-recently-played user-read-playback-state user-read-currently-playing user-modify-playback-state streaming app-remote-control"]
	},
	"trello": {
		secret:"d0e15c77523f84c778674ea58f46e2ab098f5d6492b9a5fa1e56a1dd9fc57385",
		callback: "/providers/trello"
	},
	"bitly": {
		key: "4f0e7b0937e8434b47c2560a0f45503053d8148d",
		secret: "1b2265a6543ce5f7c165073b5521f3cc98731c72",
		callback: "/providers/bitly",
		custom_params: {"redirect_uri":encodeURI("http://localhost:8080/connect/bitly/callback")}
	}
}
passport.use(
	new SpotifyStrategy(
	  {
		clientID: "2cfa586c6c43457aadb736344d842dcc",
		clientSecret: "c3f63fd9f633466f801fce7634af383c",
		callbackURL: 'http://localhost:8080/providers/spotify'
	  },
	  function(accessToken, refreshToken, expires_in, profile, done) {
		  console.log(accessToken)
		//   done(err, profile)
	  }
	)
  );
app.use(cors())
app.use(morgan("dev"))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))
app.use("/users", userRouter)
app.use("/providers" ,providerRouter)

app.use(session({
	secret: 'keyboard cat',
	name: "_cookie",
	resave:true,
	saveUninitialized:false,
	cookie: {secure:false},
	store: new redisStore({client:redisClient, ttl:86400})
  }))

// app.use(grant(grantConfig))

nunjucks.configure("./views",{
	autoescape:true,
	express:app
})


function requireLogin(req, res, next) {
	if (!req.session || !req.session.user) {
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
	const {email, password} = req.body
	let user = await User.findOne({email})
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

app.get("/auth/spotify", passport.authenticate("spotify") ,(req, res) => {

})


app.listen(process.env.PORT || 8080, () => {
	console.log("listening")
})