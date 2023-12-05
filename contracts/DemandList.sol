// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import './IteToken.sol';

contract DemandList {
    struct Demand {
        address creator; // 甲方地址
        uint256 deposit; // 甲方保证金数
    }

    mapping(string => Demand) public demands; // 需求单号与需求单的映射

    IteToken private iteToken; // IteToken合约实例

    event DemandCreated(string demandId, address creator, uint256 deposit); // 需求单创建事件

    constructor(address iteTokenAddress) {
        iteToken = IteToken(iteTokenAddress); // 创建IteToken合约实例
    }

    // 传入需求单号和甲方保证金数(甲方调用此方法)
    function addDemand(string memory demandId, uint256 creatorDeposit) external {
        demands[demandId] = Demand(msg.sender, creatorDeposit);
        iteToken.sendTokens(msg.sender); // 甲方获得代币

        emit DemandCreated(demandId, msg.sender, creatorDeposit);
    }
}
