/*global artifacts, assert, afterEach, beforeEach, contract*/

require('chai').should();

const Token = artifacts.require('InnToken');
const UpgradeAgentMock = artifacts.require('UpgradeAgentMock');

const { BN, ether, expectEvent, shouldFail } = require('openzeppelin-test-helpers');

const revision = 324;
const invalidRevision = revision + 1;

const zero = new BN('0');
const tenPower18 = ether('1');
const balances = {
    holder: tenPower18.mul(new BN('500')),          // investor
    anotherHolder: tenPower18.mul(new BN('20')),    // another investor
    totalInvestors: tenPower18.mul(new BN('520')),  // holder + anotherHolder
    primary: tenPower18.mul(new BN('78')),          // 15% extra tokens to the tokenCreator
    total: tenPower18.mul(new BN('598')),           // totalInvestors + primary
};

contract('InnToken is Upgradable', (accounts) => {

    const tokenCreator = accounts[1];
    const newOwner = accounts[2];
    const holder = accounts[4];
    const anotherHolder = accounts[5];
    const nobody = accounts[6];

    assert(tokenCreator !== newOwner);
    assert(newOwner !== nobody);
    assert(newOwner !== holder);
    assert(holder !== anotherHolder);

    beforeEach(async function () {
        this.token = await createToken();
    });

    describe('is both Ownable and Secondary', function () {

        context('when created', function () {
            it('registers the contact creator as the primary and the owner addresses', async function () {
                (await this.token.primary()).should.be.equal(tokenCreator);
                (await this.token.owner()).should.be.equal(tokenCreator);
            });
        });

        context('after the contarct creator transfers ownership', function () {
            beforeEach(async function() {
                this.token.transferOwnership(newOwner, {from: tokenCreator})
            });

            it('registers the new owner', async function () {
                (await this.token.owner()).should.be.equal(newOwner);
            });

            it('still keeps the same primary address', async function () {
                (await this.token.primary()).should.be.equal(tokenCreator);
            });

        });
    });

    describe('is Mintable by the primary only', function () {
        beforeEach(async function () {
            await transferOwnership(this.token);
        });

        it('reverts "mint" function calls from anybody including the owner', async function () {
            await shouldFail.reverting(this.token.mint(holder, balances.holder, {from: newOwner}));
            await shouldFail.reverting(this.token.mint(holder, balances.holder, {from: holder}));
        });

        it('accepts "mint" function calls from the primary address', async function () {
            (await this.token.primary()).should.be.equal(tokenCreator);
            await this.token.mint(holder, balances.holder, {from: tokenCreator});
        });
    });

    describe('is Upgradable by the owner only', function () {
        beforeEach(async function () {
            await transferOwnership(this.token);
            this.agent = await UpgradeAgentMock.new(revision, {from: newOwner});
        });

        context('it has the "setUpgradeAgent" function which', function () {

            it('reverts if called by holders', async function () {
                await shouldFail.reverting(this.token.setUpgradeAgent(this.agent.address, revision, {from: holder}));
            });

            it('reverts if called by nobody', async function () {
                await shouldFail.reverting(this.token.setUpgradeAgent(this.agent.address, revision, {from: nobody}));
            });

            context('if called by the owner', function () {

                it('reverts if invalid revision provided', async function () {
                    await shouldFail.reverting(this.token.setUpgradeAgent(this.agent.address, invalidRevision, {from: newOwner}));
                });

                it('reverts if the upgrade agent provides invalid revision', async function () {
                    const invalidAgent = await UpgradeAgentMock.new(invalidRevision);
                    await shouldFail.reverting(this.token.setUpgradeAgent(invalidAgent.address, revision, {from: newOwner}));
                });

                it('registers the upgrade agent that provides correct revision', async function () {
                    await this.token.setUpgradeAgent(this.agent.address, revision, {from: newOwner});
                    assert(await this.token.upgradeAgent(), this.agent.address);
                });

                context('if the upgarde agent is registered once', function () {

                    it('emits UpgradeEnabled event on registration of the agent', async function(){
                        const { logs } =  await this.token.setUpgradeAgent(this.agent.address, revision, {from: newOwner});
                        expectEvent.inLogs(logs, 'UpgradeEnabled', {
                            agent: this.agent.address,
                        });
                    });


                    it('reverts if called again', async function () {
                        await this.token.setUpgradeAgent(this.agent.address, revision, {from: newOwner});
                        await shouldFail.reverting(this.token.setUpgradeAgent(this.agent.address, revision, {from: newOwner}));
                    });

                });

            });

        });

    });

    describe('it has the "upgrade" function which', async function () {
        beforeEach(async function () {
            await transferOwnership(this.token);
            await mintTokens(this.token, tokenCreator);
            this.agent = await UpgradeAgentMock.new(revision, {from: newOwner});
        });

        context('if the upgrade agent is not registered', function () {

            it('reverts owner calls', async function () {
                await shouldFail.reverting(this.token.upgrade(holder, {from: newOwner}));
            });

            it('reverts holder calls', async function () {
                await shouldFail.reverting(this.token.upgrade(holder, {from: holder}));
            });

            it('reverts anybody calls', async function () {
                await shouldFail.reverting(this.token.upgrade(holder, {from: nobody}));
            });

        });

        context('after the upgarde agent is registered', function () {
            beforeEach(async function () {
                await this.token.setUpgradeAgent(this.agent.address, revision, {from: newOwner});
            });

            it('does not reverts if anybody calls it for a holder', async function () {
                await this.token.upgrade(anotherHolder, {from: nobody});
            });

            it('does not reverts if the owner calls it for a holder', async function () {
                await this.token.upgrade(holder, {from: newOwner});
            });

            it('does not reverts if a holder calls it for himself/herself', async function () {
                await this.token.upgrade(holder, {from: holder});
            });

            it('reverts if the owner calls it for a non-holder', async function () {
                await shouldFail.reverting(this.token.upgrade(nobody, {from: newOwner}));
            });

            it('reverts if a holder calls it for a non-holder', async function () {
                await shouldFail.reverting(this.token.upgrade(nobody, {from: holder}));
            });

            context('if called for a holder', function () {
                beforeEach(async function () {
                    await this.token.upgrade(holder, {from: newOwner});
                });

                it('emits the Upgrade event', async function(){
                    const { logs } = await this.token.upgrade(anotherHolder, {from: anotherHolder});
                    // event Upgrade(address indexed _from, uint256 _value);
                    expectEvent.inLogs(logs, 'Upgrade', {
                        _from: anotherHolder,
                        _value: balances.anotherHolder.toString(),
                    });
                });

                it('sets to zero the balance of the holder', async function () {
                    (await this.token.balanceOf.call(holder)).should.be.bignumber.equal(zero);
                });

                it('decreases the totalSupply', async function () {
                    (await this.token.totalSupply.call())
                        .should.be.bignumber.equal(
                            balances.total.sub(balances.holder));
                });

                it('increases the totalUpgraded', async function () {
                    (await this.token.totalUpgraded.call()).should.be.bignumber.equal(balances.holder);
                });

                it('calls the upgrade agent providing the balance and the address of the holder', async function () {
                    (await this.agent.balanceOf.call(holder)).should.be.bignumber.equal(balances.holder);
                });

                it('reverts on further calls for this holder', async function () {
                    await shouldFail.reverting(this.token.upgrade(holder, {from: newOwner}));
                });
            });

        });

    });

    context('when tokens of all holders upgraded', function () {

        beforeEach(async function () {
            await transferOwnership(this.token);
            await mintTokens(this.token, tokenCreator);
            this.agent = await UpgradeAgentMock.new(revision, {from: newOwner});
            await this.token.setUpgradeAgent(this.agent.address, revision, {from: newOwner});
            await this.token.upgrade(holder, {from: newOwner});
            await this.token.upgrade(anotherHolder, {from: newOwner});
            await this.token.upgrade(tokenCreator, {from: newOwner});
        });

        it('totalSupply is set to zero', async function () {
            (await this.token.totalSupply.call()).should.be.bignumber.equal(zero);
        });

        it('totalUpgraded is set to the original totalSupply', async function () {
            (await this.token.totalUpgraded.call()).should.be.bignumber.equal(balances.total);
        });

    });

    async function mintTokens(token, caller) {
        await token.mint(holder, balances.holder, {from: caller});
        await token.mint(anotherHolder, balances.anotherHolder, {from: caller});
        // no needs to call for the premium tokens (the contract mints them 'under-the-hood')
    }

    async function createToken() {
        return await Token.new({from: tokenCreator});
    }

    async function transferOwnership(token) {
        token.transferOwnership(newOwner, {from: tokenCreator});
        return token;
    }
});
