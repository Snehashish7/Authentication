const env = require("dotenv").config();
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const GoogleStrategy = require('passport-google-oauth20').Strategy; //we will use this as a passport strategy.
const findOrCreate = require('mongoose-findorcreate');

const app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

app.use(session({ //express-session
  secret: 'A secret',
  resave: false,
  saveUninitialized: false,
}))

app.use(passport.initialize())  //initialize passport for further use.
app.use(passport.session())


mongoose.connect('mongodb://127.0.0.1:27017/userDB', { useNewUrlParser: true });
// use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String  //will contain the profileId sent by google which will be used to find existing user or create new user.
});

userSchema.plugin(passportLocalMongoose) /*only works if the schema is a mongoose schema and not a simple JS schema.
  this is what we will use to hash and salt password and store user data in database.
  */
userSchema.plugin(findOrCreate)

const User = mongoose.model("User", userSchema)

passport.use(User.createStrategy())


passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

passport.use(new GoogleStrategy({ //place below serialize and deserialize. We cant
  //place above session since then it cannot save the user session.
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
},
  function (accessToken, refreshToken, profile, cb) { //google sends us back accesstoken(user data), profile(email,google ID and more)
    // console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {  //we have to save the googleId in the database so that that user 
      //can be automatically identified when he/she tries to login again
      return cb(err, user);
    })
  }
))


app.get("/", (req, res) => {
  res.render('home')
})

//the following code does:
/* authenticates user using googleStrategy when user hits the /auth/google route in login/register.
 */
app.get("/auth/google", passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/secrets");
  });

app.get("/login", (req, res) => {
  res.render('login');
})

// app.get("/logout", function(req, res){
//   req.logout(); // it is not a correct way to logout... gives error: requires callback
//   res.redirect("/");

// })

app.get("/logout", function (req, res) {

  req.logout(function (err) { //logs out the user and deletes the cookie associated with the user.
    if (!err) {
      res.redirect("/");
    }
  })
})


app.get("/register", (req, res) => {
  res.render('register')
})

app.get("/secrets", function (req, res) {
  // The below line was added so we can't display the "/secrets" page
  // after we logged out using the "back" button of the browser, which
  // would normally display the browser cache and thus expose the 
  // "/secrets" page we want to protect. Code taken from this post.
  res.set(
    'Cache-Control',
    'no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0'
  )
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
})

app.post("/register", function (req, res) {
  //'User.register()'  middleware is comming from passport-local-mongoose. 
  // It helps us avoid the newUser creation, saving the user and interacting with mongoose directly.
  // It also hashes and salts the password automatically.
  // Instead the middleware handles all these for us.
  User.register({ username: req.body.username }, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    }
    else {
      passport.authenticate("local")(req, res, function () {  //this authenticates the user and save the credentials in cookie
        res.redirect("/secrets");
      })
    }
  })

})


app.post("/login",
  passport.authenticate("local"), function (req, res) { //this authenticates the user and save the credentials in cookie
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
    req.login(user, function (err) {
      if (err) {
        console.log(err);
      } else {
        res.redirect("/secrets");
      }
    })
  })

app.listen(3000, () => {
  console.log("Server is runing on port 3000...   ");
})

