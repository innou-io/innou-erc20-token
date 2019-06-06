/*global artifacts, assert, afterEach, beforeEach, contract*/
// Source (accommodated):
// - openzeppelin-solidity/test/token/ERC20/ERC20Mintable.test.js
// - openzeppelin-solidity/test/token/ERC20/behaviors/ERC20Mintable.behavior.js

require('chai').should();

const ERC20MintableMock = artifacts.require('ERC20MintableMock');

const { BN, constants, expectEvent, shouldFail } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;

contract('InnToken is mintable', function ([_, minter, ...otherAccounts]) {
    const [other] = otherAccounts;

    beforeEach(async function () {
        this.token = await ERC20MintableMock.new({from: minter});
    });

    describe('as a mintable token', function () {
        describe('mint', function () {
            const amount = new BN(100);

            context('when the sender is the token creator', function () {
                const from = minter;

                context('for a zero amount', function () {
                    shouldMint(new BN(0));
                });

                context('for a non-zero amount', function () {
                    shouldMint(amount);
                });

                function shouldMint(amount) {
                    beforeEach(async function () {
                        ({logs: this.logs} = await this.token.mint(other, amount, {from}));
                    });

                    it('mints the requested amount', async function () {
                        (await this.token.balanceOf(other)).should.be.bignumber.equal(amount);
                    });

                    it('emits a mint and a transfer event', async function () {
                        expectEvent.inLogs(this.logs, 'Transfer', {
                            from: ZERO_ADDRESS,
                            to: other,
                            value: amount,
                        });
                    });
                }
            });

            context('when the sender is the token creator', function () {
                const from = other;

                it('reverts', async function () {
                    await shouldFail.reverting(this.token.mint(other, amount, {from}));
                });
            });
        });
    });
});
