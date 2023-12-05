// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import './WhiteList.sol';

contract IteToken is ERC20 {
    WhiteList public whiteListContract; // WhiteList合约实例

    uint256 public ammount = 10000; // 每次派发的数量

    event TokensSent(address indexed sender, address indexed recipient, uint256 amount); // 发放代币事件
    event IteTokenBurned(address indexed burner, uint256 newAmount); // 减少代币事件

    constructor() ERC20('Ite', 'Ite') {}

    // 设置Whitelist合约的实例
    // 合约部署后，可以随时调用setWhitelistContract函数来设置whitelistContract的实例
    function setWhitelistContract(address whiteListAddress) external {
        whiteListContract = WhiteList(whiteListAddress);
    }

    // 发放代币
    function sendTokens(address recipient) public returns (bool) {
        require(whiteListContract.whitelist(msg.sender), 'Address is not whitelisted');
        _mint(recipient, ammount);

        emit TokensSent(msg.sender, recipient, ammount);

        return true;
    }

    // 减少IteToken币的产量，减少的数量为 现在IteToken总量的1%
    function burnIteToken() public returns (bool) {
        require(whiteListContract.whitelist(msg.sender), 'Address is not whitelisted');

        if (ammount <= 100) {
            ammount = 100;
        } else {
            ammount = (ammount * 99) / 100;
        }

        emit IteTokenBurned(msg.sender, ammount);

        return true;
    }
}
