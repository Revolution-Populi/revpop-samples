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
const path = require('path');
const { PrivateKey } = require('@Revolution-Populi/revpopjs');
const { make_content_key } = require('./lib/crypto');
const revpop = require('./lib/revpop');

async function wait(ms) {
    console.log(`Waiting ${ms} milliseconds...`);
    await new Promise(resolve => setTimeout(resolve, ms));
    console.log(``);
}

async function sample_4_votes() {
    /*************************************************************************
     * Scenario:
     * Create content cards
     * Find witness to choose the master node
     * Vote for the content
     * Read and check the vote counter of the content
     * Share voting information with another account
     * Read voting information of another account
     *************************************************************************/

    // Connect to blockchain
    const connect_string = process.env.BLOCKCHAIN_URL;
    console.log(`Connecting to ${connect_string}...`);
    const network = await revpop.connect(connect_string);
    console.log(`Connected to network: ${network.network_name}`);
    console.log(``);

    ////////////////////////////////////////////////////////////////////////////////////////////
    // Init accounts:
    // Account A1 - creator of content C1 and C2
    // Account A2 - friend of A1, votes for C1
    // Account A3 - votes for C2
    // Account A4 - votes for C1
    ////////////////////////////////////////////////////////////////////////////////////////////
    const accounts = [
        { nick: 'A1', name: 'init1' },
        { nick: 'A2', name: 'init2' },
        { nick: 'A3', name: 'init3' },
        { nick: 'A4', name: 'init4' },
    ];
    const [ A1, A2, A3, A4 ] = accounts;
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

    ////////////////////////////////////////////////////////////////////////////////////////////
    // Cleanup all permissions, votes, content cards of all accounts
    ////////////////////////////////////////////////////////////////////////////////////////////
    {
        console.log(`Remove existing permissions...`);
        for (const operator_account of accounts) {
            const permissions = await revpop.get_all_permissions(operator_account);
            for (const permission of permissions) {
                const subject_account = accounts.find(account => account.acc.id == permission.subject_account);
                if (!subject_account) {
                    console.error(`Can not find subject account ${permission.subject_account} for permission ${permission.id}`);
                } else {
                    console.log(`Remove permission ${permission.id}...`);
                    await revpop.remove_permission(subject_account, permission.id);
                }
            }
        }
        console.log(``);
        console.log(`Remove existing votes...`);
        for (const subject_account of accounts) {
            const votes = await revpop.get_all_content_votes(subject_account);
            for (const vote of votes) {
                console.log(`Remove vote ${vote.id}...`);
                await revpop.remove_vote(subject_account, vote.id);
            }
        }
        console.log(``);
        console.log(`Remove existing content cards...`);
        for (const subject_account of accounts) {
            const content_cards = await revpop.get_all_content_cards(subject_account);
            for (const content_card of content_cards) {
                console.log(`Remove content card ${content_card.id}...`);
                await revpop.remove_content_card(subject_account, content_card.id);
            }
        }
        console.log(``);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////
    // Account A1 creates content C1 and С2
    ////////////////////////////////////////////////////////////////////////////////////////////
    const contents = [
        { nick: 'C1', path: 'content/input.png'  },
        { nick: 'C2', path: 'content/input2.png' },
    ];
    const [ C1, C2 ] = contents;
    for (const content of contents) {
        console.log(`Creating content card of ${content.nick}, subject ${A1.nick}...`);
        content.path = path.join(__dirname, content.path);
        content.buffer = null; // create_content_card will load buffer from path
        content.hash = null; // create_content_card will compute hash from content buffer
        content.url = 'mongodb://' + content.nick;
        content.type = 'image/png';
        content.description = 'Some image';
        content.key = make_content_key();
        content.id = await revpop.create_content_card(A1, content);
        console.log(`Content card ${content.id} created`);
        console.log(``);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////
    // Voting process
    ////////////////////////////////////////////////////////////////////////////////////////////

    // Get master node
    const master_account_id = await revpop.get_current_witness_id();

    // A2 votes for C1
    {
        console.log(`${A2.nick} votes for ${C1.nick}...`);
        const vote1_id = await revpop.create_vote(A2, C1, master_account_id);
        console.log(`Vote ${vote1_id} created`);
        console.log(``);
    }

    // A3 votes for C2
    {
        console.log(`${A3.nick} votes for ${C2.nick}...`);
        const vote2_id = await revpop.create_vote(A3, C2, master_account_id);
        console.log(`Vote ${vote2_id} created`);
        console.log(``);
    }

    // Wait for a new block
    await wait(6000);

    // Assert votes counter of C1 equals 0
    {
        console.log(`Getting content votes counter of ${C1.nick}...`);
        const cc11 = await revpop.get_content_card(C1.id);
        console.log(`${C1.nick} vote counter:`, cc11.vote_counter);
        console.log(``);
        assert.equal(cc11.vote_counter, 0);
    }

    // A4 votes for C1
    {
        console.log(`${A4.nick} votes for ${C1.nick}...`);
        const vote3_id = await revpop.create_vote(A4, C1, master_account_id);
        console.log(`Vote ${vote3_id} created`);
        console.log(``);
    }

    // Wait for a new block
    await wait(6000);

    // Assert votes counter of C1 is equals 2
    {
        console.log(`Getting content votes counter of ${C1.nick}...`);
        const cc12 = await revpop.get_content_card(C1.id);
        console.log(`${C1.nick} vote counter:`, cc12.vote_counter);
        console.log(``);
        assert.equal(cc12.vote_counter, 2);
    }

    // Create votes read permission from A2 to A1
    {
        console.log(`Creating votes read permission from ${A2.nick} to ${A1.nick}...`);
        const permission_id = await revpop.create_votes_read_permission(A2, A1);
        console.log(`Votes read permission ${permission_id} created`);
        console.log(``);
    }

    // A1 takes votes of A2 and asserts A2 votes for C1
    {
        console.log(`Getting votes read permission from ${A1.nick} to ${A1.nick}...`);
        const votes_key = await revpop.get_votes_read_permission_key(A2, A1);
        assert.notEqual(votes_key, null);
        console.log(`Votes read permission found`);
        console.log(``);
        console.log(`Enumerating ${A2.nick} votes...`);
        const votes_content_ids = await revpop.get_content_votes_content_ids(A2, votes_key);
        console.log(`Found ${votes_content_ids.length} vote(s): ${JSON.stringify(votes_content_ids)}`);
        console.log(``);
        assert.equal(votes_content_ids.length, 1);
        assert.equal(votes_content_ids[0], C1.id);
    }
}

async function finalizer() {
    console.log(`Disconnect from RevPop...`);
    await revpop.disconnect();
}

exports.sample_votes = sample_4_votes;
exports.finalizer = finalizer;

if (require.main === module) {
    const { run_func } = require('./index');
    run_func(sample_4_votes, finalizer);
}
