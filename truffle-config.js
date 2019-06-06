// more info: truffleframework.com/docs/advanced/configuration

module.exports = {
  contracts_directory: "./_contracts",
  contracts_build_directory: "./build/contracts",

  networks: {

      mainnet: {
          provider: getLivenetProvider('mainnet'),
          network_id: 1,
          gas: 6000000,
          confirmations: 2,     // # of confs to wait between deployments. (default: 0)
          timeoutBlocks: 200,   // # of blocks before a deployment times out  (minimum/default: 50)
      },

      ropsten: {
          provider: getLivenetProvider('ropsten'),
          network_id: 3,        // Ropsten's id
          gas: 5500000,         // Ropsten has a lower block limit than mainnet
          confirmations: 2,
          timeoutBlocks: 200,
          skipDryRun: true      // Skip dry run before migrations? (default: false for public nets )
      },

      // for Ganache App + 'truffle console --network development'
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
      // gasPrice: 20000000000,  // 20 gwei (in wei) (default: 100 gwei)
      // from: <address>,        // Account to send txs from (default: accounts[0])
      // websockets: true        // Enable EventEmitter interface for web3 (default: false)
    },

     // for 'truffle development'
    truffle: {
      host: "127.0.0.1",
      port: 9545,
      network_id: "*",
    },

    // for 'truffle test'
    test: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },

    // for 'truffle coverage'
    coverage: {
      host: 'localhost',
      network_id: '*', // eslint-disable-line camelcase
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },

  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
       version: "0.5.2",     // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      // settings: {          // See the solidity docs for advice about optimization and evmVersion
      //  optimizer: {
      //    enabled: false,
      //    runs: 200
      //  },
      //  evmVersion: "byzantium"
      // }
    }
  }
};

function getLivenetProvider(network) {
    if ( !(/^(mainnet|ropsten)$/).test(network) ) {
        throw new Error('mainnet ot ropsten expected');
    }
    const HDWalletProvider = require("truffle-hdwallet-provider");
    const fs = require('fs');

    return () => {
        const infuraKey = fs.readFileSync(
            process.env.INN_INFURA_KEY_FILE || '/run/secrets/infura-key'
        ).toString().trim();
        const deployerPrivKey = fs.readFileSync(
            process.env.INN_DEPLOYER_KEY_FILE || '/run/secrets/deployer-priv-key'
        ).toString().trim();

        // Start the provider and load the deployer address only
        return new HDWalletProvider([deployerPrivKey], `https://${network}.infura.io/v3/${infuraKey}`, 0, 1);
    }
}
