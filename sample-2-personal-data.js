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
const { CloudStorage, GoogleDriveAdapter, IPFSAdapter, S3Adapter, PersonalData, PrivateKey } = require('@revolutionpopuli/revpopjs');
const { computeBufSha256 } = require('./lib/signature');
const revpop = require('./lib/revpop');
const google_drive_helper = require('./google-drive-adapter-helper.js');
const bootstrap = require('./case0-bootstrap.js');

async function sample_2_personal_data_ipfs() {
    console.log(`Start IPFS test...`);
    await sample_2_personal_data(new IPFSAdapter(process.env.CLOUD_URL));
    console.log(`IPFS test finished.`);
}

async function sample_2_personal_data_google_drive() {
    console.log(`Start Google Drive test...`);
    const oAuth2Client = await google_drive_helper.getGoogleoAuth2Client();
    if (oAuth2Client === null)
        return;

    await sample_2_personal_data(new GoogleDriveAdapter({ auth: oAuth2Client, folder: "revpop" }));
    console.log(`Google Drive test finished.`);
}

async function sample_2_personal_data_s3() {
    console.log(`Start S3 test...`);
    // Load client secrets from a local file.
    // file should have AWS IAM creds with AmazonS3FullAccess.
    // See s3_auth.json.example
    const S3_CONFIG = require(process.env.S3_AUTH_FILE);
    const opts = {
        region: S3_CONFIG.region,
        accessKeyId: S3_CONFIG.accessKeyId,
        secretAccessKey: S3_CONFIG.secretAccessKey,
        params: {Bucket: S3_CONFIG.Bucket}
    };
    if (opts.accessKeyId.includes("AIM_KEY_WITH_AmazonS3FullAccess")) {
        console.error('Please fill in s3_auth.json with real accessKeyId, secretAccessKey and Bucket');
        return;
    }

    await sample_2_personal_data(new S3Adapter(opts));
    console.log(`S3 test finished.`);
}

async function sample_2_personal_data(adapter) {
    /*************************************************************************
     * Scenario:
     * Save personal data photo to the cloud storage
     * Create full personal data and sign with the root hash
     * Save full personal data to the cloud storage
     * Save full personal data record to the blockchain
     * Load full personal data + record + photo from the blockchain and the cloud storage
     * Verify full personal data with the root hash
     * Create partial personal data and sign with the root hash
     * Save partial personal data to the cloud storage
     * Save partial personal data record to the blockchain
     * Load partial personal data + record + photo from the blockchain and the cloud storage
     * Verify partial personal data with the root hash
     *************************************************************************/

    // Connect to blockchain
    // const connect_string = process.env.BLOCKCHAIN_URL;
    // console.log(`Connecting to ${connect_string}...`);
    // const network = await revpop.connect(connect_string);
    // console.log(`Connected to network ${network.network_name}`);
    // console.log(``);

    await bootstrap.connect_to_network();
    await bootstrap.prepare_registrar_and_committee();

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
            console.log(`Account ${account.nick} ${account.name} ${account.acc.id}`);
        }
        console.log(``);
    }

    const storage = new CloudStorage(adapter);
    await storage.connect();

    // Save PD photo to cloud storage
    // Create full PD and sign with root hash
    // Save full PD to cloud storage
    // Save full PD record to blockchain
    const photo_file_path = path.join(__dirname, 'content/input.png');

    {
        console.log(`Save PD photo to cloud storage...`);
        const photo_file_buf = fs.readFileSync(photo_file_path);
        const save_buffer_result = await storage.crypto_save_buffer(photo_file_buf, subject.key, subject.key.toPublicKey());
        assert.notEqual(save_buffer_result, '');
        const photo_url = save_buffer_result.url;
        const photo_type = 'image/png';
        const photo_hash = computeBufSha256(photo_file_buf);
        const photo_storage_data = save_buffer_result.storage_data;
        console.log(`PD photo saved to cloud storage, hash: ${photo_hash}, url: ${photo_url}`);
        console.log(``);

        console.log(`Create full PD and sign with root hash...`);
        let pd1 = new PersonalData();
        pd1.assign({
            first_name: 'James',
            last_name: 'Bond',
            email: 'bond@mi5.gov.uk',
            phone: '+44123456789',
            photo: PersonalData.makeReference(photo_url, photo_type, photo_hash, photo_storage_data)
        });
        const cloud_full_pd = pd1.getAllParts();
        const root_hash = pd1.getRootHash();
        console.log(`Full PD root hash: ${root_hash}`);
        console.log(``);

        console.log(`Save full PD to cloud storage...`);
        const save_object_result = await storage.crypto_save_object(cloud_full_pd, subject.key, subject.key.toPublicKey());
        assert.notEqual(save_object_result, '');
        const full_pd_url = save_object_result.url;
        console.log(`Full PD saved to cloud storage: ${JSON.stringify(cloud_full_pd)}, url: ${full_pd_url}`);
        console.log(``);

        {
            const old_bc_pd = await revpop.db_exec('get_last_personal_data', subject.acc.id, subject.acc.id);
            if (old_bc_pd != null) {
                console.log(`Remove old full PD record from blockchain, subject ${subject.name}, operator ${subject.name}...`);
                const old_pd_remove_res = await revpop.transaction(subject.key, 'personal_data_remove', {
                    fee: revpop.no_fee(),
                    subject_account: subject.acc.id,
                    operator_account: subject.acc.id,
                    hash: old_bc_pd.hash,
                });
                console.log(`Old full PD record ${old_pd_remove_res} removed from blockchain`);
                console.log(``);
            }
        }

        console.log(`Save full PD record to blockchain, subject ${subject.name}, operator ${subject.name}...`);
        const full_pd_create_res = await revpop.transaction(subject.key, "personal_data_create", {
            fee: revpop.no_fee(),
            subject_account: subject.acc.id,
            operator_account: subject.acc.id,
            url: full_pd_url,
            hash: root_hash,
            storage_data: save_object_result.storage_data
        });
        console.log(`Full PD record ${full_pd_create_res} created in blockchain`);
        console.log(``);
    }

    // Load full PD + record + photo from blockchain and cloud storage
    // Verify full PD with root hash
    {
        console.log(`Load full PD from blockchain, subject ${subject.name}, operator ${subject.name}...`);
        const bc_full_pd = await revpop.db_exec("get_last_personal_data", subject.acc.id, subject.acc.id);
        console.log(`Full PD from blockchain: ${JSON.stringify(bc_full_pd)}`);
        console.log(``);

        const full_pd_sd = JSON.parse(bc_full_pd.storage_data);
        const full_pd_cid = full_pd_sd[2];
        console.log(`Load full PD from cloud storage...`);
        const cloud_full_pd = await storage.crypto_load_object(full_pd_cid, subject.key.toPublicKey(), subject.key);
        console.log(`Full PD from cloud storage: ${JSON.stringify(cloud_full_pd)}`);
        const fpd = PersonalData.fromAllParts(cloud_full_pd);
        const full_pd_hash = fpd.getRootHash();
        console.log(`Full PD root hash: ${full_pd_hash}`);
        assert.equal(bc_full_pd.hash, full_pd_hash);
        console.log(``);

        if (cloud_full_pd.content.photo) {
            console.log(`Load PD photo from cloud storage...`);
            const photo_storage_data = JSON.parse(cloud_full_pd.content.photo.storage_data);
            const photo_content_id = photo_storage_data[2];
            const photo_buf = await storage.crypto_load_buffer(photo_content_id, subject.key.toPublicKey(), subject.key);
            const photo_hash = computeBufSha256(photo_buf);
            console.log(`PD photo hash: ${photo_hash}, url: ${cloud_full_pd.content.photo.url}, cid: ${photo_content_id}`);
            assert.equal(cloud_full_pd.content.photo.hash, photo_hash);
        }
        console.log(``);
    }

    // Create partial PD and sign with root hash
    // Save partial PD to cloud storage
    // Save partial PD record to blockchain
    {
        console.log(`Create partial PD and sign with root hash...`);
        const bc_full_pd = await revpop.db_exec('get_last_personal_data', subject.acc.id, subject.acc.id);
        assert.notEqual(bc_full_pd, null);
        const full_pd_sd = JSON.parse(bc_full_pd.storage_data);
        const full_pd_cid = full_pd_sd[2];        
        const cloud_full_pd = await storage.crypto_load_object(full_pd_cid, subject.key.toPublicKey(), subject.key);
        assert.notEqual(cloud_full_pd, null);
        const fpd = PersonalData.fromAllParts(cloud_full_pd);
        const full_pd_hash = fpd.getRootHash();
        const ppd = fpd.makePartial([ 'name', 'email' ]);
        const partial_pd_hash = ppd.getRootHash();
        console.log(`Partial PD root hash: ${partial_pd_hash}`);
        assert.equal(partial_pd_hash, full_pd_hash);
        console.log(``);

        console.log(`Save partial PD to cloud storage...`);
        const cloud_partial_pd = ppd.getAllParts();
        const partial_pd = await storage.crypto_save_object(cloud_partial_pd, subject.key, operator.key.toPublicKey());
        console.log(`Partial PD saved to cloud storage: ${JSON.stringify(cloud_partial_pd)}, url: ${partial_pd.url}`);
        console.log(``);

        {
            const old_bc_pd = await revpop.db_exec('get_last_personal_data', subject.acc.id, operator.acc.id);
            if (old_bc_pd != null) {
                console.log(`Remove old partial PD record from blockchain, subject ${subject.name}, operator ${operator.name}...`);
                const old_pd_remove_res = await revpop.transaction(subject.key, 'personal_data_remove', {
                    fee: revpop.no_fee(),
                    subject_account: subject.acc.id,
                    operator_account: operator.acc.id,
                    hash: old_bc_pd.hash,
                });
                console.log(`Old partial PD record ${old_pd_remove_res} removed from blockchain`);
                console.log(``);
            }
        }

        console.log(`Save partial PD record to blockchain, subject ${subject.name}, operator ${operator.name}...`);
        const partial_pd_create_res = await revpop.transaction(subject.key, "personal_data_create", {
            fee: revpop.no_fee(),
            subject_account: subject.acc.id,
            operator_account: operator.acc.id,
            url: partial_pd.url,
            hash: bc_full_pd.hash,
            storage_data: partial_pd.storage_data,
        });
        console.log(`Partial PD record ${partial_pd_create_res} created in blockchain`);
        console.log(``);
    }

    // Load partial PD + record from blockchain and cloud storage
    // Verify partial PD with root hash
    {
        console.log(`Load partial PD from blockchain, subject ${subject.name}, operator ${operator.name}...`);
        const bc_partial_pd = await revpop.db_exec("get_last_personal_data", subject.acc.id, operator.acc.id);
        console.log(`Partial PD from blockchain: ${JSON.stringify(bc_partial_pd)}`);
        console.log(``);

        console.log(`Load partial PD from cloud storage...`);
        const partial_pd_sd = JSON.parse(bc_partial_pd.storage_data);
        const partial_pd_cid = partial_pd_sd[2];   
        const cloud_partial_pd = await storage.crypto_load_object(partial_pd_cid, subject.key.toPublicKey(), operator.key);
        console.log(`Partial PD from cloud storage: ${JSON.stringify(cloud_partial_pd)}`);
        const ppd = PersonalData.fromAllParts(cloud_partial_pd);
        const partial_pd_hash = ppd.getRootHash();
        console.log(`Partial PD root hash: ${partial_pd_hash}`);
        assert.equal(bc_partial_pd.hash, partial_pd_hash);
        console.log(``);
    }

    await storage.disconnect();
}

async function finalizer() {
    console.log(`Disconnect from RevPop...`);
    await revpop.disconnect();
}

exports.sample_personal_data = sample_2_personal_data;
exports.finalizer = finalizer;


async function sample_2_all_adapters() {
    const { run_func } = require('./index');
    await run_func(sample_2_personal_data_ipfs, finalizer);
    await run_func(sample_2_personal_data_google_drive, finalizer);
    await run_func(sample_2_personal_data_s3, finalizer);    
}

if (require.main === module) {
    sample_2_all_adapters();
}
