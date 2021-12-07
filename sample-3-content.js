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

require('dotenv').config();
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { CloudStorage, GoogleDriveAdapter, IPFSAdapter, PrivateKey } = require('@revolutionpopuli/revpopjs');
const { make_content_key, decrypt_object, decrypt_content } = require('./lib/crypto');
const revpop = require('./lib/revpop');
const google_drive = require('./google-drive-adapter-helper.js');
const bootstrap = require('./case0-bootstrap.js');
const axios = require('axios');

async function sample_3_content_ipfs() {
    return sample_3_content(new IPFSAdapter(process.env.CLOUD_URL));
}

async function sample_3_content_google_drive() {
    const oAuth2Client = await google_drive.getGoogleoAuth2Client();
    return sample_3_content(new GoogleDriveAdapter({ auth: oAuth2Client, folder: "revpop" }));
}

async function sample_3_content(adapter) {
    /*************************************************************************
     * Scenario:
     * Save the encrypted content to the cloud storage
     * Remove the content card
     * Create the content card
     * Remove the permission
     * Create the permission
     * Read the permission
     * Read the content card
     * Load the encrypted content from the cloud storage
     * Update+read the content card
     *************************************************************************/

    await bootstrap.connect_to_network();
    await bootstrap.prepare_registrar_and_committee();

    const original_input_file = path.join(__dirname, 'content/input.png');
    const original_content_buf = fs.readFileSync(original_input_file);

    // Initialize accounts
    const accounts = [
        { nick: 'subject' , name: 'init1' },
        { nick: 'operator', name: 'init2' },
    ];
    const [ subject, operator ] = accounts;
    {
        console.log(`Initialize all accounts...`);
        for (const account of accounts) {
            account.acc = await revpop.db_exec('get_account_by_name', account.name);
            account.key = PrivateKey.fromWif('5KXbCDyCPL3eGX6xX5uJHVwoAYheF7L5fKf67oQocgJA8kNvVHF');
            account.votes_key = make_content_key();
            console.log(`Account ${account.nick} ${account.name} ${account.acc.id}`);
        }
        console.log(``);
    }

    const storage = new CloudStorage(adapter);
    await storage.connect();

    // Save encrypted content to cloud storage
    const save_content_key = make_content_key();
    let save_content_result = null;
    {
        console.log(`Save encrypted content to cloud storage...`);
        save_content_result = await storage.crypto_save_content(original_content_buf, save_content_key);
        assert.notEqual(save_content_result, '');
        console.log(`Encrypted content saved, url ${save_content_result.url}`);
        console.log(``);
    }

    // Download saved content by link
    {
        console.log(`Download encrypted content from cloud storage by url: ${save_content_result.url}`);

        try {
            const response = await axios.get(save_content_result.url, { responseType:  'arraybuffer' });
            // console.log(`Content loaded, length ${response.data.length}`);
            const load_content_buf = decrypt_content(response.data, save_content_key)
            assert.equal(Buffer.compare(load_content_buf, original_content_buf), 0);
        } catch (error) {
            assert.fail(`Failed to download content file: ` + error.message);
        }
        console.log(`Content downloaded, successfully.`);
        console.log(``);
     }

    // Remove existing content cards
    {
        console.log(`Remove existing content cards, subject ${subject.name}...`);
        const content_cards = await revpop.get_all_content_cards(subject);
        for (const content_card of content_cards) {
            console.log(`Remove content card ${content_card.id}...`);
            await revpop.remove_content_card(subject, content_card.id);
        }
        console.log(``);
    }

    // Create content card
    const content = { path: 'content/input.png' };
    {
        console.log(`Creating content card, subject ${subject.name}...`);
        content.path = path.join(__dirname, content.path);
        content.buffer = null; // create_content_card will load buffer from path
        content.hash = null; // create_content_card will compute hash from content buffer
        content.url = save_content_result.url;
        content.type = 'image/png';
        content.description = 'Some image';
        content.key = save_content_key;
        content.storage_data = save_content_result.storage_data;
        content.id = await revpop.create_content_card(subject, content);
        console.log(`Content card ${content.id} created`);
        console.log(``);
    }

    // Remove existing permissions
    {
        console.log(`Remove existing permissions, operator ${operator.name}...`);
        const perms = await revpop.get_all_permissions(operator);
        for (const perm of perms) {
            console.log(`Remove existing permission ${perm.id}...`);
            await revpop.remove_permission(subject, perm.id);
        }
        console.log(``);
    }

    // Create permission
    {
        console.log(`Creating permission, subject ${subject.name}, operator ${operator.name}...`);
        const perm_create_res = await revpop.create_content_read_permission(subject, operator, content);
        console.log(`Permission ${perm_create_res} created`);
        console.log(``);
    }

    // Read permission
    let load_permission = null;
    {
        console.log(`Read permission, operator ${operator.name}...`);
        const perms = await revpop.get_all_permissions(operator);
        load_permission = perms[0];
        console.log(`Permissions (${perms.length}):`, perms);
        console.log(``);
    }

    // Read content card
    let load_content_card = null;
    {
        const content_card_id = load_permission.object_id;
        console.log(`Read content card by id ${content_card_id}...`);
        load_content_card = await revpop.get_content_card(content_card_id);
        console.log(`Content card:`, load_content_card);
        console.log(``);
    }

    // Load encrypted content from cloud storage
    const storage_data = JSON.parse(load_content_card.storage_data);
    const content_id = storage_data[2];
    {
        console.log(`Load encrypted content from cloud storage...`);
        const load_content_key = decrypt_object(load_permission.content_key, subject.key.toPublicKey(), operator.key);
        const load_content_buf = await storage.crypto_load_content(content_id, load_content_key);
        assert.equal(Buffer.compare(load_content_buf, original_content_buf), 0);
        console.log(`Content loaded, length ${load_content_buf.length}`);
        console.log(``);
    }

    // Update one content card
    {
        console.log(`Update content card ${load_content_card.id}...`);
        const content2 = { ...content };
        //content2.hash = ; // hash must be the same
        content2.url = "mongodb://222222";
        content2.type = "jpg";
        content2.description = "Some next image";
        content2.content_key = "333333";
        const cc_update_res = await revpop.update_content_card(subject, content2);
        console.log(`Content card ${cc_update_res} updated`);
        console.log(``);
    }

    // Get content card by id
    {
        console.log(`Getting content card by id ${load_content_card.id}...`);
        const cc_by_id = await revpop.get_content_card(load_content_card.id);
        console.log(`Content card:`, cc_by_id);
        console.log(``);
    }

    // Delete content from cloud storage...
    {
        const res = await storage.del(content_id);
        assert.equal(res, true);
        console.log(`Content deleted from cloud storage`);
        console.log(``);
    }

    await storage.disconnect();
}

async function finalizer() {
    console.log(`Disconnect from RevPop...`);
    await revpop.disconnect();
}

exports.sample_content_permission = sample_3_content_ipfs;
exports.sample_3_content_google_drive = sample_3_content_google_drive;
exports.finalizer = finalizer;

if (require.main === module) {
    const { run_func } = require('./index');
    run_func(sample_3_content_ipfs, finalizer);
    run_func(sample_3_content_google_drive, finalizer);
}
