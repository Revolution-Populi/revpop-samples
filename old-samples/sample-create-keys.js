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

const {
    key, PrivateKey, Login
} = require('@Revolution-Populi/revpopjs');

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
    let { privKeys, pubKeys } = Login.generateKeys("someaccountname", "somereallylongpassword", null, "REV");
    console.log(`Private keys: ${JSON.stringify(Object.keys(privKeys).map(keyName => privKeys[keyName].toWif()))}`);
    console.log(`Public keys: ${JSON.stringify(Object.keys(pubKeys).map(keyName => pubKeys[keyName].toString()))}`);
}

exports.sample_create_keys = sample_create_keys;

if (require.main === module) {
    const { run_func } = require('../index');
    run_func(sample_create_keys);
}
