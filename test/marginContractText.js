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

  describe('提取保证金', function () {
    it('创建者成功提取保证金', async function () {
      const { demandList, creator, acceptor, marginContract } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(demandId)
      const depositAmount = await ethers.utils.parseEther('1')
      // 添加保证金
      await marginContract.connect(creator).addDeposit(demandId, { value: depositAmount })
      // 提取保证金
      await marginContract.connect(creator).withdrawDeposit(demandId)

      await expect(marginContract.connect(creator).withdrawDeposit(demandId)).to.be.revertedWith('Deposit not added')
      // 检查创建者的保证金是否正确退还（已经退还的话保证金就会归零）
      const creatorBalance = await marginContract.margins(demandId).then(result => result.depositCreator)
      expect(creatorBalance).to.equal(0)
    })
    it('接受者成功提取保证金', async function () {
      const { demandList, creator, acceptor, marginContract } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(demandId)
      const creatorDepositAmount = ethers.utils.parseEther('1')
      const acceptorDepositAmount = ethers.utils.parseEther('1.5')
      // 添加保证金
      await marginContract.connect(creator).addDeposit(demandId, { value: creatorDepositAmount })
      await marginContract.connect(acceptor).addDeposit(demandId, { value: acceptorDepositAmount })
      // 提取保证金
      await marginContract.connect(acceptor).withdrawDeposit(demandId)

      await expect(marginContract.connect(acceptor).withdrawDeposit(demandId)).to.be.revertedWith('Deposit not added')
      // 检查接受者的保证金是否正确退还（已经退还的话保证金就会归零）
      const acceptorBalance = await marginContract.margins(demandId).then(result => result.depositAcceptor)
      expect(acceptorBalance).to.equal(0)
    })
    it('既不是本需求单的创建者,也不是接受者的用户不可以提取保证金', async function () {
      const { demandList, creator, acceptor, marginContract, otherAccount } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(demandId)
      const depositAmount = ethers.utils.parseEther('1')
      // 添加保证金
      await marginContract.connect(creator).addDeposit(demandId, { value: depositAmount })

      await expect(marginContract.connect(otherAccount).withdrawDeposit(demandId)).to.be.revertedWith('You do not meet the requirements')
    })
    it('如果没有保证金,则不可以提取', async function () {
      const { demandList, creator, acceptor, marginContract } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(demandId)

      await expect(marginContract.connect(creator).withdrawDeposit(demandId)).to.be.revertedWith('Deposit not added')
    })
  })

  describe('锁定保证金', function () {
    it('成功锁定保证金', async function () {
      const { demandList, creator, acceptor, marginContract } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(demandId)
      const creatorDepositAmount = ethers.utils.parseEther('1')
      const acceptorDepositAmount = ethers.utils.parseEther('1.5')
      // 添加保证金
      await marginContract.connect(creator).addDeposit(demandId, { value: creatorDepositAmount })
      await marginContract.connect(acceptor).addDeposit(demandId, { value: acceptorDepositAmount })
      // 锁定保证金
      await marginContract.connect(creator).lockDeposit(demandId)

      const margin = await marginContract.margins(demandId)
      expect(margin.isDepositLocked).to.be.true
    })
    it('如果没有添加保证金,则不可以锁定', async function () {
      const { demandList, creator, acceptor, marginContract } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(demandId)

      await expect(marginContract.connect(creator).lockDeposit(demandId)).to.be.revertedWith('Deposit not added')
    })
    it('如果保证金已经锁定,则不可以再次锁定', async function () {
      const { demandList, creator, acceptor, marginContract } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(demandId)
      const creatorDepositAmount = ethers.utils.parseEther('1')
      const acceptorDepositAmount = ethers.utils.parseEther('1.5')
      // 添加保证金
      await marginContract.connect(creator).addDeposit(demandId, { value: creatorDepositAmount })
      await marginContract.connect(acceptor).addDeposit(demandId, { value: acceptorDepositAmount })
      // 锁定保证金
      await marginContract.connect(creator).lockDeposit(demandId)

      await expect(marginContract.connect(creator).lockDeposit(demandId)).to.be.revertedWith('Deposit is already locked')
    })
    it('如果接受者没有添加保证金,则不可以锁定', async function () {
      const { demandList, creator, acceptor, marginContract } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(demandId)
      const creatorDepositAmount = ethers.utils.parseEther('1')
      // 添加保证金
      await marginContract.connect(creator).addDeposit(demandId, { value: creatorDepositAmount })

      await expect(marginContract.connect(creator).lockDeposit(demandId)).to.be.revertedWith('The acceptor has not yet added the deposit.')
    })
    it('既不是本需求单的创建者，也不是接受者的用户不可以锁定保证金', async function () {
      const { demandList, creator, acceptor, marginContract, otherAccount } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(demandId)
      const creatorDepositAmount = ethers.utils.parseEther('1')
      const acceptorDepositAmount = ethers.utils.parseEther('1.5')
      // 添加保证金
      await marginContract.connect(creator).addDeposit(demandId, { value: creatorDepositAmount })
      await marginContract.connect(acceptor).addDeposit(demandId, { value: acceptorDepositAmount })

      await expect(marginContract.connect(otherAccount).lockDeposit(demandId)).to.be.revertedWith('Only the creator or acceptor of the demand order can lock the margin for this demand order')
    })
  })

  describe('解锁保证金', function () {
    it('成功解锁保证金', async function () {
      const { demandList, creator, acceptor, marginContract } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(demandId)
      const creatorDepositAmount = ethers.utils.parseEther('1')
      const acceptorDepositAmount = ethers.utils.parseEther('1.5')
      // 添加保证金
      await marginContract.connect(creator).addDeposit(demandId, { value: creatorDepositAmount })
      await marginContract.connect(acceptor).addDeposit(demandId, { value: acceptorDepositAmount })
      // 锁定保证金
      await marginContract.connect(creator).lockDeposit(demandId)
      // 解锁保证金
      await marginContract.connect(creator).unlockDeposit(demandId)

      const margin = await marginContract.margins(demandId)
      expect(margin.isDepositLocked).to.be.false
    })

    it('如果没有添加保证金,则不可以解锁', async function () {
      const { demandList, creator, acceptor, marginContract } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(demandId)

      await expect(marginContract.connect(creator).unlockDeposit(demandId)).to.be.revertedWith('Deposit not added')
    })

    it('如果保证金没有锁定,则不可以解锁', async function () {
      const { demandList, creator, acceptor, marginContract } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(demandId)
      const creatorDepositAmount = ethers.utils.parseEther('1')
      const acceptorDepositAmount = ethers.utils.parseEther('1.5')
      // 添加保证金
      await marginContract.connect(creator).addDeposit(demandId, { value: creatorDepositAmount })
      await marginContract.connect(acceptor).addDeposit(demandId, { value: acceptorDepositAmount })

      await expect(marginContract.connect(creator).unlockDeposit(demandId)).to.be.revertedWith('Deposit is not locked')
    })

    it('既不是本需求单的创建者，也不是接受者的用户不可以解锁保证金', async function () {
      const { demandList, creator, acceptor, marginContract, otherAccount } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(demandId)
      const creatorDepositAmount = ethers.utils.parseEther('1')
      const acceptorDepositAmount = ethers.utils.parseEther('1.5')
      // 添加保证金
      await marginContract.connect(creator).addDeposit(demandId, { value: creatorDepositAmount })
      await marginContract.connect(acceptor).addDeposit(demandId, { value: acceptorDepositAmount })
      // 锁定保证金
      await marginContract.connect(creator).lockDeposit(demandId)

      await expect(marginContract.connect(otherAccount).unlockDeposit(demandId)).to.be.revertedWith('Only the creator or acceptor of the demand order can unlock the margin for this demand order')
    })
  })

  describe('退还保证金', function () {
    it('成功退还保证金(履行交易时)', async function () {
      const { demandList, marginContract, creator, acceptor } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(demandId)
      const creatorDepositAmount = ethers.utils.parseEther('1')
      const acceptorDepositAmount = ethers.utils.parseEther('2')
      // 添加保证金
      await marginContract.connect(creator).addDeposit(demandId, { value: creatorDepositAmount })
      await marginContract.connect(acceptor).addDeposit(demandId, { value: acceptorDepositAmount })

      // 查询退还前的账户余额
      const creatorBalanceBefore = await ethers.provider.getBalance(creator.address)
      const acceptorBalanceBefore = await ethers.provider.getBalance(acceptor.address)
      // console.log(creatorBalanceBefore)
      // console.log(acceptorBalanceBefore)

      // 退还保证金
      const platformFee = ethers.utils.parseEther('0.1')
      await marginContract.connect(creator).refund(0, platformFee)

      // 查询退还后的账户余额
      const creatorBalanceAfter = await ethers.provider.getBalance(creator.address)
      const acceptorBalanceAfter = await ethers.provider.getBalance(acceptor.address)
      // console.log(creatorBalanceAfter)
      // console.log(acceptorBalanceAfter)

      // 对比退还之后的账户余额肯定比退还前的高
      expect(creatorBalanceBefore).to.be.lessThanOrEqual(creatorBalanceAfter)
      expect(acceptorBalanceBefore).to.be.lessThanOrEqual(acceptorBalanceAfter)

      // 查询下接受者的保证金剩余多少
      const acceptorBalance = await marginContract.margins(demandId).then(result => result.depositAcceptor)
      expect(acceptorBalance).to.equal(0)

      // 注：
      // 通过使用 .then() 方法，你可以访问返回对象中的 depositAcceptor 属性，并将其赋值给相应的变量
      // 如果 margins(demandId) 返回的是一个异步函数或 Promise 对象，你需要确保在使用 .then() 方法之前使用 await 关键字来等待其完成
      // const acceptorBalanceInit = await marginContract.margins(demandId).then(result => result.depositAcceptor)
      // console.log(acceptorBalanceInit)
    })
    it('成功退还保证金(取消交易时)', async function () {
      const { demandList, marginContract, creator, acceptor } = await loadFixture(deployMarginContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(demandId)
      const creatorDepositAmount = ethers.utils.parseEther('1')
      const acceptorDepositAmount = ethers.utils.parseEther('2')
      // 添加保证金
      await marginContract.connect(creator).addDeposit(demandId, { value: creatorDepositAmount })
      await marginContract.connect(acceptor).addDeposit(demandId, { value: acceptorDepositAmount })

      // 查询退还前的账户余额
      const creatorBalanceBefore = await ethers.provider.getBalance(creator.address)
      const acceptorBalanceBefore = await ethers.provider.getBalance(acceptor.address)
      // console.log(creatorBalanceBefore)
      // console.log(acceptorBalanceBefore)

      // 退还保证金
      const platformFee = 0
      await marginContract.connect(creator).refund(0, platformFee)

      // 查询退还后的账户余额
      const creatorBalanceAfter = await ethers.provider.getBalance(creator.address)
      const acceptorBalanceAfter = await ethers.provider.getBalance(acceptor.address)
      // console.log(creatorBalanceAfter)
      // console.log(acceptorBalanceAfter)

      // 对比退还之后的账户余额肯定比退还前的高
      expect(creatorBalanceBefore).to.be.lessThanOrEqual(creatorBalanceAfter)
      expect(acceptorBalanceBefore).to.be.lessThanOrEqual(acceptorBalanceAfter)

      // 查询下接受者的保证金剩余多少
      const acceptorBalance = await marginContract.margins(demandId).then(result => result.depositAcceptor)
      expect(acceptorBalance).to.equal(0)
    })
  })
})
