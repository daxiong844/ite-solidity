const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')
const { expect } = require('chai')

describe('TransactionContractV2', function () {
  // 定义部署TransactionContract合约的辅助函数
  async function deployTransactionContractV2() {
    const [owner, creator, acceptor, otherAccount, platform] = await ethers.getSigners()

    // 部署WhiteList合约
    const WhiteList = await ethers.getContractFactory('WhiteList')
    const whiteList = await WhiteList.deploy()

    // 部署IteToken合约
    const IteToken = await ethers.getContractFactory('IteToken')
    const iteToken = await IteToken.deploy()

    // 部署DemandList合约
    const DemandList = await ethers.getContractFactory('DemandList')
    const demandList = await DemandList.deploy(iteToken.address)

    // 部署ProfitContract合约
    const ProfitContract = await ethers.getContractFactory('ProfitContract')
    const profitContract = await ProfitContract.deploy(platform.address)

    // 部署DestroyFund合约
    const DestroyFund = await ethers.getContractFactory('DestroyFund')
    const destroyFund = await DestroyFund.deploy()

    // 部署MarginContract合约，并传入DemandList合约地址作为构造函数参数
    const MarginContract = await ethers.getContractFactory('MarginContract')
    const marginContract = await MarginContract.deploy(profitContract.address, destroyFund.address, whiteList.address)

    // 部署TransactionContract合约，并传入合约地址作为构造函数参数
    const TransactionContractV2 = await ethers.getContractFactory('TransactionContractV2')
    const transactionContractV2 = await TransactionContractV2.deploy()

    // 初始化交易单合约所需的状态
    await transactionContractV2.initialize(demandList.address, marginContract.address, iteToken.address, profitContract.address, destroyFund.address)

    return { owner, creator, acceptor, otherAccount, platform, whiteList, iteToken, demandList, profitContract, destroyFund, marginContract, transactionContractV2 }
  }

  describe('创建交易单', function () {
    it('成功创建一个新的交易单', async function () {
      const { demandList, transactionContractV2, creator, acceptor, iteToken, whiteList, marginContract } = await loadFixture(deployTransactionContractV2)

      // 获得一下whiteList合约的实例
      await iteToken.setWhitelistContract(whiteList.address)
      // 将demandList、transactionContract添加到白名单中
      await whiteList.addAllowedContract(demandList.address)
      await whiteList.addAllowedContract(transactionContractV2.address)

      // 创建需求单
      const demandId = 'aaa'
      const deposit = 100
      await demandList.connect(creator).addDemand(demandId, deposit)
      // 甲、乙双方添加保证金
      await marginContract.connect(creator).addDeposit({ value: deposit })
      await marginContract.connect(acceptor).addDeposit({ value: (deposit * 15) / 10 })

      // 创建交易单(接受需求单)
      await transactionContractV2.connect(acceptor).createTransaction(demandId)

      const transaction = await transactionContractV2.transactions(demandId)
      expect(transaction.acceptor).to.equal(acceptor.address)
      expect(transaction.creatorLockDeposit).to.equal(deposit)
      expect(transaction.acceptorLockDeposit).to.equal((deposit * 15) / 10)
      expect(transaction.isCreatorFulfilled).to.be.false
      expect(transaction.isAcceptorFulfilled).to.be.false
      expect(transaction.status).to.equal(0)
    })
  })

  describe('履行交易单', function () {
    it('成功履行交易单', async function () {
      const { demandList, transactionContractV2, creator, acceptor, iteToken, whiteList, marginContract } = await loadFixture(deployTransactionContractV2)

      // 获得一下whiteList合约的实例
      await iteToken.setWhitelistContract(whiteList.address)
      // 将demandList、transactionContract添加到白名单中
      await whiteList.addAllowedContract(demandList.address)
      await whiteList.addAllowedContract(transactionContractV2.address)

      // 创建需求单
      const demandId = 'aaa'
      const deposit = 100
      await demandList.connect(creator).addDemand(demandId, deposit)
      // 甲、乙双方添加保证金
      await marginContract.connect(creator).addDeposit({ value: deposit })
      await marginContract.connect(acceptor).addDeposit({ value: (deposit * 15) / 10 })

      // 创建交易单(接受需求单)
      await transactionContractV2.connect(acceptor).createTransaction(demandId)

      await transactionContractV2.connect(acceptor).fulfillTransaction(demandId)
      const transaction = await transactionContractV2.transactions(demandId)
      expect(transaction.isCreatorFulfilled).to.be.false
      expect(transaction.isAcceptorFulfilled).to.be.true
      expect(transaction.status).to.equal(0)

      await transactionContractV2.connect(creator).fulfillTransaction(demandId)
      const transaction2 = await transactionContractV2.transactions(demandId)
      expect(transaction2.isCreatorFulfilled).to.be.true
      expect(transaction2.isAcceptorFulfilled).to.be.true
      expect(transaction2.status).to.equal(1)
    })
  })

  describe('取消交易单', function () {
    it('成功取消交易单', async function () {
      const { demandList, transactionContractV2, creator, acceptor, iteToken, whiteList, marginContract } = await loadFixture(deployTransactionContractV2)

      // 获得一下whiteList合约的实例
      await iteToken.setWhitelistContract(whiteList.address)
      // 将demandList、transactionContract添加到白名单中
      await whiteList.addAllowedContract(demandList.address)
      await whiteList.addAllowedContract(transactionContractV2.address)

      // 创建需求单
      const demandId = 'aaa'
      const deposit = 100
      await demandList.connect(creator).addDemand(demandId, deposit)
      // 甲、乙双方添加保证金
      await marginContract.connect(creator).addDeposit({ value: deposit })
      await marginContract.connect(acceptor).addDeposit({ value: (deposit * 15) / 10 })

      // 创建交易单(接受需求单)
      await transactionContractV2.connect(acceptor).createTransaction(demandId)

      await transactionContractV2.connect(creator).cancelTransaction(demandId)
      let transaction = await transactionContractV2.transactions(demandId)
      expect(transaction.isCreatorCancelled).to.be.true
      expect(transaction.isAcceptorCancelled).to.be.false

      await transactionContractV2.connect(acceptor).cancelTransaction(demandId)
      transaction = await transactionContractV2.transactions(demandId)
      expect(transaction.isAcceptorCancelled).to.be.true
      expect(transaction.status).to.equal(2)
    })
  })

  describe('摧毁交易单', function () {
    it('成功摧毁交易单', async function () {
      const { demandList, transactionContractV2, creator, acceptor, iteToken, whiteList, marginContract } = await loadFixture(deployTransactionContractV2)

      // 获得一下whiteList合约的实例
      await iteToken.setWhitelistContract(whiteList.address)
      // 将demandList、transactionContract添加到白名单中
      await whiteList.addAllowedContract(demandList.address)
      await whiteList.addAllowedContract(transactionContractV2.address)

      // 创建需求单
      const demandId = 'aaa'
      const deposit = 100
      await demandList.connect(creator).addDemand(demandId, deposit)
      // 甲、乙双方添加保证金
      await marginContract.connect(creator).addDeposit({ value: deposit })
      await marginContract.connect(acceptor).addDeposit({ value: (deposit * 15) / 10 })

      // 创建交易单(接受需求单)
      await transactionContractV2.connect(acceptor).createTransaction(demandId)

      await transactionContractV2.connect(creator).destroyTransaction(demandId)
      const transaction = await transactionContractV2.transactions(demandId)
      expect(transaction.status).to.equal(3)
    })
  })
})
