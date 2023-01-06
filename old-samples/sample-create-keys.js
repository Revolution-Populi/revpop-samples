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

const {
    key, PrivateKey, Login
} = require('@revolutionpopuli/revpopjs');

function sample_create_keys() {
    const seed = "THIS IS A TERRIBLE BRAINKEY SEED WORD SEQUENCE";
    const seed_norm = key.normalize_brainKey(seed);
    const pkey = PrivateKey.fromSeed(seed_norm);
    const pkey0 = key.get_brainPrivateKey(seed_norm, 0);
    const pkey1 = key.get_brainPrivateKey(seed_norm, 1);
    
    console.log(`\nPrivate key: ${pkey.toWif()}`);
    console.log(`Public key : ${pkey.toPublicKey().toString()}\n`);
    console.log(`\nPrivate key: ${pkey0.toWif()}`);
    console.log(`Public key : ${pkey0.toPublicKey().toString()}\n`);
    console.log(`\nPrivate key: ${pkey1.toWif()}`);
    console.log(`Public key : ${pkey1.toPublicKey().toString()}\n`);
    
    // Generate keys by Login
    let roles = Login.get("roles");
    console.log(`Roles: ${JSON.stringify(roles)}`);
    let { privKeys, pubKeys } = Login.generateKeys("someaccountname", "somereallylongpassword", null, "RVP");
    console.log(`Private keys: ${JSON.stringify(Object.keys(privKeys).map(keyName => privKeys[keyName].toWif()))}`);
    console.log(`Public keys: ${JSON.stringify(Object.keys(pubKeys).map(keyName => pubKeys[keyName].toString()))}`);
}

exports.sample_create_keys = sample_create_keys;

if (require.main === module) {
    const { run_func } = require('../index');
    run_func(sample_create_keys);
}
