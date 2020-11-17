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

const { create_common_account_keys } = require('../lib/keys');
require('../lib/revpop'); // Initialize revpop config to use correct public key prefix below
const assert = require('assert');

function sample_create_wallet_keys() {
    // Wallet command:
    // create_account_with_brain_key "DAWUT BULLBAT CONGEAL PRIUS AMBAN SWAYFUL STROW ROUTER MOSTLY PUNTO FALTCHE WARSEL INSERT CINEMA MORONRY BURO" new nathan nathan true true
    // generates sample account with these keys:
    const sample = {
        brain_key: "DAWUT BULLBAT CONGEAL PRIUS AMBAN SWAYFUL STROW ROUTER MOSTLY PUNTO FALTCHE WARSEL INSERT CINEMA MORONRY BURO",
        owner: {
            priv_key: "5JUR92r9BhKFwFXmkNDn26VURTaNouuCB9RKv4YdJGxuvDU8dXw",
            pub_key: "RVP5THrbGQG65FYCmyYxZPfkmZSyQw8LXv6JJd2pSuAri3znxgVzC",
        },
        active: {
            priv_key: "5JbUcrw6SawrNBFADoSvHX8mxGgWgWaywEwEeV4gaktbcwUHCB2",
            pub_key: "RVP8S63oDiWRUUgrgvnVqpZbgcrmhNWsJ2EFbow1PtTPkfGagZkqT",
        },
        memo: {
            priv_key: "5JBzaA9XLpyMCKsympdRd1kec5x1xUqmPnfCMHGSXTiVPQFiKmj",
            pub_key: "RVP5FnB8fWetaBDmYoPQkDtazxU1mvZHiApXHSRrkuiNSTnxcsji1",
        },
    };

    // Regenerate account keys witth js lib:
    const account_keys = create_common_account_keys(sample.brain_key);
    console.log(`Owner key: ${account_keys.owner.toWif()} ${account_keys.owner.toPublicKey().toString()}`);
    assert.equal(account_keys.owner.toWif(), sample.owner.priv_key);
    console.log(`Active key: ${account_keys.active.toWif()} ${account_keys.active.toPublicKey().toString()}`);
    assert.equal(account_keys.active.toWif(), sample.active.priv_key);
    console.log(`Memo key: ${account_keys.memo.toWif()} ${account_keys.memo.toPublicKey().toString()}`);
    assert.equal(account_keys.memo.toWif(), sample.memo.priv_key);
}

exports.sample_create_wallet_keys = sample_create_wallet_keys;

if (require.main === module) {
    const { run_func } = require('../index');
    run_func(sample_create_wallet_keys);
}
