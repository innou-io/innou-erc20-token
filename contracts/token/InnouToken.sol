pragma solidity ^0.5.2;

import "../../installed_contracts/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../../installed_contracts/openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "../../installed_contracts/openzeppelin-solidity/contracts/ownership/Secondary.sol";
import "./UpgradableToken.sol";

contract InnToken is ERC20Detailed, UpgradableToken, Secondary {
    using SafeMath for uint256;

    string public constant NAME = "INNOU.IO Token";
    string public constant SYMBOL = "INNOU";

    /**
     * @dev The decimals are only for visualization purposes -
     * just as operations with ethers are done in wei,
     * all operations with the tokens are done in "atom"
     * that is the smallest and indivisible token unit:
     *     1 token = 1x10^DECIMALS atom(s)
     */
    uint8 public constant DECIMALS = 14;

    /**
     * @dev On top of tokens to investors the contract mints extra tokens to the primary account
     * (i.e. the one that created the contract) at this percent rate:
     */
    uint256 public constant PREMIUM_MINT_PCT = 15;

    constructor()
    ERC20Detailed(NAME, SYMBOL, DECIMALS)
    public
    {
    }

    /**
     * @dev Function to mint tokens
     * @param to The address that will receive the minted tokens.
     * @param value The amount of tokens to mint.
     * @return A boolean that indicates if the operation was successful.
     */
    function mint(address to, uint256 value) public onlyPrimary returns (bool) {
        // mint tokens to the requested address
        _mint(to, value);
        // mint extra tokens to the primary account
        uint256 premium = PREMIUM_MINT_PCT.mul(value).div(100);
        _mint(primary(), premium);

        return true;
    }

}
