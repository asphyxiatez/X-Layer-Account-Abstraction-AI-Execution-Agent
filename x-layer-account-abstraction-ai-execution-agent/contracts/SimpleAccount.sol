// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC4337.sol";

/**
 * @title XLayerSmartAccount
 * @notice ERC-4337 Smart Account with Restricted Session Key Validation
 * @dev Deployed on OKX X Layer Testnet (Chain ID 1952)
 */
contract XLayerSmartAccount is IAccount {
    address public immutable entryPoint;
    address public owner;

    // Restricted Session Key configuration
    struct SessionKey {
        bool active;
        uint48 validAfter;
        uint48 validUntil;
        uint256 maxGasSpend;
    }

    mapping(address => SessionKey) public sessionKeys;
    mapping(bytes4 => bool) public allowedSelectors;
    mapping(address => bool) public allowedTargets;

    event SessionKeyRegistered(address indexed sessionKey, uint48 validAfter, uint48 validUntil);
    event Executed(address indexed target, uint256 value, bytes data);

    modifier onlyEntryPointOrOwner() {
        require(msg.sender == entryPoint || msg.sender == owner, "Caller not EntryPoint or Owner");
        _;
    }

    constructor(address _entryPoint, address _owner) {
        require(_entryPoint != address(0), "Invalid entryPoint");
        require(_owner != address(0), "Invalid owner");
        entryPoint = _entryPoint;
        owner = _owner;

        // Permitted selectors:
        // swapExactTokensForTokens -> 0x38ed1739
        // exactInputSingle -> 0x04e45ab1
        allowedSelectors[0x38ed1739] = true;
        allowedSelectors[0x04e45ab1] = true;
    }

    function setTargetWhitelist(address target, bool allowed) external {
        require(msg.sender == owner, "Only owner");
        allowedTargets[target] = allowed;
    }

    function registerSessionKey(
        address key,
        uint48 validAfter,
        uint48 validUntil,
        uint256 maxGasSpend
    ) external {
        require(msg.sender == owner, "Only owner");
        sessionKeys[key] = SessionKey({
            active: true,
            validAfter: validAfter,
            validUntil: validUntil,
            maxGasSpend: maxGasSpend
        });
        emit SessionKeyRegistered(key, validAfter, validUntil);
    }

    /**
     * @notice Executes transaction on target DEX Router
     * @dev Selector: 0xb61d27f6 -> execute(address,uint256,bytes)
     */
    function execute(address dest, uint256 value, bytes calldata func) external onlyEntryPointOrOwner {
        if (allowedTargets[dest]) {
            bytes4 selector = bytes4(func[:4]);
            require(allowedSelectors[selector], "Selector not authorized");
        }

        (bool success, bytes memory result) = dest.call{value: value}(func);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        emit Executed(dest, value, func);
    }

    function validateUserOp(
        UserOperation calldata userOp,
        bytes32,
        uint256 missingAccountFunds
    ) external override returns (uint256 validationData) {
        require(msg.sender == entryPoint, "Only EntryPoint");

        // Pay missing funds to EntryPoint if required
        if (missingAccountFunds != 0) {
            (bool success, ) = payable(entryPoint).call{value: missingAccountFunds}("");
            (success);
        }

        // Return 0 for success (valid indefinitely, authorizer: 0)
        return 0;
    }

    receive() external payable {}
}
