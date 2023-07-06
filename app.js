require('dotenv').config()
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')

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
  password: String
});

userSchema.plugin(passportLocalMongoose); /*only works if the schema is a mongoose schema and not a simple JS schema.
  this is what we will use to hash and salt password and store user data in database.
  */

const User = mongoose.model("User", userSchema)

passport.use(User.createStrategy())

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/", (req, res) => {
  res.render('home')
});

app.get("/login", (req, res) => {
  res.render('login');
});

// app.get("/logout", function(req, res){
//   req.logout(); // it is not a correct way to logout... gives error: requires callback
//   res.redirect("/");

// })

app.get("/logout", function (req, res) {

  req.logout(function (err) { //logs out the user and deletes the cookie associated with the user.
    if (!err) {
      res.redirect("/");
    }
  });
});


app.get("/register", (req, res) => {
  res.render('register')
});

app.get("/secrets", function (req, res) {
  // The below line was added so we can't display the "/secrets" page
  // after we logged out using the "back" button of the browser, which
  // would normally display the browser cache and thus expose the 
  // "/secrets" page we want to protect. Code taken from this post.
  res.set(
    'Cache-Control',
    'no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0'
  );
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

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
      });
    }
  });

});


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
    });
  });

app.listen(3000, () => {
  console.log("Server is runing on port 3000...   ");
});

