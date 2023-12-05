const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')
const { expect } = require('chai')

describe('ProfitContract', function () {
  // 定义部署ProfitContract合约的辅助函数
  async function deployProfitContract() {
    const [owner, creator, acceptor, otherAccount, platform] = await ethers.getSigners()

    // 部署ProfitContract合约
    const ProfitContract = await ethers.getContractFactory('ProfitContract')
    const profitContract = await ProfitContract.deploy(platform.address)

    return { creator, acceptor, otherAccount, profitContract, platform, owner }
  }

  describe('分配利润', function () {
    it('成功分配利润', async function () {
      const { profitContract, otherAccount } = await loadFixture(deployProfitContract)

      // 发送一些以太币给合约
      const amountToSend = ethers.utils.parseEther('1')
      await otherAccount.sendTransaction({
        to: profitContract.address,
        value: amountToSend
      })

      // 调用合约的 profitAssignRule 函数
      await profitContract.profitAssignRule()

      // 检查平台利润和用户利润是否正确分配
      const platformProfit = await profitContract.platformProfit()
      const usersProfit = await profitContract.usersProfit()
      expect(platformProfit).to.equal(amountToSend.mul(90).div(100))
      expect(usersProfit).to.equal(amountToSend.mul(10).div(100))
    })
  })

  describe('增加分润份额', function () {
    it('已有用户成功增加分润份额', async function () {
      const { profitContract, creator } = await loadFixture(deployProfitContract)

      // 调用增加分润份额方法并检查结果
      const initialShare = await profitContract.addressToShare(creator.address)
      await profitContract.addProfitShare(creator.address)
      const newShare = await profitContract.addressToShare(creator.address)
      expect(newShare).to.equal(initialShare + 1)
    })
    it('新用户成功增加分润份额', async function () {
      const { profitContract, creator, acceptor } = await loadFixture(deployProfitContract)

      // 调用增加分润份额方法并检查结果
      const initialShare = await profitContract.addressToShare(creator.address)
      await profitContract.addProfitShare(creator.address)
      const newShare = await profitContract.addressToShare(creator.address)
      expect(newShare).to.equal(initialShare + 1)

      // 添加一个新用户并检查增加的分润份额
      await profitContract.addProfitShare(acceptor.address)
      const user2Share = await profitContract.addressToShare(acceptor.address)
      expect(user2Share).to.equal(1)
    })
  })

  describe('提取平台利润', function () {
    it('平台成功提取利润', async function () {
      const { profitContract, platform, otherAccount, creator } = await loadFixture(deployProfitContract)

      // 发送以太币给合约
      const amountToSend = ethers.utils.parseEther('1')
      await otherAccount.sendTransaction({
        to: profitContract.address,
        value: amountToSend
      })

      // 调用合约的 profitAssignRule 函数
      await profitContract.profitAssignRule()

      // 平台提取利润
      const initialPlatformBalance = await ethers.provider.getBalance(platform.address)
      console.log(initialPlatformBalance)
      await profitContract.connect(creator).withdrawPlatformProfit()
      const newPlatformBalance = await ethers.provider.getBalance(platform.address)
      console.log(newPlatformBalance)

      // 检查平台余额是否正确更新
      const platformProfit = await profitContract.platformProfit()
      expect(platformProfit).to.equal(0)
      expect(newPlatformBalance.sub(initialPlatformBalance)).to.equal(amountToSend.mul(90).div(100))
    })
  })

  describe('提取提取用户利润', function () {
    it('成功提取提取用户利润', async function () {
      const { profitContract, creator, otherAccount, acceptor } = await loadFixture(deployProfitContract)

      // 发送以太币给合约
      const amountToSend = ethers.utils.parseEther('1')
      await otherAccount.sendTransaction({
        to: profitContract.address,
        value: amountToSend
      })

      // 增加用户的份额
      await profitContract.addProfitShare(creator.address)
      await profitContract.addProfitShare(acceptor.address)

      // 提取平台利润
      await profitContract.connect(otherAccount).withdrawPlatformProfit()

      // 提取用户利润
      const creatorProfit = ethers.utils.parseEther('0.05')
      await profitContract.connect(creator).withdrawUserProfit(creatorProfit)
      await profitContract.connect(acceptor).withdrawUserProfit(creatorProfit)

      // 获取用户1和用户2的余额
      const creatorBalance = await ethers.provider.getBalance(creator.address)
      console.log(creatorBalance)
      const acceptorBalance = await ethers.provider.getBalance(acceptor.address)
      console.log(acceptorBalance)

      // expect(creatorBalance).to.equal(amountToSend.div(10).div(2).add(ethers.utils.parseEther('10000')))
    })
  })
})
