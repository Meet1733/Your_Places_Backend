require('dotenv').config();

const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');
const User = require('../models/user');

const admin = require('../firebase');
const { getStorage, ref, getDownloadURL } = require("firebase/storage");
const bucket = admin.storage().bucket();

async function getUsers(req, res, next) {

    let users;

    try {
        users = await User.find({}, '-password'); //It will only return email and name
    } catch (err) {
        const error = new HttpError(
            'Fetching users failed, please try again later.', 500
        );
        return next(error);
    }
    res.json({ users: users.map(user => user.toObject({ getters: true })) });
};

async function signup(req, res, next) {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        console.log(errors);
        return next(
            new HttpError('Invalid inputs passed, please check your data', 422)
        );
    }

    const { name, email, password } = req.body;

    let existingUser;
    try {
        existingUser = await User.findOne({ email: email })
    } catch (err) {
        const error = new HttpError(
            'Signing up failed, please try again later.', 500
        )
        return next(error);
    }


    if (existingUser) {
        const error = new HttpError(
            'User exists already, please login instead', 422
        )
        return next(error);
    }

    let hashedPassword;
    try {                                                 //12 salting round, which is basically strength of hash    
        hashedPassword = await bcrypt.hash(password, 12); //bcryptjs is a third party library which is used to hash the password
    } catch (err) {
        const error = new HttpError(
            'Could not create user, pleasae try again.',
            500
        );
        return next(error);
    }

    async function uploadFileToFirebaseStorage(localFilePath, destinationPath) {
        try {
            await bucket.upload(localFilePath, { destination: destinationPath });
            const downloadURL = await getDownloadURL(ref(getStorage(), destinationPath));
            return downloadURL
        } catch (err) {
            const error = new HttpError(
                'Error uploading file to firebase storage, please try again',
                500
            );
            return next(error);
        }
    }

    const fileName = req.file.filename;
    const localFilePath = './uploads/images/' + fileName;
    const destinationPath = 'users/' + fileName;
    const userImageURL = await uploadFileToFirebaseStorage(localFilePath, destinationPath);

    const createdUser = new User({
        name,  //name: name
        email,
        image: userImageURL,
        password: hashedPassword,
        places: []
    })

    try {
        await createdUser.save();  //.save is used by mongodb to create the data
    } catch (err) {
        const error = new HttpError(
            'Signing up failed, please try again',
            500
        );
        return next(error);
    }

    let token;

    try {
        token = jwt.sign(
            { userId: createdUser.id, email: createdUser.email }, //In jwt first argument is payload, which data we want to encode
            process.env.JWT_KEY, //second argument is private key which only server knows
            { expiresIn: '1h' }); //in third argument, we can configure the token like expire time
    } catch (err) {
        const error = new HttpError(
            'Signing up failed, please try again',
            500
        );
        return next(error);
    }

    res.status(201).json({ userId: createdUser.id, email: createdUser.email, token: token });
}

async function login(req, res, next) {
    const { email, password } = req.body;

    let existingUser;

    try {
        existingUser = await User.findOne({ email: email })
    } catch (err) {
        const error = new HttpError(
            'Logging in failed, please try again later.', 500
        )
        return next(error);
    }

    if (!existingUser) {
        const error = new HttpError(
            'Invalid credentials, could not login.', 403
        )
        return next(error);
    }

    let isValidPassword = false;
    try {
        isValidPassword = await bcrypt.compare(password, existingUser.password);
    } catch (err) {
        const error = new HttpError(
            'Could not log you in, please check your credentials and try again.',
            500
        );
        return next(error);
    }

    if (!isValidPassword) {
        const error = new HttpError(
            'Invalid credentials, could not login.', 403
        )
        return next(error);
    }

    let token;

    try {
        token = jwt.sign(
            { userId: existingUser.id, email: existingUser.email }, //In jwt first argument is payload, which data we want to encode
            process.env.JWT_KEY, //second argument is private key which only server knows
            { expiresIn: '1h' }); //in third argument, we can configure the token like expire time
    } catch (err) {
        const error = new HttpError(
            'Logging in failed, please try again',
            500
        );
        return next(error);
    }

    res.json({
        userId: existingUser.id,
        email: existingUser.email,
        token: token
    });
}

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;

//while login we check whether the hash password can be generated from entered password or not using bcryptjs
//Hash password is stored in database
//If user entered correct email and password then we will generate token
//for token we will use third party library jsonwebtoken(JWT)
//we never share private key with any clients
//private key should be same in login nd signup
