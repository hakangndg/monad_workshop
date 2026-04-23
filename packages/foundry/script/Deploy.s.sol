//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import { DeployMonadFrontline } from "./DeployMonadFrontline.s.sol";

/**
 * @notice Main deployment script for all contracts
 * @dev Run this when you want to deploy multiple contracts at once
 *
 * Example: yarn deploy # runs this script(without`--file` flag)
 */
contract DeployScript is ScaffoldETHDeploy {
    function run() external {
        // Deploy MonadFrontline (the main game contract)
        DeployMonadFrontline deployMonadFrontline = new DeployMonadFrontline();
        deployMonadFrontline.run();
    }
}
