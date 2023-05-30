const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')
const { expect } = require('chai')

describe('MarginDeposit', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployMarginDeposit() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners()

    const Deposit = await ethers.getContractFactory('MarginDeposit')
    const deposit = await Deposit.deploy()

    return { deposit, owner, otherAccount }
  }

  describe('存入保证金', function () {
    it('存款和查询存款余额', async function () {
      const { deposit, otherAccount } = await loadFixture(deployMarginDeposit)
      const requestId = 1
      const amount = 100
      await deposit.connect(otherAccount).depositDeposit(requestId, { value: amount })
      const res = await deposit.getDeposit(requestId)
      expect(res).to.equal(amount)
    })
    it('余额应该大于零', async function () {
      const { deposit, otherAccount } = await loadFixture(deployMarginDeposit)
      const requestId = 1
      const amount = 0
      await expect(deposit.connect(otherAccount).depositDeposit(requestId, { value: amount })).to.be.revertedWith('The margin should be greater than zero')
    })
  })
})
