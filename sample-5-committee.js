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
const assert = require('assert');
const path = require('path');
const { PrivateKey, TransactionBuilder } = require('@revolutionpopuli/revpopjs');
const revpop = require('./lib/revpop');

const pkey = PrivateKey.fromWif('5KXbCDyCPL3eGX6xX5uJHVwoAYheF7L5fKf67oQocgJA8kNvVHF');

const accounts = [
    { name: 'init0' },
    { name: 'init1' },
    { name: 'init2' },
    { name: 'init3' },
    { name: 'init4' },
    { name: 'init5' },
    { name: 'init6' },
    { name: 'init7' },
    { name: 'init8' },
    { name: 'init9' },
    { name: 'init10' },
];

function cup_op(parameters) {
    const new_parameters = Object.assign(
        parameters,
        {
            current_fees: {
                parameters: [],
                scale: 10000
            },
            revpop_vote_mixture: 6
        }
    );

    return {
        fee: revpop.no_fee(),
        new_parameters
    };
}

async function sample_5_committee() {
    // Connect to blockchain
    const connect_string = process.env.BLOCKCHAIN_URL;
    console.log(`Connecting to ${connect_string}...`);
    const network = await revpop.connect(connect_string);
    console.log(`Connected to network: ${network.network_name}`);
    console.log(``);

    for (const account of accounts) {
        account.account = await revpop.db_exec('get_account_by_name', account.name);
        account.key = pkey;
    }

    const make_proposal_result = await make_proposal(accounts[0]);
    console.log('make_proposal', make_proposal_result);

    const proposal_id = make_proposal_result;
    const vote_proposal_result = await Promise.all(accounts.map((account) => {
        return vote_for_proposal(account, proposal_id)
    }));
    console.log('vote_for_proposal', vote_proposal_result);
}

async function make_proposal(member) {
    const pkey = member.key;
    const global_properties = await revpop.db_exec('get_global_properties');
    const parameters = global_properties.parameters;
    const review_period = parameters.committee_proposal_review_period;
    // 120 - 2 min for voting
    const expiration_time = Math.ceil(Date.now() / 1000) + review_period + 120;

    const txb = new TransactionBuilder();
    await txb.update_head_block();
    txb.add_type_operation('committee_member_update_global_parameters', cup_op(parameters));
    await txb.set_required_fees();
    txb.propose({
        fee: revpop.fee(1206522),
        fee_paying_account: member.account.id,
        expiration_time: expiration_time,
        review_period_seconds: review_period
    });
    txb.add_signer(pkey, pkey.toPublicKey().toPublicKeyString());
    const result = await txb.broadcast();
    const operation_results = result[0].trx.operation_results[0];

    return operation_results[1];
}

async function vote_for_proposal(member, proposal_id) {
    const pkey = member.key;
    const txb = new TransactionBuilder();
    await txb.update_head_block();
    txb.add_type_operation('proposal_update', {
        fee_paying_account: member.account.id,
        proposal: proposal_id,
        active_approvals_to_add: [
            member.account.id
        ]
    });
    await txb.set_required_fees();
    txb.add_signer(pkey, pkey.toPublicKey().toPublicKeyString());
    const result = await txb.broadcast();
    const operation_results = result[0].trx.operation_results[0];

    return operation_results[1];
}

async function finalizer() {
    console.log(`Disconnect from RevPop...`);
    await revpop.disconnect();
}

if (require.main === module) {
    const { run_func } = require('./index');
    run_func(sample_5_committee, finalizer);
}
