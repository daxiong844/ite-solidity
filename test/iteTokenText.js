// 导入了loadFixture函数和expect断言库，用于辅助编写测试用例
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')
const { expect } = require('chai')

describe('IteToken', function () {
  // 定义部署IteToken合约的辅助函数
  async function deployIteToken() {
    // Contracts are deployed using the first signer/account by default
    const [owner, creator, acceptor, otherAccount] = await ethers.getSigners()

    // 部署WhiteList合约
    const WhiteList = await ethers.getContractFactory('WhiteList')
    const whiteList = await WhiteList.deploy()

    // 部署IteToken合约
    const IteToken = await ethers.getContractFactory('IteToken')
    const iteToken = await IteToken.deploy()

    return { owner, creator, acceptor, otherAccount, iteToken, whiteList }
  }

  describe('设置合同名称和符号', function () {
    it('成功设置合同名称和符号', async function () {
      const { iteToken } = await loadFixture(deployIteToken)

      expect(await iteToken.name()).to.equal('Ite')
      expect(await iteToken.symbol()).to.equal('Ite')
    })
  })

  describe('设置Whitelist合约的实例', function () {
    it('成功设置Whitelist合约的实例', async function () {
      const { whiteList, iteToken } = await loadFixture(deployIteToken)

      await iteToken.setWhitelistContract(whiteList.address)
      expect(await iteToken.whiteListContract()).to.equal(whiteList.address)
    })
  })

  describe('发放代币', function () {
    it('成功发放代币', async function () {
      const { whiteList, iteToken, creator } = await loadFixture(deployIteToken)

      // 获得一下whiteList合约的实例
      await iteToken.setWhitelistContract(whiteList.address)
      // 将creator添加到白名单中
      await whiteList.addAllowedContract(creator.address)
      // 只允许特定的用户才可以调用 发放代币 的方法
      await iteToken.connect(creator).sendTokens(creator.address)

      expect(await iteToken.balanceOf(creator.address)).to.equal(10000)
    })
    it('非白名单的地址不可以调用发放代币方法', async function () {
      const { whiteList, iteToken, owner, creator } = await loadFixture(deployIteToken)

      // 获得一下whiteList合约的实例
      await iteToken.setWhitelistContract(whiteList.address)

      // await expect(iteToken.sendTokens(owner.address)).to.be.revertedWith('Address is not whitelisted')
      await expect(iteToken.sendTokens(creator.address)).to.be.revertedWith('Address is not whitelisted')
    })
  })

  describe('减少币的产量', function () {
    it('成功减少币的产量', async function () {
      const { whiteList, iteToken, creator } = await loadFixture(deployIteToken)

      // 获得一下whiteList合约的实例
      await iteToken.setWhitelistContract(whiteList.address)
      // 将creator添加到白名单中
      await whiteList.addAllowedContract(creator.address)
      // 只允许特定的用户才可以调用 发放代币 的方法
      await iteToken.connect(creator).sendTokens(creator.address)

      await iteToken.connect(creator).burnIteToken()

      expect(await iteToken.ammount()).to.equal(9900)
    })
  })
})
