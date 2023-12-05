// 导入了loadFixture函数和expect断言库，用于辅助编写测试用例
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')
const { expect } = require('chai')

// 使用describe函数定义一个测试用例的描述块，描述块中包含了要测试的合约名称（MarginDeposit）和相关的测试用例
describe('DemandList', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.

  // 定义部署MarginDeposit合约的辅助函数
  async function deployDemandList() {
    // Contracts are deployed using the first signer/account by default
    const [owner, creator, acceptor, otherAccount] = await ethers.getSigners()

    // 部署WhiteList合约
    const WhiteList = await ethers.getContractFactory('WhiteList')
    const whiteList = await WhiteList.deploy()

    // 部署IteToken合约
    const IteToken = await ethers.getContractFactory('IteToken')
    const iteToken = await IteToken.deploy()

    // 部署DemandList合约
    const DemandList = await ethers.getContractFactory('DemandList')
    const demandList = await DemandList.deploy(iteToken.address)

    return { demandList, owner, otherAccount, whiteList, iteToken, creator, acceptor }
  }

  describe('创建需求单', function () {
    it('成功创建需求单', async function () {
      const { whiteList, iteToken, creator, demandList } = await loadFixture(deployDemandList)

      // 获得一下whiteList合约的实例
      await iteToken.setWhitelistContract(whiteList.address)
      // 将creator添加到白名单中
      await whiteList.addAllowedContract(demandList.address)

      const demandId = 'aaa'
      const creatorDeposit = ethers.utils.parseEther('1')

      // 创建需求单
      await demandList.connect(creator).addDemand(demandId, creatorDeposit)

      // 验证需求单的创建者和保证金数是否正确
      const demand = await demandList.demands(demandId)
      expect(demand.creator).to.equal(creator.address)
      expect(demand.deposit).to.equal(creatorDeposit)

      // 验证需求单创建后，甲方是否获得了代币
      const balance = await iteToken.balanceOf(creator.address)
      expect(balance).to.equal(10000)
    })
  })
})
