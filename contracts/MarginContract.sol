// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import './ProfitContract.sol';
import './DestroyFund.sol';
import './WhiteList.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';

contract MarginContract {
    using SafeMath for uint256; //为了uint256后面使用 sub ,add方法，，，
    mapping(address => uint256) public userWithdrawableProfit; // 用户 与 它账户内的保证金数 之间的对应关系
    mapping(address => uint256) public userLockProfit; // 用户 与 它锁定的保证金数 之间的对应关系

    address payable public profitContract; // 使用address payable类型
    address payable public destroyFund; // 使用address payable类型
    WhiteList public whiteListContract; // WhiteList合约实例

    event DepositAdded(address indexed user, uint256 amount); // 添加保证金事件
    event DepositWithdrawn(address indexed user, uint256 amount); // 提取保证金事件
    event DepositLocked(address indexed user, uint256 amount); // 锁定保证金事件
    event DepositUnlocked(address indexed user, uint256 amount); // 解锁保证金事件

    constructor(address profitContractAddress, address destroyFundAddress, address whiteListAddress) {
        profitContract = payable(profitContractAddress); // 进行类型转换
        destroyFund = payable(destroyFundAddress); // 进行类型转换
        whiteListContract = WhiteList(whiteListAddress);
    }

    // 添加保证金
    function addDeposit() external payable {
        userWithdrawableProfit[msg.sender] = userWithdrawableProfit[msg.sender].add(msg.value);

        emit DepositAdded(msg.sender, msg.value);
    }

    // 提取保证金
    function withdrawDeposit(uint256 amount) external {
        require(amount <= userWithdrawableProfit[msg.sender].sub(userLockProfit[msg.sender]), 'Insufficient balance');
        // 更新用户与可提取出去的金额数
        userWithdrawableProfit[msg.sender] = userWithdrawableProfit[msg.sender].sub(amount);
        payable(msg.sender).transfer(amount);

        emit DepositWithdrawn(msg.sender, amount);
    }

    // 锁定保证金
    function lockDeposit(address account, uint256 amount) external {
        require(whiteListContract.whitelist(msg.sender), 'Address is not whitelisted');
        require(userLockProfit[account].add(amount) <= userWithdrawableProfit[account], 'Insufficient balance');
        // 锁定传入数量的保证金
        userLockProfit[account] = userLockProfit[account].add(amount);

        emit DepositLocked(account, amount);
    }

    // 解锁保证金
    function unlockDeposit(address account, uint256 amount) external {
        require(whiteListContract.whitelist(msg.sender), 'Address is not whitelisted');
        require(userLockProfit[account] >= amount, 'Insufficient balance');
        // 解锁传入数量的保证金
        userLockProfit[account] = userLockProfit[account].sub(amount);

        emit DepositUnlocked(account, amount);
    }

    // 公开的用于修改userWithdrawableProfit的值
    function setUserWithdrawableProfit(address account, uint256 amount) external {
        require(whiteListContract.whitelist(msg.sender), 'Address is not whitelisted');
        userWithdrawableProfit[account] = amount;
    }

    // 向利润合约转账（私有的只可以本合约内部调用）
    function transferToProfitContract(uint256 account) public {
        require(whiteListContract.whitelist(msg.sender), 'Address is not whitelisted');
        (bool success, ) = profitContract.call{value: account}(''); // 使用profitContract进行转账
        require(success, 'Transfer to contract failed');
    }

    // 向摧毁资金合约合约转账（私有的只可以本合约内部调用）
    function transferToDestroyFund(uint256 account) public {
        require(whiteListContract.whitelist(msg.sender), 'Address is not whitelisted');
        (bool success, ) = destroyFund.call{value: account}(''); // 使用destroyFund进行转账
        require(success, 'Transfer to contract failed');
    }
}

// import './ProfitContract.sol';
// import './DestroyFund.sol';
// import './WhiteList.sol';
// import '@openzeppelin/contracts/utils/math/SafeMath.sol';
// import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

// contract MarginContract {
//     using SafeMath for uint256; //为了uint256后面使用 sub ,add方法，，，
//     mapping(address => uint256) public userWithdrawableProfit; // 用户 与 它账户内的保证金数 之间的对应关系
//     mapping(address => uint256) public userLockProfit; // 用户 与 它锁定的保证金数 之间的对应关系

//     address payable public profitContract; // 使用address payable类型
//     address payable public destroyFund; // 使用address payable类型
//     WhiteList public whiteListContract; // WhiteList合约实例
//     address public usdtAddress; // USDT合约地址

//     event DepositAdded(address indexed user, uint256 amount); // 添加保证金事件
//     event DepositWithdrawn(address indexed user, uint256 amount); // 提取保证金事件
//     event DepositLocked(address indexed user, uint256 amount); // 锁定保证金事件
//     event DepositUnlocked(address indexed user, uint256 amount); // 解锁保证金事件

//     constructor(address profitContractAddress, address destroyFundAddress, address whiteListAddress, address usdtContractAddress) {
//         profitContract = payable(profitContractAddress); // 进行类型转换
//         destroyFund = payable(destroyFundAddress); // 进行类型转换
//         whiteListContract = WhiteList(whiteListAddress);
//         usdtAddress = usdtContractAddress;
//     }

//     // 添加保证金
//     function addDeposit(uint256 amount) external payable {
//         IERC20 usdt = IERC20(usdtAddress);
//         require(amount > 0, 'Amount must be greater than 0');
//         require(usdt.allowance(msg.sender, address(this)) >= amount, 'Insufficient allowance');
//         usdt.transferFrom(msg.sender, address(this), amount);
//         userWithdrawableProfit[msg.sender] = userWithdrawableProfit[msg.sender].add(amount);

//         emit DepositAdded(msg.sender, amount);
//     }

//     // 提取保证金
//     function withdrawDeposit(uint256 amount) external {
//         require(amount <= userWithdrawableProfit[msg.sender].sub(userLockProfit[msg.sender]), 'Insufficient balance');
//         // 更新用户与可提取出去的金额数
//         userWithdrawableProfit[msg.sender] = userWithdrawableProfit[msg.sender].sub(amount);
//         IERC20(usdtAddress).transfer(msg.sender, amount);

//         emit DepositWithdrawn(msg.sender, amount);
//     }

//     // 锁定保证金
//     function lockDeposit(address account, uint256 amount) external {
//         require(whiteListContract.whitelist(msg.sender), 'Address is not whitelisted');
//         require(userLockProfit[account].add(amount) <= userWithdrawableProfit[account], 'Insufficient balance');
//         // 锁定传入数量的保证金
//         userLockProfit[account] = userLockProfit[account].add(amount);

//         emit DepositLocked(account, amount);
//     }

//     // 解锁保证金
//     function unlockDeposit(address account, uint256 amount) external {
//         require(whiteListContract.whitelist(msg.sender), 'Address is not whitelisted');
//         require(userLockProfit[account] >= amount, 'Insufficient balance');
//         // 解锁传入数量的保证金
//         userLockProfit[account] = userLockProfit[account].sub(amount);

//         emit DepositUnlocked(account, amount);
//     }

//     // 公开的用于修改userWithdrawableProfit的值
//     function setUserWithdrawableProfit(address account, uint256 amount) external {
//         require(whiteListContract.whitelist(msg.sender), 'Address is not whitelisted');
//         userWithdrawableProfit[account] = amount;
//     }

//     // 向利润合约转账（私有的只可以本合约内部调用）
//     function transferToProfitContract(uint256 amount) public {
//         require(whiteListContract.whitelist(msg.sender), 'Address is not whitelisted');
//         IERC20 usdt = IERC20(usdtAddress);
//         usdt.transferFrom(address(this), profitContract, amount);
//         emit DepositWithdrawn(msg.sender, amount);
//     }

//     // 向摧毁资金合约合约转账（私有的只可以本合约内部调用）
//     function transferToDestroyFund(uint256 amount) public {
//         require(whiteListContract.whitelist(msg.sender), 'Address is not whitelisted');
//         IERC20 usdt = IERC20(usdtAddress);
//         usdt.transferFrom(address(this), destroyFund, amount);
//         emit DepositWithdrawn(msg.sender, amount);
//     }
// }
