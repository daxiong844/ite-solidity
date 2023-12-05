// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import '@openzeppelin/contracts/access/Ownable.sol';

contract WhiteList is Ownable {
    mapping(address => bool) public whitelist; // 允许调用某些方法的合约地址

    event AddressAdded(address indexed contractAddress); // 添加白名单事件
    event AddressRemoved(address indexed contractAddress); // 删除白名单事件

    // 添加地址到白名单
    function addAllowedContract(address contractAddress) external onlyOwner {
        require(!whitelist[contractAddress], 'Address is whitelisted');
        whitelist[contractAddress] = true;
        emit AddressAdded(contractAddress);
    }

    // 从白名单中移除地址
    function removeAddress(address contractAddress) external onlyOwner {
        require(whitelist[contractAddress], 'Address is not whitelisted');
        whitelist[contractAddress] = false;
        emit AddressRemoved(contractAddress);
    }

    // 检查地址是否在白名单中
    function isWhitelist(address contractAddress) public view returns (bool) {
        return whitelist[contractAddress];
    }
}
