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

const { key } = require('@revolutionpopuli/revpopjs');
const assert = require('assert');
const { computeSha256, computeSignOfSha256, verifySignOfSha256 } = require('../lib/signature');
const {
    deepSortObjKeys, getObjPart,
    makeFullPersonalDataContent, makeFullPersonalData, makePartialPersonalData, hashPersonalData
} = require('../lib/personal_data');

async function sample_sign_data() {
    const private_key = key.get_random_key();

    const personal_data1 = {
        name: {
            first: 'Alice',
            last: 'Carroll'
        },
        email: 'a.carroll@gmail.com'
    };
    const personal_data1_str = JSON.stringify(personal_data1);
    const personal_data1_hash = computeSha256(personal_data1_str);
    const sign1 = computeSignOfSha256(personal_data1_hash, private_key);
    const sign1_verified = verifySignOfSha256(sign1, personal_data1_hash, private_key.toPublicKey());
    assert.equal(sign1_verified, true);

    const personal_data2 = { ...personal_data1 };
    personal_data2.email = 'a.carroll@gmali.com';
    const personal_data2_str = JSON.stringify(personal_data2);
    const personal_data2_hash = computeSha256(personal_data2_str);
    const sign2 = computeSignOfSha256(personal_data2_hash, private_key);
    const sign2_verified = verifySignOfSha256(sign2, personal_data2_hash, private_key.toPublicKey());
    assert.equal(sign2_verified, true);

    const sign12_verified = verifySignOfSha256(sign1, personal_data2_hash, private_key.toPublicKey());
    assert.equal(sign12_verified, false);

    const sign21_verified = verifySignOfSha256(sign2, personal_data1_hash, private_key.toPublicKey());
    assert.equal(sign21_verified, false);

    const obj1 = { name: { first: '1', last: '2' }, email: 'a@a' };
    const obj2 = { email: 'a@a', name: { last: '2', first: '1' } };
    assert.notEqual(JSON.stringify(obj1), JSON.stringify(obj2));
    assert.equal(JSON.stringify(deepSortObjKeys(obj1)), JSON.stringify(deepSortObjKeys(obj2)));

    assert.equal(getObjPart(obj1, 'email'), 'a@a');
    assert.equal(getObjPart(obj1, 'name.first'), '1');
    assert.equal(getObjPart(obj1, 'name.last'), '2');
    assert.equal(JSON.stringify(deepSortObjKeys(getObjPart(obj1, 'name'))), JSON.stringify(deepSortObjKeys(obj1.name)));

    assert.equal(JSON.stringify(deepSortObjKeys(getObjPart(obj1, ''))), JSON.stringify(deepSortObjKeys(obj1)));
    assert.equal(JSON.stringify(deepSortObjKeys(getObjPart(obj1))), JSON.stringify(deepSortObjKeys(obj1)));
    assert.equal(getObjPart(obj1, 'abc'), undefined);
    assert.equal(getObjPart(obj1, 'abc.def'), undefined);

    const pdc1 = makeFullPersonalDataContent('James', 'Bond', 'bond@mi5.gov.uk', '+44123456789');
    const pdc2 = {
        phone: '+44123456789',
        email: 'bond@mi5.gov.uk',
        name: {
            last: 'Bond',
            first: 'James',
        },
        photo: null
    };
    assert.equal(JSON.stringify(deepSortObjKeys(pdc1)), JSON.stringify(deepSortObjKeys(pdc2)));

    const { full_pd, root_hash } = makeFullPersonalData(pdc1);
    console.log(`full_pd ${JSON.stringify(full_pd.content)}`);
    console.log(`root_hash ${root_hash}`);

    const partial_pd = makePartialPersonalData(full_pd, [ "name", "email" ]);
    console.log(`partial_pd ${JSON.stringify(partial_pd.content)}`);

    console.log(`verify full_pd`);
    {
        const check_hash = hashPersonalData(full_pd);
        console.log(`    check_hash ${check_hash}`);
        assert.equal(check_hash, root_hash);
    }

    console.log(`verify partial_pd`);
    {
        const check_hash = hashPersonalData(partial_pd);
        console.log(`    check_hash ${check_hash}`);
        assert.equal(check_hash, root_hash);
    }
}

exports.sample_sign_data = sample_sign_data;

if (require.main === module) {
    const { run_func } = require('../index');
    run_func(sample_sign_data);
}
