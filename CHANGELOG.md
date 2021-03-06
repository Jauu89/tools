# CHANGELOG

## 0.20.1 Aug 31, 2020

Upgrade priority: Medium if using `.at`-queries or Polkadot-related chains

- `@polkadot/api` 1.31.1
- `@polkadot/util` 3.4.1
- `@polkadot/wasm-crypto` 1.4.1


## 0.19.1 Aug 10, 2020

Upgrade priority: Low

- `@polkadot/api` 1.28.1
- `@polkadot/util` 3.1.1
- `@polkadot/wasm-crypto` 1.3.1


## 0.18.1 Jul 27, 2020

Upgrade priority: Low

- `@polkadot/api` 1.26.1
- `@polkadot/util` 3.0.1


## 0.17.1 Jul 21, 2020

Upgrade priority: Low

- `@polkadot/api` 1.25.1
- `@polkadot/util` 2.18.1


## 0.16.2 Jul 3, 2020

Upgrade priority: Medium

- Remove `strict()` from yargs, allowing "unknown" commands to follow


## 0.16.1 Jul 2, 2020

- Validate payload & seed formats before signing (Thanks to https://github.com/yjkimjunior)

- `@polkadot/api` 1.22.1
- `@polkadot/util` 2.16.1


## 0.15.1 Jun 24, 2020

- Support for latest Polkadot/Substrate types
- `@polkadot/api` 1.21.1
- `@polkadot/util` 2.15.1


## 0.14.1 Jun 16, 2020

- Support for latest Polkadot/Substrate types
- `@polkadot/api` 1.19.1
- `@polkadot/util` 2.14.1


## 0.13.1 May 26, 2020

- Polkadot CC1 support via API
- `@polkadot/api` 1.16.1
- `@polkadot/util` 2.11.1


## 0.12.1 May 14, 2020

- `@polkadot/api` 1.14.1 including all latest types
- `@polkadot/util` 2.10.1


## 0.11.1 Apr 15, 2020

- Add vanitygen cli utility (moved from https://github.com/polkadot-js/apps)
- Allow signer cli to use JSON params as inputs
- Swap to yarn 2 for this project
- `@polkadot/api 1.10`
- `@polkadot/util` 2.8


## 0.10.1 Feb 26, 2020

- Add support for file syntax for tx params (`@path`) to api-cli (Thanks to https://github.com/coriolinus)
- Add support for sudo txs (via `--sudo`) to api-cli (Thanks to https://github.com/coriolinus)
- Cleanup global install docs with correct argument order (Thanks to https://github.com/coriolinus)
- Allow passing signer tx params in file (Thanks to https://github.com/kwingram25)

- Transaction submission output now is displayed in `.toHuman` format
- Update documentation for composite account support
- `@polkadot/api` 1.4.1
- `@polkadot/util` 2.5.1


## 0.9.1 Jan 30, 2020

- Allow for offline sending (Thanks to https://github.com/mzolkiewski)
- Fix readline imports (Thanks to https://github.com/joepetrowski)

- `@polkadot/api` 1.0.1
- Add simple RPC query server


## 0.8.1 Nov 29, 2019

- Add option to specific longevity on cli-signer (Thanks to https://github.com/bison-brandon)
- Allow cli-api to submit objects for complex transactions (Thanks to https://github.com/benfen)

- `@polkadot/api` 0.97.1
- Support for Kusama CC3
- Publish docker images directly from CI


## 0.7.1 Oct 25, 2019

- `@polkadot/api` 0.95.1
- Support for Extrinsic v4 (i.e. as per Kusama)


## 0.6.1 Sep 10, 2019

- `@polkadot/api` 0.91.1
- Add @polkadot/signer-cli tool


## 0.5.1 Aug 24, 2019

- `@polkadot/api` 0.90.1
- Support for Kusama
- Updated api-cli examples to use sr25519 keys


## 0.4.1 Mar 29, 2019

- `@polkadot/util` & `@polkadot/api` 0.75.1


## 0.3.1 Mar 28, 2019

- Support sr25519 crypto
- Add docker image (and publish to https://cloud.docker.com/u/jacogr/repository/docker/jacogr/polkadot-js-tools)
- Bump upstream dependencies, including v2 & v3 metadata support via api


## 0.2.1 Mar 11, 2019

- added api-cli for API queries via the command-line
- monotor-rpc `url` parameter renamed to `ws`


## 0.1.1 Dec 05, 2018

- Initial
