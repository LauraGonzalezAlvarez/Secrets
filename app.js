require('dotenv').config()

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const port = 3000;
const app = express();
const bcrypt = require('bcrypt');
const saltRounds = 10;
// const md5 = require ("md5");

const mongoose = require('mongoose');
// const encrypt = require('mongoose-encryption');


// app for put static files like (css,img,js) in the server
app.use(express.static("public"));


// Parse data from the browser to server with bodyparser npm
app.use(bodyParser.urlencoded({ extended: false }))

// Using EJS with express, mandatory have views directory with (index) - or other name.ejs file!!!!
app.set('view engine', 'ejs');


const userSchema = new mongoose.Schema({
    emailUsr: String,
    passwordUsr: String
})

// Using environment variable

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['passwordUsr']});

const User = mongoose.model('User', userSchema);

app.get("/", function(req,res){
    res.render("home")
}); 

app.get("/login", function(req,res){
    res.render("login", {errorMsgEmail : "", errorMsgPass : "" })
}); 


app.get("/register", function(req,res){

    res.render("register", {errorMsg : "" })
}); 

app.post("/register", function(req,res){

    const email = req.body.username
    const pass = req.body.password

    if (!email || !pass){
        console.log("Input files cannot be empty")
        res.redirect("/register")
    }
    else {
        searchEmailUser(email)
        .then(result => {
            if (result.length > 0)
            res.render("register", {errorMsg : "The email that you provided already exist in the database."})     
            else{
                bcrypt.hash(pass, saltRounds).then(result => {
                    registerUser(email, result)
                    .then(res.render("secrets"))
                    .finally(() => mongoose.connection.close());
                });
            }
        }) 
    }
}); 

app.post("/login", function(req,res){

    const email = req.body.username
    const pass = req.body.password

    if (!email || !pass){
        console.log("Input files cannot be empty")
        res.redirect("/login")
    }
    else{
        matchUsrAndPass(email)
        .then(result => {
            if (!result)
            res.render("login", {errorMsgEmail : "User dont exist in the database.", errorMsgPass: ""})   
            else{
                bcrypt.compare(pass, result.passwordUsr).then(function(result) {
                if (result === true)
                res.render("secrets")
                else
                res.render("login", {errorMsgEmail : "", errorMsgPass: "Password is incorrect"})
                });
            }
        })
        .finally(() => mongoose.connection.close());
    }
}); 



//////////////////////////////////////////MONGOOSE ASYNC FUNCTIONS//////////////////////////////////////////////


async function registerUser(email, pass){
    try {
        await mongoose.connect('mongodb://localhost:27017/userDB');
        console.log('Connected successfully to server');

        const user = new User({
            emailUsr: email,
            passwordUsr: pass
        })
        await user.save();
        
    } catch (error) {
        console.log(error)
    }
    
}

async function searchEmailUser(email){
    try {
        await mongoose.connect('mongodb://localhost:27017/userDB');
        console.log('Connected successfully to server');
        const searchResult = await User.find({emailUsr: email});

        return searchResult;
        
    } catch (error) {
        console.log(error) 
    }
    
}

async function matchUsrAndPass(email){
    try {
        await mongoose.connect('mongodb://localhost:27017/userDB');
        console.log('Connected successfully to server');
        const searchResult = await User.findOne({emailUsr: email});

        return searchResult;
        
    } catch (error) {
        console.log(error) 
    }
    
}





app.listen(port, function(){

    console.log(`Server is running and listengin at ${port}`);
});
