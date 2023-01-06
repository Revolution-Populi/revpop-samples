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
const assert = require('assert');
const path = require('path');
const { PrivateKey, TransactionBuilder } = require('@revolutionpopuli/revpopjs');
const revpop = require('./lib/revpop');
const bootstrap = require('./case0-bootstrap.js');

const pkey = PrivateKey.fromWif('5KXbCDyCPL3eGX6xX5uJHVwoAYheF7L5fKf67oQocgJA8kNvVHF');

async function wait_until(stop_time_s) {
    const now_ms = Date.now();
    const stop_time_ms = stop_time_s * 1000;
    if (now_ms > stop_time_ms)
        return;

    const wait_s = Math.round((stop_time_ms - now_ms)/1000);
    console.log(`Waiting ${wait_s} seconds...`);

    while (Date.now() < stop_time_ms) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        process.stdout.write(`.`);
    }
    console.log(``);
}

async function wait(ms) {
    await wait_until((Date.now() + ms)/1000);
}

function committee_member_rp_vm_update_operation(parameters, new_rp_vm) {
    const new_parameters = Object.assign(
        parameters,
        {
            revpop_vote_mixture: new_rp_vm
        }
    );

    return {
        fee: revpop.no_fee(),
        new_parameters
    };
}

async function committee_member_make_proposal_update_revpop_vote_mixture(member, new_rp_vm) {
    const pkey = member.key;
    const global_properties = await revpop.db_exec('get_global_properties');
    const parameters = global_properties.parameters;
    const review_period = parameters.committee_proposal_review_period;
    // 120 - 2 min for voting
    const expiration_time = Math.ceil(Date.now() / 1000) + review_period + 120;

    const txb = new TransactionBuilder();
    await txb.update_head_block();
    txb.add_type_operation('committee_member_update_global_parameters', committee_member_rp_vm_update_operation(parameters, new_rp_vm));
    await txb.set_required_fees();
    txb.propose({
        fee: revpop.fee(1206522),
        fee_paying_account: member.acc.id,
        expiration_time: expiration_time,
        review_period_seconds: review_period
    });
    txb.add_signer(pkey, pkey.toPublicKey().toPublicKeyString());
    const result = await txb.broadcast();

    const operation_results = {};
    operation_results.id = result[0].trx.operation_results[0][1];
    const prop_obj = await revpop.db_exec('get_objects', [operation_results.id]);
    operation_results.expiration_time = prop_obj[0].expiration_time;
    operation_results.expiration = expiration_time;
    return operation_results;
}

async function vote_for_proposal(member, proposal_id) {
    const pkey = member.key;
    const txb = new TransactionBuilder();
    await txb.update_head_block();
    txb.add_type_operation('proposal_update', {
        fee_paying_account: member.acc.id,
        proposal: proposal_id,
        active_approvals_to_add: [
            member.acc.id
        ]
    });
    await txb.set_required_fees();
    txb.add_signer(pkey, pkey.toPublicKey().toPublicKeyString());
    const result = await txb.broadcast();
    const operation_results = result[0].trx.operation_results[0];

    return operation_results[1];
}

async function sample_5_committee() {
    await bootstrap.connect_to_network();
    await bootstrap.prepare_registrar_and_committee();

    for (const account of bootstrap.committee_member_accounts) {
        account.key = pkey;
    }

    const gp = await revpop.db_exec('get_global_properties');
    const rp_vm = gp.parameters.revpop_vote_mixture;
    const new_rp_vm = rp_vm + 1;
    console.log(`We going to change revpop_vote_mixture parameter of global properties from ${rp_vm} to ${new_rp_vm}`);

    const make_proposal_result = await committee_member_make_proposal_update_revpop_vote_mixture(bootstrap.committee_member_accounts[0], new_rp_vm);
    console.log(`make_proposal: ${make_proposal_result.id}, expiration: ${make_proposal_result.expiration_time}`);

    const proposal_id = make_proposal_result.id;
    const vote_proposal_result = await Promise.all(bootstrap.committee_member_accounts.map((acc) => {
        return vote_for_proposal(acc, proposal_id)
    }));
    console.log('vote_for_proposal', vote_proposal_result);

    console.log(`Waiting for proposal to implement at ${make_proposal_result.expiration_time}`);
    await wait_until(make_proposal_result.expiration);

    const dgp = await revpop.db_exec('get_dynamic_global_properties');
    const block_time = Date.parse(dgp.time);
    const next_maintenance_time = Date.parse(dgp.next_maintenance_time);
    const wait_for_maintenance_ms = next_maintenance_time - block_time;
    console.log(``);

    console.log(`Waiting for the next maintenance interval at ${dgp.next_maintenance_time}`);
    await wait(wait_for_maintenance_ms + 1000);

    const gp_new = await revpop.db_exec('get_global_properties');
    console.log(`Currently revpop_vote_mixture parameter of global properties is ${gp_new.parameters.revpop_vote_mixture}`);

    assert.equal(gp_new.parameters.revpop_vote_mixture, new_rp_vm);
}

exports.sample_committee_proposal = sample_5_committee;
exports.finalizer = bootstrap.close_network_connection;

if (require.main === module) {
    const { run_func } = require('./index');
    run_func(sample_5_committee, bootstrap.close_network_connection);
}
