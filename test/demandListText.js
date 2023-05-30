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
    const [owner, otherAccount] = await ethers.getSigners()

    const Deposit = await ethers.getContractFactory('DemandList')
    const deposit = await Deposit.deploy()

    return { deposit, owner, otherAccount }
  }

  describe('创建需求单', function () {
    it('成功创建需求单', async function () {
      const { deposit, otherAccount } = await loadFixture(deployDemandList)
      await deposit.connect(otherAccount).createDemand()

      expect(await deposit.tokenBalances(otherAccount.address)).to.equal(1)
      expect(await deposit.demandCount()).to.equal(1)

      const demand = await deposit.demands(0)
      expect(demand.creator).to.equal(otherAccount.address)
      expect(demand.acceptor).to.equal(ethers.constants.AddressZero)
      expect(demand.isAccepted).to.be.false
      expect(demand.isDeleted).to.be.false
    })
  })

  describe('接受需求单', function () {
    it('成功接受需求单', async function () {
      const { deposit, otherAccount } = await loadFixture(deployDemandList)

      await deposit.createDemand()
      await deposit.connect(otherAccount).acceptDemand(0)

      expect(await deposit.tokenBalances(otherAccount.address)).to.equal(1)

      const demand = await deposit.demands(0)
      expect(demand.acceptor).to.equal(otherAccount.address)
      expect(demand.isAccepted).to.be.true
    })

    it('不应接受已删除的需求单', async function () {
      const { deposit, owner, otherAccount } = await loadFixture(deployDemandList)

      await deposit.createDemand()
      await deposit.connect(owner).deleteDemand(0)

      await expect(deposit.connect(otherAccount).acceptDemand(0)).to.be.revertedWith('Requirement is deleted')
    })

    it('不应重复接受需求单', async function () {
      const { deposit, otherAccount } = await loadFixture(deployDemandList)

      await deposit.createDemand()
      await deposit.connect(otherAccount).acceptDemand(0)

      await expect(deposit.connect(otherAccount).acceptDemand(0)).to.be.revertedWith('Requirement is already accepted')
    })
  })

  describe('删除需求单', function () {
    it('成功删除需求单', async function () {
      const { deposit, owner } = await loadFixture(deployDemandList)

      await deposit.createDemand()
      await deposit.connect(owner).deleteDemand(0)

      const demand = await deposit.demands(0)
      expect(demand.isDeleted).to.be.true
    })

    it('只能由创建者删除需求单', async function () {
      const { deposit, owner, otherAccount } = await loadFixture(deployDemandList)

      await deposit.connect(otherAccount).createDemand()

      await expect(deposit.connect(owner).deleteDemand(0)).to.be.revertedWith('Only the creator can delete the requirement')
    })
  })
})
