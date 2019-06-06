window.addEventListener('load', async function() {
    const deployBttn = document.getElementById("deploy");
    const cancelBttn = document.getElementById("cancel");
    const copySaleAbiBttn = document.getElementById("copy-sale");
    const copyTokenAbiBttn = document.getElementById("copy-token");
    deployBttn.disabled = true;
    copySaleAbiBttn.disabled = true;
    copyTokenAbiBttn.disabled = true;
    if (!window.ethereum) {
        throw new Error('No web3? You should consider trying MetaMask!');
    }
    try {
        window.web3 = new Web3(ethereum);
        await ethereum.enable();
        checkApiVersion();
        const InnCrowdsale = await loadContract('InnCrowdsaleReady.json');
        const InnToken = await loadContract('InnToken.json');
        inform('INFO: InnCrowdsaleReady contract is ready for deployment');
        deployBttn.disabled = false;
        copySaleAbiBttn.onclick = getCopiAbiToClipboardFn(InnCrowdsale.abi);
        copyTokenAbiBttn.onclick = getCopiAbiToClipboardFn(InnToken.abi);
        copySaleAbiBttn.disabled = false;
        copyTokenAbiBttn.disabled = false;
        const deploy = getDeployer(InnCrowdsale, (err, instance) => {
            cancelBttn.disabled = true;
            if (!err) {
                if (instance.address) {
                    inform(`SUCCESS: InnCrowdsaleReady contract is deployed at: ${instance.address}`);
                    inform(`INFO: transactionHash: ${instance.transactionHash}`);
                    instance.token((err, resp) => {
                        if (!err) {
                            inform(`INFO: InnToken contract is deployed at: ${resp}`);
                        } else {
                            inform(`ERROR: ${err}`);
                        }
                    });
                } else {
                    inform(`INFO: InnCrowdsaleReady contract has been sent to the network`);
                    inform('INFO: Check the last tx in MetaMask to get the deployment result');
                }
                console.log(instance);
            } else {
                console.log(err);
                inform(`ERROR: ${err}`);
            }
        });
        deployBttn.onclick = () => {
            deployBttn.disabled = true;
            const [err, walletAddr] = getWalletAddress();
            if (err) {
                inform(`ERROR: ${err}`);
                throw err;
            }
            inform(`INFO: deploying with wallet address: ${walletAddr}`);
            deploy(walletAddr);
        };
    } catch (e) {
        console.log(e);
        inform(`ERROR: ${e}`);
    }
});

async function loadContract(fname) {
    const contractJSON = await getContractJson(fname);
    const contract = web3.eth.contract(contractJSON.abi);
    return {
        abi: contractJSON.abi,
        bytecode: contractJSON.bytecode,
        contract: contract,
    };
}

function getDeployer(c, cb) {
    return function (walletAddr) {
        c.contract.new(
            walletAddr,
            { data: c.bytecode, gas: 5500000, gasPrice: '20000000000' },
            cb,
        );
    };
}

async function getContractJson(name) {
    const url = `build/contracts/${name}`;

    return new Promise((res, rej) => {
        const xmlhttp = new XMLHttpRequest();
        xmlhttp.onload = () => {
            if (xmlhttp.status == 200) {
                res(xmlhttp.response);
            } else {
                rej(new Error(`HTTP code: ${xmlhttp.status}`))
            }
        };
        try {
            xmlhttp.open("GET", url, true);
            xmlhttp.responseType = 'json';
            xmlhttp.send();
        } catch (e) {
            rej(e);
        }
    });
}

function inform(msg) {
    console.log(msg);
    const info = document.getElementById("info");
    info.innerText += `${msg}\n`
}

function getWalletAddress() {
    const walletAddr = document.getElementById('wallet').value;
    if (!web3.isAddress(walletAddr)) {
        return [new Error(`invalid address (${walletAddr})`), ''];
    }
    return [null, walletAddr];
}

function checkApiVersion() {
    const version = (web3.version).api;
    if (!(/^0\./).test(version)) {
        throw new Error(`web3 api version expected: 0.2.x (detected: ${version})`);
    }
}

function getCopiAbiToClipboardFn(abi) {
    return () => copyToClipboard(
        JSON.stringify(abi),
    );
}

const copyToClipboard = str => {
    const el = document.createElement('textarea');
    el.value = str;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
};
