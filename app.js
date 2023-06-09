require('dotenv').config();

const fs = require('fs');
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const placesRoutes = require('./routes/places-routes');
const usersRoutes = require('./routes/users-routes');
const HttpError = require('./models/http-error');

const app = express();

app.use(bodyParser.json());

app.use('/uploads/images', express.static(path.join('uploads', 'images'))) //built in express middleware which just return the requested file

app.use((req, res, next) => {  //used to solve error provided by browser 
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE');
    next();
})

app.use('/api/places', placesRoutes); // /api/places/...
app.use('/api/users', usersRoutes);

app.use((req, res, next) => {  //this is for route errors
    const error = new HttpError('Could not find this route', 404);
    throw error;
});

app.use((error, req, res, next) => {  //will run if any middleware causes error
    if (req.file) {
        fs.unlink(req.file.path, (err) => {  //if there is any error, we will not store the file i.e, image and delete it
            console.log(err);
        })
    }

    if (res.headerSent) {
        return next(error);
    }

    res.status(error.code || 500);
    res.json({ message: error.message || 'An unknown error occured!' });
})

mongoose
    .connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.sodeu1r.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`)
    .then(() => {
        app.listen(process.env.PORT || 5000);
    })
    .catch(err => {
        console.log(err);
    });

//express will only forward to placesRoutes if the request is /api/places
//If we provide 4 parameters to middleware function then express will recognize it as a special function
//as error handling middleware function

//If connection to mongoose is successfull then we will start our backend server

//According to browser the request from api should also be from the same server
//So to solve this we wrote three res.headers