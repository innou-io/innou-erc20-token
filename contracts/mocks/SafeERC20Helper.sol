// Source (accommodated): openzeppelin-solidity/contracts/mocks/SafeERC20Helper.sol
pragma solidity ^0.5.2;

import {InnToken, SafeERC20} from "../flatten/InnouCrowdsaleReady.sol";

contract ERC20ReturnFalseMock {
    uint256 private _allowance;

    // IERC20's functions are not pure, but these mock implementations are: to prevent Solidity from issuing warnings,
    // we write to a dummy state variable.
    uint256 private _dummy;

    function transfer(address, uint256) public returns (bool) {
        _dummy = 0;
        return false;
    }

    function transferFrom(address, address, uint256) public returns (bool) {
        _dummy = 0;
        return false;
    }

    function approve(address, uint256) public returns (bool) {
        _dummy = 0;
        return false;
    }

    function allowance(address, address) public view returns (uint256) {
        require(_dummy == 0);
        return 0;
    }
}

contract ERC20ReturnTrueMock {
    mapping (address => uint256) private _allowances;

    // IERC20's functions are not pure, but these mock implementations are: to prevent Solidity from issuing warnings,
    // we write to a dummy state variable.
    uint256 private _dummy;

    function transfer(address, uint256) public returns (bool) {
        _dummy = 0;
        return true;
    }

    function transferFrom(address, address, uint256) public returns (bool) {
        _dummy = 0;
        return true;
    }

    function approve(address, uint256) public returns (bool) {
        _dummy = 0;
        return true;
    }

    function setAllowance(uint256 allowance_) public {
        _allowances[msg.sender] = allowance_;
    }

    function allowance(address owner, address) public view returns (uint256) {
        return _allowances[owner];
    }
}

contract ERC20NoReturnMock {
    mapping (address => uint256) private _allowances;

    // IERC20's functions are not pure, but these mock implementations are: to prevent Solidity from issuing warnings,
    // we write to a dummy state variable.
    uint256 private _dummy;

    function transfer(address, uint256) public {
        _dummy = 0;
    }

    function transferFrom(address, address, uint256) public {
        _dummy = 0;
    }

    function approve(address, uint256) public {
        _dummy = 0;
    }

    function setAllowance(uint256 allowance_) public {
        _allowances[msg.sender] = allowance_;
    }

    function allowance(address owner, address) public view returns (uint256) {
        return _allowances[owner];
    }
}

contract SafeERC20Wrapper {
    using SafeERC20 for InnToken;

    InnToken private _token;

    constructor (InnToken token) public {
        _token = token;
    }

    function transfer() public {
        _token.safeTransfer(address(0), 0);
    }

    function transferFrom() public {
        _token.safeTransferFrom(address(0), address(0), 0);
    }

    function approve(uint256 amount) public {
        _token.safeApprove(address(0), amount);
    }

    function increaseAllowance(uint256 amount) public {
        _token.safeIncreaseAllowance(address(0), amount);
    }

    function decreaseAllowance(uint256 amount) public {
        _token.safeDecreaseAllowance(address(0), amount);
    }

    function setAllowance(uint256 allowance_) public {
        ERC20ReturnTrueMock(address(_token)).setAllowance(allowance_);
    }

    function allowance() public view returns (uint256) {
        return _token.allowance(address(0), address(0));
    }
}
