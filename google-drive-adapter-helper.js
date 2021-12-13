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
const path = require('path');
const revpop = require('./lib/revpop');
const { google } = require('googleapis');
const http = require('http');
const opn = require('opn');
const url = require('url');
const destroyer = require('server-destroy');

// Download your OAuth2 configuration from the Google
// To work with Google Drive one should obtain credentials for web applications
// Download and store them to file, pointed in the env variable GOOGLE_OAUTH2_KEYS
// See google_oauth2_keys.json
// Start from here:
// https://developers.google.com/identity/protocols/oauth2

const keys = require(process.env.GOOGLE_OAUTH2_KEYS);

/**
 * Create a new OAuth2Client, and go through the OAuth2 content
 * workflow.  Return the full client to the callback.
 */
function getAuthenticatedClient() {
    return new Promise((resolve, reject) => {
        // create an oAuth client to authorize the API call.  Secrets are kept in a `keys.json` file,
        // which should be downloaded from the Google Developers Console.
        const oAuth2Client = new google.auth.OAuth2(
            keys.web.client_id,
            keys.web.client_secret,
            keys.web.redirect_uris[0]
        );

        // Generate the url that will be used for the consent dialog.
        const authorizeUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://www.googleapis.com/auth/drive.file',
        });

        // Open an http server to accept the oauth callback. In this simple example, the
        // only request to our webserver is to /oauth2callback?code=<code>
        const server = http
            .createServer(async (req, res) => {
                try {
                    if (req.url.indexOf('/oauth2callback') > -1) {
                        // acquire the code from the querystring, and close the web server.
                        const qs = new url.URL(req.url, 'http://localhost:3000')
                            .searchParams;
                        const code = qs.get('code');
                        console.log(`Code is ${code}`);
                        res.end('Authentication successful! Please return to the console.');
                        server.destroy();

                        // Now that we have the code, use that to acquire tokens.
                        const r = await oAuth2Client.getToken(code);
                        // Make sure to set the credentials on the OAuth2 client.
                        oAuth2Client.setCredentials(r.tokens);
                        console.info('Tokens acquired.');
                        resolve(oAuth2Client);
                    }
                } catch (e) {
                    reject(e);
                }
            })
            .listen(3000, () => {
                // open the browser to the authorize url to start the workflow
                opn(authorizeUrl, { wait: false }).then(cp => cp.unref());
            });
        destroyer(server);
    });
}

/**
 * Check if we have previously stored a token.
 * If it exist and not expired
 */
async function authWithStoredToken() {
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) {
            return false;
        } else {
            // TODO: Check token expiration

            // After acquiring an access_token, you may want to check on the audience, expiration,
            // or original scopes requested.  You can do that with the `getTokenInfo` method.
            const tokenInfo = oAuth2Client.getTokenInfo(token);
            console.log(tokenInfo);

            // Load client secrets from a local file.
            fs.readFile(CREDENTIAL_PATH, (err, content) => {
                if (err) return console.log('Error loading client secret file:', err);

                const { client_secret, client_id, redirect_uris } = JSON.parse(content).web;
                const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

                oAuth2Client.setCredentials(JSON.parse(token));
                return oAuth2Client;
            });
        }
    });
}


async function getGoogleoAuth2Client() {
    if (keys.web.client_id.includes("000000000000-here-should-be-real-client-id")) {
        console.error('Please fill in google_oauth2_keys.json with real client_id, project_id and client_secret');
        return null;
    }
    // TODO: Add saving token and read stored token before obtaining new one
    // authWithStoredToken();
    const oAuth2Client = await getAuthenticatedClient();
    return oAuth2Client;
}

module.exports = {
    getGoogleoAuth2Client
}

exports.getGoogleoAuth2Client = getGoogleoAuth2Client;

if (require.main === module) {
    getGoogleoAuth2Client();
}
