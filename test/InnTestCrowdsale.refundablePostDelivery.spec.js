/*global artifacts, assert, afterEach, beforeEach, contract*/
// Source (accommodated): openzeppelin-solidity/test/crowdsale/PostDeliveryCrowdsale.test.js

require('chai').should();

const { balance, BN, ether, shouldFail, time } = require('openzeppelin-test-helpers');

const PostDeliveryCrowdsaleImpl = artifacts.require('InnCrowdsale');
const Token = artifacts.require('InnToken');

const gasPrice = new BN('15000000000');
const zero = new BN('0');

contract('InnCrowdsale is PostDeliveryCrowdsale until goal reached', function ([deployer, investor, wallet, buyer, nobody]) {
    const rate = new BN(1);
    const minPurchase = new BN('1');    // to make it ineffective for tests
    const goal = ether('10');
    const value = ether('5');
    const doubleValue = ether('10');

    before(async function () {
        // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
        await time.advanceBlock();
    });

    beforeEach(async function () {
        this.openingTime = (await time.latest()).add(time.duration.weeks(1));
        this.closingTime = this.openingTime.add(time.duration.weeks(1));
        this.afterClosingTime = this.closingTime.add(time.duration.seconds(1));
        this.crowdsale = await PostDeliveryCrowdsaleImpl.new(
            this.openingTime, this.closingTime, rate, wallet, goal, minPurchase
        );
        this.token =  await Token.at(await this.crowdsale.token());
    });

    context('after opening time', function () {
        beforeEach(async function () {
            await time.increaseTo(this.openingTime);
        });

        context('on new purchase', function () {

            beforeEach(async function () {
                this.walletBalance = { original: await balance.current(wallet) };
                this.weiRaised = { original: await this.crowdsale.weiRaised() };

                await this.crowdsale.buyTokens(investor, { value: value, from: buyer });
                this.buyerBalance = { original: await balance.current(buyer) };
            });

            context('if the goal is not reached', function () {

                it('does not immediately mint tokens to beneficiaries', async function () {
                    (await this.crowdsale.balanceOf(investor)).should.be.bignumber.equal(value);
                    (await this.token.balanceOf(investor)).should.be.bignumber.equal('0');
                });

                it('does not allow beneficiaries to withdraw tokens immediately', async function () {
                    await shouldFail.reverting(this.crowdsale.withdrawTokens(investor));
                });

                context('after closing time and finalization', function () {
                    beforeEach(async function () {
                        await time.increaseTo(this.afterClosingTime);
                        await this.crowdsale.finalize({ from: investor });
                    });

                    it('does not send the raised funds to the wallet', async function () {
                        (await balance.current(wallet)).should.be.bignumber
                            .equal(this.walletBalance.original);
                    });

                    it('does not allow investors to withdraw tokens', async function () {
                        await shouldFail.reverting(this.crowdsale.withdrawTokens(investor, {from: investor}));
                    });

                    it('allows buyers to reclaim funds', async function () {
                        await this.crowdsale. claimRefund(buyer, {from: buyer});
                    });

                    it('allows anybody to reclaim funds for a buyer', async function () {
                        await this.crowdsale. claimRefund(buyer, {from: nobody});
                    });

                    it('sends funds to the buyer upon the reclaim', async function () {
                        const {receipt} = await this.crowdsale. claimRefund(buyer, {from: buyer, gasPrice});
                        const gasCosts = gasPrice.mul(new BN(receipt.gasUsed.toString()));
                        (await balance.current(buyer)).should.be.bignumber
                            .equal(this.buyerBalance.original.add(value).sub(gasCosts));
                    });
                });

            });

            context('if the goal is reached', function () {
                before(async function () {
                    assert(await this.crowdsale.balanceOf(investor), value);
                    assert(await this.crowdsale.weiRaised(), value);
                    assert(await this.token.balanceOf(investor), zero);
                });

                beforeEach(async function () {
                    this.walletBalance.original = await balance.current(wallet);
                    this.weiRaised.beforeGoal = await this.crowdsale.weiRaised();
                    await this.crowdsale.buyTokens(investor, { value: value, from: buyer });
                });

                it('immediately mints tokens to investors', async function () {
                    (await this.token.balanceOf(investor)).should.be.bignumber.equal(value);
                });

                it('immediately sends funds paid for minted tokens to the wallet', async function () {
                    (await balance.current(wallet)).should.be.bignumber
                        .equal(this.walletBalance.original.add(value));
                });

                context('after the crowdsale finalized', function () {
                    beforeEach(async function () {
                        this.walletBalance.afterGoal = await balance.current(wallet);
                        await this.crowdsale.finalize();
                        assert(await this.crowdsale.finalized(), true);
                    });

                    it('it sends to the wallet funds raised prio the goal was reached', async function () {
                        (await balance.current(wallet)).should.be.bignumber
                            .equal(this.walletBalance.afterGoal.add(this.weiRaised.beforeGoal));
                    });

                    it('does not allow buyers to reclaim funds', async function () {
                        await shouldFail.reverting(this.crowdsale.claimRefund(investor));
                    });

                    context('for tokens purchased before the goal was reached', function () {
                        beforeEach(async function () {
                            assert(await this.crowdsale.balanceOf(investor), value);
                        });

                        it('allows anybody to withdraw tokens for investors before crowdsale ends', async function () {
                            assert(await this.crowdsale.isSaleOpen(), true);
                            await this.crowdsale.withdrawTokens(investor);
                            (await this.crowdsale.balanceOf(investor)).should.be.bignumber.equal('0');
                            (await this.token.balanceOf(investor))
                                .should.be.bignumber.equal(doubleValue);
                        });

                        it('allows anybody to withdraw tokens for investors after crowdsale ends', async function () {
                            await time.increaseTo(this.closingTime);
                            assert(await this.crowdsale.isSaleOpen(), false);
                            await this.crowdsale.withdrawTokens(investor);
                            (await this.crowdsale.balanceOf(investor)).should.be.bignumber.equal('0');
                            (await this.token.balanceOf(investor))
                                .should.be.bignumber.equal(doubleValue);
                        });

                        it('rejects multiple withdrawals', async function () {
                            await this.crowdsale.withdrawTokens(investor);
                            await shouldFail.reverting(this.crowdsale.withdrawTokens(investor));
                        });
                    });
                });
            });

        });
    });
});
