const InnCrowdsale = artifacts.require("InnCrowdsale");

module.exports = async function(deployer, network, accounts) {

    console.warn("2_deploy_contract.js called");

    if ( network === "test" ) {
        console.warn("Truffle test suites run - no pre-deployed contracts needed");
        return;
    }

    let walletAddress;      // [string] Ethernet address
    let preIcoOpeningTime,
        preIcoClosingTime;  // [Bignumber] seconds from epoch
    let goalInWei,
        minPurchaseInWei;   // [Bignumber] amounts in wei(s)
    let rateInAtomsPerWei;  // [Bignumber] amounts in atom(s) per wei (atom - indivisible unit of the token)

    console.warn(`setting params for network "${network}"`);

    if (/^(development|develop|truffle)$/.test(network)) {
        assignTestDeploymenetParams();
    } else {
        // else if ((network === "main") || (network === "ropsten")) { ...
        throw new Error(`deployment to development network(s) only implemented yet ("${network}" ordered)`);
        assignProdDeploymentParams();
    }

    throwIfParamsUndefined();
    printParams();

    deployer.deploy(
        InnCrowdsale,
        preIcoOpeningTime,
        preIcoClosingTime,
        rateInAtomsPerWei,
        walletAddress,
        goalInWei,
        minPurchaseInWei
    )
    .then(function() {
        console.log("InnCrowdsale contract successfully deployed");
        console.log(`..at adreess:        ${InnCrowdsale.address}`);
    });

    console.warn("2_deploy_contract.js executed");
    return;

    function assignTestDeploymenetParams() {
        const _timeNow = parseInt(new Date() / 1000);
        const _oneMinute = 60;
        const _presaleMinutes = getCustomParam('presaleMinutes') || 1;
        const _saleMinutes = getCustomParam('saleMinutes') || 3;
        const _goalEther = getCustomParam('goalEther') || 99;
        const _minPurchaseInWei = getCustomParam('minPurchaseInWei') || 1000;
        const _rateInWei = getCustomParam('rateInAtomsPerWei') || 1;

        walletAddress = accounts[1];
        preIcoOpeningTime = _timeNow + parseInt(_presaleMinutes) * parseInt(_oneMinute);
        preIcoClosingTime = preIcoOpeningTime + parseInt(_saleMinutes) * parseInt(_oneMinute);
        goalInWei = new web3.utils.BN(web3.utils.toWei(`${_goalEther}`, "ether"));
        minPurchaseInWei = new web3.utils.BN(`${_minPurchaseInWei}`);
        rateInAtomsPerWei = new web3.utils.BN(`${_rateInWei}`);
    }

    function getCustomParam(name, opts) {
        /*global InnParams*/
        // if (!opts && InnParams) {  opts = InnParams; }
        if (typeof opts === "object") {
            if (opts.hasOwnProperty(name)) {
                return opts[name];
            }
        }
        return process.env[`INN_${name}`];
    }

    function assignProdDeploymentParams() {
        walletAddress = undefined;

        preIcoOpeningTime = parseInt(
            `${new Date("May 01, 2019 00:00:01 +0:00") / 1000}`
        );
        preIcoClosingTime = parseInt(
            `${new Date("June 30, 2019 23:59:59 +0:00") / 1000}`
        );

        goalInWei = new web3.utils.BN(web3.utils.toWei("3000", "ether"));
        minPurchaseInWei = new web3.utils.toWei("100", "szabo");
        rateInAtomsPerWei = new web3.utils.BN("10000");
    }

    function throwIfParamsUndefined() {
        if (!walletAddress) {
            throw new Error("ERR: walletAddress undefined");
        }
        if (!preIcoOpeningTime) {
            throw new Error("ERR: preIcoOpeningTime undefined");
        }
        if (!preIcoClosingTime) {
            throw new Error("ERR: preIcoClosingTime undefined");
        }
        if (!goalInWei) {
            throw new Error("ERR: goalInWei undefined");
        }
        if (!minPurchaseInWei) {
            throw new Error("ERR: minPurchaseInWei undefined");
        }
        if (!rateInAtomsPerWei) {
            throw new Error("ERR: rateInAtomsPerWei undefined");
        }
    }

    function printParams() {
        console.log("InnCrowdsale contract being deployed ...");
        console.log(`..from address:        ${accounts[0]}`);
        console.log("with params:");
        console.log(`- preIcoOpeningTime:   ${preIcoOpeningTime}`);
        console.log(`- preIcoClosingTime:   ${preIcoClosingTime}`);
        console.log(`- rate:                ${rateInAtomsPerWei.toString()}`);
        console.log(`- wallet:              ${walletAddress}`);
        console.log(`- goal:                ${goalInWei.toString()}`);
        console.log(`- minPurchase:         ${minPurchaseInWei.toString()}`);
    }
};
