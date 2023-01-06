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

require('dotenv').config();
const { PrivateKey } = require('@revolutionpopuli/revpopjs');
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

function sort_ids(arr) {
    return arr.sort((a, b) => parseInt(a.split('.').pop()) - parseInt(b.split('.').pop()));
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function log(title, text) {
    console.log(`${(new Date).toLocaleTimeString()} ${title}: ${text}`);
}

async function case3_rdpos() {
    try {
        const connection_string = process.env.BLOCKCHAIN_URL;
        console.log(`Connecting to ${connection_string}...`);
        const network = await revpop.connect(connection_string);
        console.log(`Connected to network ${network.network_name}`);
        console.log(``);

        // run init script if not done before
        if (await revpop.query_balance(revpop.config.balance_address)) {
            require('child_process').spawnSync(process.execPath, ['case0-bootstrap'], {stdio: [0, 1, 2]});
        }

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

        const gp = await revpop.db_exec("get_global_properties");
        const min = Math.ceil(gp.parameters.maintenance_interval / 60);

        console.log(`Active witnesses change every ${min} min. (maintenance interval)`);
        console.log(`At first, new witnesses are selected. They will be shown under "MAINTENANCE" header.`);
        console.log(`Then the schedule is formed and new witnesses start their work. This will be shown as "NEW SCHEDULE".`);
        console.log(`Watching for witnesses...`);
        console.log(`Press Ctrl-C to exit`);
        console.log(``);

        let last_head_block_number = -1;
        let last_next_maintenance_time = null;
        let last_schedule = null;
        let fresh_blockchain_check = true;
        for (;;) {
            const dpo = await revpop.db_exec("get_dynamic_global_properties");
            if (last_head_block_number !== dpo.head_block_number) {
                last_head_block_number = dpo.head_block_number;
                log('BLOCK', `head_block_number ${dpo.head_block_number}, current_witness ${JSON.stringify(dpo.current_witness)}`);

                // Handle a new maintenance interval
                if (last_next_maintenance_time === null) {
                    last_next_maintenance_time = dpo.next_maintenance_time;
                }
                if (last_next_maintenance_time !== dpo.next_maintenance_time) {
                    last_next_maintenance_time = dpo.next_maintenance_time;
                    const gpo = await revpop.db_exec("get_global_properties");
                    log('MAINTENANCE', `active_witnesses (count=${gpo.active_witnesses.length}) ${JSON.stringify(gpo.active_witnesses)}`);
                }

                // Handle the first schedule change after the new maintenance interval
                const ws = await revpop.db_exec("get_witness_schedule");
                const schedule = sort_ids(ws.current_shuffled_witnesses);
                if (last_schedule === null) {
                    last_schedule = schedule;
                }
                if (JSON.stringify(last_schedule) !== JSON.stringify(schedule)) {
                    last_schedule = schedule;
                    log('NEW SCHEDULE', `active_witnesses (count=${schedule.length}) ${JSON.stringify(schedule)}`);
                }

                // Show fresh blockchain message
                if (fresh_blockchain_check) {
                    fresh_blockchain_check = false;
                    if (schedule.length === 1) {
                        console.log('It looks like the blockchain has just been launched. The schedule will be formed shortly.');
                    }
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
