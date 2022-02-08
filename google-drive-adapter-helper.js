/**
 * The Revolution Populi Project
 * Copyright (C) 2020 Revolution Populi Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * 
 */

const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const TOKEN_PATH = 'google_token.json';

async function getGoogleOAuth2Client() {
    let credentials;

    try {
        credentials = fs.readFileSync(process.env.GOOGLE_OAUTH2_KEYS)
    } catch (err) {
        console.log('Error loading client secret file. Google Drive test will be skipped.'.yellow);
        return null;
    }

    return await authorize(JSON.parse(credentials));
}

async function authorize(credentials) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    try {
        const token = fs.readFileSync(TOKEN_PATH);
        oAuth2Client.setCredentials(JSON.parse(token));
        return oAuth2Client;
    } catch (err) {
        return await getAccessToken(oAuth2Client);
    }
}

async function getAccessToken(oAuth2Client) {
    const authorizeUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/drive.file',
    });
    console.log('Authorize this app by visiting this url:'.green, authorizeUrl);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    process.stdout.write('Enter the code from that page here: '.green);

    let code;

    for await (const line of rl) {
        code = line;
        break;
    }

    if (undefined === code || !code.trim()) {
        throw('Empty code value.');
    }

    try {
        const response = await oAuth2Client.getToken(code);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(response.tokens));
        return oAuth2Client;
    } catch (error) {
        throw('Error retrieving access token.');
    }
}

module.exports = {
    getGoogleOAuth2Client
}

exports.getGoogleOAuth2Client = getGoogleOAuth2Client;

if (require.main === module) {
    getGoogleOAuth2Client();
}
