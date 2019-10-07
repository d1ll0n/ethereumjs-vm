var dist_1 = require('../../dist');
var assert = require('assert');
var path = require('path');
var fs = require('fs');
var util_1 = require('util');
var util = require('ethereumjs-util');
var ethereumjs_account_1 = require('ethereumjs-account');
var ethereumjs_tx_1 = require('ethereumjs-tx');
var abi = require('ethereumjs-abi');
var solc = require('solc');
var INITIAL_GREETING = 'Hello, World!';
var SECOND_GREETING = 'Hola, Mundo!';
/**
 * This function creates the input for the Solidity compiler.
 *
 * For more info about it, go to https://solidity.readthedocs.io/en/v0.5.10/using-the-compiler.html#compiler-input-and-output-json-description
 */
function getSolcInput() {
    return {
        language: 'Solidity',
        sources: {
            'contracts/Greeter.sol': {
                content: fs.readFileSync(path.join(__dirname, 'contracts', 'Greeter.sol'), 'utf8')
            }
        },
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            },
            evmVersion: 'petersburg',
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode']
                }
            }
        }
    };
}
/**
 * This function compiles all the contracts in `contracts/` and returns the Solidity Standard JSON
 * output. If the compilation fails, it returns `undefined`.
 *
 * To learn about the output format, go to https://solidity.readthedocs.io/en/v0.5.10/using-the-compiler.html#compiler-input-and-output-json-description
 */
function compileContracts() {
    var input = getSolcInput();
    var output = JSON.parse(solc.compile(JSON.stringify(input)));
    var compilationFailed = false;
    if (output.errors) {
        for (var _i = 0, _a = output.errors; _i < _a.length; _i++) {
            var error = _a[_i];
            if (error.severity === 'error') {
                console.error(error.formattedMessage);
                compilationFailed = true;
            }
            else {
                console.warn(error.formattedMessage);
            }
        }
    }
    if (compilationFailed) {
        return undefined;
    }
    return output;
}
function getGreeterDeploymentBytecode(solcOutput) {
    return solcOutput.contracts['contracts/Greeter.sol'].Greeter.evm.bytecode.object;
}
async;
function getAccountNonce(vm, accountPrivateKey) {
    var account = (await), promisify = (vm.stateManager.getAccount.bind(vm.stateManager))(util.privateToAddress(accountPrivateKey)), as = ethereumjs_account_1["default"];
    return account.nonce;
}
async;
function deployContract(vm, senderPrivateKey, deploymentBytecode, greeting) {
    // Contracts are deployed by sending their deployment bytecode to the address 0
    // The contract params should be abi-encoded and appended to the deployment bytecode.
    var params = abi.rawEncode(['string'], [greeting]);
    var tx = new ethereumjs_tx_1.Transaction({
        value: 0,
        gasLimit: 2000000,
        gasPrice: 1,
        data: '0x' + deploymentBytecode + params.toString('hex'),
        nonce: await, getAccountNonce: function (vm, senderPrivateKey) { }
    });
    tx.sign(senderPrivateKey);
    var deploymentResult = await, vm, runTx = ({ tx: tx });
    if (deploymentResult.execResult.exceptionError) {
        throw deploymentResult.execResult.exceptionError;
    }
    return deploymentResult.createdAddress;
    !;
}
async;
function setGreeting(vm, senderPrivateKey, contractAddress, greeting) {
    var params = abi.rawEncode(['string'], [greeting]);
    var tx = new ethereumjs_tx_1.Transaction({
        to: contractAddress,
        value: 0,
        gasLimit: 2000000,
        gasPrice: 1,
        data: '0x' + abi.methodID('setGreeting', ['string']).toString('hex') + params.toString('hex'),
        nonce: await, getAccountNonce: function (vm, senderPrivateKey) { }
    });
    tx.sign(senderPrivateKey);
    var setGreetingResult = await, vm, runTx = ({ tx: tx });
    if (setGreetingResult.execResult.exceptionError) {
        throw setGreetingResult.execResult.exceptionError;
    }
}
async;
function getGreeting(vm, contractAddress, caller) {
    var greetResult = await, vm, runCall = ({
        to: contractAddress,
        caller: caller,
        origin: caller,
        data: abi.methodID('greet', [])
    });
    if (greetResult.execResult.exceptionError) {
        throw greetResult.execResult.exceptionError;
    }
    var results = abi.rawDecode(['string'], greetResult.execResult.returnValue);
    return results[0];
}
async;
function main() {
    var accountPk = new Buffer('e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109', 'hex');
    var accountAddress = util.privateToAddress(accountPk);
    console.log('Account:', util.bufferToHex(accountAddress));
    var account = new ethereumjs_account_1["default"]({ balance: 1e18 });
    var vm = new dist_1["default"]();
    await;
    util_1.promisify(vm.stateManager.putAccount.bind(vm.stateManager))(accountAddress, account);
    console.log('Set account a balance of 1 ETH');
    console.log('Compiling...');
    var solcOutput = compileContracts();
    if (solcOutput === undefined) {
        throw new Error('Compilation failed');
    }
    else {
        console.log('Compiled the contract');
    }
    var bytecode = getGreeterDeploymentBytecode(solcOutput);
    console.log('Deploying the contract...');
    var contractAddress = await, deployContract = (vm, accountPk, bytecode, INITIAL_GREETING);
    console.log('Contract address:', util.bufferToHex(contractAddress));
    var greeting = await, getGreeting = (vm, contractAddress, accountAddress);
    console.log('Greeting:', greeting);
    assert.equal(greeting, INITIAL_GREETING);
    console.log('Changing greeting...');
    await;
    setGreeting(vm, accountPk, contractAddress, SECOND_GREETING);
    var greeting2 = await, getGreeting = (vm, contractAddress, accountAddress);
    console.log('Greeting:', greeting2);
    assert.equal(greeting2, SECOND_GREETING);
    console.log('Everything run correctly!');
}
main()
    .then(function () { return process.exit(0); })
    .catch(function (err) {
    console.error(err);
    process.exit(1);
});
