pragma solidity ^0.5.2;

import "../../installed_contracts/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract UpgradeAgentMock {
    using SafeMath for uint256;

    uint32 public revision;

    mapping(address => uint256) private _balances;

    constructor (uint32 _revision) public {
        revision = _revision;
    }

    function upgradeFrom(address holder, uint256 tokenQty) external returns (bool) {
        require(holder != address(0));
        require(tokenQty > 0);

        _balances[holder] = _balances[holder].add(tokenQty);
        return true;
    }

    function balanceOf(address holder) public view returns (uint256) {
        return _balances[holder];
    }

}
