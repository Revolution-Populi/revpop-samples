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

require('dotenv').config({ path: '../.env' });
const { key, PrivateKey } = require('@revolutionpopuli/revpopjs');
const revpop = require('../lib/revpop');

async function sample_create_account() {
    const connect_string = process.env.BLOCKCHAIN_URL;
    console.log(`Connecting to ${connect_string}...`);
    const network = await revpop.connect(connect_string);
    console.log(`Connected to network ${network.network_name}`);
    console.log(``);

    console.log(`Initialize all accounts...`);
    const registrar = {
        nick: 'registrar',
        name: 'nathan',
        acc: await revpop.db_exec('get_account_by_name', 'nathan'),
        key: PrivateKey.fromWif('5KXbCDyCPL3eGX6xX5uJHVwoAYheF7L5fKf67oQocgJA8kNvVHF')
    };
    console.log(`Account ${registrar.nick} ${registrar.name} ${registrar.acc.id}`);
    const testuser = {
        nick: 'testuser',
        name: 'testuser' + Date.now(),
        acc: await revpop.db_exec('get_account_by_name', 'testuser'),
        key: key.get_random_key()
    };
    console.log(`Account ${testuser.nick} ${testuser.name} ${testuser.acc ? testuser.acc.id : '[no account yet]'}`);
    console.log(``);

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

        console.log(`Account ${registrar.acc.name} claim balance...`);
        await revpop.claim_balance(registrar, init_balance);
        console.log(`Balance of account ${registrar.acc.name} claimed`);
        console.log(``);

        console.log(`Upgrading registrar account ${registrar.acc.name}...`);
        await revpop.upgrade_account(registrar);
        console.log(`Registrar account ${registrar.acc.name} upgraded`);
        console.log(``);
    }

    console.log(`Creating account ${testuser.name}...`);
    const acc_create_res = await revpop.create_account(registrar, testuser);
    console.log(`Account ${acc_create_res} created`);
    console.log(``);
}

async function finalizer() {
    console.log(`Disconnect from RevPop...`);
    await revpop.disconnect();
}

exports.sample_create_account = sample_create_account;
exports.finalizer = finalizer;

if (require.main === module) {
    const { run_func } = require('../index');
    run_func(sample_create_account, finalizer);
}
