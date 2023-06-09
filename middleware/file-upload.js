const multer = require('multer');
const uuid = require('uuid').v4;

const MIME_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
}

const fileUpload = multer({
    limits: 4000000, //in bytes here it is 4000Kb or 4Mb
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads/images') //cb(error , destination string)
        },
        filename: (req, file, cb) => {
            const ext = MIME_TYPE_MAP[file.mimetype]; //this gives us the extension 
            cb(null, uuid() + '.' + ext); //this generates random file name with correct extension
        }   //cb = callback , error = null
    }),
    fileFilter: (req, file, cb) => {
        const isValid = !!MIME_TYPE_MAP[file.mimetype]; // !! converts undefined to false if entry is not found in MIME_TYPE_MAP
        let error = isValid ? null : new Error('Invalid mime type!');
        cb(error, isValid);
    }
});

module.exports = fileUpload;

//Multer is a third party package use to upload package in backend
//It is a node/express middleware which makes easy file uploads