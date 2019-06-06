/*global artifacts, assert, afterEach, beforeEach, contract*/
// Source (accommodated): openzeppelin-solidity/test/crowdsale/TimedCrowdsale.test.js

require('chai').should();

const { BN, ether, shouldFail, time } = require('openzeppelin-test-helpers');

const TimedCrowdsaleImpl = artifacts.require('InnCrowdsale');

contract('InnCrowdsale is TimedCrowdsale', function ([_, investor, wallet, purchaser]) {

    // params set to values which make them ineffective for tests
    const goal = new BN('1');
    const minPurchase = new BN('1');

    const rate = new BN(1);
    const value = ether('42');

    before(async function () {
        // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
        await time.advanceBlock();
    });

    beforeEach(async function () {
        this.openingTime = (await time.latest()).add(time.duration.weeks(1));
        this.closingTime = this.openingTime.add(time.duration.weeks(1));
        this.afterClosingTime = this.closingTime.add(time.duration.seconds(1));
    });

    it('reverts if the opening time is in the past', async function () {
        await shouldFail.reverting(TimedCrowdsaleImpl.new(
            (await time.latest()).sub(time.duration.days(1)), this.closingTime, rate, wallet, goal, minPurchase
        ));
    });

    it('reverts if the closing time is before the opening time', async function () {
        await shouldFail.reverting(TimedCrowdsaleImpl.new(
            this.openingTime, this.openingTime.sub(time.duration.seconds(1)), rate, wallet, goal, minPurchase
        ));
    });

    it('reverts if the closing time equals the opening time', async function () {
        await shouldFail.reverting(TimedCrowdsaleImpl.new(
            this.openingTime, this.openingTime, rate, wallet, goal, minPurchase
        ));
    });

    context('with crowdsale', function () {
        beforeEach(async function () {
            this.crowdsale = await TimedCrowdsaleImpl.new(
                this.openingTime, this.closingTime, rate, wallet, goal, minPurchase
            );
        });

        it('should be ended only after end', async function () {
            (await this.crowdsale.hasClosed()).should.equal(false);
            await time.increaseTo(this.afterClosingTime);
            (await this.crowdsale.isOpen()).should.equal(false);
            (await this.crowdsale.hasClosed()).should.equal(true);
        });

        describe('accepting payments', function () {
            it('should reject payments before start', async function () {
                (await this.crowdsale.isOpen()).should.equal(false);
                await shouldFail.reverting(this.crowdsale.send(value));
                await shouldFail.reverting(this.crowdsale.buyTokens(investor, { from: purchaser, value: value }));
            });

            it('should accept payments after start', async function () {
                await time.increaseTo(this.openingTime);
                (await this.crowdsale.isOpen()).should.equal(true);
                await this.crowdsale.send(value);
                // await this.crowdsale.buyTokens(investor, { value: value, from: purchaser });
            });

            it('should reject payments after end', async function () {
                await time.increaseTo(this.afterClosingTime);
                await shouldFail.reverting(this.crowdsale.send(value));
                await shouldFail.reverting(this.crowdsale.buyTokens(investor, { value: value, from: purchaser }));
            });
        });
    });
});
