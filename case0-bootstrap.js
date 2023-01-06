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

require('dotenv').config();
const { PrivateKey } = require('@revolutionpopuli/revpopjs');
const revpop = require('./lib/revpop');

const common_accounts = [
    { nick: 'registrar', name: 'nathan' },
];

const committee_member_accounts = [
    { name: 'init0' },
    { name: 'init1' },
    { name: 'init2' },
    { name: 'init3' },
    { name: 'init4' },
    { name: 'init5' },
    { name: 'init6' },
    { name: 'init7' },
    { name: 'init8' },
    { name: 'init9' },
    { name: 'init10' },
];

async function connect_to_network() {
    const connect_string = process.env.BLOCKCHAIN_URL;
    console.log(`Connecting to ${connect_string}`);
    const network = await revpop.connect(connect_string);
    console.log(`Connected to network ${network.network_name}`);
    console.log(``);
}

async function close_network_connection() {
    console.log(`Disconnect from RevPop`);
    await revpop.disconnect();
}

async function init_accounts(accounts) {
    for (const account of accounts) {
        account.acc = await revpop.db_exec('get_account_by_name', account.name);
        account.key = PrivateKey.fromWif('5KXbCDyCPL3eGX6xX5uJHVwoAYheF7L5fKf67oQocgJA8kNvVHF');
        console.log(`Account ${account.nick ? account.nick + ' ' : ''}${account.name}: ${account.acc ? account.acc.id : '[no account yet]'}`);
    }
}

async function init_registrar(registrar) {
    console.log(`Getting balance ${revpop.config.balance_address}...`);
    const init_balance = await revpop.query_balance(revpop.config.balance_address);
    if (init_balance) {
        console.log(`Balance ${init_balance.owner} ${init_balance.id} ` +
            `${init_balance.balance.amount} ${init_balance.balance.asset_id}`);
        console.log(``);

        console.log(`Account ${registrar.acc.name} claim balance...`);
        await revpop.claim_balance(registrar, init_balance);
        console.log(`Balance of account ${registrar.acc.name} claimed`);
        console.log(``);

        console.log(`Upgrading registrar account ${registrar.acc.name}...`);
        await revpop.upgrade_account(registrar);
        console.log(`Registrar account ${registrar.acc.name} upgraded`);
        console.log(``);

    } else {
        console.log(`Balance ${revpop.config.balance_address} already claimed`);
        console.log(``);
    }
}

async function get_committee_member(committee_member_acc_name) {
    const committee_member = revpop.db_exec('get_committee_member_by_account', committee_member_acc_name);
    if (!committee_member) {
        throw new Error(`No committee_member with account ${committee_member_acc_name} found!`);
    }
    return committee_member;
}

async function get_committee_members(committee_member_names) {
    const committee_members_promises = [];
    for (const committee_member of committee_member_names) {
        committee_members_promises.push(get_committee_member(committee_member.name));
    }
    return Promise.all(committee_members_promises);
}

async function vote_for_committee_members(voter, committee_members) {
    if (committee_members[0].total_votes > 0) {
        console.log(`Committee members already voted`);
        return;
    }

    const new_options = JSON.parse(JSON.stringify(voter.acc.options));
    new_options.votes = committee_members.map(committee_member => committee_member.vote_id);
    new_options.votes.sort();
    new_options.num_committee = new_options.votes.length;
    new_options.num_witness = 0;
    await revpop.transaction(voter.key, 'account_update', {
        fee: revpop.no_fee(),
        account: voter.acc.id,
        new_options: new_options,
    });
}

async function transfer_to_accounts(issuer, accounts, amount) {
    const acc_balance = await revpop.db_exec('get_account_balances', accounts[0].name, []);
    if (acc_balance[0] !== undefined && acc_balance[0].amount > 0) {
        console.log(`Committee members balances already updated`);
        return;
    }

    let transfers = [];
    for (const account of accounts) {
        console.log(`Transfer ${amount} RVP to account ${account.name}`);
        transfers.push(revpop.transfer(issuer, account, amount));
    };
    await Promise.all(transfers);
}

async function prepare_registrar_and_committee() {
    console.log(`Initialize all accounts...`);
    await init_accounts(common_accounts);
    await init_accounts(committee_member_accounts);

    console.log(``);
    console.log(`Prepare registrar account...`);
    const [registrar] = common_accounts;
    await init_registrar(registrar);

    const committee_members = await get_committee_members(committee_member_accounts);

    console.log(`Voting for committee members ${JSON.stringify(committee_members.map(committee_member => committee_member.id))}...`);
    await vote_for_committee_members(registrar, committee_members);
    console.log(`OK`);
    console.log(``);

    console.log(`Update committee members balances to let them pay fee for operations...`);
    await transfer_to_accounts(registrar, committee_member_accounts, 10000 * 10 ** 5);
    console.log(`OK`);
    console.log(``);
}

async function case0_bootstrap() {
    try {
        await connect_to_network();

        await prepare_registrar_and_committee();

    } catch (err) {
        console.error(`Error:`, err);
        if (err.data && err.data.stack)
            console.error(err.data.stack);
        console.log(``);
    }
}

module.exports = {
    common_accounts,
    committee_member_accounts,
    case0_bootstrap,
    connect_to_network,
    close_network_connection,
    prepare_registrar_and_committee
}

if (require.main === module) {
    const { run_func } = require('./index');
    run_func(case0_bootstrap, close_network_connection);
}
