# VeriTask (Escrow0G) - Judges Verification & Reproduction Guide

This guide provides exact reproduction commands and live endpoints to verify the claimed 0G Chain, 0G Storage, and 0G Compute functionality.

---

## Live On-Chain & Infrastructure Endpoints

| 0G Pillar | Service | Live Endpoint / Value |
| :--- | :--- | :--- |
| **0G Mainnet** | Aristotle Mainnet RPC | https://evmrpc.0g.ai (Chain ID: 16661) |
| **0G Mainnet** | Deployed Contract | [0xb86d25CD0317dE545C8573f040a589c34A093544](https://chainscan.0g.ai/address/0xb86d25CD0317dE545C8573f040a589c34A093544) |
| **0G Mainnet** | Deployment Tx Hash | [0x86e597e9d6f29955f3547ded95c2f6fa2246295d7487f82390b09019d553eea6](https://chainscan.0g.ai/tx/0x86e597e9d6f29955f3547ded95c2f6fa2246295d7487f82390b09019d553eea6) |
| **0G Testnet** | Galileo Testnet RPC | https://evmrpc-testnet.0g.ai (Chain ID: 16600) |
| **0G Testnet** | Deployed Contract | [0xf6EE349a29c99D431640c9BE572E55BF435fAd64](https://chainscan-galileo.0g.ai/address/0xf6EE349a29c99D431640c9BE572E55BF435fAd64) |
| **0G Testnet** | Deployment Tx Hash | [0x455ef58e244f4b1262dafd2d848b1150dc014c43b6f649aa0c2ab6cd5b66f357](https://chainscan-galileo.0g.ai/tx/0x455ef58e244f4b1262dafd2d848b1150dc014c43b6f649aa0c2ab6cd5b66f357) |
| **0G Storage** | Turbo Indexer Gateway | https://indexer-storage-testnet-turbo.0g.ai |
| **0G Storage** | Storage RPC Node | https://rpc-storage-testnet.0g.ai |
| **0G Compute** | AI Judge Engine | Google Gemini 2.5 Flash & 0G Serving Router (https://router-api.0g.ai) |

---

## 1. Run Automated Smart Contract Tests

Verify that all state transitions, proof-gated releases, worker submissions, and dispute handling pass:

`ash
npm run test:contracts
`

---

## 2. Run End-to-End Live 0G Integration Test

Execute the full 0G pipeline:
`ash
npm run test:0g
`

---

## 3. Deploy to 0G Aristotle Mainnet

To broadcast a fresh instance directly to 0G Mainnet:
`ash
npm run deploy:mainnet
`

---

## 4. Live Interactive Web3 DApp

Start the local dashboard:
`ash
npx serve -p 3004 frontend
`
Open http://localhost:3004 to interactively:
1. Connect / Disconnect wallet.
2. Create and deposit new escrow bounties with live Keccak-256 Merkle roots.
3. Trigger 0G Compute AI Judge evaluation (91/100 passing threshold).
4. Verify 32-byte Merkle inclusion proofs against the deployed contract.