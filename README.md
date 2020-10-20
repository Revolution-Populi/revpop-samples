# RevPop Samples

Examples of using the RevPop Blockchain are designed as Nodejs console applications.

## Docker-compose configuration

There is a `docker-compose.yml` file with a pre-configured environment.

Requirements:

* [Docker](https://docs.docker.com/get-docker/)
* On Linux, you should also have [Docker-compose](https://docs.docker.com/compose/install/)

To run all samples using Docker, issue a command:
```
docker-compose run --rm samples node index.js
```

This environment uses the pre-built *Revolution Populi Core Blockchain* docker image from [revpop-core](https://github.com/Revolution-Populi/revpop-core) and *Revolution Populi Blockchain library*  from [revpop-js](https://github.com/Revolution-Populi/revpop-js). If you would like to build these dependencies yourself, please refer to the respective links.

To clean up the environment after use, run this command:
```
docker-compose down
```

### Development configuration

Create a file named `docker-compose.override.yml` where you can specify any adjustments you need, for example:

```
version: "3"
services:
  blockchain:
    image: revpop-core
    ports:
    - 8090:8090
  samples:
    volumes:
    - ./:/app
    - /app/node_modules
    - /app/demo/node_modules
```

## Installation

Requirements:

* NodeJS 10+
* MongoDB 3+
* RevPop Blockchain https://github.com/Revolution-Populi/revpop-core

Follow the steps in order to run samples on your machine.

1. `cp .env.example .env`
2. Change variables in `.env`:
    1. BLOCKCHAIN_URL should point to WS interface of the RevPop Blockchain node
    2. CLOUD_URL is a connection string for the MongoDB driver
3. `npm install` or `yarn`
4. [Use this genesis file to start blockchain](blockchain).

This repository was tested in the following environment:
* Ubuntu 18.04 Linux
* NodeJS 12
* MongoDB 3
* RevPop Blockchain latest release from https://github.com/Revolution-Populi/revpop-core/releases

# Run samples

To run a separate sample, run a command `node sample-name.js`. For example:
```
node sample-1-account.js
```

To run all samples at once, run a command
```
node index.js
```
All sample files will run one by one, the final results should look like this:
```
===========================
sample_1_account       OK
sample_2_personal_data OK
sample_3_content       OK
sample_4_votes         OK
===========================
```

## List of samples

- sample-1-account.js
    - Generate private/public keypair according to RevPop Blockchain wallet scheme
    - Get/claim balance object
    - Upgrade the application account to be able to create user accounts
    - Create user account
- sample-2-personal-data.js
    - Save PD photo to cloud storage
    - Create full PD and sign with root hash
    - Save full PD to cloud storage
    - Save full PD record to blockchain
    - Load full PD + record + photo from blockchain and cloud storage
    - Verify full PD with root hash
    - Create partial PD and sign with root hash
    - Save partial PD to cloud storage
    - Save partial PD record to blockchain
    - Load partial PD + record + photo from blockchain and cloud storage
    - Verify partial PD with root hash
- sample-3-content.js
    - Save encrypted content to cloud storage
    - Remove content card
    - Create content card
    - Remove permission
    - Create permission
    - Read permission
    - Read content card
    - Load encrypted content from cloud storage
    - Update + read content card
- sample-4-votes.js
    - Create content cards
    - Find witness to choose master node (in three different ways)
    - Vote for content ("liking")
    - Read and check vote counters of content
    - Share voting information with another account (friend)
    - Read votes of another account (friend)

# Personal data formats

## Personal data blockchain record format

    {
        subject_account: subject_acc.id,
        operator_account: subject_acc.id,
        url: "https://host/path?a=1&b=2",
        hash: "94b07b038cd395c13938474e7c81b050949577103f8cd12e4a294e4b2fa47d95"
    }

Fields:
- `subject_account` - account id of subject of the personal data,
- `operator_account` - account id of operator of the personal data,
- `url` - URL of cloud storage record of the personal data,
- `hash` - hex lowercase sha256 hash of all parts of the personal data according to scheme:
`sha256(sha256(part1_salt + ':' + part1_json) + ... + sha256(partN_salt + ':' + partN_json))`.
Parts must be sorted by its path. JSON of all parts must have all keys sorted and must be one-line
(i.e. no indents, no whitespaces).

Record stored by subject for their own access has rules:
- `subject_account` and `operator_account` must be equal,
- tuple `(subject_account, operator_account, hash)` must be unique.

Record stored by subject for operator access:
- `subject_account` and `operator_account` must be not equal,
- tuple `(subject_account, operator_account)` must be unique.

## Personal data cloud storage record format

Field `url` of blockchain record refers to ciphertext form of record in cloud storage.
Ciphertext form can be decrypted to plaintext form using subject public key and operator private key and `nonce`.
Plaintext form can be encrypted to ciphertext form using subject private key and operator public key and `nonce`.

### Ciphertext form (example for MongoDB storage, formats in other storages may vary)

    {
        data: "MlETwxAtxUDynEqvHMZtcPU5v9pLl66mwT1EnkoXgik=:zwCAzJCRf1bSI............00oFx7Z71JiMEQ="
    }

Fields:
- `data` - two parts joined with ':' separator, (1) base64 of random 32-byte nonce used in encryption of plaintext form, and
(2) base64 of JSON-stringified (in single line) and encrypted plaintext form of the personal data,

### Plaintext form

    {
        content: {
            name: {
                first: "James",
                last: "Bond"
            },
            email: "bond@mi5.gov.uk"
        },
        parts: [
            {
                path: "name",
                salt: "Jg+8wcqQWL0="
            },
            {
                path: "email",
                salt: "H1ZBI/2ggGw="
            }
        ],
        missed_parts: [
            {
                path: "phone",
                hash: "05bf87c8d4425c58f7d63508535e3a98d02af4a33a0ef7f463c2ccbbf4d7633a"
            },
        ]
    }

Fields:
- `content` - content of the personal data (json),
- `parts` - list of parts info of the personal data,
- `parts[].path` - dot-separated path of the part in `content`,
- `parts[].salt` - salt of the part used in its hashing (base64 of 64-bit random number),
- `missed_parts` - list of missed parts info of the personal data,
- `missed_parts[].path` - dot-separated path of the missed part in `content`,
- `missed_parts[].hash` - hash of the missed part and its salt (hex),

# Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

# License
[GPLv3](https://choosealicense.com/licenses/gpl-3.0/)
