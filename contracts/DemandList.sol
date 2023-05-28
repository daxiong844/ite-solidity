// SPDX-License-Identifier: MIT

pragma solidity ^0.8.16;

contract DemandList {
    mapping(address => uint256) public tokenBalances; // 用户地址对应的平台发放的代币余额
    mapping(uint256 => Demand) public demands; // 需求单ID对应的需求单结构
    uint256 public demandCount; // 需求单号计数器

    // 需求单结构
    struct Demand {
        address creator;
        address acceptor;
        bool isAccepted; // 需求单是否被接受
        bool isDeleted; // 需求单是否被删除
    }

    event DemandCreated(uint256 demand, address creator); // 需求单创建事件
    event DemandAccepted(uint256 demandId, address acceptor); // 需求单接受事件
    event DemandDeleted(uint256 demandId, address creator); // 需求单删除事件

    // 创建需求单
    function createDemand() external {
        uint256 demandId = demandCount; // 生成需求单ID
        demands[demandId] = Demand({
            creator: msg.sender,
            acceptor: address(0), // 接受者初始为空地址
            isAccepted: false, // 未接受
            isDeleted: false // 未删除
        });
        tokenBalances[msg.sender] += 1; // 创建者获得一个代币
        demandCount++;

        emit DemandCreated(demandId, msg.sender);
    }

    // 接受需求单
    function acceptDemand(uint256 demandId) external {
        Demand storage demand = demands[demandId]; // 获取需求单结构引用
        require(!demand.isDeleted, 'Requirement is deleted');
        require(!demand.isAccepted, 'Requirement is already accepted');

        demand.acceptor = msg.sender;
        demand.isAccepted = true; // 更新需求单为已接受状态
        tokenBalances[msg.sender] += 1; // 接受者获得一个代币

        emit DemandAccepted(demandId, msg.sender);
    }

    // 删除需求单
    function deleteDemand(uint256 demandId) external {
        Demand storage requirement = demands[demandId]; // 获取需求单结构引用
        require(requirement.creator == msg.sender, 'Only the creator can delete the requirement');

        requirement.isDeleted = true; // 更新需求单为已删除状态

        emit DemandDeleted(demandId, msg.sender);
    }
}
