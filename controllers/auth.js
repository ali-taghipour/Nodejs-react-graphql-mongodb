const {validationResult} = require("express-validator");
const bcript = require("bcryptjs");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

exports.putSignup = (req,res,next) => {
    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;

    console.log(email,password,name)

    const errors = validationResult(req);
    if(!errors.isEmpty()){
        const error = new Error("validation failed");
        error.statusCode = 422;
        error.data = error;
        throw error;
    }

    bcript.hash(password,12).then(hashPassword => {
        const user = new User({
            name: name,
            email: email,
            password:hashPassword
        });
        return user.save();
    })
    .then(user => {
        res.status(201).json({
            message: "User has been creaated!",
            userId: user._id
        })
    }).catch(error => {
        error.statusCode = 500;
        error.message = "server side error";
        next(error)
    })
}

exports.postLogin = (req,res,next) => {
    const email = req.body.email;
    const password = req.body.password;
    let loadedUser;
    User.findOne({email:email}).then(user => {
        if(!user){
            const error = new Error("user with this email could not be found");
            error.statusCode = 401;
            throw error;
        }
        loadedUser = user;

        return bcript.compare(password,user.password);
    })
    .then(isEqual => {
        if(!isEqual){
            const error = new Error("Wrong password!");
            error.statusCode = 401;
            throw error;
        }

        const token = jwt.sign({
            email: loadedUser.eamil,
            userId: loadedUser._id.toString()
        },"alijwtsupersupersecret",{expiresIn:"1h"})
        
        res.status(200).json({token: token, userId: loadedUser._id.toString()})
    })
    .catch(error => {
        if(!error.statusCode){
            error.statusCode = 500;
        }
        next(error);
    })
}


