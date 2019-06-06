pragma solidity ^0.5.2;

import {InnCrowdsale} from "../flatten/InnouCrowdsaleReady.sol";

contract  RefundableCrowdsaleImpl is InnCrowdsale {

    // Params set to 1 (wei) to make them ineffective for tests
    uint256 private constant MinPurchase = 1;

    constructor (
        uint256 openingTime,
        uint256 closingTime,
        uint256 rate,
        address payable wallet,
        uint256 goal
    )
        public
        InnCrowdsale(openingTime, closingTime, rate, wallet, goal, MinPurchase)
    {
        // solhint-disable-previous-line no-empty-blocks
    }
}
