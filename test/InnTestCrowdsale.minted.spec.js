/*global artifacts, assert, afterEach, beforeEach, contract*/
/*
Source (accommodated):
 - openzeppelin-solidity/test/MintedCrowdsale.test.js
 - openzeppelin-solidity/test/crowdsale/MintedCrowdsale.behavior.js
*/

require('chai').should();

const { BN, ether, expectEvent } = require('openzeppelin-test-helpers');

const MintedCrowdsaleImpl = artifacts.require('MintedCrowdsaleImpl');
const Token = artifacts.require('InnToken');

contract('InnCrowdsale is MintedCrowdsale', function ([_, deployer, investor, wallet, purchaser]) {
    const rate = new BN('1000');
    const value = ether('5');
    const expectedTokenAmount = rate.mul(value);

    describe('using ERC20Mintable', function () {
        beforeEach(async function () {
            this.crowdsale = await MintedCrowdsaleImpl.new(rate, wallet, { from: deployer });
            this.token =  await Token.at(await this.crowdsale.token());
        });

        describe('as a minted crowdsale', function () {
            describe('accepting payments', function () {
                it('should accept payments', async function () {
                    await this.crowdsale.send(value);
                    await this.crowdsale.buyTokens(investor, { value: value, from: purchaser });
                });
            });

            context('if the goal is not yet reached', function () {
                describe('high-level purchase', function () {
                    it('should log purchase', async function () {
                        const { logs } = await this.crowdsale.sendTransaction({ value: value, from: investor });
                        (await this.crowdsale.goalReached()).should.be.equal(false);
                        expectEvent.inLogs(logs, 'TokensPurchased', {
                            purchaser: investor,
                            beneficiary: investor,
                            value: value,
                            amount: expectedTokenAmount,
                        });
                    });

                    it('should assign tokens to sender', async function () {
                        await this.crowdsale.sendTransaction({ value: value, from: investor });
                        (await this.crowdsale.goalReached()).should.be.equal(false);
                        (await this.crowdsale.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
                    });
                });

            });
        });
    });
});
