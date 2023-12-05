// 导入了loadFixture函数和expect断言库，用于辅助编写测试用例
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')
const { expect } = require('chai')

describe('WhiteList', function () {
  // 定义部署WhiteList合约的辅助函数
  async function deployWhiteList() {
    // Contracts are deployed using the first signer/account by default
    const [owner, creator, acceptor, otherAccount] = await ethers.getSigners()

    // 部署WhiteList合约
    const WhiteList = await ethers.getContractFactory('WhiteList')
    const whiteList = await WhiteList.deploy()

    return { owner, creator, acceptor, otherAccount, whiteList }
  }

  describe('将地址添加到白名单中', function () {
    it('成功将地址添加到白名单中', async function () {
      const { whiteList, creator } = await loadFixture(deployWhiteList)

      await whiteList.addAllowedContract(creator.address)
      expect(await whiteList.whitelist(creator.address)).to.be.true
    })
    it('只有本合约地址才可以将地址添加到白名单中', async function () {
      const { whiteList, creator } = await loadFixture(deployWhiteList)

      await expect(whiteList.connect(creator).addAllowedContract(creator.address)).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })

  describe('将地址删除到白名单中', function () {
    it('成功将地址删除到白名单中', async function () {
      const { whiteList, creator } = await loadFixture(deployWhiteList)

      await whiteList.addAllowedContract(creator.address)
      await whiteList.removeAddress(creator.address)
      expect(await whiteList.whitelist(creator.address)).to.be.false
    })
    it('只有本合约地址才可以将地址从白名单中删除', async function () {
      const { whiteList, creator } = await loadFixture(deployWhiteList)

      await expect(whiteList.connect(creator).removeAddress(creator.address)).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })

  describe('检查地址是否在白名单中', function () {
    it('成功检查地址是否在白名单中', async function () {
      const { whiteList, creator, otherAccount } = await loadFixture(deployWhiteList)

      await whiteList.addAllowedContract(creator.address)

      expect(await whiteList.whitelist(creator.address)).to.equal(true)
      expect(await whiteList.whitelist(otherAccount.address)).to.equal(false)
    })
  })
})
