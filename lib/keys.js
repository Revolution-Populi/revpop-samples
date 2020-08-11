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

const { key } = require('@Revolution-Populi/revpopjs');

function create_common_account_keys(brain_key) {
    let account_keys = {};
    account_keys.owner = key.get_brainPrivateKey(brain_key, 0);
    account_keys.active = key.get_brainPrivateKey(account_keys.owner.toWif(), 0);
    account_keys.memo = key.get_brainPrivateKey(account_keys.active.toWif(), 0);
    return account_keys;
}

exports.create_common_account_keys = create_common_account_keys;
