/*global artifacts, assert, afterEach, beforeEach, contract*/

const { BN, ether, time } = require('openzeppelin-test-helpers');
const playScenario = require('./helpers/playScenario');

const Crowdsale = artifacts.require('InnCrowdsale');
const Token = artifacts.require('InnToken');

contract('Crowdsale campaign e2e test', function ([ deployer, owner, wallet, buyer1, buyer2, investor1, investor2 ]) {

    const rate = new BN('1');
    const minPurchase = new BN('10000');

    const gasPrice = new BN('25000000000');

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
            ],
        },
        {
            id: "close",
            description: "-> closing time has passed",
            play: async (self) => await time.increaseTo(self.afterClosingTime),
        },
        {
            id: "finalize",
            description: "deployer calls finalize",
            play: async (self) => await self.crowdsale.finalize({from: deployer}),
            assertions: [
                {   description: 'does not send any ethers to wallet',
                    test: async (_, step) => step.afterBalances.wallet.eq(step.beforeBalances.wallet)
                },
                {   description: 'does not mint any tokens at all',
                    test: async (self) => new BN('0').eq(await self.token.totalSupply())
                },
            ],
        },
        {
            id: "b1Claim",
            description: "deployer calls claimRefund for buyer1",
            play: async (self) => await self.crowdsale.claimRefund(buyer1, {from: deployer}),
            assertions: [
                {   description: 'sends 80 ethers to buyer1',
                    test: async (_, step) => step.afterBalances.buyer1.sub(step.beforeBalances.buyer1)
                        .eq(ether('80'))
                },
            ],
        },
        {
            id: "i2Claim",
            description: "investor2 calls claimRefund for himself/herself",
            play: async (self) => await self.crowdsale.claimRefund(investor2, {from: investor2, gasPrice}),
            assertions: [
                {   description: 'sends 15 ethers to investor2',
                    test: async (_, step) => {
                        const gasUsed = new BN(step.result.receipt.gasUsed.toString());
                        return step.afterBalances.investor2.sub(step.beforeBalances.investor2)
                            .eq(ether('15').sub(gasPrice.mul(gasUsed)))
                    }
                },
            ],
        },
        {
            id: "i2DrawFail",
            description: "investor2 calls withdrawToken for himself/herself",
            play: async (self) => await self.crowdsale.withdrawTokens(investor2, {from: investor2}),
            shallRevert: true,
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

    describe('shall play all steps of the "under-the-goal campaign" scenario', function () {
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
