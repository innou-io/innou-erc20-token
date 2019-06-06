/*global artifacts, assert, afterEach, beforeEach, contract*/
// Source (accommodated): openzeppelin-solidity/test/ownership/Ownable.test.js

require('chai').should();

require('openzeppelin-test-helpers');
const { shouldBehaveLikeOwnable } = require('./helpers/Ownable.behavior');

const Ownable = artifacts.require('InnToken');

contract('InnToken is Ownable', function ([_, owner, ...otherAccounts]) {
  beforeEach(async function () {
    this.ownable = await Ownable.new({ from: owner });
  });

  shouldBehaveLikeOwnable(owner, otherAccounts);

});
