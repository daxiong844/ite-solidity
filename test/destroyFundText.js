const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')
const { expect } = require('chai')

describe('DestroyFund', function () {
  // 定义部署DestroyFund合约的辅助函数
  async function deployDestroyFund() {
    const [owner, creator, acceptor, otherAccount] = await ethers.getSigners()

    // 部署DestroyFund合约
    const DestroyFund = await ethers.getContractFactory('DestroyFund')
    const destroyFund = await DestroyFund.deploy()

    return { creator, acceptor, otherAccount, destroyFund, owner }
  }

  describe('分配摧毁资金', function () {
    it('成功分配摧毁资金', async function () {
      const { destroyFund, otherAccount } = await loadFixture(deployDestroyFund)

      // 发送一些以太币给合约
      const amountToSend = ethers.utils.parseEther('1')
      await otherAccount.sendTransaction({
        to: destroyFund.address,
        value: amountToSend
      })

      // 调用合约的 FundAssignRule 函数
      await destroyFund.FundAssignRule()

      // 检查平台利润和用户利润是否正确分配
      const userDestroyProfit = await destroyFund.userDestroyProfit()
      expect(userDestroyProfit).to.equal(amountToSend.div(100).mul(80))
    })
  })

  describe('增加摧毁分润份额', function () {
    it('已有用户成功增加摧毁分润份额', async function () {
      const { destroyFund, creator } = await loadFixture(deployDestroyFund)

      // 调用增加分润份额方法并检查结果
      const initialShare = await destroyFund.addressToDestroyShare(creator.address)
      await destroyFund.addDestroyShare(creator.address)
      const newShare = await destroyFund.addressToDestroyShare(creator.address)
      expect(newShare).to.equal(initialShare + 1)
    })
    it('新用户成功增加摧毁分润份额', async function () {
      const { destroyFund, creator, acceptor } = await loadFixture(deployDestroyFund)

      // 调用增加分润份额方法并检查结果
      const initialShare = await destroyFund.addressToDestroyShare(creator.address)
      await destroyFund.addDestroyShare(creator.address)
      const newShare = await destroyFund.addressToDestroyShare(creator.address)
      expect(newShare).to.equal(initialShare + 1)

      // 添加一个新用户并检查增加的分润份额
      await destroyFund.addDestroyShare(acceptor.address)
      const user2Share = await destroyFund.addressToDestroyShare(acceptor.address)
      expect(user2Share).to.equal(1)
    })
  })

  describe('提取用户摧毁资金池收益', function () {
    it('成功提取用户摧毁资金池收益', async function () {
      const { destroyFund, creator, otherAccount, acceptor } = await loadFixture(deployDestroyFund)

      // 增加用户的份额
      await destroyFund.addDestroyShare(creator.address)
      await destroyFund.addDestroyShare(acceptor.address)

      // 发送以太币给合约
      const amountToSend = ethers.utils.parseEther('1')
      await otherAccount.sendTransaction({
        to: destroyFund.address,
        value: amountToSend
      })

      // 调用分配利润规则
      await destroyFund.FundAssignRule()

      // 提取用户利润
      const creatorProfit = ethers.utils.parseEther('0.4')
      await destroyFund.connect(creator).withdrawUserDestroyProfit(creatorProfit)
      await destroyFund.connect(acceptor).withdrawUserDestroyProfit(creatorProfit)

      // 获取用户1和用户2的余额
      const creatorBalance = await ethers.provider.getBalance(creator.address)
      console.log(creatorBalance)
      const acceptorBalance = await ethers.provider.getBalance(acceptor.address)
      console.log(acceptorBalance)

      // expect(creatorBalance).to.equal(amountToSend.div(10).div(2).add(ethers.utils.parseEther('10000')))
    })
  })
})
