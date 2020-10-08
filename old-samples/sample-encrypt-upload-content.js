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
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);
const { key } = require('@revolutionpopuli/revpopjs');
const CloudStorageClient = require('../lib/cloud-storage-client');
const {
    encrypt_object,
    make_content_key,
    make_content_cipher_stream,
    make_content_decipher_stream
} = require('../lib/crypto');

async function sample_encrypt_upload_content() {
    const subject_key = key.get_random_key();
    const content_key = make_content_key();
    const encrypted_content_key = encrypt_object(content_key, subject_key, subject_key.toPublicKey())
    console.log(`Content key: ${JSON.stringify(content_key)}`);
    console.log(`Content key encrypted by subject keys: ${encrypted_content_key}`);
    console.log(``);

    const plaintext_input_file = path.join(__dirname, '../content/input.png');
    const ciphertext_output_file = path.join(__dirname, '../content/output.enc');
    const plaintext_output_file = path.join(__dirname, '../content/output.png');

    console.log(`Encrypting file...`);
    await pipeline(
        fs.createReadStream(plaintext_input_file),
        make_content_cipher_stream(content_key),
        fs.createWriteStream(ciphertext_output_file)
    );
    console.log(`Done`);
    console.log(``);

    console.log(`Decrypting file...`);
    await pipeline(
        fs.createReadStream(ciphertext_output_file),
        make_content_decipher_stream(content_key),
        fs.createWriteStream(plaintext_output_file)
    );
    console.log(`Done`);
    console.log(``);

    console.log(`Compare files...`);
    {
        const plain_in_data = fs.readFileSync(plaintext_input_file);
        const plain_out_data = fs.readFileSync(plaintext_output_file);
        assert.ok(plain_in_data.length > 0);
        assert.ok(plain_out_data.length > 0);
        assert.equal(plain_in_data.length, plain_out_data.length);
        assert.equal(Buffer.compare(plain_in_data, plain_out_data), 0);
    }
    console.log(`OK`);
    console.log(``);

    const content_storage = new CloudStorageClient(process.env.CLOUD_URL, { collection_name: 'content' });
    let content_id = null;

    console.log(`Save content to cloud...`);
    {
        const plain_in_data = fs.readFileSync(plaintext_input_file);
        content_id = await content_storage.crypto_save_content(plain_in_data, content_key);
    }
    console.log(`OK`);
    console.log(``);

    console.log(`Cloud content_id ${content_id}`);
    console.log(``);

    console.log(`Load and check content from cloud...`);
    {
        const dec_buf = await content_storage.crypto_load_content(content_id, content_key);
        const plain_in_data = fs.readFileSync(plaintext_input_file);
        assert.ok(plain_in_data.length > 0);
        assert.ok(dec_buf.length > 0);
        assert.equal(plain_in_data.length, dec_buf.length);
        assert.equal(Buffer.compare(plain_in_data, dec_buf), 0);
    }
    console.log(`OK`);
    console.log(``);
}

exports.sample_encrypt_upload_content = sample_encrypt_upload_content;

if (require.main === module) {
    const { run_func } = require('../index');
    run_func(sample_encrypt_upload_content);
}
