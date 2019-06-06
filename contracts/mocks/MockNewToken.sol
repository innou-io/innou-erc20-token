pragma solidity ^0.5.2;

import "openzeppelin-solidity/token/ERC20/ERC20.sol";

// it MUST implement InterfaceUpgradeAgent
contract MockNewToken is ERC20 {

    uint32 public revision;
    address public master;

    constructor (uint32 _revision, address _master) public {
        revision = _revision;
        master = _master;
    }

    function upgradeFrom(address holder, uint256 tokenQty) external returns (bool) {
        require(msg.sender == master);
        require(tokenQty > 0);
        _mint(holder, tokenQty);
        return true;
    }

}
