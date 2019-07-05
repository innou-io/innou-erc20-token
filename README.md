# INNOU Token Initial CrowdSale

## Smart contracts
- **Crowdsale contract (pre-ICO)**  
  _source:_ [contracts/crowdsale/InnouCrowdsaleReady.sol](contracts/crowdsale/InnouCrowdsaleReady.sol)  
  _flatten source:_ [contracts/flatten/InnouCrowdsaleReady.sol](contracts/flatten/InnouCrowdsaleReady.sol)  
  _Ethereum address:_ [0x4A806BA7d11F12b6e95C7fc2e0c72Db8AEaD535D](https://etherscan.io/address/0x4a806ba7d11f12b6e95c7fc2e0c72db8aead535d)
- **Token contract**  
  _source:_ [contracts/token/InnouToken.sol](contracts/token/InnouToken.sol)  
  _flatten source:_ [contracts/flatten/InnouToken.sol.4verification](contracts/flatten/InnouToken.sol.4verification)  
  _Ethereum address:_ [0xC0ae889917f819eC214f59dC54B18f4364B00FF3](https://etherscan.io/address/0xc0ae889917f819ec214f59dc54b18f4364b00ff3)  
- **Escrow contract**  
  _source_ [openzeppelin-solidity/contracts/payment/escrow/RefundEscrow.sol](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/0dded493a03623c93845c2d58634c229862ab54a/contracts/payment/escrow/RefundEscrow.sol)  
  _Ethereum address:_ [0xBdB39870D0bB20dF10913ACDFce100029e2715A4](https://etherscan.io/address/0xbdb39870d0bb20df10913acdfce100029e2715a4)

## Specification
TOKEN-NAME| INNOU ("INNOU.IO Token")
:-------------|:--------------------
TOKEN-STANDARD| ERC-20 Token on Ethereum Blockchain
TOKEN-TYPE| Minted Token
BEGIN| 7. June 2019, 0:00 UTC
END| 18. July 2019, 23:59 UTC
PRICE| 1 INNOU = 0.0001 ETH, 1 ETH = 10,000 INNOU
SOFT-CAP| 2,000 ETH = 20,000,000 INNOU [_(1)_]
HARD-CAP| There is no maximum of funds which may be raised.
ISSUER’S SHARE| 15% [_(2)_]

> (1) _Soft-cap:_  
If less than 2,000 ETH will be invested until the END, all Ethereum will be sent back to the addresses where they came from.  
ERC-20 Tokens will be issued after the Soft-cap has been reached. The issuer may withdraw all ETH from this moment.  
> (2) _Issuer's share:_  
For every 100 Tokens which will be issued to investors, the issuer gets additional 15 tokens.

### Detailed Rules
- Until the the Sale period has not ended
  - Until the Soft-Cap is reached    
    >Incoming ethers are frozen  
    Token are not minted yet  
  - After the soft-cap is reached  
    (both for purchases made before the soft-cap was reached and for new purchases)  
    >Tokens get minted to investors and they can transfer tokens  
    Ethers sent to the owner
- After the sale period has ended
  - No new purchases available
  - If the soft-cap has not been reached  
    >Investors may claim their ethers back  
    No tokens get minted

### Transaction Flow
- Before the `openingTime`
    - the deployer deploys InnCrowdsaleReady contract on the network
    - _optional:_ the deployer calls `InnToken.transferOwnership(newOwner)`
- On the `openingTime` and till the `closingTime`
    - buyers (investors) may send ethers to the contract  
      _(they may call `InnCrowdsale.buyTokens(beneficiary)` as well)_
- As soon as the `goal` (the soft-cap) has been reached
    - deployer calls once `InnCrowdsale.finalize()`  
      _(anyone can call it as well)_
    - for every investor address the deployer calls `withdrawTokens(investor)`  
      _(anyone can call it as well)_
- If the `closingTime` comes but the soft-cap has not been reached
    - deployer calls once `finalize()`  
      _(anyone can call it as well)_
    - for every buyer deployer calls InnCrowdsale.claimRefund(buyer)  
      _(anyone can call it as well)_

## How To Use 
#### Run automated tests
```bash
# Run all tests
npm run test

# Run a group of tests
npm run ./test/*.e2e.js

# Run a particular test
npm run ./test/InnouCrowdsale.entireCampaignAndUpgrade.e2e.js
```

#### Build contacts
```bash
npm run build
```

#### Deploy contracts
```bash
docker build --no-cache --tag innou/deployer .
docker run --name inn-deploy --rm -p 127.0.0.1:8087:8087/tcp innou/deployer
```
Then navigate your browser to [http://localhost:8087](http://localhost:8087)  
You'll need MetaMask to select the network (eg. Mainnet or Ropsten) and pay the GAS required for the contract creation.

> A minimum of 8 GB memory will be required for proper results  
