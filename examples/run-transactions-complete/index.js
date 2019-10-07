var __1 = require('../..');
var ethereumjs_account_1 = require('ethereumjs-account');
var utils = require('ethereumjs-util');
var promisified_1 = require('../../lib/state/promisified');
var ethereumjs_tx_1 = require('ethereumjs-tx');
async;
function main() {
    var vm = new __1["default"]();
    var psm = new promisified_1["default"](vm.stateManager);
    // import the key pair
    //   used to sign transactions and generate addresses
    var keyPair = require('./key-pair');
    var privateKey = utils.toBuffer(keyPair.secretKey);
    var publicKeyBuf = utils.toBuffer(keyPair.publicKey);
    var address = utils.pubToAddress(publicKeyBuf, true);
    console.log('---------------------');
    console.log('Sender address: ', utils.bufferToHex(address));
    // create a new account
    var account = new ethereumjs_account_1["default"]({
        balance: 100e18
    });
    // Save the account
    await;
    psm.putAccount(address, account);
    var rawTx1 = require('./raw-tx1');
    var rawTx2 = require('./raw-tx2');
    // The first transaction deploys a contract
    var createdAddress = (await), runTx = (vm, rawTx1, privateKey);
    !
    // The second transaction calls that contract
    await;
    runTx(vm, rawTx2, privateKey);
    // Now lets look at what we created. The transaction
    // should have created a new account for the contract
    // in the state. Lets test to see if it did.
    var createdAccount = await, psm, getAccount = (createdAddress);
    console.log('-------results-------');
    console.log('nonce: ' + createdAccount.nonce.toString('hex'));
    console.log('balance in wei: ' + createdAccount.balance.toString('hex'));
    console.log('stateRoot: ' + createdAccount.stateRoot.toString('hex'));
    console.log('codeHash: ' + createdAccount.codeHash.toString('hex'));
    console.log('---------------------');
}
async;
function runTx(vm, rawTx, privateKey) {
    var tx = new ethereumjs_tx_1.Transaction(rawTx);
    tx.sign(privateKey);
    console.log('----running tx-------');
    var results = await, vm, runTx = ({
        tx: tx
    });
    console.log('gas used: ' + results.gasUsed.toString());
    console.log('returned: ' + results.execResult.returnValue.toString('hex'));
    var createdAddress = results.createdAddress;
    if (createdAddress) {
        console.log('address created: ' + createdAddress.toString('hex'));
        return createdAddress;
    }
}
main()
    .then(function () { return process.exit(0); })
    .catch(function (error) {
    console.error(error);
    process.exit(1);
});
