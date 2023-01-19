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

const crypto = require('crypto');
const stream = require('stream');
const { key, Aes } = require('@revolutionpopuli/revpopjs');

////////////////////////////////////////////////////////////////////////////////////////////////////
// Encrypt object with subject private key and operator public key
// Return string with serialized representation of nonce and ciphertext
////////////////////////////////////////////////////////////////////////////////////////////////////
function encrypt_object(obj, subject_private_key, operator_public_key) {
    const nonce = key.random32ByteBuffer().toString('base64');
    const cipherbuf = Aes.encrypt_with_checksum(
        subject_private_key, operator_public_key, nonce,
        Buffer.from(JSON.stringify(obj), 'utf-8')
    );
    return `${nonce}:${cipherbuf.toString('base64')}`;
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Decrypt string (serialized nonce and ciphertext data) with subject public key and operator private key
// Return original object as before encryption
////////////////////////////////////////////////////////////////////////////////////////////////////
function decrypt_object(str, subject_public_key, operator_private_key) {
    const parts = str.split(':', 2);
    const plainbuf = Aes.decrypt_with_checksum(
        operator_private_key, subject_public_key, parts[0],
        Buffer.from(parts[1], 'base64')
    );
    return JSON.parse(plainbuf.toString('utf-8'));
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Encrypt buffer with subject private key and operator public key
// Return buffer (nonce and ciphertext)
////////////////////////////////////////////////////////////////////////////////////////////////////
function encrypt_buffer(buf, subject_private_key, operator_public_key) {
    const noncebuf = key.random32ByteBuffer();
    const cipherbuf = Aes.encrypt_with_checksum(
        subject_private_key, operator_public_key,
        noncebuf.toString('base64'), buf
    );
    return Buffer.concat([ Buffer.from([ noncebuf.length ]), noncebuf, cipherbuf ]);
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Decrypt buffer (nonce and ciphertext) with subject public key and operator private key
// Return original buffer as before encryption
////////////////////////////////////////////////////////////////////////////////////////////////////
function decrypt_buffer(buf, subject_public_key, operator_private_key) {
    const noncelen = buf.slice(0, 1)[0];
    const noncebuf = buf.slice(1, 1 + noncelen);
    const cipherbuf = buf.slice(1 + noncelen);
    const plainbuf = Aes.decrypt_with_checksum(
        operator_private_key, subject_public_key,
        noncebuf.toString('base64'), cipherbuf
    );
    return plainbuf;
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Generate brain key
////////////////////////////////////////////////////////////////////////////////////////////////////
function create_brain_key() {
    return key.suggest_brain_key(require('./dictionary_en.json').en, crypto.randomBytes(64).toString());
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Content encryption settings
////////////////////////////////////////////////////////////////////////////////////////////////////
const CONTENT_CIPHER_ALGORITHM = 'aes-256-cbc';
const CONTENT_CIPHER_ALGORITHM_KEY_SIZE = 32;
const CONTENT_CIPHER_ALGORITHM_IV_SIZE = 16;
const CONTENT_CIPHER_ALGORITHM_NOENCRYPT = 'noencrypt';

////////////////////////////////////////////////////////////////////////////////////////////////////
// Create content encryption info (algorithm and random key and random IV)
////////////////////////////////////////////////////////////////////////////////////////////////////
function make_content_key() {
    return {
        algo: CONTENT_CIPHER_ALGORITHM,
        key: (CONTENT_CIPHER_ALGORITHM_KEY_SIZE > 0) ?
            crypto.randomBytes(CONTENT_CIPHER_ALGORITHM_KEY_SIZE).toString('hex') :
            null,
        iv: (CONTENT_CIPHER_ALGORITHM_IV_SIZE > 0) ?
            crypto.randomBytes(CONTENT_CIPHER_ALGORITHM_IV_SIZE).toString('hex') :
            null
    };
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Create content encryption info with no encryption
////////////////////////////////////////////////////////////////////////////////////////////////////
function make_content_key_noencrypt() {
    return {
        algo: CONTENT_CIPHER_ALGORITHM_NOENCRYPT,
        key: null,
        iv: null
    };
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Create content encryption transform stream
////////////////////////////////////////////////////////////////////////////////////////////////////
function make_content_cipher_stream(content_key) {
    if (content_key.algo === CONTENT_CIPHER_ALGORITHM_NOENCRYPT)
        return new stream.PassThrough();
    return crypto.createCipheriv(
        content_key.algo,
        Buffer.from(content_key.key, 'hex'),
        content_key.iv ? Buffer.from(content_key.iv, 'hex') : null);
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Create content decryption transform stream
////////////////////////////////////////////////////////////////////////////////////////////////////
function make_content_decipher_stream(content_key) {
    if (content_key.algo === CONTENT_CIPHER_ALGORITHM_NOENCRYPT)
        return new stream.PassThrough();
    return crypto.createDecipheriv(
        content_key.algo,
        Buffer.from(content_key.key, 'hex'),
        content_key.iv ? Buffer.from(content_key.iv, 'hex') : null);
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Transform content buffer using cipher/decipher transform
////////////////////////////////////////////////////////////////////////////////////////////////////
function crypto_content_transform(transform, input) {
    const buf_main = transform.update(input);
    const buf_final = transform.final();
    return Buffer.concat([ buf_main, buf_final ]);
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Encrypt content buffer using key
////////////////////////////////////////////////////////////////////////////////////////////////////
function encrypt_content(plain_content_buf, content_key) {
    const cipher = make_content_cipher_stream(content_key);
    return crypto_content_transform(cipher, plain_content_buf);
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Decrypt content buffer using key
////////////////////////////////////////////////////////////////////////////////////////////////////
function decrypt_content(cipher_content_buf, content_key) {
    const decipher = make_content_decipher_stream(content_key);
    return crypto_content_transform(decipher, cipher_content_buf);
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Encrypt content string using key
////////////////////////////////////////////////////////////////////////////////////////////////////
function encrypt_content_str(plain_content_str, content_key) {
    return encrypt_content(Buffer.from(plain_content_str, 'utf-8'), content_key).toString('base64')
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Decrypt content string using key
////////////////////////////////////////////////////////////////////////////////////////////////////
function decrypt_content_str(cipher_content_str, content_key) {
    return decrypt_content(Buffer.from(cipher_content_str, 'base64'), content_key).toString('utf-8')
}

exports.encrypt_object = encrypt_object;
exports.decrypt_object = decrypt_object;
exports.encrypt_buffer = encrypt_buffer;
exports.decrypt_buffer = decrypt_buffer;
exports.create_brain_key = create_brain_key;
exports.make_content_key = make_content_key;
exports.make_content_key_noencrypt = make_content_key_noencrypt;
exports.make_content_cipher_stream = make_content_cipher_stream;
exports.make_content_decipher_stream = make_content_decipher_stream;
exports.crypto_content_transform = crypto_content_transform;
exports.encrypt_content = encrypt_content;
exports.decrypt_content = decrypt_content;
exports.encrypt_content_str = encrypt_content_str;
exports.decrypt_content_str = decrypt_content_str;
