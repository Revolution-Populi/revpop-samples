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

const fs = require('fs');
const {
    encrypt_object,
    decrypt_object,
    make_content_key,
    encrypt_content_str,
    decrypt_content_str,
} = require('./crypto');
const { computeBufSha256 } = require('./signature');
const aes_cpp = require('./aes_cpp');
const {
    TransactionBuilder,
    ObjectId,
    Chain: { ChainConfig, Apis }
} = require('@revolutionpopuli/revpopjs');

const config = {
    network_name: "RevPop",
    asset_name: "REV",
    asset: null,
    chain_id: process.env.CHAIN_ID || "0eaffbc81383f34639f8615a1822b2a7bdcfb172c880a1829dd146d03c997df2",
    balance_address: "REVBrWn6V3fn1KdCZRo4DVmrMq7MpTtic5CW"
};

ChainConfig.networks[config.network_name] = {
    core_asset: config.asset_name,
    address_prefix: config.asset_name,
    chain_id: config.chain_id
};

// Initialize revpop config
ChainConfig.setChainId(config.chain_id);

const CONTENT_CARD_ID_START = '1.18.0';
const PERMISSION_ID_START = '1.19.0';
const CONTENT_VOTE_ID_START = '1.20.0';

async function connect(connection_string) {
    const conn_res = await Apis.instance(
        connection_string, // cs
        true, // connect
        4000, // connectTimeout
        { enableCrypto: false, enableOrders: false }, // optionalApis
        () => { /*console.log(`Connection closed`)*/ }, // closeCb
    ).init_promise;
    const network = conn_res[0];
    if (network.network_name !== config.network_name) {
        throw new Error('Wrong blockchain network (chain ID mismatch)! Change it in the .env file.');
    }
    config.asset = await get_asset(config.asset_name);
    return network;
}

async function disconnect() {
    await Apis.close();
}

async function db_exec(name, ...params) {
    return await Apis.instance().db_api().exec(name, params);
}

async function transaction(pkey, name, operation) {
    const tsx = new TransactionBuilder();
    tsx.add_type_operation(name, operation);
    await tsx.set_required_fees();
    tsx.add_signer(pkey, pkey.toPublicKey().toPublicKeyString());
    const result = await tsx.broadcast();
    const operation_results = result[0].trx.operation_results[0];
    switch (operation_results[0]) {
        case 0: // variant: void
            return operation_results[1];
        case 1: // variant: object_id
            return operation_results[1];
        case 2: // variant: asset
            return operation_results[1];
    }
    throw new Error(`Unknown operation result variant ${JSON.stringify(operation_results)}!`);
}

async function get_asset(name) {
    const assets = await db_exec('get_assets', [ name ]);
    if (assets.length < 1) {
        throw new Error(`No asset "${name}" found in blockchain!`);
    }
    return assets[0];
}

function get_main_asset() {
    return config.asset;
}

function no_fee() {
    return { amount: 0, asset_id: config.asset.id };
}

async function get_all_objects(db_req_name, account, start_object_id) {
    const PART_LIMIT = 100;
    let acc = [];
    let cur_object_id = start_object_id;
    for (;;) {
        let part = await db_exec(db_req_name, account.acc.id, cur_object_id, PART_LIMIT);
        if ((acc.length > 0) && (part.length > 0)) {
            const prev_last_id = acc[acc.length - 1].id;
            const next_first_id = part[0].id;
            if (prev_last_id === next_first_id) {
                part = part.slice(1);
            }
        }
        if (part.length <= 0) {
            break;
        }
        acc = acc.concat(part);
        cur_object_id = part[part.length - 1].id;
    }
    return acc;
}

async function get_all_content_cards(subject_account) {
    return await get_all_objects('get_content_cards', subject_account, CONTENT_CARD_ID_START);
}

async function get_all_permissions(operator_account) {
    return await get_all_objects('get_permissions', operator_account, PERMISSION_ID_START);
}

async function get_all_content_votes(subject_account) {
    return await get_all_objects('get_content_votes', subject_account, CONTENT_VOTE_ID_START);
}

async function get_content_card(content_id) {
    return await db_exec('get_content_card_by_id', content_id);
}

async function get_permission(permission_id) {
    return await db_exec('get_permission_by_id', permission_id);
}

async function create_content_card(account, content) {
    content.buffer = content.buffer || fs.readFileSync(content.path);
    content.hash = content.hash || computeBufSha256(content.buffer);
    content.url = content.url || content.hash;
    content.type = content.type || '';
    content.description = content.description || '';
    content.key = content.key || make_content_key();
    return await transaction(account.key, 'content_card_create', {
        fee: no_fee(),
        subject_account: account.acc.id,
        hash: content.hash,
        url: content.url,
        type: content.type,
        description: content.description,
        content_key: encrypt_object(content.key, account.key, account.key.toPublicKey()),
    });
}

async function update_content_card(account, content) {
    content.buffer = content.buffer || fs.readFileSync(content.path);
    content.hash = content.hash || computeBufSha256(content.buffer);
    content.url = content.url || content.hash;
    content.type = content.type || '';
    content.description = content.description || '';
    content.key = content.key || make_content_key();
    return await transaction(account.key, 'content_card_update', {
        fee: no_fee(),
        subject_account: account.acc.id,
        hash: content.hash,
        url: content.url,
        type: content.type,
        description: content.description,
        content_key: encrypt_object(content.key, account.key, account.key.toPublicKey()),
    });
}

async function remove_content_card(subject_account, content_card_id) {
    return await transaction(subject_account.key, 'content_card_remove', {
        fee: no_fee(),
        subject_account: subject_account.acc.id,
        content_id: content_card_id,
    });
}

async function create_vote(account, content, master_account_id = null) {
    const votes_mixing_account = await get_account_of_witness(master_account_id || await get_current_witness_id());
    const votes_mixing_account_pub_key = votes_mixing_account.active.key_auths[0][0];
    const enc_msg = aes_cpp.encrypt(
        account.key,
        votes_mixing_account_pub_key,
        ObjectId.fromString(content.id).instance.toString());
    const master_content_id = `${enc_msg.nonce}:${enc_msg.checksum}:${enc_msg.message.toString('base64')}`;
    return await transaction(account.key, 'content_vote_create', {
        fee: no_fee(),
        subject_account: account.acc.id,
        content_id: encrypt_content_str(content.id, account.votes_key),
        master_account: votes_mixing_account.id,
        master_content_id: master_content_id,
    });
}

async function remove_vote(account, vote_id) {
    return await transaction(account.key, 'content_vote_remove', {
        fee: no_fee(),
        subject_account: account.acc.id,
        vote_id: vote_id,
    });
}

async function get_votes_read_permission_key(subject_acc, operator_acc) {
    const permissions = await get_all_permissions(operator_acc);
    const permission = permissions.find(permission =>
        (permission.subject_account === subject_acc.acc.id) &&
        (permission.operator_account === operator_acc.acc.id) &&
        (permission.permission_type === 'votes')
    );
    if (permission) {
        const votes_key = decrypt_object(permission.content_key, subject_acc.key.toPublicKey(), operator_acc.key);
        if (votes_key) {
            return votes_key;
        }
    }
    return null;
}

async function get_content_votes_content_ids(account, votes_key) {
    const votes = await get_all_content_votes(account);
    return votes.map(vote => decrypt_content_str(vote.content_id, votes_key));
}

async function create_content_read_permission(subject_acc, operator_acc, content) {
    return await transaction(subject_acc.key, 'permission_create', {
        fee: no_fee(),
        subject_account: subject_acc.acc.id,
        operator_account: operator_acc.acc.id,
        permission_type: 'content',
        object_id: content.id,
        content_key: encrypt_object(content.key, subject_acc.key, operator_acc.key.toPublicKey()),
    });
}

async function create_votes_read_permission(subject_acc, operator_acc) {
    return await transaction(subject_acc.key, 'permission_create', {
        fee: no_fee(),
        subject_account: subject_acc.acc.id,
        operator_account: operator_acc.acc.id,
        permission_type: 'votes',
        //object_id: , // Vote objects are not specified here!
        content_key: encrypt_object(subject_acc.votes_key, subject_acc.key, operator_acc.key.toPublicKey()),
    });
}

async function remove_permission(subject_account, permission_id) {
    return await transaction(subject_account.key, 'permission_remove', {
        fee: no_fee(),
        subject_account: subject_account.acc.id,
        permission_id: permission_id,
    });
}

async function query_balance(address) {
    const balances = await db_exec('get_balance_objects', [ address ]);
    if (balances.length === 1) {
        return balances[0];
    }
}

async function claim_balance(account, balance) {
    await transaction(account.key, "balance_claim", {
        fee: no_fee(),
        deposit_to_account: account.acc.id,
        balance_to_claim: balance.id,
        balance_owner_key: account.key.toPublicKey().toPublicKeyString(),
        total_claimed: {
            amount: balance.balance.amount,
            asset_id: balance.balance.asset_id
        }
    });
}

async function create_account(registrar, newaccount) {
    const owner_key  = newaccount.owner_key  || newaccount.key;
    const active_key = newaccount.active_key || newaccount.key;
    const memo_key   = newaccount.memo_key   || newaccount.key;
    return await transaction(registrar.key, "account_create", {
        fee: no_fee(),
        registrar: registrar.acc.id,
        referrer: registrar.acc.id,
        referrer_percent: 0,
        name: newaccount.name,
        owner: {
            weight_threshold: 1,
            account_auths: [],
            key_auths: [ [ owner_key.toPublicKey().toPublicKeyString(), 1 ] ],
            address_auths: []
        },
        active: {
            weight_threshold: 1,
            account_auths: [],
            key_auths: [ [ active_key.toPublicKey().toPublicKeyString(), 1 ] ],
            address_auths: []
        },
        options: {
            memo_key: memo_key.toPublicKey().toPublicKeyString(),
            voting_account: "1.2.5",
            num_witness: 0,
            num_committee: 0,
            votes: []
        },
    });
}

async function upgrade_account(account) {
    await transaction(account.key, "account_upgrade", {
        fee: no_fee(),
        account_to_upgrade: account.acc.id,
        upgrade_to_lifetime_member: true
    });
}

async function get_current_witness_id() {
    const props = await db_exec("get_dynamic_global_properties");
    const current_witness_id = props.current_witness;
    if (!current_witness_id) {
        throw new Error('No current witness in blockchain!');
    }
    return current_witness_id;
}

async function get_head_block_witness_id() {
    const props = await db_exec("get_dynamic_global_properties");
    const head_block_number = props.head_block_number;
    if (!head_block_number) {
        throw new Error('No head block in blockchain!');
    }
    const head_block_hdr = await db_exec("get_block_header", head_block_number);
    if (!head_block_hdr) {
        throw new Error('Can not get header of head block in blockchain!');
    }
    const head_block_witness_id = head_block_hdr.witness;
    if (!head_block_witness_id) {
        throw new Error('No witness in head block in blockchain!');
    }
    return head_block_witness_id;
}

async function get_last_irreversible_block_witness_id() {
    const props = await db_exec("get_dynamic_global_properties");
    const last_irreversible_block_num = props.last_irreversible_block_num;
    if (!last_irreversible_block_num) {
        throw new Error('No last irreversible block in blockchain!');
    }
    const last_irreversible_block_hdr = await db_exec("get_block_header", last_irreversible_block_num);
    if (!last_irreversible_block_hdr) {
        throw new Error('Can not get header of last irreversible block in blockchain!');
    }
    const last_irreversible_block_witness_id = last_irreversible_block_hdr.witness;
    if (!last_irreversible_block_witness_id) {
        throw new Error('No witness in last irreversible block in blockchain!');
    }
    return last_irreversible_block_witness_id;
}

async function get_account_of_witness(witness_id) {
    const witnesses = await db_exec("get_witnesses", [ witness_id ]);
    if (witnesses.length < 1) {
        throw new Error(`No witness with id ${witness_id} in blockchain!`);
    }
    const witness_account_id = witnesses[0].witness_account;
    if (!witness_account_id) {
        throw new Error(`No witness with id ${witness_id} in blockchain!`);
    }
    const witness_accounts = await db_exec("get_accounts", [ witness_account_id ]);
    if (witness_accounts.length < 1) {
        throw new Error(`No witness with id ${witness_id} in blockchain!`);
    }
    return witness_accounts[0];
}

module.exports = {
    config,
    CONTENT_CARD_ID_START,
    PERMISSION_ID_START,
    CONTENT_VOTE_ID_START,
    connect,
    disconnect,
    db_exec,
    transaction,
    get_asset,
    get_main_asset,
    no_fee,
    get_all_objects,
    get_all_content_cards,
    get_all_permissions,
    get_all_content_votes,
    get_content_card,
    get_permission,
    create_content_card,
    update_content_card,
    remove_content_card,
    create_vote,
    remove_vote,
    get_votes_read_permission_key,
    get_content_votes_content_ids,
    create_content_read_permission,
    create_votes_read_permission,
    remove_permission,
    query_balance,
    claim_balance,
    create_account,
    upgrade_account,
    get_current_witness_id,
    get_head_block_witness_id,
    get_last_irreversible_block_witness_id,
    get_account_of_witness
};
