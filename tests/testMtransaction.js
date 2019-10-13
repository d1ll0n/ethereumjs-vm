const VM = require('../').default
const Account = require('ethereumjs-account').default
const testUtil = require('./util')
const Trie = require('merkle-patricia-tree/secure')
const ethUtil = require('ethereumjs-util')
const Transaction = require('ethereumjs-tx').Transaction;
const testData = require('./api/testdata')
const BN = ethUtil.BN

async function runVMTest () {
  let state = new Trie()
  // let results
  // let account
  const account = new Account();
  account.nonce = ethUtil.toBuffer(0);
  account.balance = ethUtil.toBuffer('0x02540be400');
  const address = ethUtil.toBuffer('0x095e7baea6a6c7c4c2dfeb977efac326af552d87');
  await new Promise(resolve => state.put(address, account.serialize(), resolve));
  let vm = new VM({state: state})
  const tx = new Transaction({
    caller: address,
    data: ethUtil.toBuffer('0x608060405234801561001057600080fd5b50600560008190555060405161002590610087565b604051809103906000f080158015610041573d6000803e3d6000fd5b50600160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550610094565b6101da806105e583390190565b610542806100a36000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c806309cdcf9b1461003b5780634df7e3d01461007d575b600080fd5b6100676004803603602081101561005157600080fd5b810190808035906020019092919050505061009b565b6040518082815260200191505060405180910390f35b610085610507565b6040518082815260200191505060405180910390f35b60006010549050816000819055506000600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166311759d716040518163ffffffff1660e01b8152600401602060405180830381600087803b15801561011557600080fd5b505af1158015610129573d6000803e3d6000fd5b505050506040513d602081101561013f57600080fd5b8101908080519060200190929190505050905060006060600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1660405180807f736f6d654c6172676572537461746963466e28290000000000000000000000008152506014019050604051809103902060405160200180827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19167bffffffffffffffffffffffffffffffffffffffffffffffffffffffff191681526004019150506040516020818303038152906040526040518082805190602001908083835b602083106102555780518252602082019150602081019050602083039250610232565b6001836020036101000a0380198251168184511680821785525050505050509050019150506000604051808303816000865af19150503d80600081146102b7576040519150601f19603f3d011682016040523d82523d6000602084013e6102bc565b606091505b50915091507fe3ea1cf381f2243f06942c2f2a2e83597610c0c6433b186a49e1ac7a2eab73bf816040518080602001828103825283818151815260200191508051906020019080838360005b83811015610323578082015181840152602081019050610308565b50505050905090810190601f1680156103505780820380516001836020036101000a031916815260200191505b509250505060405180910390a17fe3ea1cf381f2243f06942c2f2a2e83597610c0c6433b186a49e1ac7a2eab73bf83604051602001808281526020019150506040516020818303038152906040526040518080602001828103825283818151815260200191508051906020019080838360005b838110156103de5780820151818401526020810190506103c3565b50505050905090810190601f16801561040b5780820380516001836020036101000a031916815260200191505b509250505060405180910390a160003073ffffffffffffffffffffffffffffffffffffffff163190506000434090507fe3ea1cf381f2243f06942c2f2a2e83597610c0c6433b186a49e1ac7a2eab73bf828260405160200180838152602001828152602001925050506040516020818303038152906040526040518080602001828103825283818151815260200191508051906020019080838360005b838110156104c35780820151818401526020810190506104a8565b50505050905090810190601f1680156104f05780820380516001836020036101000a031916815260200191505b509250505060405180910390a15050505050919050565b6000548156fea265627a7a72315820ebcc67f45abe9d6e9eb92e034e0b3434581506d27742887cfe8c3f85c419517164736f6c634300050c0032608060405234801561001057600080fd5b506101ba806100206000396000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c806311759d7114610051578063308c242a1461006f5780637cb2ed16146100795780638a36d813146100d8575b600080fd5b6100596100f6565b6040518082815260200191505060405180910390f35b6100776100ff565b005b610081610109565b6040518080602001828103825283818151815260200191508051906020019060200280838360005b838110156100c45780820151818401526020810190506100a9565b505050509050019250505060405180910390f35b6100e061017c565b6040518082815260200191505060405180910390f35b60006032905090565b600a600081905550565b606080600260405190808252806020026020018201604052801561013c5781602001602082028038833980820191505090505b50905060058160008151811061014e57fe5b60200260200101818152505060068160018151811061016957fe5b6020026020010181815250508091505090565b6000602090509056fea265627a7a7231582083f7c48cd4fa20ea383b60becf01527a0cd0793401b0bb4a199a943111dc9ccd64736f6c634300050c0032'),
    to: ethUtil.toBuffer(undefined),
    gas: 6e6
  })
  // tx.mainnetAddress = ethUtil.toBuffer('0x8888f1f195afa192cfee860698584c030f4c9db1');
  // tx.fromMainnet = true;
  tx.getSenderAddress = () => address
  Object.defineProperty(tx, 'from', {
    value: address,
    enumerable: true,
    configurable: true
  });
  // const block = testUtil.makeBlockFromEnv(testData.env)
  const results = await vm.runTx({ tx })
  console.log('results!')
  console.log('results!')
/* 
      if (testData.gas) {
        let actualGas, expectedGas
        if (!results.exceptionError) {
          actualGas = results.gas.toString()
          expectedGas = new BN(testUtil.format(testData.gas)).toString()
        } else {
          // OOG
          actualGas = results.gasUsed.toString()
          expectedGas = new BN(testUtil.format(testData.exec.gas)).toString()
        }

        // compress output message for passing test cases
        const successMsg = `valid gas usage [file: ${testData.fileName}]`
        const failMsg = `valid gas usage [file: ${testData.fileName}, test: ${testData.testName}]`
        if (actualGas === expectedGas) {
          t.equal(actualGas, expectedGas, successMsg)
        } else {
          t.equal(actualGas, expectedGas, failMsg)
        }
      }

      done()
    }
  ], cb) */
}
runVMTest()