/*global artifacts, assert, afterEach, beforeEach, contract*/
// Source (accommodated): openzeppelin-solidity/test/crowdsale/RefundableCrowdsale.test.js

require('chai').should();

const { balance, BN, ether, shouldFail, time } = require('openzeppelin-test-helpers');

const RefundableCrowdsaleImpl = artifacts.require('RefundableCrowdsaleImpl');

contract('InnCrowdsale is RefundableCrowdsale', function ([_, wallet, investor, purchaser, other]) {
  const rate = new BN(1);
  const goal = ether('50');
  const lessThanGoal = ether('45');

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await time.advanceBlock();
  });

  beforeEach(async function () {
    this.openingTime = (await time.latest()).add(time.duration.weeks(1));
    this.closingTime = this.openingTime.add(time.duration.weeks(1));
    this.afterClosingTime = this.closingTime.add(time.duration.seconds(1));
    this.preWalletBalance = await balance.current(wallet);
  });

  it('rejects a goal of zero', async function () {
    await shouldFail.reverting(
      RefundableCrowdsaleImpl.new(this.openingTime, this.closingTime, rate, wallet, 0)
    );
  });

  context('with crowdsale', function () {
    beforeEach(async function () {
      this.crowdsale = await RefundableCrowdsaleImpl.new(
        this.openingTime, this.closingTime, rate, wallet, goal
      );
    });

    context('before opening time', function () {
      it('denies refunds', async function () {
        await shouldFail.reverting(this.crowdsale.claimRefund(investor));
      });
    });

    context('after opening time', function () {
      beforeEach(async function () {
        await time.increaseTo(this.openingTime);
      });

      it('denies refunds', async function () {
        await shouldFail.reverting(this.crowdsale.claimRefund(investor));
      });

      context('with unreached goal', function () {
        beforeEach(async function () {
          await this.crowdsale.sendTransaction({ value: lessThanGoal, from: investor });
        });

        context('after closing time and finalization', function () {
          beforeEach(async function () {
            await time.increaseTo(this.afterClosingTime);
            await this.crowdsale.finalize({ from: other });
          });

          it('refunds', async function () {
            const balanceTracker = await balance.tracker(investor);
            await this.crowdsale.claimRefund(investor, { gasPrice: 0 });
            (await balanceTracker.delta()).should.be.bignumber.equal(lessThanGoal);
          });
        });
      });

      context('with reached goal', function () {
        beforeEach(async function () {
          await this.crowdsale.sendTransaction({ value: goal, from: investor });
        });

        context('after closing time and finalization', function () {
          beforeEach(async function () {
            await time.increaseTo(this.afterClosingTime);
            await this.crowdsale.finalize({ from: other });
          });

          it('denies refunds', async function () {
            await shouldFail.reverting(this.crowdsale.claimRefund(investor));
          });

          it('forwards funds to wallet', async function () {
            const postWalletBalance = await balance.current(wallet);
            postWalletBalance.sub(this.preWalletBalance).should.be.bignumber.equal(goal);
          });
        });
      });
    });
  });
});
