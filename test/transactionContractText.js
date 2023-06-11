const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')
const { expect } = require('chai')

describe('TransactionContract', function () {
  // 定义部署TransactionContract合约的辅助函数
  async function deployTransactionContract() {
    const [owner, creator, acceptor, otherAccount] = await ethers.getSigners()

    // 部署DemandList合约
    const DemandList = await ethers.getContractFactory('DemandList')
    const demandList = await DemandList.deploy()

    // 部署MarginContract合约，并传入DemandList合约地址作为构造函数参数
    const MarginContract = await ethers.getContractFactory('MarginContract')
    const marginContract = await MarginContract.deploy(demandList.address)

    // 部署TransactionContract合约，并传入MarginContract合约地址作为构造函数参数
    const TransactionContract = await ethers.getContractFactory('TransactionContract')
    const transactionContract = await TransactionContract.deploy(marginContract.address)

    return { demandList, marginContract, transactionContract, creator, acceptor, otherAccount, owner }
  }

  describe('创建交易单', function () {
    it('成功创建一个新的交易单', async function () {
      const { demandList, marginContract, transactionContract, creator, acceptor } = await loadFixture(deployTransactionContract)

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

      // 创建一个交易单的操作
      await transactionContract.connect(creator).createTransaction(demandId)
      // 根据需求单ID从交易单映射中选出对应的交易单结构体
      const transaction = await transactionContract.transactions(demandId)

      // 验证交易单是否正确创建
      expect(transaction.demandId).to.equal(demandId)
      expect(transaction.isCancelled).to.be.false
      expect(transaction.isDestroyed).to.be.false
      expect(transaction.isCreatorFulfilled).to.be.false
      expect(transaction.isAcceptorFulfilled).to.be.false
      expect(transaction.creatorShares).to.eq(ethers.BigNumber.from(1))
      expect(transaction.acceptorShares).to.eq(ethers.BigNumber.from(1))
    })
    it('创建交易单必须锁定保证金', async function () {
      const { demandList, marginContract, transactionContract, creator, acceptor } = await loadFixture(deployTransactionContract)

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

      // 尝试创建交易单并验证是否回滚
      await expect(transactionContract.connect(creator).createTransaction(demandId)).to.be.revertedWith('Must deposit margin to create a trading order')
    })
  })

  describe('履行交易单', function () {
    it('创建者成功履行交易单', async function () {
      const { demandList, marginContract, transactionContract, creator, acceptor } = await loadFixture(deployTransactionContract)

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

      // 创建一个交易单的操作
      await transactionContract.connect(creator).createTransaction(demandId)

      // 调用 fulfillTransaction 函数并验证创建者是否已满足条件
      await transactionContract.connect(creator).fulfillTransaction(demandId)
      const transaction = await transactionContract.transactions(demandId)
      expect(transaction.isCreatorFulfilled).to.be.true
    })
    it('接受者成功履行交易单', async function () {
      const { demandList, marginContract, transactionContract, creator, acceptor } = await loadFixture(deployTransactionContract)

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

      // 创建一个交易单的操作
      await transactionContract.connect(creator).createTransaction(demandId)

      // 调用 fulfillTransaction 函数并验证接受者是否已满足条件
      await transactionContract.connect(acceptor).fulfillTransaction(demandId)
      const transaction = await transactionContract.transactions(demandId)
      expect(transaction.isAcceptorFulfilled).to.be.true
    })
    it('只有需求单的创建者或者接受者才可以调用履行交易单的方法', async function () {
      const { demandList, marginContract, transactionContract, creator, acceptor, otherAccount } = await loadFixture(deployTransactionContract)

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

      // 创建一个交易单的操作
      await transactionContract.connect(creator).createTransaction(demandId)

      await expect(transactionContract.connect(otherAccount).fulfillTransaction(demandId)).to.be.revertedWith('Only the creator or acceptor can fulfill the transaction')
    })
    it('完成交易单', async function () {
      const { demandList, marginContract, transactionContract, creator, acceptor, otherAccount } = await loadFixture(deployTransactionContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(demandId)
      const creatorDepositAmount = 100
      const acceptorDepositAmount = 200
      // 添加保证金
      await marginContract.connect(creator).addDeposit(demandId, { value: creatorDepositAmount })
      await marginContract.connect(acceptor).addDeposit(demandId, { value: acceptorDepositAmount })
      // // 保存退还前的账户余额
      // const creatorBalanceBefore = await ethers.provider.getBalance(creator.address)
      // const acceptorBalanceBefore = await ethers.provider.getBalance(acceptor.address)
      // console.log(creatorBalanceBefore)
      // console.log(acceptorBalanceBefore)
      // 锁定保证金
      await marginContract.connect(creator).lockDeposit(demandId)
      // 创建一个交易单的操作
      await transactionContract.connect(creator).createTransaction(demandId)

      // 先让创建者和接受者分别履约
      await transactionContract.connect(creator).fulfillTransaction(demandId)
      await transactionContract.connect(acceptor).fulfillTransaction(demandId)

      // // 保存退还后的账户余额
      // const creatorBalanceAfter = await ethers.provider.getBalance(creator.address)
      // const acceptorBalanceAfter = await ethers.provider.getBalance(acceptor.address)
      // console.log(creatorBalanceAfter)
      // console.log(acceptorBalanceAfter)
      // // 对比退还之后的账户余额肯定比退还前的高
      // expect(creatorBalanceBefore).to.lt(creatorBalanceAfter)
      // expect(acceptorBalanceBefore).to.lt(acceptorBalanceAfter)

      // 检查甲乙双方的保证金是否正确退还（已经退还的话保证金就会归零）
      const creatorBalance = await marginContract.margins(demandId).then(result => result.depositCreator)
      const acceptorBalance = await marginContract.margins(demandId).then(result => result.depositAcceptor)
      expect(creatorBalance).to.equal(0)
      expect(acceptorBalance).to.equal(0)

      // 检查平台利润是否正确更新
      const platformProfit = await transactionContract.platformProfit()
      expect(platformProfit).to.equal(3)

      // 根据需求单ID从交易单映射中选出对应的交易单结构体 验证交易单是否已完成
      const transaction = await transactionContract.transactions(demandId)
      expect(transaction.isFulfill).to.be.true
    })
  })

  describe('取消交易单', function () {
    it('创建者取消交易单', async function () {
      const { demandList, marginContract, transactionContract, creator, acceptor } = await loadFixture(deployTransactionContract)

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

      // 创建一个交易单的操作
      await transactionContract.connect(creator).createTransaction(demandId)

      // 调用cancelTransaction函数并验证创建者是否已满足条件
      await transactionContract.connect(creator).cancelTransaction(demandId)
      const transaction = await transactionContract.transactions(demandId)
      expect(transaction.isCreatorCancelled).to.be.true
    })
    it('接受者取消交易单', async function () {
      const { demandList, marginContract, transactionContract, creator, acceptor } = await loadFixture(deployTransactionContract)

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

      // 创建一个交易单的操作
      await transactionContract.connect(creator).createTransaction(demandId)

      // 调用cancelTransaction函数并验证接受者是否已满足条件
      await transactionContract.connect(acceptor).cancelTransaction(demandId)
      const transaction = await transactionContract.transactions(demandId)
      expect(transaction.isAcceptorCancelled).to.be.true
    })
    it('只有需求单的创建者或者接受者才可以调用取消交易单的方法', async function () {
      const { demandList, marginContract, transactionContract, creator, acceptor, otherAccount } = await loadFixture(deployTransactionContract)

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

      // 创建一个交易单的操作
      await transactionContract.connect(creator).createTransaction(demandId)

      await expect(transactionContract.connect(otherAccount).cancelTransaction(demandId)).to.be.revertedWith('Only the creator or acceptor can cancel the transaction')
    })
    it('成功取消交易单', async function () {
      const { demandList, marginContract, transactionContract, creator, acceptor, otherAccount } = await loadFixture(deployTransactionContract)

      // 创建需求单
      await demandList.connect(creator).createDemand()
      const demandId = 0
      // 接受需求单
      await demandList.connect(acceptor).acceptDemand(demandId)
      const creatorDepositAmount = 100
      const acceptorDepositAmount = 200
      // 添加保证金
      await marginContract.connect(creator).addDeposit(demandId, { value: creatorDepositAmount })
      await marginContract.connect(acceptor).addDeposit(demandId, { value: acceptorDepositAmount })

      // 锁定保证金
      await marginContract.connect(creator).lockDeposit(demandId)
      // 创建一个交易单的操作
      await transactionContract.connect(creator).createTransaction(demandId)

      // 先让创建者和接受者分别取消交易
      await transactionContract.connect(creator).cancelTransaction(demandId)
      await transactionContract.connect(acceptor).cancelTransaction(demandId)

      // 检查甲乙双方的保证金是否正确退还（已经退还的话保证金就会归零）
      const creatorBalance = await marginContract.margins(demandId).then(result => result.depositCreator)
      const acceptorBalance = await marginContract.margins(demandId).then(result => result.depositAcceptor)
      expect(creatorBalance).to.equal(0)
      expect(acceptorBalance).to.equal(0)

      // 检查平台利润是否正确更新
      const platformProfit = await transactionContract.platformProfit()
      expect(platformProfit).to.equal(0)

      // 根据需求单ID从交易单映射中选出对应的交易单结构体 验证交易单是否已完成
      const transaction = await transactionContract.transactions(demandId)
      expect(transaction.isCancelled).to.be.true
    })
  })

  describe('摧毁交易单', function () {
    it('需求单的创建者摧毁交易单', async function () {
      const { demandList, marginContract, transactionContract, creator, acceptor } = await loadFixture(deployTransactionContract)

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

      // 创建一个交易单的操作
      await transactionContract.connect(creator).createTransaction(demandId)

      // 调用 destroyTransaction 函数并验证交易单是否已销毁
      await transactionContract.connect(creator).destroyTransaction(demandId)
      const transaction = await transactionContract.transactions(demandId)
      expect(transaction.isDestroyed).to.be.true
    })
    it('需求单的接受者摧毁交易单', async function () {
      const { demandList, marginContract, transactionContract, creator, acceptor } = await loadFixture(deployTransactionContract)

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

      // 创建一个交易单的操作
      await transactionContract.connect(creator).createTransaction(demandId)

      // 调用 destroyTransaction 函数并验证交易单是否已销毁
      await transactionContract.connect(acceptor).destroyTransaction(demandId)
      const transaction = await transactionContract.transactions(demandId)
      expect(transaction.isDestroyed).to.be.true
    })
    it('非需求单的创建者和接受者不可以摧毁交易单', async function () {
      const { demandList, marginContract, transactionContract, creator, acceptor, otherAccount } = await loadFixture(deployTransactionContract)

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

      // 创建一个交易单的操作
      await transactionContract.connect(creator).createTransaction(demandId)

      // 尝试以非创建者和非接受者的身份调用 destroyTransaction 函数并验证是否回滚
      await expect(transactionContract.connect(otherAccount).destroyTransaction(demandId)).to.be.revertedWith('Only creator or acceptor can destroy the transaction')
    })
  })
})
