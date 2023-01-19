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
const { PrivateKey } = require('@revolutionpopuli/revpopjs');
const revpop = require('../lib/revpop');

async function sample_personal_data() {
    const connect_string = process.env.BLOCKCHAIN_URL;
    console.log(`Connecting to ${connect_string}...`);
    const network = await revpop.connect(connect_string);
    console.log(`Connected to network ${network.network_name}`);
    console.log(``);

    const subject_name = "init1";
    const subject_key = PrivateKey.fromWif("5KXbCDyCPL3eGX6xX5uJHVwoAYheF7L5fKf67oQocgJA8kNvVHF");
    const operator_name = "init2";
    const subject_acc = await revpop.db_exec("get_account_by_name", subject_name);
    const operator_acc = await revpop.db_exec("get_account_by_name", operator_name);


    const old_bc_pd = await revpop.db_exec('get_last_personal_data', subject_acc.id, operator_acc.id);
    if (old_bc_pd != null) {
        console.log(`Remove old full PD record from blockchain, subject ${subject_name}, operator ${operator_name}...`);
        const old_pd_remove_res = await revpop.transaction(subject_key, 'personal_data_remove', {
            fee: revpop.no_fee(),
            subject_account: subject_acc.id,
            operator_account: operator_acc.id,
            hash: old_bc_pd.hash,
        });
        console.log(`Old full PD record ${old_pd_remove_res} removed from blockchain`);
        console.log(``);
    }

    console.log(`Creating personal data, subject ${subject_name}, operator ${operator_name}...`);
    const pd_create_res = await revpop.transaction(subject_key, "personal_data_create", {
        fee: revpop.no_fee(),
        subject_account: subject_acc.id,
        operator_account: operator_acc.id,
        url: "https://revolutionpopuli.com/wp-content/uploads/2020/10/Revolution-Populi-WP1.pdf",
        hash: "sqplkk2npv0haqpohdi92",
    });
    console.log(`Personal data ${pd_create_res} created`);
    console.log(``);


    console.log(`Getting personal data, subject ${subject_name}, operator ${operator_name}...`);
    const pd1 = await revpop.db_exec("get_personal_data", subject_acc.id, operator_acc.id);
    console.log(`Personal data: ${JSON.stringify(pd1)}`);
    console.log(``);

    console.log(`Getting last personal data, subject ${subject_name}, operator ${operator_name}...`);
    const last_pd = await revpop.db_exec("get_last_personal_data", subject_acc.id, operator_acc.id);
    console.log(`Last personal data: ${JSON.stringify(last_pd)}`);
    console.log(``);

    console.log(`Removing personal data, subject ${subject_name}, operator ${operator_name}...`);
    const pd_remove_res = await revpop.transaction(subject_key, "personal_data_remove", {
        fee: revpop.no_fee(),
        subject_account: last_pd['subject_account'],
        operator_account: last_pd['operator_account'],
        hash: last_pd['hash'],
    });
    console.log(`Personal data ${pd_remove_res} removed`);
    console.log(``);


    console.log(`Getting personal data, subject ${subject_name}, operator ${operator_name}...`);
    const pd2 = await revpop.db_exec("get_personal_data", subject_acc.id, operator_acc.id);
    console.log(`Personal data: ${JSON.stringify(pd2)}`);
    console.log(``);
}

async function finalizer() {
    console.log(`Disconnect from RevPop...`);
    await revpop.disconnect();
}

exports.sample_personal_data = sample_personal_data;
exports.finalizer = finalizer;

if (require.main === module) {
    const { run_func } = require('../index');
    run_func(sample_personal_data, finalizer);
}
