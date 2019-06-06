// Source (slightly modified): openzeppelin-solidity/test/token/ERC20/ERC20Detailed.test.js
require('chai').should();

const { BN } = require('openzeppelin-test-helpers');

const ERC20DetailedMock = artifacts.require('InnToken');

contract('InnToken is ERC20detailed', function () {
  const _name = 'INNOU.IO Token';
  const _symbol = 'INNOU';
  const _decimals = new BN(14);

  beforeEach(async function () {
    this.detailedERC20 = await ERC20DetailedMock.new();
  });

  it('has a name', async function () {
    (await this.detailedERC20.name()).should.be.equal(_name);
  });

  it('has a symbol', async function () {
    (await this.detailedERC20.symbol()).should.be.equal(_symbol);
  });

  it('has an amount of decimals', async function () {
    (await this.detailedERC20.decimals()).should.be.bignumber.equal(_decimals);
  });
});
