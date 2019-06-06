/*
SafeERC20 functionality gets tested as the Crowdsale contract (from openzeppelin lib) expects the token to be SafeERC20:
- the token must implement the 'safeTransfer' method (other methods are unused).
Therefore SafeERC20 functionality gets tested.

Despite on the following statement:
"The library SafeERC20 is to safely interact with a third party token. It is not to be used inside your own token contract.
OpenZeppelin contracts already have require to check for preconditions so they will return true or fail early."
(source: https://ethereum.stackexchange.com/questions/29339/how-to-user-safeerc20-from-zeppelin-solidity)
*/
require('chai').should();

// Source (no modifications bellow this line): openzeppelin-solidity/test/token/ERC20/SafeERC20.test.js

const { shouldFail } = require('openzeppelin-test-helpers');

const ERC20ReturnFalseMock = artifacts.require('ERC20ReturnFalseMock');
const ERC20ReturnTrueMock = artifacts.require('ERC20ReturnTrueMock');
const ERC20NoReturnMock = artifacts.require('ERC20NoReturnMock');
const SafeERC20Wrapper = artifacts.require('SafeERC20Wrapper');

contract('InnToken supports SafeERC20', function ([_, hasNoCode]) {
  describe('with address that has no contract code', function () {
    beforeEach(async function () {
      this.wrapper = await SafeERC20Wrapper.new(hasNoCode);
    });

    shouldRevertOnAllCalls();
  });

  describe('with token that returns false on all calls', function () {
    beforeEach(async function () {
      this.wrapper = await SafeERC20Wrapper.new((await ERC20ReturnFalseMock.new()).address);
    });

    shouldRevertOnAllCalls();
  });

  describe('with token that returns true on all calls', function () {
    beforeEach(async function () {
      this.wrapper = await SafeERC20Wrapper.new((await ERC20ReturnTrueMock.new()).address);
    });

    shouldOnlyRevertOnErrors();
  });

  describe('with token that returns no boolean values', function () {
    beforeEach(async function () {
      this.wrapper = await SafeERC20Wrapper.new((await ERC20NoReturnMock.new()).address);
    });

    shouldOnlyRevertOnErrors();
  });
});

function shouldRevertOnAllCalls () {
  it('reverts on transfer', async function () {
    await shouldFail.reverting(this.wrapper.transfer());
  });

  it('reverts on transferFrom', async function () {
    await shouldFail.reverting(this.wrapper.transferFrom());
  });

  it('reverts on approve', async function () {
    await shouldFail.reverting(this.wrapper.approve(0));
  });

  it('reverts on increaseAllowance', async function () {
    await shouldFail.reverting(this.wrapper.increaseAllowance(0));
  });

  it('reverts on decreaseAllowance', async function () {
    await shouldFail.reverting(this.wrapper.decreaseAllowance(0));
  });
}

function shouldOnlyRevertOnErrors () {
  it('doesn\'t revert on transfer', async function () {
    await this.wrapper.transfer();
  });

  it('doesn\'t revert on transferFrom', async function () {
    await this.wrapper.transferFrom();
  });

  describe('approvals', function () {
    context('with zero allowance', function () {
      beforeEach(async function () {
        await this.wrapper.setAllowance(0);
      });

      it('doesn\'t revert when approving a non-zero allowance', async function () {
        await this.wrapper.approve(100);
      });

      it('doesn\'t revert when approving a zero allowance', async function () {
        await this.wrapper.approve(0);
      });

      it('doesn\'t revert when increasing the allowance', async function () {
        await this.wrapper.increaseAllowance(10);
      });

      it('reverts when decreasing the allowance', async function () {
        await shouldFail.reverting(this.wrapper.decreaseAllowance(10));
      });
    });

    context('with non-zero allowance', function () {
      beforeEach(async function () {
        await this.wrapper.setAllowance(100);
      });

      it('reverts when approving a non-zero allowance', async function () {
        await shouldFail.reverting(this.wrapper.approve(20));
      });

      it('doesn\'t revert when approving a zero allowance', async function () {
        await this.wrapper.approve(0);
      });

      it('doesn\'t revert when increasing the allowance', async function () {
        await this.wrapper.increaseAllowance(10);
      });

      it('doesn\'t revert when decreasing the allowance to a positive value', async function () {
        await this.wrapper.decreaseAllowance(50);
      });

      it('reverts when decreasing the allowance to a negative value', async function () {
        await shouldFail.reverting(this.wrapper.decreaseAllowance(200));
      });
    });
  });
}
