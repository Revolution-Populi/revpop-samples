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
const { PrivateKey } = require('@revolutionpopuli/revpopjs');
const revpop = require('./lib/revpop');

async function get_committee_member(committee_member_acc_name) {
    const committee_member = revpop.db_exec('get_committee_member_by_account', committee_member_acc_name);
    if (!committee_member) {
        throw new Error(`No committee_member with account ${committee_member_acc_name} found!`);
    }
    return committee_member;
}

async function get_committee_memberes(committee_memberes_acc_names) {
    const committee_memberes_promises = [];
    for (const committee_memberes_acc_name of committee_memberes_acc_names) {
        committee_memberes_promises.push(get_committee_member(committee_memberes_acc_name));
    }
    return await Promise.all(committee_memberes_promises);
}

async function vote_for_committee_memberes(voter, committee_memberes_acc_names) {
    const committee_memberes = await get_committee_memberes(committee_memberes_acc_names);
    const new_options = JSON.parse(JSON.stringify(voter.acc.options));
    new_options.votes = committee_memberes.map(committee_member => committee_member.vote_id);
    new_options.votes.sort();
    new_options.num_committee = new_options.votes.length;
    new_options.num_witness = 0;
    await revpop.transaction(voter.key, 'account_update', {
        fee: revpop.no_fee(),
        account: voter.acc.id,
        new_options: new_options,
    });
}

async function transfer_to_committee_memberes(issuer, committee_memberes_acc_names, amount) {
    let transfers = [];
    for (const committee_member_name of committee_memberes_acc_names) {
        console.log(`Transfer ${amount} RVP to account ${committee_member_name}...`);
        const to = {};
        to.acc = await revpop.db_exec('get_account_by_name', committee_member_name);;
        transfers.push(revpop.transfer(issuer, to, amount));
    };
    await Promise.all(transfers);
}

async function case4_setup_committee() {
    try {
        const connection_string = process.env.BLOCKCHAIN_URL;
        console.log(`Connecting to ${connection_string}...`);
        const network = await revpop.connect(connection_string);
        console.log(`Connected to network ${network.network_name}`);
        console.log(``);

        // run init script if not done before
        if (await revpop.query_balance(revpop.config.balance_address)) {
            require('child_process').spawnSync(process.execPath, ['case0-bootstrap'], {stdio: [0, 1, 2]});
        }

        console.log(`Initialize all accounts...`);
        const accounts = [
            { nick: 'voter', name: 'nathan' },
        ];
        const [ voter ] = accounts;
        for (const account of accounts) {
            account.acc = await revpop.db_exec('get_account_by_name', account.name);
            account.key = PrivateKey.fromWif('5KXbCDyCPL3eGX6xX5uJHVwoAYheF7L5fKf67oQocgJA8kNvVHF');
            console.log(`Account ${account.nick} ${account.name} ${account.acc ? account.acc.id : '[no account yet]'}`);
        }
        console.log(``);

        const committee_memberes_acc_names = [ 'init0', 'init1', 'init2', 'init3', 'init4', 'init5', 'init6', 'init7', 'init8', 'init9', 'init10' ];
        const committee_memberes_ids = (await get_committee_memberes(committee_memberes_acc_names)).map(committee_member => committee_member.id);

        console.log(`Voting for committee_memberes ${JSON.stringify(committee_memberes_ids)}...`);
        await vote_for_committee_memberes(voter, committee_memberes_acc_names);
        await transfer_to_committee_memberes(voter, committee_memberes_acc_names, 10000 * 10**5);
        console.log(`OK`);
        console.log(``);

    } catch (err) {
        console.error(`Error:`, err);
        if (err.data && err.data.stack)
            console.error(err.data.stack);
        console.log(``);
    }

    console.log(`Close connection`);
    await revpop.disconnect();
    console.log(``);
}

exports.case4_setup_committee = case4_setup_committee;

if (require.main === module) {
    case4_setup_committee();
}
