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
const CloudStorageClient = require('./lib/cloud-storage-client');
const revpop = require('./lib/revpop');
const {
    makePartialPersonalData, hashPersonalData
} = require('./lib/personal_data');

async function case2_registering() {
    try {
        const connection_string = process.env.BLOCKCHAIN_URL;
        console.log(`Connecting to ${connection_string}...`);
        const network = await revpop.connect(connection_string);
        console.log(`Connected to network ${network.network_name}`);
        console.log(``);

        const storage = new CloudStorageClient(process.env.CLOUD_URL);

        console.log(`Initialize all accounts...`);
        const accounts = [
            { nick: 'app2'   , name: 'init9'      },
            { nick: 'newuser', name: 'james.bond' },
        ];
        const [ app2, newuser ] = accounts;
        for (const account of accounts) {
            account.acc = await revpop.db_exec('get_account_by_name', account.name);
            account.key = PrivateKey.fromWif('5KXbCDyCPL3eGX6xX5uJHVwoAYheF7L5fKf67oQocgJA8kNvVHF');
            console.log(`Account ${account.nick} ${account.name} ${account.acc ? account.acc.id : '[no account yet]'}`);
        }
        console.log(``);

        if (newuser.acc == null) {
            throw new Error(`No new user account ${newuser.name}!`);
        }

        // Variables for full personal data
        let full_pd = null;
        let root_hash = null;

        // Subject4subject personal data reading and verification
        {
            const bc_pd = await revpop.db_exec('get_last_personal_data', newuser.acc.id, newuser.acc.id);
            if (bc_pd == null) {
                throw new Error('No s4s personal data in blockchain!');
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

            full_pd = cloud_pd;
            root_hash = bc_pd.hash;
        }

        // Variable for partial personal data
        let partial_pd = null;

        // Subject4operator personal data reading and creation if need
        {
            const s4o_bc_pd = await revpop.db_exec('get_last_personal_data', newuser.acc.id, app2.acc.id);
            const s4o_cloud_pd = (s4o_bc_pd != null && s4o_bc_pd.hash === root_hash) ?
                                 (await storage.crypto_load_object(s4o_bc_pd.url, newuser.key.toPublicKey(), app2.key)) :
                                 null;
            if (s4o_bc_pd == null || s4o_cloud_pd == null) {
                console.log(`No s4o personal data, creating new one...`);

                // No phone field in partial data for operator
                partial_pd = makePartialPersonalData(full_pd, [ 'name', 'email' ]);
                if (s4o_bc_pd != null) {
                    const pd_remove_res = await revpop.transaction(newuser.key, 'personal_data_remove', {
                        fee: revpop.no_fee(),
                        subject_account: newuser.acc.id,
                        operator_account: app2.acc.id,
                        hash: s4o_bc_pd.hash,
                    });
                    console.log(`S4o old personal data ${pd_remove_res} removed`);
                }
                const s4o_pd_url = await storage.crypto_save_object(partial_pd, newuser.key, app2.key.toPublicKey());
                const pd_create_res = await revpop.transaction(newuser.key, 'personal_data_create', {
                    fee: revpop.no_fee(),
                    subject_account: newuser.acc.id,
                    operator_account: app2.acc.id,
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

        // Subject4operator personal data reading and verification
        {
            const bc_pd = await revpop.db_exec('get_last_personal_data', newuser.acc.id, app2.acc.id);
            if (bc_pd == null) {
                throw new Error('No s4o personal data in blockchain!');
            }
            if (bc_pd.hash !== root_hash) {
                throw new Error('S4o personal data verification failed!');
            }
            const cloud_pd = await storage.crypto_load_object(bc_pd.url, newuser.key.toPublicKey(), app2.key);
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

exports.case2_registering = case2_registering;

if (require.main === module) {
    case2_registering();
}
