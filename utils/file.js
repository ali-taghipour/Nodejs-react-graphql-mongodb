const path = require("path");
const fs = require("fs");


const clearingImage = (imagePath) => {
    const filePath = path.join(__dirname,"..",imagePath)
    fs.unlink(filePath, err => {
        console.log(err);
    })
}

module.exports = clearingImage;