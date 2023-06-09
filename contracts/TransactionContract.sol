// SPDX-License-Identifier: MIT

pragma solidity ^0.8.16;

import './MarginContract.sol';

interface MarginContractInterface {
    function refund(uint256 demandId, uint256 platformFee) external;
}

contract TransactionContract {
    // 交易单结构体
    struct Transaction {
        uint256 demandId; // 需求单ID
        bool isFulfill; // 是否已完成交易单
        bool isCancelled; // 是否已取消
        bool isDestroyed; // 是否已摧毁
        bool isCreatorFulfilled; // 创建者是否已满足条件
        bool isAcceptorFulfilled; // 接受者是否已满足条件
        bool isCreatorCancelled; // 创建者同意取消
        bool isAcceptorCancelled; // 接受者同意取消
        uint256 creatorShares; // 创建者份额
        uint256 acceptorShares; // 接受者份额
    }

    MarginContract private marginContract; // MarginContract合约实例
    uint256 public platformProfit; // 平台利润
    mapping(uint256 => Transaction) public transactions; // 交易单映射，将需求单ID映射到交易结构体

    event CreateTransaction(uint256 demandId); // 交易单创建事件
    event CreatorFulfilled(uint256 demandId); //甲方履约功能事件
    event AcceptorFulfilled(uint256 demandId); //乙方履约功能事件
    event transactionFinished(uint256 demandId); // 交易单完成事件
    event CreatorCancelTransaction(uint256 demandId); // 甲方同意取消交易单事件
    event AcceptorCancelTransaction(uint256 demandId); // 乙方同意取消交易单事件
    event CancelTransaction(uint256 demandId); // 交易单取消交易事件
    event DestroyTransaction(uint256 demandId); // 交易单摧毁交易事件
    event WithdrawProfit(address account, uint256 amount); // 提取利润事件

    address private owner; // Owner of the contract

    constructor(address marginContractAddress) {
        marginContract = MarginContract(marginContractAddress); // 创建MarginContract合约实例
        owner = msg.sender; // Set the contract deployer as the owner
    }

    // 创建交易单
    function createTransaction(uint256 demandId) external {
        // 根据需求单ID获取MarginContract合约中对应的保证金结构体
        (, , , bool isDepositLocked, , ) = marginContract.margins(demandId);
        // marginContract.lockDeposit(demandId); // 锁定保证金
        require(isDepositLocked, 'Must deposit margin to create a trading order');
        transactions[demandId] = Transaction(demandId, false, false, false, false, false, false, false, 1, 1); // 创建交易结构体
        emit CreateTransaction(demandId); // 触发创建交易事件
    }

    // 履行交易单（甲乙双方都满足条件之后的）
    function fulfillTransaction(uint256 demandId) external {
        // 根据需求单ID获取MarginContract合约中对应的保证金结构体
        (, uint256 depositCreator, uint256 depositAcceptor, bool isDepositLocked, , ) = marginContract.margins(demandId);
        // 获取需求单结构
        (address creator, address acceptor, , ) = marginContract.demandList().demands(demandId);

        Transaction storage transaction = transactions[demandId]; // 获取对应需求单ID的交易结构体
        require(!transaction.isCancelled, 'Transaction is cancelled'); // 交易已取消
        require(!transaction.isDestroyed, 'Transaction is destroyed'); // 交易已销毁
        require(isDepositLocked, 'Transaction order has not been created'); // 用来判断是否已经锁定保证金

        if (msg.sender == creator) {
            require(!transaction.isCreatorFulfilled, 'Creator already fulfilled'); // 创建者已履约
            transaction.isCreatorFulfilled = true; // 设置创建者已履约为true
            emit CreatorFulfilled(demandId); // 触发甲方履约事件
        } else if (msg.sender == acceptor) {
            require(!transaction.isAcceptorFulfilled, 'Acceptor already fulfilled'); // 接受者已履约
            transaction.isAcceptorFulfilled = true; // 设置接受者已履约为true
            emit AcceptorFulfilled(demandId); // 触发乙方履约事件
        } else {
            revert('Only the creator or acceptor can fulfill the transaction'); // 只有创建者或接受者可以履约
        }

        // 检查甲乙双方是否都已履约
        if (transaction.isCreatorFulfilled && transaction.isAcceptorFulfilled && !transaction.isFulfill) {
            // 解锁保证金并返还给参与者
            uint256 creatorDeposit = depositCreator; // 创建者保证金
            uint256 acceptorDeposit = depositAcceptor; // 接受者保证金
            uint256 totalDeposit = creatorDeposit + acceptorDeposit; // 总保证金

            // 计算甲乙双方应该缴纳给平台的利润
            uint256 platformFee = totalDeposit / 100; // 如平台收费为总保证金的1%
            uint256 creatorShare = totalDeposit / 100; // 创建者分润份额为总保证金的1%
            uint256 acceptorShare = totalDeposit / 100; // 接受者分润份额为总保证金的1%

            platformProfit += platformFee; // 更新平台利润

            // 返还保证金给甲乙双方（扣除平台费用）
            // 调用MarginContract合约的refund函数
            marginContract.refund(demandId, platformFee);

            // 更新份额
            transaction.creatorShares += creatorShare;
            transaction.acceptorShares += acceptorShare;

            transaction.isFulfill = true; // 设置交易单已完成为true
            emit transactionFinished(demandId); // 触发交易单完成事件
        }
    }

    // 取消交易
    function cancelTransaction(uint256 demandId) external {
        // 获取需求单结构
        (address creator, address acceptor, , ) = marginContract.demandList().demands(demandId);

        Transaction storage transaction = transactions[demandId]; // 获取对应需求单ID的交易结构体
        require(!transaction.isFulfill, 'Transaction is already isFulfill'); // 交易已取消
        require(!transaction.isCancelled, 'Transaction is already cancelled'); // 交易已取消
        require(!transaction.isDestroyed, 'Transaction is destroyed'); // 交易已销毁

        if (msg.sender == creator) {
            require(!transaction.isCreatorFulfilled || !transaction.isAcceptorFulfilled, 'Creator or Acceptor already fulfilled'); // 只要有一方未履约，就可以保证交易单未完成交易
            transaction.isCreatorCancelled = true; // 设置创建者同意取消交易为true
            emit CreatorCancelTransaction(demandId); // 触发甲方同意取消交易事件
        } else if (msg.sender == acceptor) {
            require(!transaction.isCreatorFulfilled || !transaction.isAcceptorFulfilled, 'Creator or Acceptor already fulfilled'); // 只要有一方未履约，就可以保证交易单未完成交易
            transaction.isAcceptorCancelled = true; // 设置接受者同意取消交易为true
            emit AcceptorCancelTransaction(demandId); // 触发乙方同意取消交易事件
        } else {
            revert('Only the creator or acceptor can cancel the transaction'); // 只有创建者或接受者可以取消交易
        }

        // 检查创建者和接受者是否都同意取消交易单
        if (transaction.isCreatorCancelled && transaction.isAcceptorCancelled) {
            // 将创建者和接受者双方各自的保证金返回给双方
            marginContract.refund(demandId, 0);

            transaction.isCancelled = true; // 设置交易已取消为true
            emit CancelTransaction(demandId); // 触发取消交易事件
        }
    }

    // 销毁交易
    function destroyTransaction(uint256 demandId) external {
        // 根据需求单ID获取DemandList合约中对应的需求单结构体
        (address creator, address acceptor, , ) = marginContract.demandList().demands(demandId);
        // 根据需求单ID获取MarginContract合约中对应的保证金结构体
        (, uint256 depositCreator, uint256 depositAcceptor, , , ) = marginContract.margins(demandId);

        Transaction storage transaction = transactions[demandId]; // 获取对应需求单ID的交易结构体
        require(!transaction.isCancelled, 'Transaction is cancelled'); // 交易已取消
        require(!transaction.isDestroyed, 'Transaction is already destroyed'); // 交易已销毁
        require(msg.sender == creator || msg.sender == acceptor, 'Only creator or acceptor can destroy the transaction'); // 只有创建者或接受者可以销毁交易

        transaction.isDestroyed = true; // 设置交易已销毁为true

        // 将保证金转移到平台的销毁池中
        uint256 creatorDeposit = depositCreator; // 创建者保证金
        uint256 acceptorDeposit = depositAcceptor; // 接受者保证金
        uint256 totalDeposit = creatorDeposit + acceptorDeposit; // 总保证金

        // 更新平台利润
        platformProfit += totalDeposit;

        emit DestroyTransaction(demandId); // 触发销毁交易事件
    }
}
