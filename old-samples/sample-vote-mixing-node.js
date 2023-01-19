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
const assert = require('assert');
const revpop = require('../lib/revpop');

async function sample_vote_mixing_node() {
    const connect_string = process.env.BLOCKCHAIN_URL;
    console.log(`Connecting to ${connect_string}...`);
    const network = await revpop.connect(connect_string);
    console.log(`Connected to network ${network.network_name}`);
    console.log(``);

    {
        const current_witness_account = await revpop.get_account_of_witness(await revpop.get_current_witness_id());
        console.log(`current witness`);
        console.log(`    account_id   ${current_witness_account.id}`);
        console.log(`    account_name ${current_witness_account.name}`);
        console.log(`    active_key   ${current_witness_account.active.key_auths[0][0]}`);
        console.log(``);
        assert.strictEqual(typeof(current_witness_account.active.key_auths[0][0]), 'string');
        assert.notStrictEqual(current_witness_account.active.key_auths[0][0], '');
    }

    {
        const head_block_witness_account = await revpop.get_account_of_witness(await revpop.get_head_block_witness_id());
        console.log(`head block witness`);
        console.log(`    account_id   ${head_block_witness_account.id}`);
        console.log(`    account_name ${head_block_witness_account.name}`);
        console.log(`    active_key   ${head_block_witness_account.active.key_auths[0][0]}`);
        console.log(``);
        assert.strictEqual(typeof(head_block_witness_account.active.key_auths[0][0]), 'string');
        assert.notStrictEqual(head_block_witness_account.active.key_auths[0][0], '');
    }


    {
        const last_irreversible_block_witness_account = await revpop.get_account_of_witness(await revpop.get_head_block_witness_id());
        console.log(`last irreversible block witness`);
        console.log(`    account_id   ${last_irreversible_block_witness_account.id}`);
        console.log(`    account_name ${last_irreversible_block_witness_account.name}`);
        console.log(`    active_key   ${last_irreversible_block_witness_account.active.key_auths[0][0]}`);
        console.log(``);
        assert.strictEqual(typeof(last_irreversible_block_witness_account.active.key_auths[0][0]), 'string');
        assert.notStrictEqual(last_irreversible_block_witness_account.active.key_auths[0][0], '');
    }
}

async function finalizer() {
    console.log(`Disconnect from RevPop...`);
    await revpop.disconnect();
}

exports.sample_vote_mixing_node = sample_vote_mixing_node;
exports.finalizer = finalizer;

if (require.main === module) {
    const { run_func } = require('../index');
    run_func(sample_vote_mixing_node, finalizer);
}
