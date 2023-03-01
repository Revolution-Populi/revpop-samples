/*
 * Copyright (c) 2018-2023 Revolution Populi Limited, and contributors.
 *
 * The MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
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
