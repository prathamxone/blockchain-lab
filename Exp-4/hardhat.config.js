require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

const PRIVATE_KEY =
  process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000';
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '';
const INFURA_API_KEY = process.env.INFURA_API_KEY || '';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.21',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    ganache: {
      url: 'http://127.0.0.1:7545',
      chainId: 1337,
    },
    ganacheCli: {
      url: 'http://127.0.0.1:8545',
      chainId: 1337,
    },
    // Sepolia testnet — for MetaMask integration and token deployment
    sepolia: {
      url: ALCHEMY_API_KEY
        ? `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
        : `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts:
        PRIVATE_KEY !== '0x0000000000000000000000000000000000000000000000000000000000000000'
          ? [PRIVATE_KEY]
          : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
};
