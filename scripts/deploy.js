// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat')
const { ethers, upgrades } = require('hardhat')

async function main() {
  const platform = '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1'

  // 部署ProfitContract合约
  const ProfitContract = await hre.ethers.getContractFactory('ProfitContract')
  const profitContract = await ProfitContract.deploy(platform)

  // 部署DestroyFund合约
  const DestroyFund = await hre.ethers.getContractFactory('DestroyFund')
  const destroyFund = await DestroyFund.deploy()

  // 部署WhiteList合约
  const WhiteList = await hre.ethers.getContractFactory('WhiteList')
  const whiteList = await WhiteList.deploy()

  // 部署IteToken合约
  const IteToken = await hre.ethers.getContractFactory('IteToken')
  const iteToken = await IteToken.deploy()

  // 部署DemandList合约
  const DemandList = await hre.ethers.getContractFactory('DemandList')
  const demandList = await DemandList.deploy(iteToken.address)

  // 部署MarginContract合约，并传入DemandList合约地址作为构造函数参数
  const MarginContract = await hre.ethers.getContractFactory('MarginContract')
  const marginContract = await MarginContract.deploy(profitContract.address, destroyFund.address, whiteList.address)

  // 部署 ransactionContract 合约，并传入合约地址作为构造函数参数
  const TransactionContract = await hre.ethers.getContractFactory('TransactionContract')
  // const transactionContract = await TransactionContract.deploy(demandList.address, marginContract.address, iteToken.address, profitContract.address, destroyFund.address)
  const transactionContract = await hre.upgrades.deployProxy(TransactionContract, [demandList.address, marginContract.address, iteToken.address, profitContract.address, destroyFund.address])

  await transactionContract.deployed()

  // // 升级成V2
  // const TransactionContractV2 = await hre.ethers.getContractFactory('TransactionContractV2')
  // const transactionContractV2 = await hre.upgrades.upgradeProxy(transactionContract.address, TransactionContractV2)

  console.log(`profitContract  deployed to ${profitContract.address}`)
  console.log(`destroyFund  deployed to ${destroyFund.address}`)
  console.log(`whiteList  deployed to ${whiteList.address}`)
  console.log(`iteToken  deployed to ${iteToken.address}`)
  console.log(`demandList  deployed to ${demandList.address}`)
  console.log(`marginContract  deployed to ${marginContract.address}`)
  console.log(`transactionContract  deployed to ${transactionContract.address}`)
  // console.log(`transactionContractV2  deployed to ${transactionContractV2.address}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })

// profitContract  deployed to 0x5FbDB2315678afecb367f032d93F642f64180aa3
// destroyFund  deployed to 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
// whiteList  deployed to 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
// iteToken  deployed to 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
// demandList  deployed to 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
// marginContract  deployed to 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
// transactionContract  deployed to 0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
