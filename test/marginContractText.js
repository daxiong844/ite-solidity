// const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')
// const { expect } = require('chai')

// describe('MarginContract', function () {
//   // 定义部署MarginContract合约的辅助函数
//   async function deployMarginContract() {
//     const [creator, acceptor, otherAccount, platform] = await ethers.getSigners()

//     // USDT合约地址
//     const usdtTokenAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7'

//     // 部署ProfitContract合约
//     const ProfitContract = await ethers.getContractFactory('ProfitContract')
//     const profitContract = await ProfitContract.deploy(platform.address, usdtTokenAddress)

//     // 部署DestroyFund合约
//     const DestroyFund = await ethers.getContractFactory('DestroyFund')
//     const destroyFund = await DestroyFund.deploy(usdtTokenAddress)

//     // 部署WhiteList合约
//     const WhiteList = await ethers.getContractFactory('WhiteList')
//     const whiteList = await WhiteList.deploy()

//     // 部署MarginContract合约，并传入DemandList合约地址作为构造函数参数
//     const MarginContract = await ethers.getContractFactory('MarginContract')
//     const marginContract = await MarginContract.deploy(profitContract.address, destroyFund.address, whiteList.address, usdtTokenAddress)

//     return { creator, acceptor, otherAccount, profitContract, destroyFund, whiteList, marginContract, usdtTokenAddress }
//   }

//   describe('添加保证金', function () {
//     it('成功添加保证金', async function () {
//       const { creator, marginContract, usdtTokenAddress, otherAccount } = await loadFixture(deployMarginContract)

//       // 获取USDT实例
//       const usdtToken = await ethers.getContractAt('IERC20', usdtTokenAddress)
//       // 将 USDT 分配给测试账户 // 创建另一个账户来模拟转账
//       const depositAmount = ethers.utils.parseEther('10')
//       await usdtToken.connect(creator).transfer(otherAccount.address, depositAmount)
//       // 授权账户要转给marginContract合约的金额
//       await usdtToken.connect(otherAccount).approve(marginContract.address, depositAmount)
//       // 添加USDT保证金
//       await marginContract.connect(otherAccount).addDeposit(depositAmount)
//       // 断言
//       const userDeposit = await marginContract.userWithdrawableProfit(otherAccount.address)
//       expect(userWithdrawableProfit).to.be.gte(depositAmount)
//     })
//   })

// describe('锁定与解锁保证金', function () {
//   it('成功锁定与解锁保证金', async function () {
//     const { creator, marginContract, whiteList, otherAccount } = await loadFixture(deployMarginContract)

//     // 将marginContract添加到白名单中
//     await whiteList.addAllowedContract(otherAccount.address)

//     const depositAmount = ethers.utils.parseEther('1')

//     // 添加保证金
//     await marginContract.connect(creator).addDeposit({ value: depositAmount })

//     // 锁定保证金
//     await marginContract.connect(otherAccount).lockDeposit(creator.address, depositAmount)

//     // 验证用户锁定的保证金数是否正确
//     const lockedProfit = await marginContract.userLockProfit(creator.address)
//     expect(lockedProfit).to.equal(depositAmount)

//     // 解锁保证金
//     await marginContract.connect(otherAccount).unlockDeposit(creator.address, depositAmount)

//     // 验证用户锁定的保证金数是否为零
//     const updatedLockedProfit = await marginContract.userLockProfit(creator.address)
//     expect(updatedLockedProfit).to.equal(0)
//   })
// })

// describe('向利润合约转账', function () {
//   it('成功向利润合约转账', async function () {
//     const { creator, marginContract, whiteList, otherAccount, profitContract } = await loadFixture(deployMarginContract)

//     // 将marginContract添加到白名单中
//     await whiteList.addAllowedContract(otherAccount.address)

//     const depositAmount = ethers.utils.parseEther('1')

//     // 添加保证金
//     await marginContract.addDeposit({ value: depositAmount })

//     // 锁定保证金
//     await marginContract.connect(otherAccount).lockDeposit(creator.address, depositAmount)

//     // 调用 transferToProfitContract 方法，将保证金转账给 ProfitContract
//     await marginContract.connect(otherAccount).transferToProfitContract(depositAmount)

//     // 验证 ProfitContract 中的余额是否与转账金额相等
//     const profitContractBalance = await ethers.provider.getBalance(profitContract.address)
//     expect(profitContractBalance).to.equal(depositAmount)
//   })
// })

// describe('向摧毁合约转账', function () {
//   it('成功向摧毁合约转账', async function () {
//     const { creator, marginContract, whiteList, otherAccount, destroyFund } = await loadFixture(deployMarginContract)

//     // 将marginContract添加到白名单中
//     await whiteList.addAllowedContract(otherAccount.address)

//     const depositAmount = ethers.utils.parseEther('1')

//     // 添加保证金
//     await marginContract.addDeposit({ value: depositAmount })

//     // 锁定保证金
//     await marginContract.connect(otherAccount).lockDeposit(creator.address, depositAmount)

//     // 调用 transferToDestroyFund 方法，将保证金转账给 ProfitContract
//     await marginContract.connect(otherAccount).transferToDestroyFund(depositAmount)

//     // 验证 DestroyFund 中的余额是否与转账金额相等
//     const destroyFundBalance = await ethers.provider.getBalance(destroyFund.address)
//     expect(destroyFundBalance).to.equal(depositAmount)
//   })
// })

// describe('更新用户的总保证金数', function () {
//   it('成功更新用户的总保证金数', async function () {
//     const { creator, marginContract, whiteList, otherAccount } = await loadFixture(deployMarginContract)

//     // 将marginContract添加到白名单中
//     await whiteList.addAllowedContract(otherAccount.address)

//     const account = creator.address
//     const amount = 100

//     await marginContract.connect(otherAccount).setUserWithdrawableProfit(account, amount)

//     const userWithdrawableProfit = await marginContract.userWithdrawableProfit(account)
//     expect(userWithdrawableProfit).to.equal(amount)
//   })
// })
// })

const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')
const { expect } = require('chai')

describe('MarginContract', function () {
  // 定义部署MarginContract合约的辅助函数
  async function deployMarginContract() {
    const [creator, acceptor, otherAccount, platform] = await ethers.getSigners()

    // 部署ProfitContract合约
    const ProfitContract = await ethers.getContractFactory('ProfitContract')
    const profitContract = await ProfitContract.deploy(platform.address)

    // 部署DestroyFund合约
    const DestroyFund = await ethers.getContractFactory('DestroyFund')
    const destroyFund = await DestroyFund.deploy()

    // 部署WhiteList合约
    const WhiteList = await ethers.getContractFactory('WhiteList')
    const whiteList = await WhiteList.deploy()

    // 部署MarginContract合约，并传入DemandList合约地址作为构造函数参数
    const MarginContract = await ethers.getContractFactory('MarginContract')
    const marginContract = await MarginContract.deploy(profitContract.address, destroyFund.address, whiteList.address)

    return { creator, acceptor, otherAccount, profitContract, destroyFund, whiteList, marginContract }
  }

  describe('添加与提取保证金', function () {
    it('成功添加与提取保证金', async function () {
      const { creator, marginContract } = await loadFixture(deployMarginContract)

      const depositAmount = ethers.utils.parseEther('1')

      // 添加保证金
      await marginContract.connect(creator).addDeposit({ value: depositAmount })

      // 验证用户可提取出去的保证金数是否正确
      const withdrawableProfit = await marginContract.userWithdrawableProfit(creator.address)
      expect(withdrawableProfit).to.equal(depositAmount)

      // 提取保证金
      await marginContract.connect(creator).withdrawDeposit(depositAmount)

      // 验证用户可提取出去的保证金数是否为零
      const updatedWithdrawableProfit = await marginContract.userWithdrawableProfit(creator.address)
      expect(updatedWithdrawableProfit).to.equal(0)
    })
  })

  describe('锁定与解锁保证金', function () {
    it('成功锁定与解锁保证金', async function () {
      const { creator, marginContract, whiteList, otherAccount } = await loadFixture(deployMarginContract)

      // 将marginContract添加到白名单中
      await whiteList.addAllowedContract(otherAccount.address)

      const depositAmount = ethers.utils.parseEther('1')

      // 添加保证金
      await marginContract.connect(creator).addDeposit({ value: depositAmount })

      // 锁定保证金
      await marginContract.connect(otherAccount).lockDeposit(creator.address, depositAmount)

      // 验证用户锁定的保证金数是否正确
      const lockedProfit = await marginContract.userLockProfit(creator.address)
      expect(lockedProfit).to.equal(depositAmount)

      // 解锁保证金
      await marginContract.connect(otherAccount).unlockDeposit(creator.address, depositAmount)

      // 验证用户锁定的保证金数是否为零
      const updatedLockedProfit = await marginContract.userLockProfit(creator.address)
      expect(updatedLockedProfit).to.equal(0)
    })
  })

  describe('向利润合约转账', function () {
    it('成功向利润合约转账', async function () {
      const { creator, marginContract, whiteList, otherAccount, profitContract } = await loadFixture(deployMarginContract)

      // 将marginContract添加到白名单中
      await whiteList.addAllowedContract(otherAccount.address)

      const depositAmount = ethers.utils.parseEther('1')

      // 添加保证金
      await marginContract.addDeposit({ value: depositAmount })

      // 锁定保证金
      await marginContract.connect(otherAccount).lockDeposit(creator.address, depositAmount)

      // 调用 transferToProfitContract 方法，将保证金转账给 ProfitContract
      await marginContract.connect(otherAccount).transferToProfitContract(depositAmount)

      // 验证 ProfitContract 中的余额是否与转账金额相等
      const profitContractBalance = await ethers.provider.getBalance(profitContract.address)
      expect(profitContractBalance).to.equal(depositAmount)
    })
  })

  describe('向摧毁合约转账', function () {
    it('成功向摧毁合约转账', async function () {
      const { creator, marginContract, whiteList, otherAccount, destroyFund } = await loadFixture(deployMarginContract)

      // 将marginContract添加到白名单中
      await whiteList.addAllowedContract(otherAccount.address)

      const depositAmount = ethers.utils.parseEther('1')

      // 添加保证金
      await marginContract.addDeposit({ value: depositAmount })

      // 锁定保证金
      await marginContract.connect(otherAccount).lockDeposit(creator.address, depositAmount)

      // 调用 transferToDestroyFund 方法，将保证金转账给 ProfitContract
      await marginContract.connect(otherAccount).transferToDestroyFund(depositAmount)

      // 验证 DestroyFund 中的余额是否与转账金额相等
      const destroyFundBalance = await ethers.provider.getBalance(destroyFund.address)
      expect(destroyFundBalance).to.equal(depositAmount)
    })
  })

  describe('更新用户的总保证金数', function () {
    it('成功更新用户的总保证金数', async function () {
      const { creator, marginContract, whiteList, otherAccount } = await loadFixture(deployMarginContract)

      // 将marginContract添加到白名单中
      await whiteList.addAllowedContract(otherAccount.address)

      const account = creator.address
      const amount = 100

      await marginContract.connect(otherAccount).setUserWithdrawableProfit(account, amount)

      const userWithdrawableProfit = await marginContract.userWithdrawableProfit(account)
      expect(userWithdrawableProfit).to.equal(amount)
    })
  })
})
