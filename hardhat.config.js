require('@nomicfoundation/hardhat-toolbox')

/** @type import('hardhat/config').HardhatUserConfig */

const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require('hardhat/builtin-tasks/task-names')
const path = require('path')

subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
  if (args.solcVersion === '0.8.16') {
    const compilerPath = path.join(__dirname, 'node_modules/solc/soljson.js')

    return {
      compilerPath,
      isSolcJs: true, // if you are using a native compiler, set this to false
      version: args.solcVersion
      // this is used as extra information in the build-info files, but other than
      // that is not important
      // longVersion: "0.8.5-nightly.2021.5.12+commit.98e2b4e5"
    }
  }

  // we just use the default subtask if the version is not 0.8.5
  return runSuper()
})

module.exports = {
  solidity: '0.8.16',
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545'
    }
  }
}
