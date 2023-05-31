// SPDX-License-Identifier: MIT

pragma solidity ^0.8.16;

import './DemandList.sol';

contract MarginContract {
    //保证金结构
    struct Margin {
        uint256 demandId; // 用作需求单和保证金之间的关联标识
        uint256 depositCreator; // 创建者缴纳的保证金金额
        uint256 depositAcceptor; // 接受者缴纳的保证金金额
    }

    DemandList private demandList; // DemandList合约实例

    mapping(uint256 => Margin) public margins; // 需求单ID与保证金结构的映射

    event AddDeposit(uint256 demandId, address account, uint256 amount); // 添加保证金事件

    constructor(address demandListAddress) {
        demandList = DemandList(demandListAddress);
    }

    // 添加保证金
    function addDeposit(uint256 demandId) external payable {
        Margin storage margin = margins[demandId];
        require(margin.demandId == 0, 'Deposit already added');

        // 注意这里后面一个没用到了变量用一个逗号代替
        (address creator, address acceptor, bool isAccepted, ) = demandList.demands(demandId);

        if (creator == msg.sender) {
            // 此行代码应该是可有可无，因为需求单不接受的话，甲方也可以添加保证金
            require(isAccepted, 'Demand not accepted yet');
            margin.depositCreator = msg.value;
        } else if (acceptor == msg.sender) {
            require(!isAccepted, 'Demand already accepted');
            require(msg.value >= (margin.depositCreator * 15) / 10 && msg.value <= (margin.depositCreator * 2), "Deposit amount should be 1.5-2 times the creator's deposit");
            margin.depositAcceptor = msg.value;
        } else {
            revert('You do not meet the requirements');
        }

        margin.demandId = demandId;

        emit AddDeposit(demandId, msg.sender, msg.value);
    }
}
