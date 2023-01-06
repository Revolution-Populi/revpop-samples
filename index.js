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

const fs = require('fs');
const path = require('path');
require('colors');

async function main() {
    const samples_prefix = (process.argv.length == 3) ? process.argv[2] : 'sample-';
    const modules = fs.readdirSync(__dirname)
        .filter(name => path.extname(name) === '.js')
        .filter(name => name.startsWith(samples_prefix))
        .sort()
        .map(name => {
            const mod_path = path.join(__dirname, name);
            return {
                name: name,
                path: mod_path,
                mod: require(mod_path)
            };
        });
    let results = [];
    for (const mod of modules) {
        await run_module(mod, results);
    }

    const max_func_name_len = results.reduce((acc, result) => Math.max(acc, result.func_name.length), 0);
    console.log(``);
    console.log(''.padEnd(max_func_name_len + 1 + 4, '=').blue);
    for (const result of results) {
        console.log(`${result.func_name.padEnd(max_func_name_len, ' ')} ${result.result ? 'OK'.green : 'FAIL'.red}`);
    }
    console.log(''.padEnd(max_func_name_len + 1 + 4, '=').blue);
    console.log(``);
}

async function run_module(mod, results) {
    const all_functions = Object.keys(mod.mod)
        .filter(exp_name => mod.mod[exp_name] instanceof Function);
    const sample_functions = all_functions
        .filter(func_name => func_name.startsWith('sample_'))
        .map(func_name => mod.mod[func_name]);
    const finalizer = all_functions
        .filter(func_name => (func_name === 'finalizer'))
        .map(func_name => mod.mod[func_name])[0];
    for (const func of sample_functions) {
        if (func !== finalizer) {
            const result = await run_func(func, finalizer);
            results.push({
                mod_name: mod.name,
                func_name: func.name,
                result: result
            });
        }
    }
}

async function run_func(func, finalizer) {
    console.log(`================================================================================`.green);
    console.log(`*** ${func.name} ***`);
    console.log(`================================================================================`.green);
    console.log(``);
    let result = true;
    try {
        const func_ret = func();
        if (func_ret instanceof Promise) {
            await func_ret;
        }
    } catch (err) {
        console.error(``);
        console.error((err.stack || err).toString().red);
        console.error(``);
        result = false;
    }
    if (finalizer) {
        const fin_ret = finalizer();
        if (fin_ret instanceof Promise) {
            await fin_ret;
        }
    }
    console.log(``);
    return result;
}

exports.run_func = run_func;

if (require.main === module) {
    main();
}
