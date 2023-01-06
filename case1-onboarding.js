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
const CloudStorageClient = require('./lib/cloud-storage-client');
const revpop = require('./lib/revpop');
const {
    makeFullPersonalDataContent, makeFullPersonalData, makePartialPersonalData,
    hashPersonalData
} = require('./lib/personal_data');

async function case1_onboarding() {
    try {
        const connection_string = process.env.BLOCKCHAIN_URL;
        console.log(`Connecting to ${connection_string}...`);
        const network = await revpop.connect(connection_string);
        console.log(`Connected to network: ${network.network_name}`);
        console.log(``);

        const storage = new CloudStorageClient(process.env.CLOUD_URL);

        console.log(`Initialize all accounts...`);
        const accounts = [
            { nick: 'registrar', name: 'nathan'     },
            { nick: 'app'      , name: 'init10'     },
            { nick: 'newuser'  , name: 'james.bond' },
        ];
        const [ registrar, app, newuser ] = accounts;
        for (const account of accounts) {
            account.acc = await revpop.db_exec('get_account_by_name', account.name);
            account.key = PrivateKey.fromWif('5KXbCDyCPL3eGX6xX5uJHVwoAYheF7L5fKf67oQocgJA8kNvVHF');
            console.log(`Account ${account.nick} ${account.name} ${account.acc ? account.acc.id : '[no account yet]'}`);
        }
        console.log(``);

        if (newuser.acc === null) {
            console.log(`No new user account ${newuser.name}, creating...`);
            const acc_create_res = await revpop.create_account(registrar, newuser);
            console.log(`Account ${newuser.name} created: ${acc_create_res}`);
            console.log(``);

            newuser.acc = await revpop.db_exec('get_account_by_name', newuser.name);
        }

        // Variables for full personal data
        let full_pd = null;
        let root_hash = null;

        // Subject4subject personal data reading and creation if need
        {
            const s4s_bc_pd = await revpop.db_exec('get_last_personal_data', newuser.acc.id, newuser.acc.id);
            const s4s_cloud_pd = (s4s_bc_pd != null) ?
                                 (await storage.crypto_load_object(s4s_bc_pd.url, newuser.key.toPublicKey(), newuser.key)) :
                                 null;
            if (s4s_bc_pd == null || s4s_cloud_pd == null) {
                console.log(`No s4s personal data, creating new one...`);

                // Create full personal data for subject
                const pd_res = makeFullPersonalData(
                    makeFullPersonalDataContent('James', 'Bond', 'bond@mi5.gov.uk', '+44123456789')
                );
                full_pd = pd_res.full_pd;
                root_hash = pd_res.root_hash;

                const s4s_pd_url = await storage.crypto_save_object(full_pd, newuser.key, newuser.key.toPublicKey());
                const pd_create_res = await revpop.transaction(newuser.key, 'personal_data_create', {
                    fee: revpop.no_fee(),
                    subject_account: newuser.acc.id,
                    operator_account: newuser.acc.id,
                    url: s4s_pd_url,
                    hash: root_hash,
                });
                console.log(`S4s personal data ${pd_create_res} created: ${JSON.stringify(full_pd.content)}`);
                console.log(``);
    
            } else {
                full_pd = s4s_cloud_pd;
                root_hash = s4s_bc_pd.hash;
                console.log(`S4s personal data already exists: ${JSON.stringify(full_pd.content)}`);
                console.log(``);
            }
        }

        // Variable for partial personal data
        let partial_pd = null;

        // Subject4operator personal data reading and creation if need
        {
            const s4o_bc_pd = await revpop.db_exec('get_last_personal_data', newuser.acc.id, app.acc.id);
            const s4o_cloud_pd = (s4o_bc_pd != null && s4o_bc_pd.hash === root_hash) ?
                                 (await storage.crypto_load_object(s4o_bc_pd.url, newuser.key.toPublicKey(), app.key)) :
                                 null;
            if (s4o_bc_pd == null || s4o_cloud_pd == null) {
                console.log(`No s4o personal data, creating new one...`);

                // No phone field in partial data for operator
                partial_pd = makePartialPersonalData(full_pd, [ 'name', 'email' ]);
                if (s4o_bc_pd != null) {
                    const pd_remove_res = await revpop.transaction(newuser.key, 'personal_data_remove', {
                        fee: revpop.no_fee(),
                        subject_account: newuser.acc.id,
                        operator_account: app.acc.id,
                        hash: s4o_bc_pd.hash,
                    });
                    console.log(`S4o old personal data ${pd_remove_res} removed`);
                }
                const s4o_pd_url = await storage.crypto_save_object(partial_pd, newuser.key, app.key.toPublicKey());
                const pd_create_res = await revpop.transaction(newuser.key, 'personal_data_create', {
                    fee: revpop.no_fee(),
                    subject_account: newuser.acc.id,
                    operator_account: app.acc.id,
                    url: s4o_pd_url,
                    hash: root_hash,
                });
                console.log(`S4o personal data ${pd_create_res} created: ${JSON.stringify(partial_pd.content)}`);
                console.log(``);
    
            } else {
                partial_pd = s4o_cloud_pd;
                console.log(`S4o personal data already exists: ${JSON.stringify(partial_pd.content)}`);
                console.log(``);
            }
        }

        // Subject4subject personal data reading and verification
        {
            const bc_pd = await revpop.db_exec('get_last_personal_data', newuser.acc.id, newuser.acc.id);
            if (bc_pd == null) {
                throw new Error('No s4s personal data in blockchain!');
            }
            if (bc_pd.hash !== root_hash) {
                throw new Error('S4s personal data verification failed!');
            }
            const cloud_pd = await storage.crypto_load_object(bc_pd.url, newuser.key.toPublicKey(), newuser.key);
            if (cloud_pd == null) {
                throw new Error('No s4s personal data in cloud!');
            }
            if (hashPersonalData(cloud_pd) !== bc_pd.hash) {
                throw new Error('S4s personal data verification failed!');
            }
            console.log(`S4s personal data verified: ${JSON.stringify(cloud_pd.content)}`);
            console.log(``);
        }

        // Subject4operator personal data reading and verification
        {
            const bc_pd = await revpop.db_exec('get_last_personal_data', newuser.acc.id, app.acc.id);
            if (bc_pd == null) {
                throw new Error('No s4o personal data in blockchain!');
            }
            if (bc_pd.hash !== root_hash) {
                throw new Error('S4o personal data verification failed!');
            }
            const cloud_pd = await storage.crypto_load_object(bc_pd.url, newuser.key.toPublicKey(), app.key);
            if (cloud_pd == null) {
                throw new Error('No s4o personal data in cloud!');
            }
            if (hashPersonalData(cloud_pd) !== bc_pd.hash) {
                throw new Error('S4o personal data verification failed!');
            }
            console.log(`S4o personal data verified: ${JSON.stringify(cloud_pd.content)}`);
            console.log(``);
        }

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

exports.case1_onboarding = case1_onboarding;

if (require.main === module) {
    case1_onboarding();
}
