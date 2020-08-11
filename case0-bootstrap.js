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

async function case0_bootstrap() {
    try {
        const connect_string = process.env.BLOCKCHAIN_URL;
        console.log(`Connecting to ${connect_string}...`);
        const network = await revpop.connect(connect_string);
        console.log(`Connected to network ${network.network_name}`);
        console.log(``);

        console.log(`Initialize all accounts...`);
        const accounts = [
            { nick: 'registrar', name: 'nathan' },
        ];
        const [ registrar ] = accounts;
        for (const account of accounts) {
            account.acc = await revpop.db_exec('get_account_by_name', account.name);
            account.key = PrivateKey.fromWif('5KXbCDyCPL3eGX6xX5uJHVwoAYheF7L5fKf67oQocgJA8kNvVHF');
            console.log(`Account ${account.nick} ${account.name} ${account.acc ? account.acc.id : '[no account yet]'}`);
        }
        console.log(``);

        console.log(`Getting balance ${revpop.config.balance_address}...`);
        const balances = await revpop.db_exec('get_balance_objects', [ revpop.config.balance_address ]);
        if (balances.length === 1) {
            const init_balance = balances[0];
            console.log(`Balance ${init_balance.owner} ${init_balance.id} ` +
                        `${init_balance.balance.amount} ${init_balance.balance.asset_id}`);
            console.log(``);

            console.log(`Account ${registrar.acc.name} claim balance...`);
            await revpop.transaction(registrar.key, 'balance_claim', {
                fee: revpop.no_fee(),
                deposit_to_account: registrar.acc.id,
                balance_to_claim: init_balance.id,
                balance_owner_key: registrar.key.toPublicKey().toPublicKeyString(),
                total_claimed: {
                    amount: init_balance.balance.amount,
                    asset_id: init_balance.balance.asset_id
                }
            });
            console.log(`Balance of account ${registrar.acc.name} claimed`);
            console.log(``);

            console.log(`Upgrading registrar account ${registrar.acc.name}...`);
            await revpop.transaction(registrar.key, 'account_upgrade', {
                fee: revpop.no_fee(),
                account_to_upgrade: registrar.acc.id,
                upgrade_to_lifetime_member: true
            });
            console.log(`Registrar account ${registrar.acc.name} upgraded`);
            console.log(``);

        } else {
            console.log(`Balance ${revpop.config.balance_address} already claimed`);
            console.log(``);
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

exports.case0_bootstrap = case0_bootstrap;

if (require.main === module) {
    case0_bootstrap();
}
