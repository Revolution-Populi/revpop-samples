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
