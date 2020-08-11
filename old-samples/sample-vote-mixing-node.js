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
