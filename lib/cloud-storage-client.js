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
