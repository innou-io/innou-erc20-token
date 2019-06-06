pragma solidity ^0.5.2;

import "./InnouCrowdsale.sol";

contract InnCrowdsaleReady is InnCrowdsale {

    // From 06/07/2019 @ 12:00am (UTC) to 07/18/2019 @ 11:59pm (UTC), Goal: 2000 ETH
    uint256 public constant OpeningTime = 1559865600;
    uint256 public constant ClosingTime = 1563494399;
    uint256 public constant Goal = 2000 ether;

    /**
     * all operations with tokens are done in "atom"
     * that is the smallest and indivisible token unit:
     *   1 token = 1e+14 atom
     *
     * token(s) exchanged for ether(s) at the fixed rate:
     *   1 ether => 10,000 token (1 wei => 1 atom)
     */

    // 1 wei gets this number of atom(s)
    uint256 public constant Rate = 1;

    //   1 szabo = 1e+12 wei = 1e-6 ether
    uint256 public constant MinPurchase = 5000 szabo;

    constructor(address payable wallet)
    InnCrowdsale(
        OpeningTime,
        ClosingTime,
        Rate,
        wallet,
        Goal,
        MinPurchase
    )
    public {
    }

}
