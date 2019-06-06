pragma solidity ^0.5.2;

import {InnToken} from "../flatten/InnouCrowdsaleReady.sol";

contract ERC20MintableMock is InnToken {

    function onlyPrimaryMock() public view onlyPrimary {
        // solhint-disable-previous-line no-empty-blocks
    }

}
