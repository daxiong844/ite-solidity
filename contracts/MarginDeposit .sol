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

// 根据上述的存入保证金和查询保证金的合约，帮我创建一个新的合约，要求：
// 1、甲方创建需求单并且可以获得代币，提醒存入的保证金余额是否充足
// 2、乙方接受需求单并且可以获得代币
// 3、删除需求单功能，但必须是创建需求单的一方才可以使用删除需求单的功能

// 帮我创建一个用于双方信任交易的需求单的智能合约，要求实现以下功能：
// 1、创建需求单功能：甲方是创建需求单的一方，甲方创建完需求单之后可以获得平台发放的代币，同时提醒甲方存入保证金(存入保证金要调用已知合约的depositDeposit函数)
// 2、接受需求单功能：乙方是接受需求单的一方，乙方接受完需求单之后也可以获得平台发放的代币，并且乙方也需要存入保证金(存入保证金要调用已知合约的depositDeposit函数)，还要保证乙方存入的保证金是甲方的1.5～2倍
// 3、删除需求单：只有创建需求单的一方（如甲方）才可以删除需求单

// 已知合约：
// pragma solidity ^0.8.16;

// contract MarginDeposit {
//     mapping(uint256 => uint256) public deposits;

//     event Deposit(address user, uint256 requestId, uint256 amount);

//     // 存入保证金
//     function depositDeposit(uint256 requestId) public payable {
//         require(msg.value > 0, 'The margin should be greater than zero');
//         deposits[requestId] += msg.value;
//         emit Deposit(msg.sender, requestId, msg.value);
//     }

//     //查询保证金
//     function getDeposit(uint256 requestId) public view returns (uint256) {
//         return deposits[requestId];
//     }
// }
// 帮我创建一个用于双方信任交易的需求单的智能合约，要求实现以下功能：
// 1、创建需求单功能：甲方是创建需求单的一方，甲方创建完需求单之后获得平台发放的代币，此时甲方可以添加保证金，也可以等到有人(乙方)接受完需求单之后添加保证金
// 2、接受需求单功能：乙方是接受需求单的一方，乙方接受完需求单之后也获得平台发放的代币，同时判断甲方是否已存入保证金，如果没有，则甲方需要添加保证金，如果甲方已存入保证金，则乙方也需要存入保证金(存入保证金要调用已知合约的depositDeposit函数)，并且乙方存入的保证金需要是是甲方保证金的1.5～2倍
// 3、删除需求单：只有创建需求单的一方（甲方）才可以发起删除需求单的功能。当甲方发起删除需求单功能时，先判断此需求单是否已经被接受，如果没有被接受，则需求单可以直接被删除，同时如果甲方添加了保证金，将甲方的保证金退回给甲方；如果需求单已经被接受，则需要征得乙方的同意后才可以删除需求单，否则只能继续交易，乙方同意之后才可以删除需求单，同时将甲乙双方的保证金退回给甲乙双方
