const { google } = require('googleapis');
const credentials = require('./credentials.json');
const fs = require('fs')
require('dotenv').config();

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
const sheets = google.sheets({ version: 'v4', auth })

// Possible request params: https://developers.google.com/drive/api/v3/reference/files/list
const requestParams = {
    pageSize: 1,
    fields: 'files(name, webViewLink)'
};

// List files. All drive methods: https://developers.google.com/drive/api/v3/reference/
// drive.files.list(requestParams, (err, res) => {
//     if (err) throw err;
//     const files = res.data.files;
//     if (files.length) {
//         files.map((file) => {
//             console.log(file);
//         });
//     } else {
//         console.log(`No files found`);
//     }
// });

let data = 'Name,URL\n';

(async function () {
    let res = await new Promise((resolve, reject) => {
        drive.files.list({
            pageSize: 5,
            fields: 'files(name, webViewLink)',
            orderBy: 'createdTime desc'
        }, function (err, res) {
            if (err) {
                reject(err);
            } 
            resolve(res);
        });
    });
    console.log(res.data);

    // Create a new google sheet.
    // By default the service account will own any file created  
    let newSheet = await sheets.spreadsheets.create({
        resource: {
            properties: {
                title: 'A new day, a new sheet 1'
            }
        }
    });

    // Move the sheet to a chosen folder:
    const updatedSheet = await drive.files.update({
        fileId: newSheet.data.spreadsheetId,
        addParents: '1sOWTqtQiFQzhpOsjCxhTxci0A9Ok9Kjz',
        fields: 'id, parents'
    });

    // Transfer ownership of the created file:
    await drive.permissions.create({
        fileId: newSheet.data.spreadsheetId,
        transferOwnership: 'true',
        resource: {
            role: 'owner',
            type: 'user',
            emailAddress: process.env.EMAIL
        }
    });

    // Add data as new rows in google sheet (like the local version in CSV)
    let sheetData = [['File Name', 'URL']];
    res.data.files.map(entry => {
        const { name, webViewLink} = entry;
        sheetData.push([name, webViewLink]);
    });

    await sheets.spreadsheets.values.append({
        spreadsheetId: newSheet.data.spreadsheetId,
        valueInputOption: 'USER_ENTERED',
        range: 'A1',
        resource: {
            range: 'A1',
            majorDimension: 'ROWS',
            values: sheetData
        }
    });
    console.log('The file has been saved to Google Sheet');

    // Add styling to the google sheet data
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: newSheet.data.spreadsheetId,
        resource: {
            requests: [
                {
                    repeatCell: {
                        range: {
                            startRowIndex: 0,
                            endRowIndex: 1
                        },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: {
                                    red: 0.2,
                                    green: 0.2,
                                    blue: 0.2
                                },
                                textFormat: {
                                    foregroundColor: {
                                        red: 1, 
                                        green: 1,
                                        blue: 1
                                    },
                                    bold: true
                                }
                            }
                        },
                        fields: 'userEnteredFormat(backgroundColor,textFormat)'
                    }
                }
            ]
        }
    });

    // Back up data locally in CSV
    res.data.files.map(entry => {
        const { name, webViewLink } = entry;
        data += `${name},${webViewLink}\n`
    });
    fs.writeFile('data.csv', data, (err) => {
        if (err)  throw err;
        console.log('The file has been saved to CSV');
    });
})();




