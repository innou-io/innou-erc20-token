pragma solidity ^0.5.2;

import "../../installed_contracts/openzeppelin-solidity/contracts/crowdsale/distribution/RefundablePostDeliveryCrowdsale.sol";
import "../token/InnouToken.sol";

/*
 * @title InnCrowdsale
 * @dev Before the goal (soft-cap) is reached the contract acts as openzeppelin RefundablePostDeliveryCrowdsale.
 * As soon as the goal is reached the contract behaves like openzeppelin MintedCrowdsale
 */

contract InnCrowdsale is RefundablePostDeliveryCrowdsale {

    InnToken private _token = new InnToken();
    uint256 private _minPurchase;

    constructor(
        uint256 openingTime,
        uint256 closingTime,
        uint256 rate,
        address payable wallet,
        uint256 goal,
        uint256 minPurchase
    )
    Crowdsale(rate, wallet, _token)
    TimedCrowdsale(openingTime, closingTime)
    RefundableCrowdsale(goal)
    public{
        _minPurchase = minPurchase;
        _token.transferOwnership(msg.sender);
    }

    /**
    * @return the min purchase possible (in wei).
    */
    function minPurchase() public view returns (uint256) {
        return _minPurchase;
    }

    /**
     * @dev Transfer tokens held by the contract itself ("premium" tokens) to the wallet address.
     * Reverts if called by any address except the wallet.
     * @return true if tokens have been transferred.
     */
    function transferPremiumTokens() external returns (bool) {
        require(msg.sender == wallet());
        uint256 value = InnToken(_token).balanceOf(address(this));
        require(InnToken(_token).transfer(msg.sender, value));
        return true;
    }

    /**
     * @dev Like ERC20 tokens does, the contract provides the name the symbol and decimals for the token on sale.
     * It facilitates software wallets in getting info on the token.
     * @return the name of the token on sale.
     */
    function name() public view returns (string memory) {
        return _token.name();
    }
    /**
     * @return the symbol of the token on sale.
     */
    function symbol() public view returns (string memory) {
        return _token.symbol();
    }
    /**
     * @return the number of decimals of the token on sale.
     */
    function decimals() public view returns (uint8) {
        return _token.decimals();
    }

    /**
     * @return true if the crowdsale is open, false otherwise.
     */
    function isSaleOpen() public view returns (bool) {
        return TimedCrowdsale.isOpen();
    }

    /**
     * @dev Overrides parents by checking whether the REFUNDABLE part of the crowdsale is open.
     * (it considers if the goal has not yet been reached)
     * @return true if the refundable part of the crowdsale is open, false otherwise.
     */
    function isOpen() public view returns (bool) {
        if (goalReached()) {
            return false;
        }
        return super.isOpen();
    }

    /**
     * @dev Overrides parents by checking whether the REFUNDABLE part of the crowdsale has closed.
     * (i.e. considers if the goal has reached)
     * @return Whether the refundable part of the crowdsale has closed.
     */
    function hasClosed() public view returns (bool) {
        if (goalReached()) {
            return true;
        }
        return super.hasClosed();
    }

    /**
     * @dev Overrides parents by issuing tokens if the goal reached or storing the balance to mint them later otherwise.
     * @param beneficiary Token purchaser
     * @param tokenAmount Amount of tokens purchased
     */
    function _processPurchase(address beneficiary, uint256 tokenAmount) internal {
        if (goalReached()) {
            // mint tokens
            Crowdsale._processPurchase(beneficiary, tokenAmount);
        } else {
            // book balance to mint tokens later
            super._processPurchase(beneficiary, tokenAmount);
        }
    }

    /**
     * @dev Overrides fund forwarding.
     */
    function _forwardFunds() internal {
        if (goalReached()) {
            // directly to the wallet
            Crowdsale._forwardFunds();
        } else {
            // to the escrow
            RefundableCrowdsale._forwardFunds();
        }
    }

    /**
     * @dev Overrides pre-validation on token purchase transaction.
     * Replica of the openzeppelin methods except for re-defined isSaleOpen
     */
    function _preValidatePurchase(address beneficiary, uint256 weiAmount) internal view {
        // (note: this code runs before Crowdsale._weiRaised gets incremented with weiAmount)
        require(weiAmount >= _minPurchase);
        require(beneficiary != address(0));
        require(isSaleOpen());
    }

    /**
     * @dev Overrides delivery by minting tokens
     * (effectively, InnCrowdsale is MintedCrowdsale)
     * Replica of the openzeppelin MintedCrowdsale contract only own method
     * @param beneficiary Token purchaser
     * @param tokenAmount Number of tokens to be minted
     */
    function _deliverTokens(address beneficiary, uint256 tokenAmount) internal {
        require(InnToken(address(token())).mint(beneficiary, tokenAmount));
    }

}
