// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

contract ProfitContract {
    mapping(address => uint256) public addressToShare; // 所有地址对应的份额
    // mapping(address => uint256) public addressToSharesTotal; // 记录增加份额时平台的所有份额总数

    address[] public addresses; // 存储地址的数组

    uint256 public SharesTotal; // shares总和
    uint256 public platformProfit; // 平台应收取的利润
    uint256 public usersProfit; // 所有用户应收的利润
    address public platform; // 平台地址

    event ProfitShareAdded(address indexed userAddress, uint256 shareAmount); // 增加分润份额事件
    event PlatformProfitWithdrawn(address indexed platformAddress, uint256 profitAmount); // 平台提取利润事件
    event UserProfitWithdrawn(address indexed userAddress, uint256 profitAmount); // 用户提取利润事件

    constructor(address _platform) {
        platform = _platform; // 传递平台的地址
    }

    // receive 函数不允许包含任何逻辑，因为它只是用于接收以太币的占位符函数。如果您需要在接收以太币时执行特定的逻辑操作，请将逻辑放在fallback函数中
    receive() external payable {
        // 当合约接收到以太币时，将调用此函数。
        // 如果需要，您可以在此处添加自定义逻辑。
    }

    // 分配利润的规则
    function profitAssignRule() external {
        // 利润合约的余额
        uint256 totalBalance = address(this).balance;
        platformProfit = (totalBalance * 90) / 100; // 要发给平台利润  （为余额的90%）
        usersProfit = (totalBalance * 10) / 100; // 要分发给用户的利润  （为余额的10%）
    }

    // 增加分润份额
    function addProfitShare(address userAddress) external {
        if (addressToShare[userAddress] >= 1) {
            addressToShare[userAddress] = addressToShare[userAddress] + 1;
        } else {
            addressToShare[userAddress] = 1;
            addresses.push(userAddress); // 将新地址添加到数组中
        }

        // 调用分配利润的规则方法，然后更新状态变量中的总份额
        this.profitAssignRule();
        // 计算所有的份额的总数
        SharesTotal += 1;

        emit ProfitShareAdded(userAddress, 1);
    }

    // 平台提取利润
    function withdrawPlatformProfit() external {
        // 调用分配利润的规则方法
        this.profitAssignRule();
        // require(msg.sender == platform, 'Only platform address can call this function');
        require(platformProfit > 0, 'No platform profit available');

        // 转账给平台地址
        (bool success, ) = platform.call{value: platformProfit}('');
        require(success, 'Platform profit withdrawal failed');

        platformProfit = 0; // 重置平台利润为零

        emit PlatformProfitWithdrawn(platform, platformProfit);
    }

    // 用户提取份额利润
    function withdrawUserProfit(uint256 amount) external {
        // 1、如果没有任何地址具有份额，则直接返回
        if (SharesTotal == 0) {
            return;
        }

        // 调用这个函数的用户必须是有份额的
        require(addressToShare[msg.sender] >= 0, 'user must have a share');

        // 一个份额所占的金额数
        uint256 oneProfitShare = usersProfit / SharesTotal;

        require(amount <= addressToShare[msg.sender] * oneProfitShare, 'Insufficient profit');

        // 重置用户地址的份额（目前无重置份额的需求）
        addressToShare[msg.sender] = addressToShare[msg.sender] - amount / oneProfitShare;

        // 给用户转账
        (bool success, ) = msg.sender.call{value: amount}('');
        require(success, 'User profit withdrawal failed');

        emit UserProfitWithdrawn(msg.sender, amount);
    }
}
