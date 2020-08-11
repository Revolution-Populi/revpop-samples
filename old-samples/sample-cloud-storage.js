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

require('dotenv').config({ path: '../.env' });
const CloudStorageClient = require('../lib/cloud-storage-client');
const { key } = require('@Revolution-Populi/revpopjs');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function sample_cloud_storage() {
    const subject_key = key.get_random_key();
    const operator_key = key.get_random_key();

    const personal_data1 = {
        name: {
            first: 'Alice',
            last: 'Carroll'
        },
        email: 'a.carroll@gmail.com'
    };

    const storage = new CloudStorageClient(process.env.CLOUD_URL);

    let save1_id = null;
    {
        console.log(`save1 obj = ${JSON.stringify(personal_data1)}`);
        save1_id = await storage.crypto_save_object(personal_data1, subject_key, operator_key.toPublicKey());
        console.log(`save1 id = ${save1_id}`);
        const load1_ret = await storage.crypto_load_object(save1_id, subject_key.toPublicKey(), operator_key);
        console.log(`load1 obj = ${JSON.stringify(load1_ret)}`);
        assert.deepEqual(personal_data1, load1_ret);
        console.log(``);
    }

    let save2_id = null;
    {
        const personal_data2 = { ...personal_data1 };
        personal_data2.name.last = 'Smith';
        console.log(`save2 obj = ${JSON.stringify(personal_data2)}`);
        save2_id = await storage.crypto_save_object(personal_data2, subject_key, operator_key.toPublicKey());
        console.log(`save2 id = ${save2_id}`);
        const load2_ret = await storage.crypto_load_object(save2_id, subject_key.toPublicKey(), operator_key);
        console.log(`load2 obj = ${JSON.stringify(load2_ret)}`);
        assert.deepEqual(personal_data2, load2_ret);
        assert.notEqual(save2_id, save1_id);
        console.log(``);
    }

    {
        const del1_res = await storage.del(save1_id);
        console.log(`del ret = ${del1_res}`);
        assert.equal(del1_res, true);
        const load3_ret = await storage.load(save1_id);
        console.log(`load obj = ${JSON.stringify(load3_ret)}`);
        assert.equal(load3_ret, null);
        console.log(``);
    }

    {
        const plaintext_input_file = path.join(__dirname, '../content/input.png');
        const test_buf = fs.readFileSync(plaintext_input_file);
        console.log(`save buf len = ${test_buf.length}`);
        const save_buf_id = await storage.crypto_save_buffer(test_buf, subject_key, operator_key.toPublicKey());
        console.log(`save buf id = ${save_buf_id}`);
        const load_buf_ret = await storage.crypto_load_buffer(save_buf_id, subject_key.toPublicKey(), operator_key);
        console.log(`load buf len = ${load_buf_ret.length}`);
        assert.equal(test_buf.length, load_buf_ret.length);
        assert.equal(Buffer.compare(test_buf, load_buf_ret), 0);
    }
}

exports.sample_cloud_storage = sample_cloud_storage;

if (require.main === module) {
    const { run_func } = require('../index');
    run_func(sample_cloud_storage);
}
