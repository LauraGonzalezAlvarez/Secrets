require('dotenv').config()

const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
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


// Parse data from te browser to server with bodyparser npm
app.use(bodyParser.urlencoded({ extended: false }));


// Using EJS with express, mandatory have views directory with (index) - or other name.ejs file!!!!
app.set('view engine', 'ejs');

app.use(session({
    secret: process.env.LOCAL_SECRET,
    resave: false,
    saveUninitialized: true,  
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb+srv://admin-fernando:03eszv07@cluster0.23yhe.mongodb.net/secretsDB');

const postSchema = new mongoose.Schema({
    secret: String
})

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    dspName: String,
    googleId: String,
    facebookId: String,
    secretPosts: Array
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const Post = mongoose.model('Post', postSchema);
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
    callbackURL: "https://rocky-lake-68566.herokuapp.com/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id, dspName: profile.displayName}, function (err, user) {
      return cb(err, user);
    });
  }
));

//Facebook login strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FB_CLIENT_ID,
    clientSecret: process.env.FB_CLIENT_SECRET,
    callbackURL: "https://rocky-lake-68566.herokuapp.com/auth/facebook/secrets",
    profileFields: ['id', 'displayName', 'photos', 'email']
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id, dspName: profile.displayName}, function (err, user) {
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
    res.render("login")
});

app.get("/register", function (req, res) {
    res.render("register", {errorMsg: ""});
});

app.get("/secrets", function (req, res){
   
    loadSecrets()
        .then(result => {
            if(req.isAuthenticated()){
                if(!req.user.username)
                res.render("secrets", {user: req.user.dspName, allPost: result});
                else
                res.render("secrets", {user: req.user.username, allPost: result});
            }
            else
            res.render("secrets", {user: "", allPost: result});
        });
});

app.get("/submit", function (req, res) {
    if(req.isAuthenticated()){
        res.render("submit"); 
    }
    else
    res.redirect("/login");
});

app.post("/register", function (req, res) {

    User.register({ username: req.body.username}, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.render("register", {errorMsg : "The email that you provided already exist in the database."});
        } else {
            passport.authenticate('local')(req, res, function () {
                res.redirect('/secrets');
            });
        }

    });

});

app.post("/submit", function (req, res) {

    const secretPost = req.body.secret;
    const idUser = req.user._id;

    createPost(idUser, secretPost)
        .then(setTimeout(() => {
            res.redirect('/secrets')
            }, 1500));
            
});

app.post('/login', 
    passport.authenticate('local', { failureRedirect: '/login', failureMessage: true }), 
    function(req, res) {
        res.redirect('/secrets');
    }
);

app.post('/secrets', function(req, res){
    req.logout();
    res.redirect('/');
});


//////////////////////////////////////////MONGOOSE ASYNC FUNCTIONS//////////////////////////////////////////////


// async function registerUser(email, pass) {
//     try {
//         await mongoose.connect('mongodb://localhost:27017/userDB');
//         console.log('Connected successfully to server');

//         const user = new User({
//             emailUsr: email,
//             passwordUsr: pass
//         })
//         await user.save();

//     }
//     catch (error) {
//         console.log(error)
//     }

// }

// async function searchEmailUser(email) {
//     try {
//         await mongoose.connect('mongodb://localhost:27017/userDB');
//         console.log('Connected successfully to server');
//         const searchResult = await User.find({ emailUsr: email });

//         return searchResult;

//     }
//     catch (error) {
//         console.log(error)
//     }

// }

// async function matchUsrAndPass(email) {
//     try {
//         await mongoose.connect('mongodb://localhost:27017/userDB');
//         console.log('Connected successfully to server');
//         const searchResult = await User.findOne({ emailUsr: email });

//         return searchResult;

//     }
//     catch (error) {
//         console.log(error)
//     }

// }

async function createPost(userId, userSecret) {
    try {
        
        const searchResult = await User.findById(userId);

        const post = new Post({
            secret: userSecret
        })

        searchResult.secretPosts.push(post);

        await searchResult.save();
        await post.save();

    }
    catch (error) {
        console.log(error);
    }

}

async function loadSecrets() {
    try {
        const searchResult = await Post.find({});

        return searchResult;

    }
    catch (error) {
        console.log(error)
    }

}


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function(){

    console.log(`Server is running and listening at ${port}`);
});
