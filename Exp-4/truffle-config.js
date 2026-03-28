/**
 * Truffle Configuration — Exp-4
 * University of Mumbai · IT Engineering SEM VIII · AY 2025-26
 *
 * Truffle is used for local testing with Ganache.
 * MetaMask + Remix handles the Sepolia testnet for Exp-4.
 */

module.exports = {
  networks: {
    development: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*',
    },
    ganacheCli: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*',
    },
  },

  mocha: {
    timeout: 100000,
  },

  compilers: {
    solc: {
      version: '0.8.21',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
};
