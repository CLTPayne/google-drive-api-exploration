const { google } = require('googleapis');
const credentials = require('./credentials.json');

const scopes = [
    'https://www.googleapis.com/auth/drive'
];

// create a JSON Web Token object to pass as an argument when calling the Drive API
const auth = new google.auth.JWT(
    credentials.client_email, 
    null, 
    credentials.private_key, 
    scopes
);

const drive = google.drive({ version: 'v3', auth });

// passing an empty object as a default argument
drive.files.list({}, (err, res) => {
    if (err) throw err;
    const files = res.data.files;
    if (files.length) {
        files.map((file) => {
            console.log(file);
        });
    } else {
        console.log(`No files found`);
    }
});