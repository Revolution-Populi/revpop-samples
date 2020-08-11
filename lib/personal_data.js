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

const { computeSha256 } = require('./signature');
const crypto = require('crypto');
const assert = require('assert');

////////////////////////////////////////////////////////////////////////////////////////////////////
// Return new object with sorted keys/values pairs from input object (handle nested objects too)
////////////////////////////////////////////////////////////////////////////////////////////////////
function deepSortObjKeys(obj) {
    if (typeof(obj) !== 'object' || obj === null) {
        return obj;
    }
    const keys = Object.keys(obj).sort();
    let ret = {};
    for (const key of keys) {
        let val = obj[key];
        ret[key] = deepSortObjKeys(val);
    }
    return ret;
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Returns part of object with specified path
// Path must contains period-delimited field names
// For empty path returns input object
// Returns undefined if path not found
////////////////////////////////////////////////////////////////////////////////////////////////////
function getObjPart(obj, part_path) {
    let ret = obj;
    if (part_path) {
        for (const elem of part_path.split('.')) {
            if (elem in ret) {
                ret = ret[elem];
            } else {
                ret = undefined;
                break;
            }
        }
    }
    return ret;
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Set part of object with specified path
// Path must contains period-delimited field names
// For empty path channges input object
////////////////////////////////////////////////////////////////////////////////////////////////////
function putObjPart(obj, part_path, part) {
    const part_path_elems = part_path ? part_path.split('.') : [];
    if (part_path_elems.length > 0) {
        let dst = obj;
        const prefix_elems = part_path_elems.slice(0, -1);
        for (const elem of prefix_elems) {
            if (elem in dst) {
                dst = dst[elem];
            } else {
                dst = dst[elem] = {};
                break;
            }
        }
        const last_elem = part_path_elems[part_path_elems.length - 1];
        dst[last_elem] = part;
    } else {
        const old_keys = Object.keys(obj);
        for (const k of old_keys) {
            if (Object.prototype.hasOwnProperty.call(obj, k)) {
                delete obj[k];
            }
        }
        const new_keys = Object.keys(part);
        for (const k of new_keys) {
            if (Object.prototype.hasOwnProperty.call(part, k)) {
                obj[k] = part[k];
            }
        }
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// List of personal data parts
// Personal data can be shared only by parts
// Each part specified by fields path inside of whole personal data
////////////////////////////////////////////////////////////////////////////////////////////////////
const PERSONAL_DATA_PART_PATHS = [
    'name',
    'email',
    'phone',
    'photo',
].sort();

////////////////////////////////////////////////////////////////////////////////////////////////////
// Create personal data part
////////////////////////////////////////////////////////////////////////////////////////////////////
function makeReferencePart(url, type, hash) {
    return {
        url: url || '',
        type: type || '',
        hash: hash || '',
    };
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Create personal data content
////////////////////////////////////////////////////////////////////////////////////////////////////
function makeFullPersonalDataContent(first_name, last_name, email, phone, photo) {
    return {
        name: {
            first: first_name || '',
            last: last_name || '',
        },
        email: email || '',
        phone: phone || '',
        photo: photo || null,
    };
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Create full personal data from its content
// Return object with fields full_pd (personal data structure) and root_hash (hash of personal data)
////////////////////////////////////////////////////////////////////////////////////////////////////
function makeFullPersonalData(content) {
    content = deepSortObjKeys(content);
    const pd = {
        content: {},
        parts: [],
        missed_parts: []
    };
    PERSONAL_DATA_PART_PATHS.forEach(part_path => {
        let part_content = getObjPart(content, part_path);
        if (part_content === undefined) {
            part_content = null;
        }
        putObjPart(pd.content, part_path, part_content);
        pd.parts.push({
            path: part_path,
            salt: crypto.randomBytes(8).toString('base64')
        });
    });
    return { full_pd: pd, root_hash: hashPersonalData(pd) };
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Create partial personal data from input personal data and list of paths of output parts
////////////////////////////////////////////////////////////////////////////////////////////////////
function makePartialPersonalData(in_pd, output_part_paths) {
    const out_pd = {
        content: {},
        parts: [],
        missed_parts: []
    };
    PERSONAL_DATA_PART_PATHS.forEach(part_path => {
        const existing_part = in_pd.parts.find(part => (part.path == part_path));
        const missed_part = in_pd.missed_parts.find(part => (part.path == part_path));
        if (existing_part) {
            const part_content = getObjPart(in_pd.content, existing_part.path);
            assert.notStrictEqual(part_content, undefined);
            if (output_part_paths.indexOf(part_path) >= 0) {
                putObjPart(out_pd.content, existing_part.path, part_content);
                out_pd.parts.push({ ...existing_part });
            } else {
                out_pd.missed_parts.push({
                    path: existing_part.path,
                    hash: computeSha256(`${existing_part.salt}:${JSON.stringify(part_content)}`)
                });
            }
        } else if (missed_part) {
            out_pd.missed_parts.push({ ...missed_part });
        } else {
            // Make no inserts here to keep personal data hash value!
        }
    });
    return out_pd;
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Compute hash of personal data
////////////////////////////////////////////////////////////////////////////////////////////////////
function hashPersonalData(pd) {
    const all_parts = pd.parts.concat(pd.missed_parts).sort((a, b) => a.path.localeCompare(b.path));
    return computeSha256(all_parts.map(part => {
        return part.salt ?
               computeSha256(`${part.salt}:${JSON.stringify(getObjPart(pd.content, part.path))}`) :
               part.hash;
    }).join());
}

exports.deepSortObjKeys = deepSortObjKeys;
exports.getObjPart = getObjPart;
exports.putObjPart = putObjPart;

exports.PERSONAL_DATA_PART_PATHS = PERSONAL_DATA_PART_PATHS;
exports.makeReferencePart = makeReferencePart;
exports.makeFullPersonalDataContent = makeFullPersonalDataContent;
exports.makeFullPersonalData = makeFullPersonalData;
exports.makePartialPersonalData = makePartialPersonalData;
exports.hashPersonalData = hashPersonalData;
