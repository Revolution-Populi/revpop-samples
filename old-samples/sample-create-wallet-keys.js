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
