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

require('dotenv').config();
const { PrivateKey } = require('@Revolution-Populi/revpopjs');
const revpop = require('./lib/revpop');

async function get_witness(witness_acc_name) {
    const witness = await revpop.db_exec('get_witness_by_account', witness_acc_name);
    if (!witness) {
        throw new Error(`No witness with account ${witness_acc_name} found!`);
    }
    return witness;
}

async function get_witnesses(witnesses_acc_names) {
    const witnesses_promises = [];
    for (const witnesses_acc_name of witnesses_acc_names) {
        witnesses_promises.push(get_witness(witnesses_acc_name));
    }
    return await Promise.all(witnesses_promises);
}

async function vote_for_witnesses(voter, witnesses_acc_names) {
    const witnesses = await get_witnesses(witnesses_acc_names);
    const new_options = JSON.parse(JSON.stringify(voter.acc.options));
    new_options.votes = witnesses.map(witness => witness.vote_id);
    new_options.votes.sort();
    new_options.num_witness = new_options.votes.length;
    await revpop.transaction(voter.key, 'account_update', {
        fee: revpop.no_fee(),
        account: voter.acc.id,
        new_options: new_options,
    });
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function case3_rdpos() {
    try {
        const connection_string = process.env.BLOCKCHAIN_URL;
        console.log(`Connecting to ${connection_string}...`);
        const network = await revpop.connect(connection_string);
        console.log(`Connected to network ${network.network_name}`);
        console.log(``);

        console.log(`Initialize all accounts...`);
        const accounts = [
            { nick: 'voter', name: 'nathan' },
        ];
        const [ voter ] = accounts;
        for (const account of accounts) {
            account.acc = await revpop.db_exec('get_account_by_name', account.name);
            account.key = PrivateKey.fromWif('5KXbCDyCPL3eGX6xX5uJHVwoAYheF7L5fKf67oQocgJA8kNvVHF');
            console.log(`Account ${account.nick} ${account.name} ${account.acc ? account.acc.id : '[no account yet]'}`);
        }
        console.log(``);

        const witnesses_acc_names = [ 'init0', 'init1', 'init2', 'init3', 'init4' ];
        const witnesses_ids = (await get_witnesses(witnesses_acc_names)).map(witness => witness.id);

        console.log(`Voting for witnesses ${JSON.stringify(witnesses_ids)}...`);
        await vote_for_witnesses(voter, witnesses_acc_names);
        console.log(`OK`);
        console.log(``);

        console.log(`Watching for witnesses...`);
        console.log(`Press Ctrl-C to exit`);
        console.log(``);

        let last_head_block_number = -1;
        let last_next_maintenance_time = null;
        for (;;) {
            const dpo = await revpop.db_exec("get_dynamic_global_properties");
            if (last_head_block_number !== dpo.head_block_number) {
                last_head_block_number = dpo.head_block_number;
                console.log(`BLOCK: head_block_number ${dpo.head_block_number}, current_witness ${JSON.stringify(dpo.current_witness)}`);
                if (last_next_maintenance_time === null) {
                    last_next_maintenance_time = dpo.next_maintenance_time;
                }
                if (last_next_maintenance_time !== dpo.next_maintenance_time) {
                    last_next_maintenance_time = dpo.next_maintenance_time;
                    const gpo = await revpop.db_exec("get_global_properties");
                    console.log(`MAINTENANCE: active_witnesses (count=${gpo.active_witnesses.length}) ${JSON.stringify(gpo.active_witnesses)}`);
                }
            }
            await sleep(500);
        }

    } catch (err) {
        console.error(`Error:`, err);
        if (err.data && err.data.stack)
            console.error(err.data.stack);
        console.log(``);
    }

    console.log(`Close connection`);
    await revpop.disconnect();
    console.log(``);
}

exports.case3_rdpos = case3_rdpos;

if (require.main === module) {
    case3_rdpos();
}
