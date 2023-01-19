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

const { hash, Signature } = require('@revolutionpopuli/revpopjs');

////////////////////////////////////////////////////////////////////////////////////////////////////
// Compute SHA256 hash of string
// Return hex lowercase representation of hash
////////////////////////////////////////////////////////////////////////////////////////////////////
function computeSha256(str) {
    const buf = Buffer.from(str.toString(), 'utf-8');
    return hash.sha256(buf).toString('hex');
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Compute SHA256 hash of buffer
// Return hex lowercase representation of hash
////////////////////////////////////////////////////////////////////////////////////////////////////
function computeBufSha256(buf) {
    return hash.sha256(buf).toString('hex');
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Compute signature of SHA256 hash (hex format)
// Return base64 representation of signature
////////////////////////////////////////////////////////////////////////////////////////////////////
function computeSignOfSha256(hash, private_key) {
    const hash_buf = Buffer.from(hash.toString(), 'hex');
    const sign_obj = Signature.signBufferSha256(hash_buf, private_key);
    return sign_obj.toBuffer().toString('base64');
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Verify signature (base64 format) of SHA256 hash (hex format)
// Return boolean value
////////////////////////////////////////////////////////////////////////////////////////////////////
function verifySignOfSha256(sign, hash, public_key) {
    const hash_buf = Buffer.from(hash.toString(), 'hex');
    const sign_obj = Signature.fromBuffer(Buffer.from(sign.toString(), 'base64'));
    return sign_obj.verifyHash(hash_buf, public_key);
}

exports.computeSha256 = computeSha256;
exports.computeBufSha256 = computeBufSha256;
exports.computeSignOfSha256 = computeSignOfSha256;
exports.verifySignOfSha256 = verifySignOfSha256;
