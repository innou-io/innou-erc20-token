/*global artifacts, assert, afterEach, beforeEach, contract*/

require('chai').should();

const { BN, ether, shouldFail, time } = require('openzeppelin-test-helpers');

const CrowdsaleImpl = artifacts.require('InnCrowdsale');
const Token = artifacts.require('InnToken');

contract('InnCrowdsale', function ([_, deployer, investor, anotherInvestor, wallet]) {

    const Rate = new BN('10000');
    const MinPurchase = new BN('10000000');
    const Goal = ether('52');

    const extraRatePct = new BN('15');
    const hundredPct = new BN('100');

    const Value = ether('51');
    const AnotherValue = ether('49');
    const ExpectedTokenAmount = Rate.mul(Value);
    const ExpectedExtraTokenAmount = extraRatePct
        .mul(ExpectedTokenAmount)
        .div(hundredPct);
    const AnotherExpectedTokenAmount = Rate.mul(AnotherValue);
    const AnotherExpectedExtraTokenAmount = extraRatePct
        .mul(AnotherExpectedTokenAmount)
        .div(hundredPct);
    const ExpectedTotalExtraTokenAmount = ExpectedExtraTokenAmount
        .add(AnotherExpectedExtraTokenAmount);
    const ExpectedTotalTokenAmount = ExpectedTokenAmount.add(AnotherExpectedTokenAmount)
        .add(ExpectedTotalExtraTokenAmount);
    assert(ExpectedTotalTokenAmount, new BN('1.15e+22'));

    before(async function () {
        // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
        await time.advanceBlock();
    });

    beforeEach(async function () {
        this.beforeOpen = (await time.latest()).add(time.duration.seconds(10));
        this.openingTime = this.beforeOpen.add(time.duration.weeks(1));
        this.closingTime = this.openingTime.add(time.duration.weeks(1));
        this.whenOpen = this.openingTime.add(time.duration.seconds(10));
        this.afterClosingTime = this.closingTime.add(time.duration.seconds(10));

        this.crowdsale = await CrowdsaleImpl.new(
            this.openingTime,
            this.closingTime,
            Rate,
            wallet,
            Goal,
            MinPurchase,
            { from: deployer }
         );
        this.token =  await Token.at(await this.crowdsale.token());
    });

    async function buyTokens(crowdsale, opts) {
        await crowdsale.sendTransaction({
            value: opts.value,
            from: opts.investor,
        })
    }

    context('to help software wallets get info on the token', function () {
        it('provides the token name', async function () {
            (await this.crowdsale.name()).should.be.equal(await this.token.name());
        });

        it('provides the token symbol', async function () {
            (await this.crowdsale.symbol()).should.be.equal(await this.token.symbol());
        });

        it('provides the token decimals', async function () {
            (await this.crowdsale.decimals()).should.be.bignumber.equal(await this.token.decimals());
        });
    });

    describe('properly applies exchange rate', async function () {
        beforeEach(async function () {
            await time.increaseTo(this.whenOpen);
            await buyTokens(this.crowdsale, {value: Value, investor});
            await time.advanceBlock();
            (await this.crowdsale.goalReached()).should.be.equal(false);
        });

        context('against purchase transactions', function () {
            context('if the purchase does not make the goal reached', function () {
                it('accurately books tokens mintable after the goal is reached', async function () {
                    (await this.crowdsale.balanceOf(investor))
                        .should.be.bignumber.equal(ExpectedTokenAmount);
                });
            });

            context('if the purchase makes the goal reached', function () {
                beforeEach(async function () {
                    await buyTokens(this.crowdsale, {value: AnotherValue, investor: anotherInvestor});
                    await time.advanceBlock();
                });
                it('accurately mints tokens to investors', async function () {
                    (await this.crowdsale.goalReached()).should.be.equal(true);
                    (await this.token.balanceOf(anotherInvestor))
                        .should.be.bignumber.equal(AnotherExpectedTokenAmount);
                });
            });
        });

        context('when crowdsale finilized', function () {
            beforeEach(async function () {
                await buyTokens(this.crowdsale, {value: AnotherValue, investor: anotherInvestor});
                await time.advanceBlock();
                (await this.crowdsale.goalReached()).should.be.equal(true);
            });

            beforeEach(async function () {
                await time.increaseTo(this.afterClosingTime);
                await this.crowdsale.finalize();
                await time.advanceBlock();
                await this.crowdsale.withdrawTokens(investor);
            });

            it('accurately mints tokens to investors', async function () {
                (await this.token.balanceOf(investor))
                    .should.be.bignumber.equal(ExpectedTokenAmount);
            });

            it('accurately mints extra tokens to the contract address', async function () {
                (await this.token.balanceOf(this.crowdsale.address))
                    .should.be.bignumber.equal(ExpectedTotalExtraTokenAmount);
            });

            it('accurately calculates totalSupply', async function () {
                (await this.token.totalSupply())
                    .should.be.bignumber.equal(ExpectedTotalTokenAmount);
            });

            context('transferPremiumTokens function', function () {

                context('if wallet address calls it', function () {
                    it('transfers all extra tokens to the wallet address', async function () {
                        await this.crowdsale.transferPremiumTokens({from: wallet});
                        (await this.token.balanceOf(wallet))
                            .should.be.bignumber.equal(ExpectedTotalExtraTokenAmount);
                    });
                });

                context('if deployer or investors call it', function () {
                    it('reverts', async function () {
                        await shouldFail.reverting(this.crowdsale.transferPremiumTokens({from: deployer}));
                        await shouldFail.reverting(this.crowdsale.transferPremiumTokens({from: investor}));
                    });
                });

            });

        });
    });

});
