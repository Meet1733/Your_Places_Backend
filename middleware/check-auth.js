require('dotenv').config();

const jwt = require('jsonwebtoken');

const HttpError = require("../models/http-error");

module.exports = (req, res, next) => {
    if (req.method === 'OPTIONS') { //this will allow options request to continue 
        return next();              //browser first send option request then send other request like post
    }

    try {
        const token = req.headers.authorization.split(' ')[1]; //Authorization: 'Bearer TOKEN'

        if (!token) {
            throw new Error('Authentication failed!');
        }

        const decodedToken = jwt.verify(token, process.env.JWT_KEY); //it will return string or object i.e, payload
        req.userData = { userId: decodedToken.userId }; //when we created token, we have added userId in payload
        next();
    } catch (err) {
        const error = new HttpError(
            'Authentication failed',
            403
        )
        return next(error);
    }
}


//earlier we have allowed authorization header in app.js
//After spliting Authorization from space ' ', we will get array of two object
