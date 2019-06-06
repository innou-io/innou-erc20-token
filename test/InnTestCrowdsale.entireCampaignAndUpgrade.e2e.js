/*global artifacts, assert, afterEach, beforeEach, contract*/

const { BN, ether, expectEvent, time } = require('openzeppelin-test-helpers');
const playScenario = require('./helpers/playScenario');

const Crowdsale = artifacts.require('InnCrowdsale');
const Token = artifacts.require('InnToken');
const MockNewToken = artifacts.require('MockNewToken');

contract('Crowdsale campaign e2e test', function ([ deployer, owner, wallet, buyer1, buyer2, investor1, investor2 ]) {

    const rate = new BN('1');
    const minPurchase = new BN('10000');
    const newTokenVersion = 377;

    const scenarioSteps = [
        {
            id: "deploy",
            description: "deployer deploys InnCrowdsale instance with the goal of 110 ethers",
            play: async (self) => {
                self.crowdsale = await Crowdsale.new(
                    self.openingTime, self.closingTime, rate, wallet, ether('110'), minPurchase, {from: deployer});
                self.token =  await Token.at(await self.crowdsale.token());
            },
            assertions: [
                {   description: 'sets the deployer as the token owner',
                    test: async (self) => deployer  === await self.token.owner() },
                {   description: 'sets the crowdsale contract address as the token primary',
                    test: async (self) => self.crowdsale.address === await self.token.primary() },
                {   description: 'sets the crowdsale goal of 110 ethers',
                    test: async (self) => ether('110').eq(await self.crowdsale.goal()) },
            ],
        },
        {
            id: "newOwn",
            description: "deployer transfer the ownership on InnToken instance to owner",
            play: async (self) => await self.token.transferOwnership(owner, {from: deployer}),
            assertions: [
                {   description: 'sets the owner as the token owner',
                    test: async (self) => owner  === await self.token.owner() },
            ],
        },
        {
            id: "open",
            description: "-> opening time has passed",
            play: async (self) => await time.increaseTo(self.openingTime),
            assertions: [
                {   description: 'makes the crowdsale be opened',
                    test: async (self) => true  === await self.crowdsale.isOpen() },
            ],
        },
        {
            id: "b1Buy",
            description: "buyer1 calls buyTokens for investor1 with 80 ethers",
            play: async (self) => await self.crowdsale.buyTokens(investor1, {from: buyer1, value: ether('80')}),
            assertions: [
                {   description: 'does not send any ethers to wallet',
                    test: async (_, step) => step.afterBalances.wallet.eq(step.beforeBalances.wallet)
                },
                {   description: 'books tokens worth of 80 ethers for investor1',
                    test: async (self) => rate.mul(ether('80')).eq(await self.crowdsale.balanceOf(investor1))
                },
                {   description: 'emits TokensPurchased',
                    test: async (_, step) => expectEvent.inLogs(step.result.logs, 'TokensPurchased', {
                        purchaser: buyer1, beneficiary: investor1, value: ether('80'), amount: rate.mul(ether('80')),
                    })
                },
            ],
        },
        {
            id: "i2Pay",
            description: "investor2 sends 15 ethers to the InnCrowdsale instance",
            play: async (self) => await self.crowdsale.sendTransaction({from: investor2, value: ether('15')}),
            assertions: [
                {   description: 'does not send any ethers to wallet',
                    test: async (_, step) => step.afterBalances.wallet.eq(step.beforeBalances.wallet)
                },
                {   description: 'books tokens worth of 15 ethers for investor2',
                    test: async (self) => rate.mul(ether('15')).eq(await self.crowdsale.balanceOf(investor2))
                },
                {   description: 'emits TokensPurchased',
                    test: async (_, step) => expectEvent.inLogs(step.result.logs, 'TokensPurchased', {
                        purchaser: investor2, beneficiary: investor2, value: ether('15'), amount: rate.mul(ether('15')),
                    })
                },
            ],
        },
        {
            id: "b1ClaimFail",
            description: "buyer1 calls claimRefund for himself/herself",
            play: async (self) => await self.crowdsale.claimRefund(buyer1, {from: buyer1}),
            shallRevert: true,
        },
        {
            id: "i1DrawFail",
            description: "investor1 calls withdrawToken for own tokens",
            play: async (self) => await self.crowdsale.withdrawTokens(investor1, {from: investor1}),
            shallRevert: true,
        },
        {
            id: "i1Pay",
            description: "investor1 sends 45 ethers which make the goal be reached",
            play: async (self) => await self.crowdsale.sendTransaction({from: investor1, value: ether('45')}),
            assertions: [
                {   description: 'sends 45 ethers to wallet',
                    test: async (_, step) => ether('45').eq(step.afterBalances.wallet.sub(step.beforeBalances.wallet))
                },
                {   description: 'mints tokens worth of 45 ethers for investor1',
                    test: async (self) => rate.mul(ether('45')).eq(await self.token.balanceOf(investor1))
                },
                {   description: 'mints extra 15% tokens to the contract address',
                    test: async (self) => {
                        const primary = await self.token.primary();
                        return rate.mul(ether('45')).mul(new BN('15')).div(new BN('100'))
                            .eq(await self.token.balanceOf(primary)); }
                },
                {   description: 'emits TokensPurchased',
                    test: async (_, step) => expectEvent.inLogs(step.result.logs, 'TokensPurchased', {
                        purchaser: investor1, beneficiary: investor1, value: ether('45'), amount: rate.mul(ether('45')),
                    })
                },
                {   description: 'adds minted tokens (incl. 15% premium) to token.totalSupply',
                    test: async (self) => rate.mul(ether('45')).mul(new BN('115')).div(new BN('100'))
                        .eq(await self.token.totalSupply())
                },
            ]
        },
        {
            id: "i2ClaimFail",
            description: "investor2 calls claimRefund",
            play: async (self) => await self.crowdsale.claimRefund(investor2, {from: investor2}),
            shallRevert: true,
        },
        {
            id: "i1DrawFail",
            description: "deployer calls withdrawTokens for investor1",
            play: async (self) => await self.crowdsale.withdrawTokens(investor1, {from: deployer}),
            shallRevert: true,
        },
        {
            id: "finalize",
            description: "deployer calls finalize",
            play: async (self) => await self.crowdsale.finalize({from: deployer}),
            assertions: [
                {   description: 'sends 95 ethers to wallet',
                    test: async (_, step) => ether('95').eq(step.afterBalances.wallet.sub(step.beforeBalances.wallet))
                },
                {   description: 'emits CrowdsaleFinalized',
                    test: async (_, step) => expectEvent.inLogs(step.result.logs, 'CrowdsaleFinalized'),
                },
                {   description: 'sets the crowdsale as finilized',
                    test: async (self) => await self.crowdsale.finalized() === true,
                },
            ],
        },
        {
            id: "i2Draw",
            description: "investor2 calls withdrawTokens for himself/herself",
            play: async (self) => await self.crowdsale.withdrawTokens(investor2, {from: investor2}),
            assertions: [
                {   description: 'mints tokens worth of 15 ethers for investor2',
                    test: async (self) => rate.mul(ether('15')).eq(await self.token.balanceOf(investor2))
                },
                {   description: 'mints extra 15% tokens to the contract address',
                    test: async (self) => {
                        const primary = await self.token.primary();
                        return rate.mul(ether('60')).mul(new BN('15')).div(new BN('100'))
                            .eq(await self.token.balanceOf(primary)); }
                },
                {   description: 'adds minted tokens (incl. 15% premium) to token.totalSupply',
                    test: async (self) => rate.mul(ether('60')).mul(new BN('115')).div(new BN('100'))
                        .eq(await self.token.totalSupply())
                },
            ]
        },
        {
            id: "i1Draw",
            description: "deployer calls withdrawTokens for investor1",
            play: async (self) => await self.crowdsale.withdrawTokens(investor1, {from: deployer}),
            assertions: [
                {   description: 'mints tokens worth of 80 ethers for investor1',
                    test: async (self) => rate.mul(ether('125')).eq(await self.token.balanceOf(investor1))
                },
                {   description: 'mints extra 15% tokens to the contract address',
                    test: async (self) => {
                        const primary = await self.token.primary();
                        return rate.mul(ether('140')).mul(new BN('15')).div(new BN('100'))
                            .eq(await self.token.balanceOf(primary)); }
                },
                {   description: 'adds minted tokens (incl. 15% premium) to token.totalSupply',
                    test: async (self) => rate.mul(ether('140')).mul(new BN('115')).div(new BN('100'))
                        .eq(await self.token.totalSupply())
                },
            ]
        },
        {
            id: "i2Pay2",
            description: "investor2 sends 12 ethers to the InnCrowdsale instance",
            play: async (self) => await self.crowdsale.sendTransaction({from: investor2, value: ether('12')}),
            assertions: [
                {   description: 'sends 12 ethers to wallet',
                    test: async (_, step) => ether('12').eq(step.afterBalances.wallet.sub(step.beforeBalances.wallet))
                },
                {   description: 'mints tokens worth of 12 ethers for investor2',
                    test: async (self) => rate.mul(ether('27')).eq(await self.token.balanceOf(investor2))
                },
                {   description: 'mints extra 15% tokens to the contract address',
                    test: async (self) => {
                        const primary = await self.token.primary();
                        return rate.mul(ether('152')).mul(new BN('15')).div(new BN('100'))
                            .eq(await self.token.balanceOf(primary)); }
                },
                {   description: 'emits TokensPurchased',
                    test: async (_, step) => expectEvent.inLogs(step.result.logs, 'TokensPurchased', {
                        purchaser: investor2, beneficiary: investor2, value: ether('12'), amount: rate.mul(ether('12')),
                    })
                },
                {   description: 'adds minted tokens (incl. 15% premium) to token.totalSupply',
                    test: async (self) => rate.mul(ether('152')).mul(new BN('115')).div(new BN('100'))
                        .eq(await self.token.totalSupply())
                },
            ]
        },
        {
            id: "i2DrawFail",
            description: "investor2 calls withdrawTokens for himself/herself",
            play: async (self) => await self.crowdsale.withdrawTokens(investor2, {from: investor2}),
            shallRevert: true,
        },
        {
            id: "i2Trans",
            description: "investor2 transfers tokens worth of 8 ethers to buyer2",
            play: async (self) => await self.token.transfer(buyer2, ether('8').mul(rate), {from: investor2}),
            assertions: [
                {   description: 'decreases tokens of investor2 by qty worth of 8 ethers',
                    test: async (self) => rate.mul(ether('19')).eq(await self.token.balanceOf(investor2))
                },
                {   description: 'increases tokens of buyer2 by qty worth of 8 ethers',
                    test: async (self) => rate.mul(ether('8')).eq(await self.token.balanceOf(buyer2))
                },
                {   description: 'emits Transfer',
                    test: async (_, step) => expectEvent.inLogs(step.result.logs, 'Transfer', {
                        from: investor2, to: buyer2, value: rate.mul(ether('8')),
                    })
                },
                {   description: 'does not change token.totalSupply',
                    test: async (self) => rate.mul(ether('152')).mul(new BN('115')).div(new BN('100'))
                        .eq(await self.token.totalSupply())
                },
            ]
        },
        {
            id: "close",
            description: "-> closing time has passed",
            play: async (self) => await time.increaseTo(self.afterClosingTime),
        },
        {
            id: "premium",
            description: "wallet address calls transferPremiumTokens",
            play: async (self) => await self.crowdsale.transferPremiumTokens({from: wallet}),
            assertions: [
                {   description: 'removes all tokens minted for the contract address',
                    test: async (self) => {
                        const primary = await self.token.primary();
                        return (new BN('0')).eq(await self.token.balanceOf(primary)); }
                },
                {   description: 'transfers minted tokens worth of 152x15% ethers to wallet',
                    test: async (self) => rate.mul(ether('22.8')).eq(await self.token.balanceOf(wallet))
                },
                {   description: 'does not change token.totalSupply',
                    test: async (self) => rate.mul(ether('152')).mul(new BN('115')).div(new BN('100'))
                        .eq(await self.token.totalSupply())
                },
            ]
        },
        {
            id: "b2PayFail",
            description: "buyer2 sends 7 ethers to the InnCrowdsale instance",
            play: async (self) => await self.crowdsale.sendTransaction({from: buyer2, value: ether('7')}),
            shallRevert: true,
        },
        {
            id: "i2Claim2Fail",
            description: "investor2 calls claimRefund for himself/herself",
            play: async (self) => await self.crowdsale.claimRefund(buyer1, {from: investor2}),
            shallRevert: true,
        },
        {
            id: "b2UpgrdFail",
            description: "buyer2 calls upgrade for himself/herself",
            play: async (self) => await self.token.upgrade(buyer2, {from: buyer2}),
            shallRevert: true,
        },
        {
            id: "token2",
            description: "deployer deploys the new token with the upgrade agent",
            play: async (self) => {
                self.newToken = await MockNewToken.new(newTokenVersion, self.token.address,
                    {from: deployer, gas: new BN('3000000')});
                return self.newToken;
            }
        },
        {
            id: "setAgent",
            description: "owner calls setUpgradeAgent for the new token",
            play: async (self) => self.token.setUpgradeAgent(self.newToken.address, newTokenVersion, {from: owner}),
            // emit UpgradeEnabled(_upgradeAgent), upgradeAgent
            assertions: [
                {   description: 'emits UpgradeEnabled',
                    test: async (self, step) => expectEvent.inLogs(step.result.logs, 'UpgradeEnabled', {
                        agent: self.newToken.address,
                    }),
                },
                {   description: 'registers the new token agent address',
                    test: async (self) => await self.token.upgradeAgent() === self.newToken.address,
                },
            ]
        },
        {
            id: "i1Upgrd",
            description: "deployer calls upgrade for investor1",
            play: async (self) => await self.token.upgrade(investor1, {from: deployer}),
            assertions: [
                {   description: 'removes all the tokens of investor1',
                    test: async (self) => (new BN('0')).eq(await self.token.balanceOf(investor1))
                },
                {   description: 'mints new tokens worth of 125 ethers for investor1',
                    test: async (self) => rate.mul(ether('125')).eq(await self.newToken.balanceOf(investor1))
                },
                {   description: 'decreases token.totalSupply by qty worth of 125 ethers',
                    test: async (self) => rate.mul(
                        ether('152').mul(new BN('115')).div(new BN('100')).sub(ether('125'))
                    ).eq(await self.token.totalSupply())
                },
                {   description: 'increases token.totalUpgraded by qty worth of 125 ethers',
                    test: async (self) => rate.mul(ether('125')).eq(await self.token.totalUpgraded())
                },
            ],
        },
        {
            id: "i2Upgrd",
            description: "deployer calls upgrade for investor2",
            play: async (self) => await self.token.upgrade(investor2, {from: deployer}),
            assertions: [
                {   description: 'removes all the tokens of investor2',
                    test: async (self) => (new BN('0')).eq(await self.token.balanceOf(investor2))
                },
                {   description: 'mints new tokens worth of 19 ethers for investor2',
                    test: async (self) => rate.mul(ether('19')).eq(await self.newToken.balanceOf(investor2))
                },
                {   description: 'decreases token.totalSupply by qty worth of 19 ethers',
                    test: async (self) => rate.mul(
                        ether('152').mul(new BN('115')).div(new BN('100')).sub(ether('144'))
                    ).eq(await self.token.totalSupply())
                },
                {   description: 'increases token.totalUpgraded by qty worth of 19 ethers',
                    test: async (self) => rate.mul(ether('144')).eq(await self.token.totalUpgraded())
                },
            ],
        },
        {
            id: "b2Upgrd",
            description: "deployer calls upgrade for buyer2",
            play: async (self) => await self.token.upgrade(buyer2, {from: deployer}),
            assertions: [
                {   description: 'removes all the tokens of buyer2',
                    test: async (self) => (new BN('0')).eq(await self.token.balanceOf(buyer2))
                },
                {   description: 'mints new tokens worth of 8 ethers for investor2',
                    test: async (self) => rate.mul(ether('8')).eq(await self.newToken.balanceOf(buyer2))
                },
                {   description: 'decreases token.totalSupply by qty worth of 8 ethers',
                    test: async (self) => rate.mul(
                        ether('152').mul(new BN('115')).div(new BN('100')).sub(ether('152'))
                    ).eq(await self.token.totalSupply())
                },
                {   description: 'increases token.totalUpgraded by qty worth of 8 ethers',
                    test: async (self) => rate.mul(ether('152')).eq(await self.token.totalUpgraded())
                },
            ],
        },
        {
            id: "i1UpgrdFail",
            description: "investor1 calls upgrade for homself/herself again",
            play: async (self) => await self.token.upgrade(investor1, {from: investor1}),
            shallRevert: true,
        },
        {
            id: "wtUpgrd",
            description: "deployer calls upgrade for wallet address",
            play: async (self) => await self.token.upgrade(wallet, {from: deployer}),
            assertions: [
                {   description: 'removes all the tokens of wallet',
                    test: async (self) => (new BN('0')).eq(await self.token.balanceOf(wallet))
                },
                {   description: 'mints new tokens worth of 22.8 ethers for wallet address',
                    test: async (self) => rate.mul(ether('22.8')).eq(await self.newToken.balanceOf(wallet))
                },
                {   description: 'decreases token.totalSupply to zero',
                    test: async (self) => (new BN('0')).eq(await self.token.totalSupply())
                },
                {   description: 'increases token.totalUpgraded to qty wort of 174.8 ethers',
                    test: async (self) => rate.mul(ether('174.8')).eq(await self.token.totalUpgraded())
                },
            ],
        },
    ];

    before(async function () {
        await time.advanceBlock();
        this.openingTime = (await time.latest()).add(time.duration.weeks(1));
        this.closingTime = this.openingTime.add(time.duration.weeks(1));
        this.afterClosingTime = this.closingTime.add(time.duration.seconds(1));

        await playScenario(
            scenarioSteps,
            this,
            [ deployer, owner, wallet, buyer1, buyer2, investor1, investor2 ],
            function beforePlay(step) { console.log(`playing step [${step.id}]: ${step.description}`); },
            function beforeAssert(assertion) { console.log(`asserting: ${assertion.description}`); },
        );
    });

    describe('shall play all steps of the "successful campaign" scenario', function () {
        scenarioSteps.forEach((s) => {
            context(s.description, () => {
                it(`${s.shallRevert ? "fails reverting" : "does not fail"}`, () => assert(s.done, true));
                if (s.assertions) {
                    s.assertions.forEach((a) => {
                        it(a.description, () => assert(a.result));
                    });
                }
            });
        });
    });

});
