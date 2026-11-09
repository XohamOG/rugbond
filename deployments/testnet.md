# Testnet deployment

Chain ID 46630. All tokens are mocks with no value. Source is verified on the explorer.

| Contract | Address |
|---|---|
| RugBond | [`0x04Afa7f0511caFB53DC91Ae7e8A8B7c8299E4813`](https://explorer.testnet.chain.robinhood.com/address/0x04Afa7f0511caFB53DC91Ae7e8A8B7c8299E4813) |
| Mock WIF (mWIF) | [`0x4aDa6E6C1568b435999e7593E62C86b0dF48a13f`](https://explorer.testnet.chain.robinhood.com/address/0x4aDa6E6C1568b435999e7593E62C86b0dF48a13f) |
| Demo coin (DEMO) | [`0x1bf8dF5d705D02FFc9d1e3c2756d2c09AF3B411F`](https://explorer.testnet.chain.robinhood.com/address/0x1bf8dF5d705D02FFc9d1e3c2756d2c09AF3B411F) |

## Transactions run by the project

Every bond below was posted by the project to test the system. None came from a third party. Bonds 4 and 5 came from an automated browser test of the website and are not listed. Bond 6 was run through the website to record the demo video.

| Bond | Step | Transaction |
|---|---|---|
| 0 | Posted, 10,000 mWIF | [`0x8456c7c5…`](https://explorer.testnet.chain.robinhood.com/tx/0x8456c7c520a536dcb5d5483b2cf05ee9f3ff2c9dcc891dbc3441329cd44e88b1) |
| 0 | Funded by a second wallet, 5,000 mWIF | [`0xa59daaf8…`](https://explorer.testnet.chain.robinhood.com/tx/0xa59daaf846b9bc24c3e0a9a4f4ef21a11e3e459f7bd398b2cb3b04eda98e1f04) |
| 0 | Promised wallet sells | [`0x79a2f19d…`](https://explorer.testnet.chain.robinhood.com/tx/0x79a2f19d0bf6b18a4b90820ff0d3f1ca688e7004a98bc0b7034a8e4702649338) |
| 0 | Slashed by hand: 13,000 burned, 2,000 paid | [`0x9b7ebe99…`](https://explorer.testnet.chain.robinhood.com/tx/0x9b7ebe9939804c9e1530bac98b423036c4fd0fa41e678005edb23aaf7b0f8249) |
| 1 | Posted with a signed consent | [`0xdaa300db…`](https://explorer.testnet.chain.robinhood.com/tx/0xdaa300db75187f886a0fd7185e0f9435a2b5979c783ea17f798e3e83bf7745a5) |
| 1 | Withdrawn after expiry | [`0x0f28f8d2…`](https://explorer.testnet.chain.robinhood.com/tx/0x0f28f8d241ecbc485f74bfe9a129651aa4287b0ff536915e14588be62395ebeb) |
| 2 | Posted, 30 days, left healthy | [`0xa6687712…`](https://explorer.testnet.chain.robinhood.com/tx/0xa6687712f20c123f6ad3eb7b6279cda2223d4743ce86c6d9fca6650ab1d7d87c) |
| 3 | Posted | [`0x2dc57b15…`](https://explorer.testnet.chain.robinhood.com/tx/0x2dc57b15ab33399dbf2080e6122e879ffe9c8f2be16fe712149dd4c35ccd124c) |
| 3 | Promised wallet sells | [`0x55fc2978…`](https://explorer.testnet.chain.robinhood.com/tx/0x55fc297837b5c1ffefebc382142c2b126b799e7b72e959d6d17bf163c35944e8) |
| 3 | **Slashed automatically by the watcher** | [`0x02c5b9f6…`](https://explorer.testnet.chain.robinhood.com/tx/0x02c5b9f6948835fce709d4c6f26c182c4cc280c8422f2cdf15ce8e9b4b42fb99) |

| 6 | Promised wallet sells 30,000 DEMO | [`0x1b19b34d…`](https://explorer.testnet.chain.robinhood.com/tx/0x1b19b34d83616aded9da623873a61321c2ac3ccb097f83baa6958f29c66c1574) |
| 6 | **Slashed automatically by the watcher: 40,000 burned, 10,000 paid** | [`0xe803f4fc…`](https://explorer.testnet.chain.robinhood.com/tx/0xe803f4fcc46339b54d38affbd4aa5139377e8b3ff426e7f0ef6644b8d7d158fe) |

## Measured watcher speed

Two runs on the public RPC:

| Interval | Bond 3 | Bond 6 |
|---|---|---|
| Breach detected to slash sent | 2.9 s | 2.7 s |
| Breach detected to slash confirmed | 3.9 s | 3.7 s |
| Sale block to slash block | 9 s | 4 s |

Bond 6 ran after the watcher was changed to simulate and estimate gas in parallel. The sample is too small to treat either figure as typical.
