const Post = require("../models/post");
const {validationResult} = require("express-validator");
const fs = require("fs");
const path = require("path");
const User = require("../models/user");
const io = require("../socket");

exports.getPosts = (req,res,next) => {
    const currentPage = req.query.page || 1;
    const ITEM_PER_PAGE = 2;
    let totalItems;

    Post.find().countDocuments()
    .then(count => {
        totalItems = count;
        return Post.find()
        .populate("creator")
        .sort({
            createdAt:-1
        })
        .skip((currentPage -1) * ITEM_PER_PAGE)
        .limit(ITEM_PER_PAGE)
    })
    .then(posts => {
        res.status(200).json({
            posts:posts,
            totalItems: totalItems
        })
     })
    .catch(err => {
        if(!err.statusCode === 500){
            err.statusCode = 500;
        }
        error.message = "An error was occured! we're on fixing that"
        next(err);
    })
    
     
}

exports.createPost = (req,res,next) => {
    const title = req.body.title;
    const content = req.body.content;
    const image = req.file;

    let creator;

    const error = validationResult(req);
    if(!error.isEmpty()){
        const error = new Error("Validation was failed! entered data is incorrect")
        error.statusCode = 422;
        throw error;
    }

    if(!image){
        const error = new Error("No image provided")
        error.statusCode = 422;
        throw error;
    }

    const imageUrl = image.path;

    const post = new Post({
        title: title,
        content: content,
        imageUrl: imageUrl,
        creator: req.userId 
    });
    post.save()
    .then(result => {
        return User.findById(req.userId);
    })
    .then(user => {
        user.posts.push(post);
        creator = user;
        return user.save();
    })
    .then(result => {
        io.getIO().emit("posts",{
            action: "create",
            post: {...post._doc,creator: {_id: req.userId,name: result.name}}
        })
        res.status(201).json({
            message: "it has been saved!",
            post:post,
            creator: {userId: creator._id,name: creator.name}
        })
    })
    .catch(err => {
        if(!err.statusCode === 500){
            err.statusCode = 500;
        }
        error.message = "An error was occured! we're on fixing that"
        next(err);
    })
    
}

exports.getPost = (req,res,next) => {
    const postId = req.params.postId;
    
    Post.findById(postId)
    .then(post => {
        res.status(200).json({
            message: "Succeed getting specific post",
            post:post
        })
    })
    .catch(err => {
        if(!err.statusCode === 500){
            err.statusCode = 500;
        }
        error.message = "An error was occured! we're on fixing that"
        next(err);
    })
}

exports.updatePost = (req,res,next) => {
    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;

    const error = validationResult(req);
    if(!error.isEmpty()){
        const error = new Error("Validation was failed! entered data is incorrect")
        error.statusCode = 422;
        throw error;
    }

    if(req.file){
        imageUrl = req.file.path;
    }

    if(!imageUrl){
        const error = new Error("No image provided")
        error.statusCode = 422;
        throw error;
    }


    Post.findById(postId).populate("creator")
    .then(post => {
        if(!post){
            const error = new Error("There is no such post!");
            error.statusCode = 404;
            throw error;
        }

        if(post.creator._id.toString() !== req.userId){
            const error = new Error("UnAthenticated!");
            error.statusCode = 403;
            throw error;
        }

        if(imageUrl !== post.imageUrl){
            clearingImage(post.imageUrl)
        }

        post.title = title;
        post.content = content;
        post.imageUrl = imageUrl;
        post.creator.name = "ali"

        return post.save();   
    })
    .then(result => {
        io.getIO().emit("posts",{action: "update",post:result})
        res.status(200).json({
            message: "Post updated",
            post:result
        })
    })
    .catch(err => {
        if(!err.statusCode === 500){
            err.statusCode = 500;
        }
        error.message = "An error was occured! we're on fixing that"
        next(err);
    })
}

exports.deletePost = (req,res,next) => {
    const postId = req.params.postId;
    Post.findById(postId)
    .then(post => {
        if(!post){
            const error = new Error("There is no such post!");
            error.statusCode = 404;
            throw error;
        }
        if(post.creator.toString() !== req.userId){
            const error = new Error("UnAthenticated!");
            error.statusCode = 403;
            throw error;
        }
        const imageUrl = post.imageUrl;
        clearingImage(imageUrl);
        return Post.findByIdAndRemove(postId);
    })
    .then(result => {
        return User.findById(req.userId);
    })
    .then(user => {
        user.posts.pull(postId);
        return user.save();
    })
    .then(result => {
        io.getIO().emit("posts",{action: "delete", post:postId})
        res.status(200).json({
            message: "Post has been deleted!"
        });
    })
    .catch(err => {
        if(!err.statusCode === 500){
            err.statusCode = 500;
        }
        err.message = "An error was occured! we're on fixing that"
        next(err);
    })
}

const clearingImage = (imagePath) => {
    const filePath = path.join(__dirname,"..",imagePath)
    fs.unlink(filePath, err => {
        console.log(err);
    })
}