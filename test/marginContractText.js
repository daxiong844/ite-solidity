const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')
const { expect } = require('chai')

describe('MarginContract', function () {
  // 定义部署MarginContract合约的辅助函数
  async function deployMarginContract() {
    const [creator, acceptor, otherAccount] = await ethers.getSigners()

    // 部署DemandList合约
    const DemandList = await ethers.getContractFactory('DemandList')
    const demandList = await DemandList.deploy()

    // 部署MarginContract合约，并传入DemandList合约地址作为构造函数参数
    const MarginContract = await ethers.getContractFactory('MarginContract')
    const marginContract = await MarginContract.deploy(demandList.address)

    return { demandList, marginContract, creator, acceptor, otherAccount }
  }

  describe('添加保证金', function () {
    it('创建者成功添加保证金', async function () {
      const { demandList, creator, acceptor, marginContract } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      // 这种方式获取到的需求单ID是不正确的！！！
      // demandCount 是一个公共变量，它返回的是需求单的数量，而不是下一个可用的需求单 ID
      // const demandId = await demandList.demandCount()
      const demandId = 0

      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(demandId)
      const depositAmount = ethers.utils.parseEther('1')

      // .to.emit(marginContract, 'AddDeposit')用于验证一个函数调用是否会触发一个事件，其中marginContract是一个合约实例，用于指定期望的事件是由哪个合约触发的。'AddDeposit'是一个字符串，表示期望的事件名称。
      // .withArgs()用于指定事件的期望参数。它可以在.to.emit()之后链式调用
      await expect(marginContract.connect(creator).addDeposit(demandId, { value: depositAmount }))
        .to.emit(marginContract, 'AddDeposit')
        .withArgs(demandId, creator.address, depositAmount)
    })
    it('接受者成功添加保证金', async function () {
      const { demandList, creator, acceptor, marginContract } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(0)
      const demandId = await demandList.demandCount()
      const depositAmount = ethers.utils.parseEther('1.5')

      await expect(marginContract.connect(acceptor).addDeposit(demandId, { value: depositAmount }))
        .to.emit(marginContract, 'AddDeposit')
        .withArgs(demandId, acceptor.address, depositAmount)
    })
    it('如果保证金已添加,则不可以继续添加', async function () {
      const { demandList, creator, marginContract } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = await demandList.demandCount()
      const depositAmount = ethers.utils.parseEther('1')
      // 创建者添加保证金
      await marginContract.connect(creator).addDeposit(demandId, { value: depositAmount })

      await expect(marginContract.connect(creator).addDeposit(demandId, { value: depositAmount })).to.be.revertedWith('Deposit already added')
    })
    it('如果需求单没有被接受,则不可以添加保证金', async function () {
      const { demandList, creator, marginContract } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      const depositAmount = ethers.utils.parseEther('1')

      await expect(marginContract.connect(creator).addDeposit(demandId, { value: depositAmount })).to.be.revertedWith('Demand not accepted yet')
    })
    it('如果接受者的保证金不符合要求,则不可以添加保证金', async function () {
      const { demandList, creator, acceptor, marginContract } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(0)
      const depositAmount = ethers.utils.parseEther('1')
      // 创建者添加保证金
      await marginContract.connect(creator).addDeposit(demandId, { value: depositAmount })

      await expect(marginContract.connect(acceptor).addDeposit(demandId, { value: depositAmount })).to.be.revertedWith("Deposit amount should be 1.5-2 times the creator's deposit")
    })
  })
})
