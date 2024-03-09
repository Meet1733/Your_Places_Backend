const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const firebase = require("firebase/compat/app");

const firebaseConfig = {
    apiKey: `${process.env.FB_API_KEY}`,
    authDomain: `${process.env.FB_AUTH_DOMAIN}`,
    projectId: `${process.env.FB_PROJECT_ID}`,
    storageBucket: `${process.env.FB_STORAGE_BUCKET}`,
    messagingSenderId: `${process.env.FB_MSG_SENDER_ID}`,
    appId: `${process.env.FB_APP_ID}`
};

firebase.initializeApp(firebaseConfig);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${process.env.FB_STORAGE_BUCKET_LINK}`

});

module.exports = admin;