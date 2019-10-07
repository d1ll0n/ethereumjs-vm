# SYNOPSIS

[![NPM Package](https://img.shields.io/npm/v/ethereumjs-vm.svg?style=flat-square)](https://www.npmjs.org/package/ethereumjs-vm)
[![Build Status](
https://img.shields.io/circleci/project/github/ethereumjs/ethereumjs-vm/master.svg
)](https://circleci.com/gh/ethereumjs/ethereumjs-vm)
[![Coverage Status](https://img.shields.io/coveralls/ethereumjs/ethereumjs-vm.svg?style=flat-square)](https://coveralls.io/r/ethereumjs/ethereumjs-vm)
[![Gitter](https://img.shields.io/gitter/room/ethereum/ethereumjs.svg?style=flat-square)](https://gitter.im/ethereum/ethereumjs)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

Implements Ethereum's VM in Javascript.

#### Fork Support

The VM currently supports the following hardfork rules:

- `Byzantium`
- `Constantinople`
- `Petersburg` (default)
<<<<<<< HEAD

If you are still looking for a [Spurious Dragon](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-607.md) compatible version of this library install the latest of the ``2.2.x`` series (see [Changelog](./CHANGELOG.md)).
=======
- `Istanbul` (`beta`)

If you are still looking for a [Spurious Dragon](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-607.md) compatible version of this library install the latest of the `2.2.x` series (see [Changelog](./CHANGELOG.md)).

##### Istanbul Harfork Support

A feature-complete `Istanbul` HF implementation is available since the `v4.1.0`
VM release. You can activate an `Istanbul` VM by using the `istanbul`
`hardfork` option flag.

Supported `Istanbul` EIPs:

- [EIP-152](https://github.com/ethereum/EIPs/pull/2129): Blake 2b `F` precompile,
  PR [#584](https://github.com/ethereumjs/ethereumjs-vm/pull/584)
- [EIP-1108](https://eips.ethereum.org/EIPS/eip-1108): Reduce `alt_bn128`
  precompile gas costs,  
  PR [#540](https://github.com/ethereumjs/ethereumjs-vm/pull/540)
  (already released in `v4.0.0`)
- [EIP-1344](https://eips.ethereum.org/EIPS/eip-1344): Add ChainID Opcode,
  PR [#572](https://github.com/ethereumjs/ethereumjs-vm/pull/572)
- [EIP-1884](https://eips.ethereum.org/EIPS/eip-1884): Trie-size-dependent
  Opcode Repricing,
  PR [#581](https://github.com/ethereumjs/ethereumjs-vm/pull/581)
- [EIP-2200](https://github.com/ethereum/EIPs/pull/2200): Rebalance net-metered
  SSTORE gas costs,
  PR [#590](https://github.com/ethereumjs/ethereumjs-vm/pull/590)

Note that `Istanbul` support is still labeled as `beta`. All implementations
have only basic test coverage since the official Ethereum consensus tests are
not yet merged. There might be also last minute changes to EIPs during the
testing period.
>>>>>>> 00d8fe3c7941fe571581fff1cd4e327980928127

# INSTALL
`npm install ethereumjs-vm`

# USAGE
```javascript
var VM = require('ethereumjs-vm')

//create a new VM instance
var vm = new VM()
var code = '7f4e616d65526567000000000000000000000000000000000000000000000000003055307f4e616d6552656700000000000000000000000000000000000000000000000000557f436f6e666967000000000000000000000000000000000000000000000000000073661005d2720d855f1d9976f88bb10c1a3398c77f5573661005d2720d855f1d9976f88bb10c1a3398c77f7f436f6e6669670000000000000000000000000000000000000000000000000000553360455560df806100c56000396000f3007f726567697374657200000000000000000000000000000000000000000000000060003514156053576020355415603257005b335415603e5760003354555b6020353360006000a233602035556020353355005b60007f756e72656769737465720000000000000000000000000000000000000000000060003514156082575033545b1560995733335460006000a2600033545560003355005b60007f6b696c6c00000000000000000000000000000000000000000000000000000000600035141560cb575060455433145b1560d25733ff5b6000355460005260206000f3'

vm.runCode({
  code: Buffer.from(code, 'hex'), // code needs to be a Buffer
  gasLimit: Buffer.from('ffffffff', 'hex')
}, function(err, results){
  console.log('returned: ' + results.return.toString('hex'));
})
```
Also more examples can be found here
- [examples](./examples)
- [old blog post](https://wanderer.github.io/ethereum/nodejs/code/2014/08/12/running-contracts-with-vm/)

# BROWSER

To build for standalone use in the browser, install `browserify` and check [run-transactions-simple example](https://github.com/ethereumjs/ethereumjs-vm/tree/master/examples/run-transactions-simple). This will give you a global variable `EthVM` to use. The generated file will be at `./examples/run-transactions-simple/build.js`.

# API

## VM

For documentation on ``VM`` instantiation, exposed API and emitted ``events`` see generated [API docs](./docs/index.md).

## StateManger

The API for the ``StateManager`` is currently in ``Beta``, separate documentation can be found [here](./docs/stateManager.md), see also [release notes](https://github.com/ethereumjs/ethereumjs-vm/releases/tag/v2.5.0) from the ``v2.5.0`` VM release for details on the ``StateManager`` rewrite.

# Internal Structure
The VM processes state changes at many levels.

* **runBlockchain**
  * for every block, runBlock
* **runBlock**
  * for every tx, runTx
  * pay miner and uncles
* **runTx**
  * check sender balance
  * check sender nonce
  * runCall
  * transfer gas charges
* **runCall**
  * checkpoint state
  * transfer value
  * load code
  * runCode
  * materialize created contracts
  * revert or commit checkpoint
* **runCode**
  * iterate over code
  * run op codes
  * track gas usage
* **OpFns**
  * run individual op code
  * modify stack
  * modify memory
  * calculate fee

The opFns for `CREATE`, `CALL`, and `CALLCODE` call back up to `runCall`.

## VM's tracing events

You can subscribe to the following events of the VM:

- `beforeBlock`: Emits a `Block` right before running it.
- `afterBlock`: Emits `RunBlockResult` right after running a block.
- `beforeTx`: Emits a `Transaction` right before running it.
- `afterTx`: Emits a `RunTxResult` right after running a transaction.
- `beforeMessage`: Emits a `Message` right after running it.
- `afterMessage`: Emits an `EVMResult` right after running a message.
- `step`: Emits an `InterpreterStep` right before running an EVM step.
- `newContract`: Emits a `NewContractEvent` right before creating a contract. This event contains the deployment code, not the deployed code, as the creation message may not return such a code.

### Asynchronous event handlers

You can perform asynchronous operations from within an event handler
and prevent the VM to keep running until they finish.

In order to do that, your event handler has to accept two arguments.
The first one will be the event object, and the second one a function.
The VM won't continue until you call this function.

If an exception is passed to that function, or thrown from within the
handler or a function called by it, the exception will bubble into the
VM and interrupt it, possibly corrupting its state. It's strongly
recommended not to do that.

### Synchronous event handlers

If you want to perform synchronous operations, you don't need
to receive a function as the handler's second argument, nor call it.

Note that if your event handler receives multiple arguments, the second
one will be the continuation function, and it must be called.

If an exception is thrown from withing the handler or a function called
by it, the exception will bubble into the VM and interrupt it, possibly
corrupting its state. It's strongly recommended not to throw from withing
event handlers.

# DEVELOPMENT

Developer documentation - currently mainly with information on testing and debugging - can be found [here](./developer.md).

# EthereumJS

# DEVELOPMENT

Developer documentation - currently mainly with information on testing and debugging - can be found [here](./docs/developer.md). 

# LICENSE
[MPL-2.0](https://www.mozilla.org/MPL/2.0/)
