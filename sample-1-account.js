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
const { PrivateKey } = require('@revolutionpopuli/revpopjs');
const { create_common_account_keys } = require('./lib/keys');
const revpop = require('./lib/revpop');
const pk = PrivateKey.fromWif('5KXbCDyCPL3eGX6xX5uJHVwoAYheF7L5fKf67oQocgJA8kNvVHF');

async function sample_1_account() {
    /*************************************************************************
     * Scenario:
     * Generate private/public keys according to Bitshares wallet scheme
     * Get balance object and claim balance by registrar account
     * Upgrade registrar account
     * Create a new user account with keys generated
     *************************************************************************/

    // Connect to blockchain
    const connect_string = process.env.BLOCKCHAIN_URL;
    console.log(`Connecting to ${connect_string}...`);
    const network = await revpop.connect(connect_string);
    console.log(`Connected to network ${network.network_name}`);
    console.log(``);

    // Wallet command:
    // create_account_with_brain_key "DAWUT BULLBAT CONGEAL PRIUS AMBAN SWAYFUL STROW ROUTER MOSTLY PUNTO FALTCHE WARSEL INSERT CINEMA MORONRY BURO" new nathan nathan true true
    // generates sample account with these keys:
    const sample_wallet_keys = {
        brain_key: "DAWUT BULLBAT CONGEAL PRIUS AMBAN SWAYFUL STROW ROUTER MOSTLY PUNTO FALTCHE WARSEL INSERT CINEMA MORONRY BURO",
        owner: {
            priv_key: "5JUR92r9BhKFwFXmkNDn26VURTaNouuCB9RKv4YdJGxuvDU8dXw",
            pub_key: "RVP5THrbGQG65FYCmyYxZPfkmZSyQw8LXv6JJd2pSuAri3znxgVzC",
        },
        active: {
            priv_key: "5JbUcrw6SawrNBFADoSvHX8mxGgWgWaywEwEeV4gaktbcwUHCB2",
            pub_key: "RVP8S63oDiWRUUgrgvnVqpZbgcrmhNWsJ2EFbow1PtTPkfGagZkqT",
        },
        memo: {
            priv_key: "5JBzaA9XLpyMCKsympdRd1kec5x1xUqmPnfCMHGSXTiVPQFiKmj",
            pub_key: "RVP5FnB8fWetaBDmYoPQkDtazxU1mvZHiApXHSRrkuiNSTnxcsji1",
        },
    };

    // Generate account keys with js lib and check its:
    console.log(`Regenerate new account keys from brain key...`);
    const testuser_keys = create_common_account_keys(sample_wallet_keys.brain_key);
    console.log(`Owner key: ${testuser_keys.owner.toWif()} ${testuser_keys.owner.toPublicKey().toString()}`);
    assert.equal(testuser_keys.owner.toWif(), sample_wallet_keys.owner.priv_key);
    console.log(`Active key: ${testuser_keys.active.toWif()} ${testuser_keys.active.toPublicKey().toString()}`);
    assert.equal(testuser_keys.active.toWif(), sample_wallet_keys.active.priv_key);
    console.log(`Memo key: ${testuser_keys.memo.toWif()} ${testuser_keys.memo.toPublicKey().toString()}`);
    assert.equal(testuser_keys.memo.toWif(), sample_wallet_keys.memo.priv_key);
    console.log(``);

    // Initialize accounts
    console.log(`Initialize all accounts...`);
    const registrar = {
        nick: 'registrar',
        name: 'nathan',
        acc: await revpop.db_exec('get_account_by_name', 'nathan'),
        key: pk
    };
    console.log(`Account ${registrar.nick} ${registrar.name} ${registrar.acc.id}`);
    const testuser = {
        nick: 'testuser',
        name: 'testuser' + Date.now(),
        acc: await revpop.db_exec('get_account_by_name', 'testuser'),
        owner_key : testuser_keys.owner,
        active_key : testuser_keys.active,
        memo_key : testuser_keys.memo,
        key: testuser_keys.active
    };
    console.log(`Account ${testuser.nick} ${testuser.name} ${testuser.acc ? testuser.acc.id : '[no account yet]'}`);
    console.log(``);

    const init1 = {
        nick: 'init1',
        name: 'init1',
        acc: await revpop.db_exec('get_account_by_name', 'init1'),
        key: pk
    };

    // Get balance object and claim it if any and upgrade registrar account
    console.log(`Getting balance ${revpop.config.balance_address}...`);
    const balances = await revpop.db_exec("get_balance_objects", [ revpop.config.balance_address ]);
    if (balances.length < 1) {
        console.log(`No balance found! Maybe registrar account ${registrar.acc.name} already claimed it?`);
        console.log(``);
    } else {
        const init_balance = balances[0];
        console.log(`Balance: ${init_balance.owner} ${init_balance.id} ` +
                    `${init_balance.balance.amount} ${init_balance.balance.asset_id}`);
        console.log(``);
    
        console.log(`Registrar account ${registrar.acc.name} claiming balance...`);
        await revpop.claim_balance(registrar, init_balance);
        console.log(`Balance is claimed by registrar account ${registrar.acc.name}`);
        console.log(``);

        // Upgrade registrar account
        console.log(`Upgrading registrar account ${registrar.acc.name}...`);
        await revpop.upgrade_account(registrar);
        console.log(`Registrar account ${registrar.acc.name} upgraded`);
        console.log(``);

        // Add balance to demo account
        console.log(`Transfer RVP to account ${init1.acc.name}...`);
        await revpop.transfer(registrar, init1, 1000 * 10**5);
        console.log(``);
    }

    // Create new account
    console.log(`Creating new account ${testuser.name}...`);
    const acc_create_res = await revpop.create_account(registrar, testuser);
    console.log(`Account ${acc_create_res} created`);
    console.log(``);
}

async function finalizer() {
    console.log(`Disconnect from RevPop...`);
    await revpop.disconnect();
}

exports.sample_create_account = sample_1_account;
exports.finalizer = finalizer;

if (require.main === module) {
    const { run_func } = require('./index');
    run_func(sample_1_account, finalizer);
}
