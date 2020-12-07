const jwt = require("jsonwebtoken");

module.exports = (req,res,next) => {
    const authorization = req.get("Authorization");
    if(!authorization){
        req.isAuth = false;
        return next();
    }

    const token = authorization.split(" ")[1];
    let decodedToken;

    try{
        decodedToken = jwt.verify(token,"alitokensupersecretsecret");
    }catch(error){
        req.isAuth = false;
        return next();
    }

    if(!decodedToken){
        req.isAuth = false;
        return next();
    }

    req.userId = decodedToken.userId;
    req.isAuth = true;
    next();
}