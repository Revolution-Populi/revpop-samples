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

require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);
const { PrivateKey } = require('@revolutionpopuli/revpopjs');
const {
    encrypt_object,
    make_content_key,
    make_content_cipher_stream,
} = require('../lib/crypto');
const revpop = require('../lib/revpop');

async function sample_content_permission() {
    // Connect to blockchain
    const connect_string = process.env.BLOCKCHAIN_URL;
    console.log(`Connecting to ${connect_string}...`);
    const network = await revpop.connect(connect_string);
    console.log(`Connected to network ${network.network_name}`);
    console.log(``);

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

    // Encrypt/decrypty content in files
    {
        const content_key = make_content_key();
        const encrypted_content_key = encrypt_object(content_key, subject.key, subject.key.toPublicKey())
        console.log(`Content key: ${JSON.stringify(content_key)}`);
        console.log(`Content key encrypted by subject keys ${encrypted_content_key}`);
        console.log(``);

        const plaintext_input_file = path.join(__dirname, '../content/input.png');
        const ciphertext_output_file = path.join(__dirname, '../content/output.enc');

        console.log(`Encrypting file...`);
        await pipeline(
            fs.createReadStream(plaintext_input_file),
            make_content_cipher_stream(content_key),
            fs.createWriteStream(ciphertext_output_file)
        );
        console.log(`Done`);
        console.log(``);
    }

    // Create content card in blockchain
    {
        console.log(`Remove existing content cards, subject ${subject.name}...`);
        const content_cards = await revpop.get_all_content_cards(subject);
        for (const content_card of content_cards) {
            console.log(`Remove content card ${content_card.id}...`);
            await revpop.remove_content_card(subject, content_card.id);
        }
        console.log(``);
    }
    const content = { path: '../content/input.png' };
    {
        console.log(`Creating content card, subject ${subject.name}...`);
        content.path = path.join(__dirname, content.path);
        content.buffer = null; // create_content_card will load buffer from path
        content.hash = null; // create_content_card will compute hash from content buffer
        content.url = 'mongodb://' + content.nick;
        content.type = 'image/png';
        content.description = 'Some image';
        content.key = make_content_key();
        content.id = await revpop.create_content_card(subject, content);
        console.log(`Content card ${content.id} created`);
        console.log(``);
    }

    // Get all content cards
    let content_cards = null;
    {
        console.log(`Getting content cards, subject ${subject.name}...`);
        content_cards = await revpop.get_all_content_cards(subject);
        console.log(`Content cards (${content_cards.length}):`, content_cards);
        console.log(``);
    }

    // Update one content card
    {
        console.log(`Update content card ${content_cards[0].id}...`);
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
        console.log(`Getting content card by id ${content_cards[0].id}...`);
        const cc_by_id = await revpop.get_content_card(content_cards[0].id);
        console.log(`Content card:`, cc_by_id);
        console.log(``);
    }

    // Cleanup permissions
    {
        console.log(`Remove existing permissions, operator ${operator.name}...`);
        const perms = await revpop.get_all_permissions(operator);
        for (const perm of perms) {
            console.log(`Remove existing permission ${perm.id}...`);
            await revpop.remove_permission(subject, perm.id);
        }
        console.log(``);
    }

    // Create content permission
    {
        console.log(`Creating permission, subject ${subject.name}, operator ${operator.name}...`);
        const perm_create_res = await revpop.create_content_read_permission(subject, operator, content);
        console.log(`Permission ${perm_create_res} created`);
        console.log(``);
    }

    // Get all permissions
    let perms = null;
    {
        console.log(`Getting permissions, operator ${operator.name}...`);
        perms = await revpop.get_all_permissions(operator);
        console.log(`Permissions (${perms.length}):`, perms);
        console.log(``);
    }

    // Get permission by id
    {
        console.log(`Getting permission by id ${perms[0].id}...`);
        const perm_by_id = await revpop.get_permission(perms[0].id);
        console.log(`Permission:`, perm_by_id);
        console.log(``);
    }
}

async function finalizer() {
    console.log(`Disconnect from RevPop...`);
    await revpop.disconnect();
}

exports.sample_content_permission = sample_content_permission;
exports.finalizer = finalizer;

if (require.main === module) {
    const { run_func } = require('../index');
    run_func(sample_content_permission, finalizer);
}
