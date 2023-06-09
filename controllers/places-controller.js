const fs = require('fs');

const uuid = require('uuid').v4;
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const getCoordsForAddress = require('../util/location');
const Place = require('../models/place');
const User = require('../models/user');

async function getPlaceById(req, res, next) {
    const placeId = req.params.pid; //{pid: 'p1'}

    let place;
    try {
        place = await Place.findById(placeId);
    } catch (err) { //this is server error which may be cause by monogo
        const error = new HttpError(
            'Something went wrong, could not find a place.', 500
        );

        return next(error); //use to stop application
    }

    if (!place) {  //this error is due to error in providing placeId
        const error = new HttpError('Could not find a place for the provided id.', 404);
        return next(error);
    }

    res.json({ place: place.toObject({ getters: true }) }); //converted place to normal javascript object
}                                                         //getters: true is used to add id to each object by mongoose

async function getPlacesByUserId(req, res, next) {
    const userId = req.params.uid;

    let places;
    try {
        places = await Place.find({ creator: userId });
    } catch (err) {
        const error = new HttpError('Fetching places failed, please try again later', 500);
        return next(error);
    }


    if (!places || places.length === 0) {
        return next(
            new HttpError('Could not find places for the provided user id.', 404)
        );
    }

    res.json({ places: places.map(place => place.toObject({ getters: true })) });
}

async function createPlace(req, res, next) {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        console.log(errors);
        return next(new HttpError('Invalid inputs passed, please check your data', 422));
    }

    const { title, description, address } = req.body; //const title = req.body.title

    let coordinates;  //For getting coordinated based on address
    try {
        coordinates = await getCoordsForAddress(address);
    } catch (error) {
        return next(error);
    }


    const createdPlace = new Place({
        title,
        description,
        address,
        location: coordinates,
        image: req.file.path,
        creator: req.userData.userId
    });

    let user;

    try {
        user = await User.findById(req.userData.userId);

    } catch (err) {
        const error = new HttpError(
            'Creating place failed, please try again', 500
        )
        return next(error);
    }

    if (!user) {
        const error = new HttpError(
            'Could not find user for provided id', 404
        );
        return next(error);
    }

    console.log(user);

    try {
        const sess = await mongoose.startSession();  //if all the task in a session are successfull then only it will make changes
        sess.startTransaction();                     //if there is any error in any task then it will automatically roll back by mongoose
        await createdPlace.save({ session: sess });
        user.places.push(createdPlace);  //Adding places to particular user
        await user.save({ session: sess });
        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError(
            'Creating place failed, please try again',
            500
        );
        return next(error);
    }

    res.status(201).json({ place: createdPlace });
}

async function updatePlaceById(req, res, next) {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        console.log(errors);
        return next(
            new HttpError('Invalid inputs passed, please check your data', 422)
        )
    }

    const { title, description } = req.body;
    const placeId = req.params.pid;

    let place;
    try {
        place = await Place.findById(placeId);
    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not update place.', 500
        );
        return next(error);
    }

    if (place.creator.toString() !== req.userData.userId) { //Authorization , one who created place can only edit it
        const error = new HttpError(
            'You are not allowed to edit this place.', 401
        );
        return next(error);
    }

    place.title = title;
    place.description = description;

    try {
        await place.save();
    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not update place.', 500
        );
        return next(error);
    }

    res.status(200).json({ place: place.toObject({ getters: true }) });
}

async function deletePlace(req, res, next) {
    const placeId = req.params.pid;

    let place;
    try {
        place = await Place.findById(placeId).populate('creator');
    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not delete place.', 500
        );
        return next(error);
    }

    if (!place) {
        const error = new HttpError(
            'Could not find place for this id.', 404
        );
        return next(error);
    }

    if (place.creator.id !== req.userData.userId) { //Authorization , one who created place can only delete it
        const error = new HttpError(
            'You are not allowed to delete this place.', 401
        );
        return next(error);
    }

    const imagePath = place.image;

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await place.deleteOne({ session: sess });
        place.creator.places.pull(place); //pull will automatically remove the place from array
        await place.creator.save({ session: sess }); //Saving the user data
        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not delete place.', 500
        );
        return next(error);
    }

    fs.unlink(imagePath, (err) => {
        console.log(err);
    });

    res.status(200).json({ message: 'Deleted Place' });
}

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlaceById = updatePlaceById;
exports.deletePlace = deletePlace;

//req.params is used to take values from url
//res.json({place}) => javascript will convert it to {place: place};
//throw cancels the function eexecution while next does not
//so we need to return next else there there will be two things that will return and cause error
//we can use exports.name for multiple exports rather than module.exports
// ... is used to create a new copy of the same place
// const store the address of the object not the actual object that's why we can change it's value
//using express-validator, a third party library for validation

//populate allows us to refer to a document stored in different collection
//abd to work with data in that existing document of that collection
//to do so we need a relation between both collection which is established using "ref" we used earlier