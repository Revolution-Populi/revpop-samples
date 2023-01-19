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
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { PrivateKey } = require('@revolutionpopuli/revpopjs');
const revpop = require('../lib/revpop');
const { computeBufSha256 } = require('../lib/signature');
const CloudStorageClient = require('../lib/cloud-storage-client');
const {
    makeReferencePart, makeFullPersonalDataContent,
    makeFullPersonalData, hashPersonalData
} = require('../lib/personal_data');

async function sample_personal_data_photo() {
    const photo_file_path = path.join(__dirname, '../content/input.png');

    const storage = new CloudStorageClient(process.env.CLOUD_URL);

    const subject_name = "init1";
    const subject_key = PrivateKey.fromWif("5KXbCDyCPL3eGX6xX5uJHVwoAYheF7L5fKf67oQocgJA8kNvVHF");

    const connect_string = process.env.BLOCKCHAIN_URL;
    console.log(`Connecting to ${connect_string}...`);
    const network = await revpop.connect(connect_string);
    console.log(`Connected to network ${network.network_name}`);
    console.log(``);

    const subject_acc = await revpop.db_exec("get_account_by_name", subject_name);
    console.log(`Subject: ${subject_name} ${subject_acc.id}`);
    console.log(``);

    {
        const photo_file_buf = fs.readFileSync(photo_file_path);
        const photo_url = await storage.crypto_save_buffer(photo_file_buf, subject_key, subject_key.toPublicKey());
        const photo_type = 'image/png';
        const photo_hash = computeBufSha256(photo_file_buf);
        const photo_ref = makeReferencePart(photo_url, photo_type, photo_hash);
        console.log(`Photo hash: ${photo_hash}`);
        const pd_content = makeFullPersonalDataContent('James', 'Bond', 'bond@mi5.gov.uk', '+44123456789', photo_ref);
        const { full_pd, root_hash } = makeFullPersonalData(pd_content);
        const pd_url = await storage.crypto_save_object(full_pd, subject_key, subject_key.toPublicKey());
        console.log(`Personal data saved to cloud: ${JSON.stringify(full_pd)}`);
        console.log(`Personal data hash: ${root_hash}`);
        console.log(`Creating personal data in blockchain, subject ${subject_name}, operator ${subject_name}...`);
        const pd_create_res = await revpop.transaction(subject_key, "personal_data_create", {
            fee: revpop.no_fee(),
            subject_account: subject_acc.id,
            operator_account: subject_acc.id,
            url: pd_url,
            hash: root_hash,
        });
        console.log(`Personal data ${pd_create_res} created in blockchain`);
        console.log(``);
    }

    {
        console.log(`Getting last personal data from blockchain, subject ${subject_name}, operator ${subject_name}...`);
        const pd_bc = await revpop.db_exec("get_last_personal_data", subject_acc.id, subject_acc.id);
        console.log(`Last personal data from blockchain: ${JSON.stringify(pd_bc)}`);
        const full_pd = await storage.crypto_load_object(pd_bc.url, subject_key.toPublicKey(), subject_key);
        console.log(`Last personal data from cloud: ${JSON.stringify(full_pd)}`);
        const pd_hash = hashPersonalData(full_pd);
        console.log(`Personal data hash: ${pd_hash}`);
        assert.equal(pd_bc.hash, pd_hash);
        if (full_pd.content.photo) {
            const photo_buf = await storage.crypto_load_buffer(full_pd.content.photo.url, subject_key.toPublicKey(), subject_key);
            const photo_hash = computeBufSha256(photo_buf);
            console.log(`Photo hash: ${photo_hash}`);
            assert.equal(full_pd.content.photo.hash, photo_hash);
        }
        console.log(``);
    }
}

async function finalizer() {
    console.log(`Disconnect from RevPop...`);
    await revpop.disconnect();
}

exports.sample_personal_data = sample_personal_data_photo;
exports.finalizer = finalizer;

if (require.main === module) {
    const { run_func } = require('../index');
    run_func(sample_personal_data_photo, finalizer);
}
