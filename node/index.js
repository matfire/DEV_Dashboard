const axios = require("axios")
const express = require("express")
const cors = require("cors")
const morgan = require("morgan")
const bodyParser = require("body-parser")
const nunjucks = require('nunjucks');
const db = require("./db")
const session = require('express-session')
const bcrypt = require("bcrypt")
const grant = require("grant-express")
const userRouter = require("./routes/userRoute")
const providerRouter = require("./routes/providers")
const User = require("./models/User.model")
const redis = require('redis');
const SpotifyStrategy = require('passport-spotify').Strategy;
const LocalStrategy = require("passport-local").Strategy;
const DigitalOceanStrategy = require("passport-digitalocean").Strategy;
const passport = require("passport")
const fetch = require("node-fetch")

const redisClient = redis.createClient({ host: process.env.REDIS || "127.0.0.1" });
const redisStore = require('connect-redis')(session);

db.once("open", () => console.log("database connect"))

const app = express()

const grantConfig = {
	"spotify": {
		key: "2cfa586c6c43457aadb736344d842dcc",
		secret: "c3f63fd9f633466f801fce7634af383c",
		callback: "/providers/spotify",
		custom_params: { "redirect_uri": "http%3A%2F%2Flocalhost%3A8080%2Fproviders%2Fspotify%2" },
		scopes: ["user-read-recently-played user-read-playback-state user-read-currently-playing user-modify-playback-state streaming app-remote-control"]
	},
	"trello": {
		secret: "d0e15c77523f84c778674ea58f46e2ab098f5d6492b9a5fa1e56a1dd9fc57385",
		callback: "/providers/trello"
	},
	"bitly": {
		key: "4f0e7b0937e8434b47c2560a0f45503053d8148d",
		secret: "1b2265a6543ce5f7c165073b5521f3cc98731c72",
		callback: "/providers/bitly",
		custom_params: { "redirect_uri": encodeURI("http://localhost:8080/connect/bitly/callback") }
	}
}

passport.serializeUser((user, done) => {
	done(null, user._id)
})

passport.deserializeUser((id, done) => {
	User.findById(id).then((user) => {
		done(null, user)
	})
})

passport.use(
	new LocalStrategy({
		usernameField: "email",
		passwordField: "password",

	}, async (email, password, done) => {
		let user = await User.findOne({ email })
		if (!user) {
			return done(null, false, { message: "Incorrect credentials" })
		}
		if (bcrypt.compareSync(password, user.password)) {
			return done(null, user)
		} else {
			return done(null, false, { message: "Incorrect credentials" })
		}
	})
)

passport.use(
	new DigitalOceanStrategy({
		clientID: "a854f75482023fefd03b59af436cde7a739c2afd9a62959010157acba46b8673",
		clientSecret: "64599a2d29f7ad84ff87023520552e4e915011c79a27a6149b76267919a00029",
		callbackURL: "https://demo.dashboard.nirah.tech/auth/digitalocean"
	},
		async function (accessToken, refreshToken, expires_in, profile, done) {
			let res = await fetch("https://api.digitalocean.com/v2/account", {
				headers: {
					"Authorization": `Bearer ${accessToken}`
				}
			})
			let json = await res.json()
			var user = await User.findOne({ email: json.account.email })
			if (user) {
				user.digitalOceanToken = accessToken
				await user.save()
				return done(null, user)
			}
		}
	)
)

passport.use(
	new SpotifyStrategy(
		{
			clientID: "2cfa586c6c43457aadb736344d842dcc",
			clientSecret: "c3f63fd9f633466f801fce7634af383c",
			callbackURL: 'https://demo.dashboard.nirah.tech/auth/spotify',
		},
		async function (accessToken, refreshToken, expires_in, profile, done) {
			var user = await User.findOne({ email: profile.emails[0].value })
			if (user) {
				user.spotifyToken = accessToken
				await user.save()
				return done(null, user)
			}
			//   done(err, profile)
		}
	)
);

app.use(cors())
app.use(morgan("dev"))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use("/users", userRouter)
app.use("/providers", providerRouter)
app.use(express.static(__dirname + "/public"))
app.use(session({
	secret: 'keyboard cat',
	name: "_cookie",
	resave: true,
	saveUninitialized: false,
	cookie: { secure: false },
	store: new redisStore({ client: redisClient, ttl: 86400 })
}))
app.use(passport.initialize())
app.use(passport.session())
// app.use(grant(grantConfig))

nunjucks.configure("./views", {
	autoescape: true,
	express: app
})

app.get("/register", (req, res) => {
	res.render("register.html")
})

app.get("/login", (req, res) => {
	res.render("login.html")
})

app.post('/login',
	passport.authenticate('local', {
		successRedirect: '/',
		failureRedirect: '/login',
		failureFlash: true
	})
);

app.post("/register", async (req, res) => {
	const { email, password } = req.body
	let user = await User.findOne({ email })
	if (user) {
		res.render("register.html", { errors: ["user already exists with provided credentials"] })
	} else {
		let user = await User.create({ email, password: bcrypt.hashSync(password, 12) })
		req.session.user = user;
		res.redirect("/login");
	}
})

app.get("/", (req, res) => {
	if (!req.user) {
		return res.redirect("/login")
	}
	res.render("home.html", { user: req.user })
})

app.get("/auth/spotify", passport.authenticate("spotify", {
	scope: ["user-read-recently-played", "user-read-playback-state", "user-read-currently-playing", "user-modify-playback-state", "streaming app-remote-control", "user-read-email"],
	successRedirect: "/"
}))

app.get("/auth/digitalocean", passport.authenticate("digitalocean", {
	scope: ["read"],
	successRedirect: "/",
	failureRedirect: "/"
}))

app.get("/auth/twitch", passport.authenticate("twitch", {
	scope: [""],
	successRedirect: "/",
	failureRedirect: "/"
}))

app.get("/about.json", (req, res) => {
	res.json({
		client: {
			host: req.ip
		},
		server: {
			current_time: Math.floor(new Date() / 1000),
			services: [
				{
					name: "weather",
					widgets: [
						{
							name: "city_temperature",
							description: "Display temperature for a city, based on the name or the geographical coordinates",
							params: [
								{
									name: "city",
									type: "string",
									optional: true
								},
								{
									name: "latitude",
									type: "double",
									optional: true
								},
								{
									name: "longitude",
									type: "double",
									optional: true
								}
							]
						}
					]
				},
				{
					name: "unsplash",
					widgets: [
						{
							name: "background_picker",
							description: "Search Unsplash's gallery and find an image to set as your background on the dashboard's main page",
							params: [
								{
									name: "query",
									type: "string",
									optional: false
								}
							]
						}
					]
				},
				{
					name: "spotify",
					widgets: [
						{
							name: "device_info",
							description: "Get a list of connected devices linked to your account and select the one that will play your music"
						},
						{
							name: "jukebox",
							description: "Play, pause, skip forward and backward on your playlist"
						}
					]
				},
				{
					name: "digital_ocean",
					widgets: [
						{
							name: "droplets",
							description: "Get a list of droplets associated to your account",
							params: []
						},
						{
							name: "domains",
							description: "Get a list of domains linked to your account"
						}
					]
				}
			]
		}
	})
})


app.listen(process.env.PORT || 8080, () => {
	console.log("listening")
})