// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MonadFrontline {
    mapping(uint256 => uint8) public grid;
    mapping(uint8 => uint256) public scores;
    event TileClaimed(uint256 indexed tileId, uint8 teamId);

    function claimTile(uint256 tileId, uint8 teamId, uint8 multiplier) public {
        require(tileId < 225, "Gecersiz kare");
        uint8 oldTeam = grid[tileId];
        if (oldTeam != 0 && scores[oldTeam] > 0) scores[oldTeam]--;
        grid[tileId] = teamId;
        scores[teamId] += multiplier;
        emit TileClaimed(tileId, teamId);
    }
}
