// SPDX-License-Identifier: MIT

pragma solidity ^0.8.16;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract MarginDeposit {
    mapping(uint256 => uint256) public deposits;

    event Deposit(address user, uint256 requestId, uint256 amount);

    // 存入保证金
    function depositDeposit(uint256 requestId) public payable {
        require(msg.value > 0, 'The margin should be greater than zero');
        deposits[requestId] += msg.value;
        emit Deposit(msg.sender, requestId, msg.value);
    }

    //查询保证金
    function getDeposit(uint256 requestId) public view returns (uint256) {
        return deposits[requestId];
    }
}
