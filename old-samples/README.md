# Old samples

Contains historical sample files of RevPop blockchain usage.

Run all samples at once:

```
find . -name 'sample-*.js' -exec node {} \;
```

## List of samples

- sample-cloud-storage.js
    - Save/load/remove encrypted personal data to/from cloud storage
    - Save/load encrypted content buffer to/from cloud storage
- sample-content-permission.js
    - Encrypt content file on disk
    - Create/read/update/remove content cards
    - Create/read/remove permissions
- sample-create-account.js
    - Get/claim balance object
    - Upgrade account to be able to create another accounts
    - Create account
- sample-create-keys.js
    - Generate private/public keypair: random and from seed phrase
- sample-create-wallet-keys.js
    - Generate private/public keypair according to RevPop blockchain wallet scheme
- sample-encrypt-upload-content.js
    - Encrypt/decrypt content file on disk and check correctness
    - Save/load encrypted content to/from cloud storage and check correctness
- sample-personal-data.js
    - Create/read/remove personal data record in/from blockchain
- sample-personal-data-photo.js
    - Save encrypted personal data photo to cloud storage
    - Save encrypted personal data to cloud storage
    - Save personal data record to blockchain
    - Get personal data from blockchain and cloud storage and check it
- sample-sign-data.js
    - Sign and verify personal data with obsolete scheme (merkle tree)
    - Sign and verify full/partial personal data with current scheme (root hash)
- sample-vote-mixing-node.js
    - Find witness to choose master node (in three different ways)
- sample-votes.js
    - Create content cards
    - Vote for content
    - Check votes counters of content
    - Share voting information with another account
