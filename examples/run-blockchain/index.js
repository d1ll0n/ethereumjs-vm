var _1 = require('../../');
var ethereumjs_account_1 = require('ethereumjs-account');
var ethereumjs_blockchain_1 = require('ethereumjs-blockchain');
var utils = require('ethereumjs-util');
var util_1 = require('util');
var promisified_1 = require('../../lib/state/promisified');
var Block = require('ethereumjs-block');
var BlockHeader = require('ethereumjs-block/header.js');
var testData = require('./test-data');
var level = require('level');
async;
function main() {
    var hardfork = testData.network.toLowerCase();
    var blockchain = new ethereumjs_blockchain_1["default"]({
        hardfork: hardfork,
        // This flag can be control whether the blocks are validated. This includes:
        //    * Verifying PoW
        //    * Validating each blocks's difficulty, uncles, tries, header and uncles.
        validate: true
    });
    // When verifying PoW, setting this cache improves the performance of subsequent runs of this
    // script. It has no effect if the blockchain is initialized with `validate: false`.
    setEthashCache(blockchain);
    var vm = new _1["default"]({
        blockchain: blockchain,
        hardfork: hardfork
    });
    await;
    setupPreConditions(vm, testData);
    await;
    setGenesisBlock(blockchain, hardfork);
    await;
    putBlocks(blockchain, hardfork, testData);
    await;
    vm.runBlockchain(blockchain);
    var blockchainHead = await, promisify = (vm.blockchain.getHead.bind(vm.blockchain))();
    console.log('--- Finished processing the BlockChain ---');
    console.log('New head:', '0x' + blockchainHead.hash().toString('hex'));
    console.log('Expected:', testData.lastblockhash);
}
function setEthashCache(blockchain) {
    if (blockchain.validate) {
        blockchain.ethash.cacheDB = level('./.cachedb');
    }
}
async;
function setupPreConditions(vm, testData) {
    var psm = new promisified_1["default"](vm.stateManager);
    await;
    psm.checkpoint();
    for (var _i = 0, _a = Object.keys(testData.pre); _i < _a.length; _i++) {
        var address = _a[_i];
        var addressBuf = utils.toBuffer(address);
        var acctData = testData.pre[address];
        var account = new ethereumjs_account_1["default"]({
            nonce: acctData.nonce,
            balance: acctData.balance
        });
        await;
        psm.putAccount(addressBuf, account);
        for (var _b = 0, _c = Object.keys(acctData.storage); _b < _c.length; _b++) {
            var hexStorageKey = _c[_b];
            var val = utils.toBuffer(acctData.storage[hexStorageKey]);
            var storageKey = utils.setLength(utils.toBuffer(hexStorageKey), 32);
            await;
            psm.putContractStorage(addressBuf, storageKey, val);
        }
        var codeBuf = utils.toBuffer(acctData.code);
        await;
        psm.putContractCode(addressBuf, codeBuf);
    }
    await;
    psm.commit();
}
async;
function setGenesisBlock(blockchain, hardfork) {
    var genesisBlock = new Block({ hardfork: hardfork });
    genesisBlock.header = new BlockHeader(testData.genesisBlockHeader, { hardfork: hardfork });
    await;
    util_1.promisify(blockchain.putGenesis.bind(blockchain))(genesisBlock);
}
async;
function putBlocks(blockchain, hardfork, testData) {
    for (var _i = 0, _a = testData.blocks; _i < _a.length; _i++) {
        var blockData = _a[_i];
        var block = new Block(utils.toBuffer(blockData.rlp), { hardfork: hardfork });
        await;
        util_1.promisify(blockchain.putBlock.bind(blockchain))(block);
    }
}
main()
    .then(function () { return process.exit(0); })
    .catch(function (err) {
    console.error(err);
    process.exit(1);
});
