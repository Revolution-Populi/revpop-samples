# Genesis file for the RevPop blockchain

This instruction can be used to run the RevPop blockchain

All genesis accounts (init* and nathan) have the same key:
* Private key: `5KXbCDyCPL3eGX6xX5uJHVwoAYheF7L5fKf67oQocgJA8kNvVHF`
* Public key: `RVP6JaiMEZZ57Q75Xh3kVbJ4owX13p7f1kkV76B3xLNFuWHVbRSyZ`
* Address: `RVPBrWn6V3fn1KdCZRo4DVmrMq7MpTtic5CW`

New account has the key:
* Private key: `5KAffU3Pw7RNJAJ3d1qUrJ6QPVb6UFx6CJ4MhgfoHL7YwYspHhs`
* Public key : `GPH8mT7XvtTARjdZQ9bqHRoJRMf7P7azFqTQACckaVenM2GmJyxLh`

Change chain id in the `.env` file to:
`CHAIN_ID=673332024bdbeac585bfaec340ad102537e3b84c24fd0f869a4d8a3e370174a1`

Node command line:
```
witness_node \
    --genesis-json genesis/my-genesis.json \
    --rpc-endpoint 127.0.0.1:8090 \
    --p2p-endpoint 127.0.0.1:1414 \
    --enable-stale-production \
    --private-key ["RVP6JaiMEZZ57Q75Xh3kVbJ4owX13p7f1kkV76B3xLNFuWHVbRSyZ","5KXbCDyCPL3eGX6xX5uJHVwoAYheF7L5fKf67oQocgJA8kNvVHF"] \
    --seed-nodes [] \
    -w \""1.6.1"\"
```
