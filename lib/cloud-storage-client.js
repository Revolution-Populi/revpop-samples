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

const { MongoClient, ObjectID } = require('mongodb');
const {
    encrypt_object,
    decrypt_object,
    encrypt_buffer,
    decrypt_buffer,
    encrypt_content,
    decrypt_content
} = require('./crypto');

////////////////////////////////////////////////////////////////////////////////////////////////////
// Cloud storage class
////////////////////////////////////////////////////////////////////////////////////////////////////
class CloudStorageClient {
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Constructor
    // Receives MongoDB connection URL, database name, collection name
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    constructor(service_url, options = {}) {
        this.service_url = service_url;
        this.db_name = options.db_name || 'revpop';
        this.coll_name = options.collection_name || 'personal_data';
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Internal helper: connect client, do an operation, disconnect client
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    async _do_db_op(op) {
        const client = await MongoClient.connect(this.service_url, { useUnifiedTopology: true });
        const db = client.db(this.db_name);
        let res = null;
        try {
            res = op(db);
            if (res instanceof Promise) {
                res = await res;
            }
        } finally {
            if (client) {
                await client.close();
            }
        }
        return res;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Save value and return its id
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    async save(value) {
        const res = await this._do_db_op(async (db) => {
            return await db.collection(this.coll_name).insertOne({ data: value });
        });
        return res ? res.insertedId.toString() : null;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Load and return value by its id
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    async load(id) {
        let obj = await this._do_db_op(async (db) => {
            return await db.collection(this.coll_name).findOne({ _id: ObjectID(id) });
        });
        return obj ? obj.data : null;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Encrypt and save object and return its id
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    async crypto_save_object(obj, subject_private_key, operator_public_key) {
        const crypto_str = encrypt_object(obj, subject_private_key, operator_public_key);
        return await this.save(crypto_str);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Load and decrypt and return object by its id
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    async crypto_load_object(id, subject_public_key, operator_private_key) {
        const crypto_str = await this.load(id);
        return crypto_str ? decrypt_object(crypto_str, subject_public_key, operator_private_key) : null;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Encrypt and save buffer and return its id
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    async crypto_save_buffer(buf, subject_private_key, operator_public_key) {
        const crypto_buf = encrypt_buffer(buf, subject_private_key, operator_public_key);
        return await this.save(crypto_buf);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Load and decrypt and return buffer by its id
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    async crypto_load_buffer(id, subject_public_key, operator_private_key) {
        const crypto_buf = await this.load(id);
        return crypto_buf ? decrypt_buffer(crypto_buf.buffer, subject_public_key, operator_private_key) : null;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Encrypt and save content buffer and return its id
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    async crypto_save_content(content_buf, content_key) {
        const crypto_buf = encrypt_content(content_buf, content_key);
        return await this.save(crypto_buf);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Load and decrypt and return content buffer by its id
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    async crypto_load_content(id, content_key) {
        const crypto_buf = await this.load(id);
        return crypto_buf ? decrypt_content(crypto_buf.buffer, content_key) : null;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Delete object or content buffer by its id
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    async del(id) {
        const res = await this._do_db_op(async (db) => {
            return await db.collection(this.coll_name).deleteOne({ _id: ObjectID(id) });
        });
        return res && (res.result.ok === 1);
    }
}

module.exports = CloudStorageClient;
