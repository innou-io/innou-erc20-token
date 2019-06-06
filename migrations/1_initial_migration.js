// use '--f 2' with 'truffle migrate' to skip this script (and deployment of 'Migrations')
const Migrations = artifacts.require("Migrations");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
};
