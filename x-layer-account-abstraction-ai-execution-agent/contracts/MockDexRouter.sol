// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockDexRouter
 * @notice DEX Router mock supporting UniswapV2 / V3 swap interfaces for X Layer
 */
contract MockDexRouter {
    event SwapExecuted(
        uint256 amountIn,
        uint256 minAmountOut,
        address[] path,
        address recipient
    );

    /**
     * @notice Selector: 0x38ed1739
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(path.length >= 2, "Invalid path");
        require(amountIn > 0, "Zero amount in");

        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        amounts[path.length - 1] = amountOutMin;

        emit SwapExecuted(amountIn, amountOutMin, path, to);
        return amounts;
    }

    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    /**
     * @notice Selector: 0x04e45ab1
     */
    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut)
    {
        require(block.timestamp <= params.deadline, "Transaction expired");
        require(params.amountIn > 0, "Zero amount in");

        amountOut = params.amountOutMinimum;
        return amountOut;
    }
}
