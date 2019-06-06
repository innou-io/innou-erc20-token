// Source (import only modified): openzeppelin-solidity/contracts/mocks/ERC20Mock.sol
pragma solidity ^0.5.2;

import {InnToken} from "../flatten/InnouCrowdsaleReady.sol";

contract ERC20Mock is InnToken {
    constructor (address initialAccount, uint256 supplyLessPremium) public {
        mint(initialAccount, supplyLessPremium);
    }
}
