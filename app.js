require('dotenv').config()
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));


main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/userDB');
  // use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
  const userSchema = new mongoose.Schema({
    email: String,
    password: String
  });

  const secrets = process.env.SECRETS;

  const User = mongoose.model('User', userSchema);

  app.get("/", (req, res) => {
    res.render('home');
  });

  app.get("/register", (req, res) => {
    res.render('register');
  });

  app.post("/register", async (req, res) => {
    try {
      bcrypt.hash(req.body.password, saltRounds, async (err, hash) => {  //password is hashed with salt here 'saltRounds' number of times
        // Store hash in your password DB.
        const newUser = new User({
          email: req.body.username,
          password: hash
        });
        const result = await newUser.save();
        if (result) {
          res.render('secrets');
        } else {
          console.log("Login Failed");
        }
      });
    } catch (err) {
      console.log(err);
    }
  });


  app.get("/login", (req, res) => {
    res.render('login');
  });

  app.post("/login", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    try {
      const foundName = await User.findOne({ email: username }) //when find() is called then password is decrypted
      if (foundName) {
        const match = await bcrypt.compare(password, foundName.password);  //matches the given password with the hashed password stored in the database against an username.
        if (match) {
          res.render('secrets')
        } else {
          console.log('Password Does not Match...Try Again !')
        }
      } else {
        console.log("User Not found...")
      }
    } catch (err) {
      console.log(err);
    }
  });

  app.listen(3000, () => {
    console.log("Server is runing on port 3000...   ");
  });


}
