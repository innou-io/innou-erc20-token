pragma solidity ^0.5.2;

/**
* @title Upgrade agent interface
*/
contract InterfaceUpgradeAgent {

    uint32 public revision;

    /**
     * @dev Reissue the tokens onto the new contract revision.
     * @param holder Holder (owner) of the tokens
     * @param tokenQty How many tokens to be issued
     * @return true if tokens properly reissued, false (or reverts) otherwise
     */
    function upgradeFrom(address holder, uint256 tokenQty) external returns (bool success);
}
