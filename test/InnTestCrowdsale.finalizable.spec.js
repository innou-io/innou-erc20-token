/*global artifacts, assert, afterEach, beforeEach, contract*/
// Source (accommodated): openzeppelin-solidity/test/FinalizableCrowdsale.test.js

require('chai').should();

const { BN, ether, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');

const FinalizableCrowdsaleImpl = artifacts.require('InnCrowdsale');
const ERC20 = artifacts.require('InnToken');

contract('InnCrowdsale is FinalizableCrowdsale', function ([_, wallet, investor, other]) {
    const rate = new BN('1');
    const goal = ether('1');
    const minPurchase = new BN('1');    // to make it ineffective for tests

    before(async function () {
        // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
        await time.advanceBlock();
    });

    beforeEach(async function () {
        this.openingTime = (await time.latest()).add(time.duration.weeks(1));
        this.closingTime = this.openingTime.add(time.duration.weeks(1));
        this.afterClosingTime = this.closingTime.add(time.duration.seconds(1));

        this.crowdsale = await FinalizableCrowdsaleImpl.new(
            this.openingTime, this.closingTime, rate, wallet, goal, minPurchase,
        );
        this.token =  await ERC20.at(await this.crowdsale.token());
    });

    beforeEach(async function () {
        await time.increaseTo(this.openingTime);
    });

    context('until the goal is reached', function () {

        it('cannot be finalized before ending', async function () {
            await shouldFail.reverting(this.crowdsale.finalize({ from: other }));
        });

        it('can be finalized by anyone after ending', async function () {
            await time.increaseTo(this.afterClosingTime);
            await this.crowdsale.finalize({ from: other });
        });

        it('cannot be finalized twice', async function () {
            await time.increaseTo(this.afterClosingTime);
            await this.crowdsale.finalize({ from: other });
            await shouldFail.reverting(this.crowdsale.finalize({ from: other }));
        });

        it('logs finalized', async function () {
            await time.increaseTo(this.afterClosingTime);
            const { logs } = await this.crowdsale.finalize({ from: other });
            expectEvent.inLogs(logs, 'CrowdsaleFinalized');
        });
    });

    context('after the goal is reached', function () {
        beforeEach(async function () {
            await this.crowdsale.buyTokens(investor, {value: goal});
            await time.advanceBlock();
            assert(await this.crowdsale.goalReached(), true);
        });

        it('can be finalized by anyone before ending', async function () {
            await this.crowdsale.finalize({ from: other });
            await time.increaseTo(this.afterClosingTime);
        });

        it('can be finalized by anyone after ending', async function () {
            await time.increaseTo(this.afterClosingTime);
            await this.crowdsale.finalize({ from: other });
        });

        it('cannot be finalized twice', async function () {
            await time.increaseTo(this.afterClosingTime);
            await this.crowdsale.finalize({ from: other });
            await shouldFail.reverting(this.crowdsale.finalize({ from: other }));
        });

        it('logs finalized', async function () {
            const { logs } = await this.crowdsale.finalize({ from: other });
            expectEvent.inLogs(logs, 'CrowdsaleFinalized');
        });
    });

});
