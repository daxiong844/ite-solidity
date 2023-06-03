// SPDX-License-Identifier: MIT

pragma solidity ^0.8.16;

import './DemandList.sol';

contract MarginContract {
    //保证金结构
    struct Margin {
        uint256 demandId; // 用作需求单和保证金之间的关联标识
        uint256 depositCreator; // 创建者缴纳的保证金金额
        uint256 depositAcceptor; // 接受者缴纳的保证金金额
        bool isDepositLocked; // 保证金是否已锁定
        bool isCreatorWithdrawn; // 创建者是否已提取保证金
        bool isAcceptorWithdrawn; // 接受者是否已提取保证金
    }

    DemandList private demandList; // DemandList合约实例

    mapping(uint256 => Margin) public margins; // 需求单ID与保证金结构的映射

    event AddDeposit(uint256 demandId, address account, uint256 amount); // 添加保证金事件
    event WithdrawnDeposit(uint256 demandId, address account, uint256 amount); // 提取保证金事件
    event LockDeposit(uint256 demandId); // 锁定保证金事件
    event UnlockDeposit(uint256 demandId); // 解锁保证金事件

    constructor(address demandListAddress) {
        demandList = DemandList(demandListAddress);
    }

    // 添加保证金
    function addDeposit(uint256 demandId) external payable {
        // 此行代码也可以直接使用margins[demandId]来访问状态变量的映射并进行修改，
        // 如果函数较简单且不需要多次访问保证金结构，可直接通过margins[demandId]进行操作，而不用在函数内声明局部变量margin
        Margin storage margin = margins[demandId];
        require(margin.demandId == 0, 'Deposit already added');

        // 注意这里后面一个没用到了变量用一个逗号代替
        (address creator, address acceptor, bool isAccepted, ) = demandList.demands(demandId);

        if (creator == msg.sender) {
            // 此行代码应该是可有可无，因为需求单不接受的话，甲方也可以添加保证金
            require(isAccepted, 'Demand not accepted yet');
            margin.depositCreator = msg.value;
        } else if (acceptor == msg.sender) {
            require(isAccepted, 'Demand not accepted yet');
            require(margin.depositCreator > 0, 'Creator deposit not set');
            require(msg.value >= (margin.depositCreator * 15) / 10 && msg.value <= (margin.depositCreator * 2), "Deposit amount should be 1.5-2 times the creator's deposit");
            margin.depositAcceptor = msg.value;
        }

        margin.demandId = demandId;

        emit AddDeposit(demandId, msg.sender, msg.value);
    }

    // 提取保证金
    function withdrawDeposit(uint256 demandId) external {
        Margin storage margin = margins[demandId];
        require(margin.depositCreator != 0, 'Deposit not added');

        // 注意这里后面两个没用到了变量用两个逗号代替
        (address creator, address acceptor, , ) = demandList.demands(demandId);

        if (msg.sender == creator) {
            require(!margin.isCreatorWithdrawn, "Creator's deposit already withdrawn");
            margin.isCreatorWithdrawn = true;
            payable(msg.sender).transfer(margin.depositCreator);
            emit WithdrawnDeposit(demandId, msg.sender, margin.depositCreator);
        } else if (msg.sender == acceptor) {
            require(!margin.isAcceptorWithdrawn, "Acceptor's deposit already withdrawn");
            margin.isAcceptorWithdrawn = true;
            payable(msg.sender).transfer(margin.depositAcceptor);
            emit WithdrawnDeposit(demandId, msg.sender, margin.depositAcceptor);
        } else {
            revert('You do not meet the requirements');
        }
    }

    // 锁定保证金
    function lockDeposit(uint256 demandId) external {
        Margin storage margin = margins[demandId];
        (address creator, address acceptor, , ) = demandList.demands(demandId);

        require(margin.depositCreator != 0, 'Deposit not added');
        // 甲乙双方需要都添加了保证金之后，才可以锁定
        require(margin.depositAcceptor > 0, 'The acceptor has not yet added the deposit.');
        require(!margin.isDepositLocked, 'Deposit is already locked');
        // 只能是甲方或者乙方才可以锁定保证金
        require(msg.sender == creator || msg.sender == acceptor, 'Only the creator or acceptor of the demand order can lock the margin for this demand order');

        margin.isDepositLocked = true;

        emit LockDeposit(demandId);
    }

    // 解锁保证金
    function unlockDeposit(uint256 demandId) external {
        Margin storage margin = margins[demandId];
        (address creator, address acceptor, , ) = demandList.demands(demandId);

        require(margin.depositCreator != 0, 'Deposit not added');
        require(margin.isDepositLocked, 'Deposit is not locked');
        // 只能是甲方或者乙方才可以解锁保证金
        require(msg.sender == creator || msg.sender == acceptor, 'Only the creator or acceptor of the demand order can unlock the margin for this demand order');

        margin.isDepositLocked = false;

        emit UnlockDeposit(demandId);
    }
}
