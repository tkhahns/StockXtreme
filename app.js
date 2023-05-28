require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
//const md5 = require("md5"); //md5 hash function
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");  
const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret: "Our little secret",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
const uri = process.env.URI;
mongoose.connect(uri).then(() => {
    console.log("Connect to DB");
    app.listen(4000, () => {
        console.log("Server running");
    });
    var userSchema = new mongoose.Schema({
        email: {
            type: String,
            //required: [true, "No email specified"]
        },
        password: {
            type: String,
            //required: [true, "No password specified"]
        },
        googleId: String
    });
    userSchema.plugin(passportLocalMongoose);
    userSchema.plugin(findOrCreate);
    //Mongoose-encryption encrypts data when save() is activated and decrypt when find() is activated.
    //userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});
    const User = new mongoose.model("User", userSchema);
    passport.use(User.createStrategy());
    passport.serializeUser(function(user, cb) {
        process.nextTick(function() {
          return cb(null, {
            id: user.id,
            username: user.username,
            picture: user.picture
          });
        });
      });
      
      passport.deserializeUser(function(user, cb) {
        process.nextTick(function() {
          return cb(null, user);
        });
      });

    passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:4000/auth/google/homepage",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
      },
      function(accessToken, refreshToken, profile, cb) {
        //console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            console.log(user);
          return cb(err, user);
        });
      }
    ));
    app.get("/", (req, res) => {
        res.render("home");
    });
    app.get("/auth/google", passport.authenticate("google", { scope: ["profile"] }));
    app.get('/auth/google/homepage', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
        res.redirect("/homepage");
    });
    app.get("/signup", (req, res) => {
        res.render("signup");
    });
    app.get("/homepage", (req, res) => {
        if (req.isAuthenticated()) {
            res.render("homepage");
        } else {
            res.redirect("/");
        }
    });
    //Every time we save app.js and nodemon restarts the program, cookies will disappear and we are no longer authenticated
    app.get("/logout", (req, res) => {
        req.logout((err) => {
            if (err) {
                console.log(err);
            } else {
                res.redirect("/");
            }
        });
    });
    app.post("/signup", (req, res) => {
        if (req.body.password != req.body.confirmPassword) {
            res.redirect("/signup");
        } else {
            User.register({username: req.body.username}, req.body.password, (err, user) => {
                if (err) {
                    console.log(err);
                    res.redirect("/signup");
                } else {
                    passport.authenticate("local")(req, res, () => {
                        res.redirect("/homepage");
                    });
                }
            });
        }
    });
    app.post("/", (req, res) => {
        const user = new User({
            username: req.body.username,
            password: req.body.password
        });
        req.login(user, (err) => {
            if (err) {
                console.log(err);
            } else {
                passport.authenticate("local", {failureRedirect: "/"})(req, res, () => {
                    res.redirect("/homepage");
                });
            }
        });
    });
});


