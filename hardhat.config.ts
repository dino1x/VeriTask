import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";
const ZERO_G_TESTNET_RPC = process.env.ZERO_G_TESTNET_RPC || "https://evmrpc-testnet.0g.ai";
const ZERO_G_MAINNET_RPC = process.env.ZERO_G_MAINNET_RPC || "https://evmrpc.0g.ai";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  mocha: {
    timeout: 120000,
  },
  networks: {
    hardhat: {
      chainId: 31337,
      mining: {
        auto: true,
      },
    },
    zeroGTestnet: {
      url: ZERO_G_TESTNET_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 16600,
    },
    zeroGMainnet: {
      url: ZERO_G_MAINNET_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 16661,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./contracts/test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
