require('dotenv').config()

const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const port = 3000;
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport')
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();


// app for put static files like (css,img,js) in the server
app.use(express.static("public"));


// Parse data from the browser to server with bodyparser npm
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(bodyParser.raw());


// Using EJS with express, mandatory have views directory with (index) - or other name.ejs file!!!!
app.set('view engine', 'ejs');


app.use(session({
    secret: 'wandeta pequena',
    resave: false,
    saveUninitialized: true,  
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/userDB');

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    facebookId: String
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user);
});
   
passport.deserializeUser(function(user, done) {
    done(null, user);
});

//Google login strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//Facebook login strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FB_CLIENT_ID,
    clientSecret: process.env.FB_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
    profileFields: ['id', 'displayName', 'photos', 'email']
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile)
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));




app.get("/", function (req, res) {
    res.render("home")
});

//////////////////////Google authentication////////////////////////////// 
app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
});
////////////////////////////////////////////////////////////////////////

//////////////////////Facebook authentication////////////////////////////// 
app.get('/auth/facebook',
  passport.authenticate('facebook')
);

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
});
///////////////////////////////////////////////////////////////////////////

app.get("/login", function (req, res) {
    res.render("login", { errorMsgEmail: "", errorMsgPass: "" })
});

app.get("/register", function (req, res) {

    res.render("register", { errorMsg: "" })
});

app.get("/secrets", function (req, res){
    if(req.isAuthenticated())
    res.render("secrets");   
    else
    res.redirect("/login");
});

app.post("/register", function (req, res) {

    User.register({ username: req.body.username}, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            // res.redirect("/register");
            res.render("register", {errorMsg : "The email that you provided already exist in the database."});
        } else {
            passport.authenticate('local')(req, res, function () {
                console.log(res)
                res.redirect('/secrets');
            });
        }

    });

});

app.post('/login', 
    passport.authenticate('local', { failureRedirect: '/login' }), 
    function(req, res) {
        res.redirect('/secrets');
    }
);

// app.post("/login", function (req, res) {

//     const user = new User({
//         username: req.body.username,
//         password: req.body.password
//     })

//     req.login(user, function(err) {
//         if (err)
//             console.log(err)
//         else{
//             passport.authenticate('local', { failureRedirect: '/login' })(req, res, function () {
//                 res.redirect('/secrets');
//             });
//         }
        
//     });

// });

app.post('/secrets', function(req, res){
    req.logout();
    res.redirect('/');
  });



//////////////////////////////////////////MONGOOSE ASYNC FUNCTIONS//////////////////////////////////////////////


async function registerUser(email, pass) {
    try {
        await mongoose.connect('mongodb://localhost:27017/userDB');
        console.log('Connected successfully to server');

        const user = new User({
            emailUsr: email,
            passwordUsr: pass
        })
        await user.save();

    }
    catch (error) {
        console.log(error)
    }

}

async function searchEmailUser(email) {
    try {
        await mongoose.connect('mongodb://localhost:27017/userDB');
        console.log('Connected successfully to server');
        const searchResult = await User.find({ emailUsr: email });

        return searchResult;

    }
    catch (error) {
        console.log(error)
    }

}

async function matchUsrAndPass(email) {
    try {
        await mongoose.connect('mongodb://localhost:27017/userDB');
        console.log('Connected successfully to server');
        const searchResult = await User.findOne({ emailUsr: email });

        return searchResult;

    }
    catch (error) {
        console.log(error)
    }

}

app.listen(port, function () {

    console.log(`Server is running and listengin at ${port}`);
});
