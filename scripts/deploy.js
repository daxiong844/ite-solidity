// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat')

async function main() {
  const DemandList = await hre.ethers.getContractFactory('DemandList')
  const demandList = await DemandList.deploy()

  await demandList.deployed()

  console.log(`DemandList  deployed to ${demandList.address}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error)
  process.exitCode = 1
})

// DemandList合约地址：
// 0x5fbdb2315678afecb367f032d93f642f64180aa3
