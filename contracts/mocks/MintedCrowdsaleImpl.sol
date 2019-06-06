pragma solidity ^0.5.2;

import {InnCrowdsale} from "../flatten/InnouCrowdsaleReady.sol";

contract MintedCrowdsaleImpl is InnCrowdsale {

    // Params set to values which make them ineffective for tests
    uint256 private OpeningTime = block.timestamp;
    uint256 private ClosingTime = block.timestamp + 100;
    uint256 private constant Goal = 100000000 ether;
    uint256 private constant MinPurchase = 1;

    constructor(
        uint256 rate,
        address payable wallet
    )
    InnCrowdsale(
        OpeningTime,
        ClosingTime,
        rate,
        wallet,
        Goal,
        MinPurchase
    )
    public {
        // solhint-disable-previous-line no-empty-blocks
    }

}
