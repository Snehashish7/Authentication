require('dotenv').config();
const bcrypt = require('bcrypt');
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(session({
  secret: "My secret for site.",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "development" ? false : true,
    httpOnly: process.env.NODE_ENV === "development" ? false : true,
    sameSite: process.env.NODE_ENV === "development" ? "" : "none", // Set if using CORS
    path: "/",
  }, // 5 minutes
}));


passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(async function (id, done) {
  try {
    const user = await User.findById(id);
    if (user) {
      console.log("if is running", user);
      return done(null, user);
    } else {
      console.log("else is running");
      return done(null, false);
    }
  } catch (err) {
    return done(err, null);
  }
});



app.use(passport.initialize());
app.use(passport.session());


mongoose.connect('mongodb+srv://snehashishghosh21:test@cluster0.3hj1ahr.mongodb.net/userDB', { useNewUrlParser: true });


const userSchema = new Schema({
  email: String,
  password: String,
  googleId: String,
  secret: Array,
  username: { type: String, unique: false, sparse: true }
});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = mongoose.model("User", userSchema);


passport.use(User.createStrategy());
userSchema.plugin(findOrCreate);


passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "https://snehashish-secrets-app.cyclic.app/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"

}, async function (accessToken, refreshToken, profile, cb) {
  try {

    User.findOrCreate({ username: profile.displayName, googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  } catch (error) {
    console.log('Error deleting indexes:', error);
  }
}));


passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: "https://snehashish-secrets-app.cyclic.app/auth/facebook/secrets",
  profileFields: ['id', 'displayName', 'email']
}, async function (accessToken, refreshToken, profile, cb) {
  try {

    // Your search logic or user creation
    User.findOrCreate({ username: profile.displayName, facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  } catch (error) {
    console.log('Error deleting indexes:', error);
  }
}
));


app.get('/', function (req, res) {
  res.render("home");

});


app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));


app.get('/auth/google/secrets',
  passport.authenticate('google', { successRedirect: "/secrets",failureRedirect: '/login' }))


app.get('/auth/facebook',
  passport.authenticate('facebook'));


app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { successRedirect: "/secrets",failureRedirect: '/login' }),);


app.route("/login")
  .get(function (req, res) {
    res.render("login");
  })
  .post(async function (req, res) {
    const user = new User({ username: req.body.username, password: req.body.password });

    req.login(user, function (err) {
      try {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      } catch (error) {
        console.log(err);
      }
    });
  });


app.route("/register")
  .get(function (req, res) {
    res.render("register");
  })
  .post(async function (req, res) {
    try {
      const user = new User({ username: req.body.username });
      await User.register(user, req.body.password);

      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    } catch (err) {
      console.log(err);
      res.render("register");
    }
  });


app.get("/secrets", async function (req, res) {
  try {
    const foundUsers = await User.find({ "secret": { $ne: null } });
    res.render("secrets", { usersWithSecrets: foundUsers });
  } catch (error) {
    console.log(error);
  }
});


app.route("/submit")
  .get(function (req, res) {
    try {
      if (req.isAuthenticated()) {
        res.render("submit");
      } else {
        res.redirect("/login");
      }
    }
    catch (err) {
      console.log(err);
    }
  })
  .post(async function (req, res) {
    try {
      if (req.isAuthenticated()) {
        const submittedSecret = req.body.secret;
        console.log(req.user.id);
        const foundUser = await User.findById(req.user.id);
        if (foundUser) {
          foundUser.secret.push(submittedSecret);
          await foundUser.save();
          res.redirect("/secrets");
        } else {
          console.log(req.user.id);
        }
      }
    } catch (err) {
      console.log(err);
    }
  });


app.get("/logout", function (req, res) {
  req.logout(function () {
    res.redirect("/");
  });
});



app.listen(PORT, function () {
  console.log(`Server on port ${PORT}...`);

});