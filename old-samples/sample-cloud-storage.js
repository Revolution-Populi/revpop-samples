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
const CloudStorageClient = require('../lib/cloud-storage-client');
const { key } = require('@revolutionpopuli/revpopjs');
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
