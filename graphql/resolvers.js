const User = require("../models/user");
const Post = require("../models/post");
const bcrypt = require("bcryptjs");
const validator = require("validator").default;
const jwt = require("jsonwebtoken");
const clearingImage = require("../utils/file");

module.exports = {
  createUser: async function ({ userInput }, req) {
    // const email = args.userInput.email;
    const errors = [];
    if (!validator.isEmail(userInput.email)) {
      errors.push({ message: "E-Mail is not valid" });
    }
    if (
      !validator.isLength(userInput.password, { min: 5 }) ||
      !validator.isAlphanumeric(userInput.password) ||
      validator.isEmpty(userInput.password)
    ) {
      errors.push({ message: "Password is not valid" });
    }
    if (
      !validator.isLength(userInput.name, { min: 3 }) ||
      validator.isEmpty(userInput.name)
    ) {
      errors.push({ message: "Name is not valid" });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input!");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const existingUser = await User.findOne({ email: userInput.email });
    if (existingUser) {
      const error = new Error("Email is already exists!");
      throw error;
    }

    const hasPass = await bcrypt.hash(userInput.password, 12);

    const user = new User({
      email: userInput.email,
      name: userInput.name,
      password: hasPass,
    });
    const createdUser = await user.save();
    return {
      ...createdUser._doc,
      _id: createdUser._id.toString(),
    };
  },

  login: async function ({ email, password }) {
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("This user doesn't exist!");
      error.code = 404;
      throw error;
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("Authorization has failed!");
      error.code = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        email: email,
        userId: user._id.toString(),
      },
      "alitokensupersecretsecret",
      { expiresIn: "1h" }
    );

    return {
      userId: user._id.toString(),
      token: token,
    };
  },

  createPost: async function ({ postInput }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const errors = [];
    if (
      !validator.isLength(postInput.title, { min: 5 }) ||
      validator.isEmpty(postInput.title)
    ) {
      errors.push({ message: "Title format is not valid" });
    }
    if (
      !validator.isLength(postInput.content, { min: 10 }) ||
      validator.isEmpty(postInput.content)
    ) {
      errors.push({ message: "Content format is not valid" });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input!");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }

    const post = new Post({
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      creator: user,
    });

    const createdPost = await post.save();

    // add post to user posts
    user.posts.push(post);
    await user.save();

    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },

  posts: async function ({ page }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }

    if (!page) {
      page = 1;
    }

    const perPage = 2;

    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("creator");

    return {
      posts: posts.map((post) => {
        return {
          ...post._doc,
          _id: post._id.toString(),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
        };
      }),
      totalPosts: totalPosts,
    };
  },

  post: async function ({ id }, req) {
    if (!req.isAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(id).populate("creator");

    if (!post) {
        const error = new Error("Not Found Post!");
        error.code = 404;
        throw error;
      }

    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },

  updatePost: async function({id,postInput},req){
    if (!req.isAuth) {
        const error = new Error("Not authenticated!");
        error.code = 401;
        throw error;
    }

    const post = await Post.findById(id).populate("creator");

    if (!post) {
        const error = new Error("Not Found Post!");
        error.code = 404;
        throw error;
      }
      if(post.creator._id.toString() !== req.userId.toString()){
        const error = new Error("Not Permission Action!");
        error.code = 403;
        throw error;
      }

    const errors = [];
    if (
      !validator.isLength(postInput.title, { min: 5 }) ||
      validator.isEmpty(postInput.title)
    ) {
      errors.push({ message: "Title format is not valid" });
    }
    if (
      !validator.isLength(postInput.content, { min: 10 }) ||
      validator.isEmpty(postInput.content)
    ) {
      errors.push({ message: "Content format is not valid" });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input!");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    post.title = postInput.title;
    post.content = postInput.content;
    if(postInput.imageUrl !== "undefined"){
        post.imageUrl = postInput.imageUrl;
    }
    const updatedPost = await post.save();
    
    return {
        ...updatedPost._doc,
        _id: updatedPost._id.toString(),
        createdAt: updatedPost.createdAt.toISOString(),
        updatedAt: updatedPost.updatedAt.toISOString(),
      };
  },

  deletePost: async function({id},req){
    if (!req.isAuth) {
        const error = new Error("Not authenticated!");
        error.code = 401;
        throw error;
    }

    const post = await Post.findById(id);
    if (!post) {
        const error = new Error("Not Found Post!");
        error.code = 404;
        throw error;
    }
    if(post.creator._id.toString() !== req.userId.toString()){
        const error = new Error("Not Permission Action!");
        error.code = 403;
        throw error;
      }

    clearingImage(post.imageUrl);
    await Post.findByIdAndDelete(id);
    const user = await User.findById(req.userId);
    user.posts.pull(id);
    await user.save();
    return true;
  },

  user: async function(args,req){
    if (!req.isAuth) {
        const error = new Error("Not authenticated!");
        error.code = 401;
        throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
        const error = new Error("User Found Post!");
        error.code = 404;
        throw error;
    }

    return {
        ...user._doc, _id: user._id.toString()
    }
  },

  updateStatus: async function({status},req){
    if (!req.isAuth) {
        const error = new Error("Not authenticated!");
        error.code = 401;
        throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
        const error = new Error("User Found Post!");
        error.code = 404;
        throw error;
    }

    user.status = status;
    await user.save();

    return {
        ...user._doc, _id: user._id.toString()
    }
  }
};
