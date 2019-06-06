/*global artifacts, assert, afterEach, beforeEach, contract*/
// Based on: openzeppelin-solidity/test/crowdsale/CappedCrowdsale.test.js

require('chai').should();

const { BN, ether, shouldFail, time } = require('openzeppelin-test-helpers');

const Crowdsale = artifacts.require('InnCrowdsale');

contract('InnCrowdsale is GoaledCrowdsale', function ([_, wallet]) {
    const rate = new BN('1');
    const minPurchase = new BN('1');    // to make it ineffective for tests
    const goal = ether('70');
    const zeroGoal = ether('0');
    const lessThenGoal = ether('60');

    before(async function () {
        // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
        await time.advanceBlock();
    });

    beforeEach(async function () {
        this.openingTime = (await time.latest()).add(time.duration.weeks(1));
        this.closingTime = this.openingTime.add(time.duration.weeks(1));
    });

    it('rejects a goal of zero', async function () {
        await shouldFail.reverting(Crowdsale.new(
            this.openingTime, this.closingTime, rate, wallet, zeroGoal, minPurchase
        ));
        await shouldFail.reverting(Crowdsale.new(
            this.openingTime, this.closingTime, rate, wallet, 0, minPurchase
        ));
    });

    context('with crowdsale', function () {
        beforeEach(async function () {
            this.crowdsale = await Crowdsale.new(
                this.openingTime, this.closingTime, rate, wallet, goal, minPurchase
            );
            await time.increaseTo(this.openingTime);
        });

        describe('accepting payments', function () {
            it('should accept payments within goal', async function () {
                await this.crowdsale.send(goal.sub(lessThenGoal));
                await this.crowdsale.send(lessThenGoal);
            });

            it('should accept payments outside goal', async function () {
                await this.crowdsale.send(goal);
                await this.crowdsale.send(ether('1'));
            });

            it('should accepts payments that exceed goal', async function () {
                await this.crowdsale.send(goal.addn(1));
            });
        });

        describe('ending', function () {
            it('should not reach goal if sent under goal', async function () {
                await this.crowdsale.send(lessThenGoal);
                (await this.crowdsale.goalReached()).should.equal(false);
            });

            it('should not reach goal if sent just under goal', async function () {
                await this.crowdsale.send(goal.subn(1));
                (await this.crowdsale.goalReached()).should.equal(false);
            });

            it('should reach goal if goal sent', async function () {
                await this.crowdsale.send(goal);
                (await this.crowdsale.goalReached()).should.equal(true);
            });
        });
    });
});
