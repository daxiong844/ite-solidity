// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import './DemandList.sol';
import './MarginContract.sol';
import './IteToken.sol';
import './ProfitContract.sol';
import './DestroyFund.sol';
// import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
// import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/proxy/utils/Initializable.sol';

interface ProfitContractInterfaceV2 {
    // 定义 ProfitContract 合约的函数声明
    function addProfitShare(address userAddress) external;
}

interface DestroyFundInterfaceV2 {
    // 定义 DestroyFund 合约的函数声明
    function addDestroyShare(address userAddress) external;
}

contract TransactionContractV2 is Initializable {
    using SafeMath for uint256; //为了uint256后面使用 sub ,add方法，，，

    // 交易单状态枚举
    enum TransactionStatus {
        Locked, // 锁定
        Finished, // 完成
        Cancelled, // 取消
        Destroyed // 销毁
    }
    // 交易单结构体
    struct Transaction {
        address acceptor; // 交易单的创建者 即乙方
        uint256 creatorLockDeposit; // 创建者锁定的保证金金额数
        uint256 acceptorLockDeposit; // 接受者锁定的保证金金额数
        bool isCreatorFulfilled; // 创建者是否已满足履约条件
        bool isAcceptorFulfilled; // 接受者是否已满足履约条件
        bool isCreatorCancelled; // 创建者同意取消
        bool isAcceptorCancelled; // 接受者同意取消
        TransactionStatus status; // 交易单状态
    }
    mapping(string => Transaction) public transactions; // 交易单映射，将需求单ID映射到交易结构体

    DemandList private demandList; // DemandList合约实例
    MarginContract private marginContract; // MarginContract合约实例
    IteToken private iteToken; // IteToken合约实例
    ProfitContractInterfaceV2 public profitContract;
    DestroyFundInterfaceV2 public destroyFund;

    bool private initialized; // 标记合约是否已初始化

    event TransactionCreated(string demandId, address indexed creator, address indexed acceptor); // 创建交易单事件
    event TransactionFulfilled(string demandId, address indexed creator, address indexed acceptor); // 履约交易单事件
    event TransactionCancelled(string demandId, address indexed creator, address indexed acceptor); // 取消交易单事件
    event TransactionDestroyed(string demandId, address indexed creator, address indexed acceptor); // 销毁交易单事件

    // constructor(address demandListAddress, address marginContractAddress, address iteTokenAddress, address profitContractAddress, address destroyFundAddress) {
    //     demandList = DemandList(demandListAddress); // 创建DemandList合约实例
    //     marginContract = MarginContract(marginContractAddress); // 创建MarginContract合约实例
    //     iteToken = IteToken(iteTokenAddress); // 创建IteToken合约实例
    //     profitContract = ProfitContractInterfaceV2(profitContractAddress); // 转换为 ProfitContract 合约实例
    //     destroyFund = DestroyFundInterfaceV2(destroyFundAddress); // 转换为 DestroyFund 合约实例
    // }

    function initialize(address demandListAddress, address marginContractAddress, address iteTokenAddress, address profitContractAddress, address destroyFundAddress) public initializer {
        demandList = DemandList(demandListAddress);
        marginContract = MarginContract(marginContractAddress);
        iteToken = IteToken(iteTokenAddress);
        profitContract = ProfitContractInterfaceV2(profitContractAddress);
        destroyFund = DestroyFundInterfaceV2(destroyFundAddress);
    }

    // 创建交易单(乙方调用此方法)
    function createTransaction(string memory demandId) external virtual {
        // 通过需求单号获得甲方的地址和保证金数
        (address creator, uint256 deposit) = demandList.demands(demandId);

        uint256 depositCreator = marginContract.userWithdrawableProfit(creator); // 甲方的保证金
        uint256 depositAcceptor = marginContract.userWithdrawableProfit(msg.sender); // 乙方的保证金

        // 验证甲方的保证金数,通过后锁定保证金
        require(depositCreator >= deposit, 'Insufficient deposit for creator LockDeposit');
        marginContract.lockDeposit(creator, deposit);

        // 验证乙方的保证金是不是甲方的1.5倍之间，通过后锁定保证金
        require(depositAcceptor >= deposit.mul(15).div(10), "Insufficient deposit for acceptor. Deposit amount should be 1.5-2 times the creator's deposit");
        marginContract.lockDeposit(msg.sender, deposit.mul(15).div(10));

        // 生成交易单，状态为锁定
        transactions[demandId] = Transaction({acceptor: msg.sender, creatorLockDeposit: deposit, acceptorLockDeposit: deposit.mul(15).div(10), isCreatorFulfilled: false, isAcceptorFulfilled: false, isCreatorCancelled: false, isAcceptorCancelled: false, status: TransactionStatus.Locked});

        iteToken.sendTokens(msg.sender); // 乙方获得代币

        // 给双方增加一个分润份额
        profitContract.addProfitShare(creator);
        profitContract.addProfitShare(msg.sender);

        // 触发交易单创建事件
        emit TransactionCreated(demandId, creator, msg.sender);
    }

    // 履行交易单（甲乙双方都同意履约之后）

    function fulfillTransaction(string memory demandId) external {
        // 通过需求单号获得甲方的地址和保证金数
        (address creator, ) = demandList.demands(demandId);

        if (msg.sender == creator && transactions[demandId].status == TransactionStatus.Locked) {
            transactions[demandId].isCreatorFulfilled = true;
        } else if (msg.sender == transactions[demandId].acceptor && transactions[demandId].status == TransactionStatus.Locked) {
            // 交易单状态设置为完成
            transactions[demandId].isAcceptorFulfilled = true;
        } else {
            revert('Only the creator or acceptor can fulfill the transaction'); // 只有创建者或接受者可以取消交易
        }

        if (transactions[demandId].isAcceptorFulfilled && transactions[demandId].isCreatorFulfilled) {
            // 交易单状态设置为完成
            transactions[demandId].status = TransactionStatus.Finished;

            // 分别解锁甲乙的保证金
            marginContract.unlockDeposit(creator, transactions[demandId].creatorLockDeposit);
            marginContract.unlockDeposit(transactions[demandId].acceptor, transactions[demandId].acceptorLockDeposit);

            // 甲乙双方保证金之和
            uint256 totalDeposit = transactions[demandId].creatorLockDeposit.add(transactions[demandId].acceptorLockDeposit);
            // 此时也需要减去甲乙双方各自的保证金数
            uint256 currentCreatorDeposit = marginContract.userWithdrawableProfit(creator).sub(totalDeposit.div(200));
            marginContract.setUserWithdrawableProfit(creator, currentCreatorDeposit);
            uint256 currentAcceptorDeposit = marginContract.userWithdrawableProfit(transactions[demandId].acceptor).sub(totalDeposit.div(200));
            marginContract.setUserWithdrawableProfit(transactions[demandId].acceptor, currentAcceptorDeposit);
            // 收取平台利润（扣除平台费用）
            marginContract.transferToProfitContract(totalDeposit.div(100));

            // 更新分润份额
            profitContract.addProfitShare(creator);
            profitContract.addProfitShare(msg.sender);

            // 更新摧毁份额
            destroyFund.addDestroyShare(creator);
            destroyFund.addDestroyShare(msg.sender);

            // 摧毁代币
            (bool success, ) = address(iteToken).call(abi.encodeWithSignature('burnIteToken()'));
            require(success, 'burnIteToken call failed');

            // 触发交易单完成事件
            emit TransactionFulfilled(demandId, creator, transactions[demandId].acceptor);
        }
    }

    // 取消交易
    function cancelTransaction(string memory demandId) external virtual {
        // 通过需求单号获得甲方的地址和保证金数
        (address creator, ) = demandList.demands(demandId);
        require(transactions[demandId].status != TransactionStatus.Finished, 'Transaction is Finished');
        require(transactions[demandId].status != TransactionStatus.Destroyed, 'Transaction is Destroyed');

        if (msg.sender == creator) {
            transactions[demandId].isCreatorCancelled = true;
        } else if (msg.sender == transactions[demandId].acceptor) {
            transactions[demandId].isAcceptorCancelled = true;
        } else {
            revert('Only the creator or acceptor can cancel the transaction'); // 只有创建者或接受者可以取消交易
        }

        // 检查创建者和接受者是否都同意取消交易单
        if (transactions[demandId].isCreatorCancelled && transactions[demandId].isAcceptorCancelled) {
            // 交易单状态设置为取消
            transactions[demandId].status = TransactionStatus.Cancelled;

            // 分别解锁甲乙的保证金
            marginContract.unlockDeposit(creator, transactions[demandId].creatorLockDeposit);
            marginContract.unlockDeposit(transactions[demandId].acceptor, transactions[demandId].acceptorLockDeposit);

            // 触发交易单取消事件
            emit TransactionCancelled(demandId, creator, transactions[demandId].acceptor);
        }
    }

    // 销毁交易
    function destroyTransaction(string memory demandId) external virtual {
        // 通过需求单号获得甲方的地址和保证金数
        (address creator, ) = demandList.demands(demandId);
        require(transactions[demandId].status != TransactionStatus.Finished, 'Transaction is Finished');
        require(transactions[demandId].status != TransactionStatus.Cancelled, 'Transaction is Cancelled');
        require(msg.sender == creator || msg.sender == transactions[demandId].acceptor, 'Only creator or acceptor can destroy the transaction'); // 只有创建者或接受者可以销毁交易

        // 交易单状态设置为摧毁
        transactions[demandId].status = TransactionStatus.Destroyed;

        // 分别解锁甲乙的保证金
        marginContract.unlockDeposit(creator, transactions[demandId].creatorLockDeposit);
        marginContract.unlockDeposit(transactions[demandId].acceptor, transactions[demandId].acceptorLockDeposit);

        // 甲乙双方保证金之和
        uint256 totalDeposit = transactions[demandId].creatorLockDeposit.add(transactions[demandId].acceptorLockDeposit);
        // 此时也需要减去甲乙双方各自的保证金数
        uint256 currentCreatorDeposit = marginContract.userWithdrawableProfit(creator).sub(transactions[demandId].creatorLockDeposit);
        marginContract.setUserWithdrawableProfit(creator, currentCreatorDeposit);
        uint256 currentAcceptorDeposit = marginContract.userWithdrawableProfit(transactions[demandId].acceptor).sub(transactions[demandId].acceptorLockDeposit);
        marginContract.setUserWithdrawableProfit(transactions[demandId].acceptor, currentAcceptorDeposit);

        // 调用refund将保证金转移到平台的销毁池中
        marginContract.transferToDestroyFund(totalDeposit);

        // 触发交易单销毁事件
        emit TransactionDestroyed(demandId, creator, transactions[demandId].acceptor);
    }
}

// pragma solidity ^0.8.2;

// // 导入必要的接口和库，并定义新的实现
// import './TransactionContract.sol';
// import './DemandList.sol'; // 添加DemandList合约的引入
// import './MarginContract.sol'; // 添加MarginContract合约的引入
// import './IteToken.sol'; // 添加IteToken合约的引入
// import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

// contract TransactionContractV2 is Initializable, TransactionContract {
//     DemandList private demandListV2; // 添加DemandList合约实例
//     MarginContract private marginContractV2; // 添加MarginContract合约实例
//     IteToken private iteTokenV2; // 添加IteToken合约实例

//     // 构造函数用于初始化合约
//     // constructor(address demandListAddress, address marginContractAddress, address iteTokenAddress, address profitContractAddress, address destroyFundAddress) TransactionContract(demandListAddress, marginContractAddress, iteTokenAddress, profitContractAddress, destroyFundAddress) {
//     //     demandListV2 = DemandList(demandListAddress);
//     //     marginContractV2 = MarginContract(marginContractAddress);
//     //     iteTokenV2 = IteToken(iteTokenAddress);
//     // }

//     function initialize(address demandListAddress, address marginContractAddress, address iteTokenAddress, address profitContractAddress, address destroyFundAddress) public override initializer {
//         TransactionContract.initialize(demandListAddress, marginContractAddress, iteTokenAddress, profitContractAddress, destroyFundAddress);

//         demandListV2 = DemandList(demandListAddress);
//         marginContractV2 = MarginContract(marginContractAddress);
//         iteTokenV2 = IteToken(iteTokenAddress);
//     }

//     // 履行交易单（甲乙双方都同意履约之后）
//     function fulfillTransaction(uint256 demandId) external override {
//         // 通过需求单号获得甲方的地址和保证金数
//         (address creator, ) = demandListV2.demands(demandId);

//         if (msg.sender == creator && transactions[demandId].status == TransactionStatus.Locked) {
//             transactions[demandId].isCreatorFulfilled = true;
//         } else if (msg.sender == transactions[demandId].acceptor && transactions[demandId].status == TransactionStatus.Locked) {
//             // 交易单状态设置为完成
//             transactions[demandId].isAcceptorFulfilled = true;
//         } else {
//             revert('Only the creator or acceptor can fulfill the transaction'); // 只有创建者或接受者可以取消交易
//         }

//         if (transactions[demandId].isAcceptorFulfilled && transactions[demandId].isCreatorFulfilled) {
//             // 交易单状态设置为完成
//             transactions[demandId].status = TransactionStatus.Finished;

//             // 分别解锁甲乙的保证金
//             marginContractV2.unlockDeposit(creator, transactions[demandId].creatorLockDeposit);
//             marginContractV2.unlockDeposit(transactions[demandId].acceptor, transactions[demandId].acceptorLockDeposit);

//             // 甲乙双方保证金之和
//             uint256 totalDeposit = transactions[demandId].creatorLockDeposit + transactions[demandId].acceptorLockDeposit;
//             // 此时也需要减去甲乙双方各自的保证金数
//             uint256 currentCreatorDeposit = marginContractV2.userWithdrawableProfit(creator) - totalDeposit / 200;
//             marginContractV2.setUserWithdrawableProfit(creator, currentCreatorDeposit);
//             uint256 currentAcceptorDeposit = marginContractV2.userWithdrawableProfit(transactions[demandId].acceptor) - totalDeposit / 200;
//             marginContractV2.setUserWithdrawableProfit(transactions[demandId].acceptor, currentAcceptorDeposit);
//             // 收取平台利润（扣除平台费用）
//             marginContractV2.transferToProfitContract(totalDeposit / 100);

//             // 更新分润份额
//             profitContract.addProfitShare(creator);
//             profitContract.addProfitShare(msg.sender);

//             // 更新摧毁份额
//             destroyFund.addDestroyShare(creator);
//             destroyFund.addDestroyShare(msg.sender);

//             // 摧毁代币
//             (bool success, ) = address(iteTokenV2).call(abi.encodeWithSignature('burnIteToken()'));
//             require(success, 'burnIteToken call failed');

//             // 触发交易单完成事件
//             emit TransactionFulfilled(demandId, creator, transactions[demandId].acceptor);
//         }
//     }
// }
