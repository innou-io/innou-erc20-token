pragma solidity ^0.5.2;

import "../../installed_contracts/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../../installed_contracts/openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../../installed_contracts/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "./InterfaceUpgradeAgent.sol";

/**
 * @title UpgradableToken
 * @dev The UpgradableToken contract provides an option of upgrading the tokens to a new revision.
 * The contract owner only may enable the upgrade. After that anyone may trigger the upgrade.
 */

contract UpgradableToken is ERC20, Ownable {

    using SafeMath for uint256;

    uint32 public REVISION;

    /** Address of the contract that issues the new revision tokens. */
    address public upgradeAgent = address(0);

    /** How many tokens are upgraded. */
    uint256 public totalUpgraded;

    event Upgrade(address indexed _from, uint256 _value);
    event UpgradeEnabled(address agent);

    /**
     * @dev Set the upgrade agent (once only) thus enabling the upgrade.
     * @param _upgradeAgent Upgrade agent contract address
     * @param _revision Unique ID that agent contract must return on ".revision()"
     */
    function setUpgradeAgent(address _upgradeAgent, uint32 _revision)
        onlyOwner whenUpgradeDisabled external
    {
        require((_upgradeAgent != address(0)) && (_revision != 0));

        InterfaceUpgradeAgent agent = InterfaceUpgradeAgent(_upgradeAgent);
        require(agent.revision() == _revision);

        upgradeAgent = _upgradeAgent;
        emit UpgradeEnabled(_upgradeAgent);
    }

    /**
     * @dev Upgrade tokens to the new revision.
     * @param from address tokens of which to be upgraded
     */
    function upgrade(address from) whenUpgradeEnabled external {
        require(from != address(0));

        uint256 value = balanceOf(from);
        require(value > 0);

        // Take tokens out from the old contract
        _burn(from, value);
        // Issue the new revision tokens
        totalUpgraded = totalUpgraded.add(value);
        InterfaceUpgradeAgent agent = InterfaceUpgradeAgent(upgradeAgent);
        require(agent.upgradeFrom(from, value));

        emit Upgrade(from, value);
    }

    /**
    * @dev Modifier to make a function callable only when the upgrade is enabled.
    */
    modifier whenUpgradeEnabled() {
        require(upgradeAgent != address(0));
        _;
    }

    /**
    * @dev Modifier to make a function callable only when the upgrade is impossible.
    */
    modifier whenUpgradeDisabled() {
        require(upgradeAgent == address(0));
        _;
    }

}
