const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const clearingImage = require("./utils/file");
const {graphqlHTTP} = require("express-graphql");
const path = require("path");

const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolvers");

const auth = require("./middleware/is_auth");

const app = express();

const storage = multer.diskStorage({
    destination: (req,file,cb) => {
        cb(null,"images")
    },
    filename: (req,file,cb) => {
        cb(null,new Date().toISOString() + "-" + file.originalname)
    }
})

const filter = (req,file,cb) => {
    if(file.mimetype === "image/png" || file.mimetype === "image/jpg" || file.mimetype === "image/jpeg"){
        cb(null,true)
    }else{
        cb(null,false)
    }
}

// bodyParser.urlencoded() is for x-www-urlencoded-form <form>
app.use(bodyParser.json()) // it is for transfering application/json
app.use("/images",express.static(path.join(__dirname,"images")))

app.use(multer({storage:storage,fileFilter:filter}).single("image"))

app.use((req,res,next) => {
    res.setHeader("Access-Control-Allow-Origin","*");
    res.setHeader("Access-Control-Allow-Methods","OPTIONS,POST,GET,PUT,DELETE,PATCH");
    res.setHeader("Access-Control-Allow-Headers","Content-Type,Authorization");
    if(req.method === "OPTIONS"){
        return res.sendStatus(200);
    }
    next();
})

app.use(auth);

app.put("/post-image",(req,res,next) => {
    if(!req.isAuth){
        throw new Error("Not authenticated!");
    }
    if(!req.file){
       return res.status(200).json({message: "File not provided!"});
    }
    if(req.body.oldPath){
        clearingImage(req.body.oldPath)
    }
    return res.status(201).json({message: "File stored",imageUrl:req.file.path})
})

app.use("/graphql",graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    customFormatErrorFn(err){
        if(!err.originalError){
            return err;
        }
        const data = err.originalError.data;
        const code = err.originalError.code || 500;
        const message = err.message || "An error has occured";
        return {message:message,data: data,status: code}
    }
}))

app.use((error,req,res,next) => {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
        message: error.message, data: error.data
    });
})


mongoose.connect("mongodb://localhost:27017/messages",{ useNewUrlParser: true,useUnifiedTopology: true })
.then(res => {
    app.listen(8080);
})
.catch(err => {
    err.statusCode = 500;
    next(err);
})


