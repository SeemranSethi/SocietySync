const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const User = require('./models/User');
require('dotenv').config();

const app = express();

// Middleware for parsing JSON and URL-encoded form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Middleware for serving static files from the 'public' folder
app.use("/public", express.static(__dirname + "/public"));

// Set up session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).redirect('/');
  }
};
//connect to databse
const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };
async function run() {
  try {
    // Create a Mongoose client with a MongoClientOptions object to set the Stable API version
    await mongoose.connect(process.env.MONGO_URI, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.log("error in connection to db")
  }
}
run().catch(console.dir);

//serve pages
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/pages/login.html');
});

app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/pages/signup.html');
  });

app.get('/Core', isLoggedIn, (req, res) => {
    res.sendFile(__dirname + '/pages/core.html');
  });

app.get('/Member', isLoggedIn, (req, res) => {
    res.sendFile(__dirname + '/pages/member.html');
  });

app.get('/Team', isLoggedIn, (req, res) => {
    res.sendFile(__dirname + '/pages/team.html');
  });

//APIs
app.post('/signup', async (req, res) => { 
  const { name, username, password, team, role } = req.body;
  try {
    // Check for existing user
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).send({ title: "User already exists" });
    }
    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create and save new user
    const user = new User({ name,username, password: hashedPassword,team,role });
    await user.save();
    res.status(200).send({ message: "Signup successful" });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).send({ message: "Failed to create user" });
  } 
});

app.post('/login',async (req, res) => {
  const { username, password } = req.body
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).send({ title: "User not Found" });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send({ title: "Invalid Password" });
    }
    // Login successful, set session variable
    req.session.user = user;
    res.send({ message: "Login successful",role:user.role });
  } catch (error) {
    res.status(500).send({ message: "Failed to login" });
  }
 
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:');
    } else {
      res.redirect('/');
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
