// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

contract DestroyFund {
    mapping(address => uint256) public addressToDestroyShare; // 所有地址对应的摧毁份额
    address[] public addresses; // 存储地址的数组

    uint256 public destroySharesTotal; // destroyShares总和
    uint256 public userDestroyProfit; // 所有用户的全部摧毁金额
    uint256 public tokenDestroyProfit; // 回购代币并摧毁的金额

    event DestroyShareAdded(address indexed userAddress, uint256 shareAmount); // 增加摧毁份额事件
    event UserDestroyProfitWithdrawn(address indexed userAddress, uint256 profitAmount); // 用户提取摧毁资金事件

    // receive 函数不允许包含任何逻辑，因为它只是用于接收以太币的占位符函数。如果您需要在接收以太币时执行特定的逻辑操作，请将逻辑放在fallback函数中
    receive() external payable {
        // 当合约接收到以太币时，将调用此函数。
        // 如果需要，您可以在此处添加自定义逻辑。
    }

    // 分配摧毁资金池的规则
    function FundAssignRule() external {
        // 利润合约的余额
        uint256 totalBalance = address(this).balance;
        userDestroyProfit = (totalBalance * 80) / 100; // 分配给所有用户的全部摧毁金额  （为余额的80%）
        tokenDestroyProfit = (totalBalance * 20) / 100; // 回购代币并摧毁的金额  （为余额的20%）
    }

    // 增加摧毁份额
    function addDestroyShare(address userAddress) external {
        if (addressToDestroyShare[userAddress] >= 1) {
            addressToDestroyShare[userAddress] = addressToDestroyShare[userAddress] + 1;
        } else {
            addressToDestroyShare[userAddress] = 1;
            addresses.push(userAddress); // 将新地址添加到数组中
        }

        // 调用分配摧毁资金池的规则方法，然后更新状态变量中的总份额
        this.FundAssignRule();

        // 计算所有的摧毁份额的总数
        destroySharesTotal += 1;

        emit DestroyShareAdded(userAddress, 1);
    }

    // 购买代币并摧毁函数（等调用代币合约）
    // 。。。。。。。。。。

    // 提取用户摧毁资金池收益
    function withdrawUserDestroyProfit(uint256 amount) external {
        // 1、如果没有任何地址具有份额，则直接返回
        if (destroySharesTotal == 0) {
            return;
        }

        // 调用这个函数的用户必须是有份额的
        require(addressToDestroyShare[msg.sender] >= 0, 'user must have a share');

        // 一个份额所占的金额数
        uint256 userProfitShare = userDestroyProfit / destroySharesTotal;

        require(amount <= addressToDestroyShare[msg.sender] * userProfitShare, 'Insufficient profit');

        // 重置用户地址的份额（目前无重置份额的需求）
        addressToDestroyShare[msg.sender] = addressToDestroyShare[msg.sender] - amount / userProfitShare;

        // 给用户转账
        (bool success, ) = msg.sender.call{value: amount}('');
        require(success, 'User profit withdrawal failed');

        emit UserDestroyProfitWithdrawn(msg.sender, amount);
    }
}
