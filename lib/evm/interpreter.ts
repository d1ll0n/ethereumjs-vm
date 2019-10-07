import BN = require('bn.js')
import Common from 'ethereumjs-common'
import { StateManager } from '../state'
import PStateManager from '../state/promisified'
import { ERROR, VmError } from '../exceptions'
import Memory from './memory'
import Stack from './stack'
import EEI from './eei'
import { Opcode } from './opcodes'
import { handlers as opHandlers, OpHandler } from './opFns.js'
import copyStateManager from '../copyStateManager';
import getCurrentRoot from '../getCurrentRoot';
const {
	toHex,
	addHexPrefix,
	stripHexPrefix,
	bufferToHex
} = require('ethereumjs-util');
const {
	soliditySha3,
	leftPad
} = require('web3-utils');

const copyStep = (step) => Object.assign({}, step, {
	opcode: Object.assign({}, step.opcode),
	stack: step.stack.slice(),
	memory: step.memory.slice(),
	stateManager: copyStateManager(step.stateManager)
});

const addOneToStackOffset = [
  'callcode',
  'call'
].reduce((r, v) => {
  r[v] = true;
  return r;
}, {});

const fromBack = (ary, n = 0) => ary[ary.length - (1 + n)];
const formatWord = (word) => addHexPrefix(leftPad(word.toString(16), 64));
const wordToBool = (word) => !word.isZero();
const wordToNumber = (word) => word.toString(10);
const wordToDouble = (word) => Number(word);
const byteLength = (word) => Math.ceil(stripHexPrefix(word.toString(16)).length / 2);
const wordToAddress = (word) => addHexPrefix(leftPad(word.toString(16), 64).substr(24));
const mslice = (segment, start, length) => addHexPrefix(segment.map((v) => leftPad(v.toString(16), 2)).join('').substr(start * 2, length * 2));

async function onStep(vm, step) {
  const { sioMap } = vm;
	delete sioMap.possibleUncaughtFailure;
 	const op = step.opcode.name.toLowerCase();
 	let returndata;
 	if (sioMap.depthTrigger[step.depth]) {
		delete sioMap.lastReturnData;
		const {
			current,
			precompiled,
			sio
		} = sioMap.depthTrigger[step.depth];
 		const lastOp = sioMap.lastStep.opcode.name.toLowerCase();
		if (precompiled) Object.assign(sio.metadata, {
 			returndatasize: precompiled[1],
			returndata: mslice(step.memory, precompiled[0], precompiled[1]),
			callsuccess: true
		});
		else switch (lastOp) {
 			case 'return':
   		case 'revert':
 			case 'invalid':
        returndata = lastOp === 'invalid' ? '0x' : mslice(sioMap.lastStep.memory, wordToDouble(fromBack(sioMap.lastStep.stack)), wordToDouble(fromBack(sioMap.lastStep.stack, 1)));
				Object.assign(sio.metadata, {
 					returndatasize: byteLength(returndata),
 					returndata,
 					callsuccess: lastOp === 'return'
 				});
				break;
 			default:
 				Object.assign(sio.metadata, {
 					returndatasize: 0,
 					returndata: '0x',
 					callsuccess: true
 				});
				break;
 		}
    current.sio.push(sio);
		sioMap.current.returndata = sio.metadata.returndata;
		sioMap.current.stateRootLeave = await getCurrentRoot(sioMap.lastStep.stateManager);
		sioMap.current.callsuccess = sio.metadata.callsuccess;
		sioMap.current = current;
		sioMap.currentAddress = sioMap.current.caller;
 		delete sioMap.depthTrigger[step.depth];
		Array(sioMap.lastStep.depth - step.depth).fill(0).forEach(() => {
			sioMap.callStack.pop();
		});
		sioMap.depth = step.depth;
 	}
	if (!step.stack) return;
 	if (sioMap.trigger) {
 		switch (sioMap.trigger.opcode) {
 			case 'sload':
 				sioMap.trigger.metadata.value = formatWord(fromBack(step.stack));
 				sioMap.current.sio.push(sioMap.trigger);
 				break;
			case 'sstore':
				sioMap.trigger.metadata.stateRoot = await getCurrentRoot(step.stateManager);
				sioMap.current.sio.push(sioMap.trigger);
				break;
 			case 'balance':
 				sioMap.trigger.metadata.balance = wordToNumber(fromBack(step.stack));
 				sioMap.current.sio.push(sioMap.trigger);
 				break;
 			case 'blockhash':
 				sioMap.trigger.metadata.number = wordToNumber(fromBack(step.stack));
 				sioMap.current.sio.push(sioMap.trigger);
 				break;
 		}
 		delete sioMap.trigger;
 	}
	if (sioMap.internalCallTrigger) {
		if (step.depth === sioMap.internalCallTrigger) {
			sioMap.current.stateRootEnter = await getCurrentRoot(step.stateManager);
		}
		delete sioMap.internalCallTrigger;
	}
 	switch (op) {
		case 'sstore':
 			sioMap.trigger = {
     		opcode: op,
   			metadata: {
 	 				slot: formatWord(fromBack(step.stack)),
 	 				value: formatWord(fromBack(step.stack, 1))
 				}
  		};
  		break;
 		case 'sload':
 			sioMap.trigger = {
   			opcode: op,
 				metadata: {
 					slot: formatWord(fromBack(step.stack))
 				}
 			};
 			break;
 		case 'balance':
 			sioMap.trigger = {
 				opcode: op,
 				metadata: {
 					address: wordToAddress(fromBack(step.stack))
 				}
   		};
 			break;
 		case 'blockhash':
 			sioMap.trigger = {
 				opcode: op,
 				metadata: {
 					hash: formatWord(fromBack(step.stack))
 				}
 			};
			break;
 		case 'log0':
 		case 'log1':
 		case 'log2':
 		case 'log3':
 		case 'log4':
 			const topicCount = Number(op[op.length - 1]);
 			const topics = Array(topicCount).fill(0).map((_, i) => formatWord(fromBack(step.stack, i + 2)));
 			const data = mslice(step.memory, wordToDouble(fromBack(step.stack, 0)), wordToDouble(fromBack(step.stack, 1)));
 			const log = {
 				address: sioMap.currentAddress,
 				data,
 				removed: false,
 				topics,
 				transactionHash: sioMap.receipts[0].transactionHash
 			} as any;
 			sioMap.callStack.concat(sioMap.receipts.indexOf(sioMap.current)).forEach((index) => {
 				sioMap.receipts[index].logs.push(log);
 			});
 			break;
		case 'return':
      sioMap.lastReturnData = mslice(step.memory, wordToDouble(fromBack(step.stack)), wordToDouble(fromBack(step.stack, 1)));
			break;
 	 	case 'revert':
 	 	case 'invalid':
 	 		sioMap.possibleUncaughtFailure = true;
			if (op === 'revert') sioMap.lastReturnData = mslice(step.memory, wordToDouble(fromBack(step.stack)), wordToDouble(fromBack(step.stack, 1)));
 	 	  break;
 		case 'call':
 		case 'callcode':
 		case 'delegatecall':
 		case 'staticcall':
 		  sioMap.callStack.push(sioMap.receipts.indexOf(sioMap.current));
 			sioMap.depth++;
 			const internalTransactionHash = soliditySha3({
 				t: 'bytes32',
 				v: sioMap.current.transactionHash
 			}, {
 				t: 'uint256',
 				v: sioMap.current.internal.length
 			});
			sioMap.current.internal.push(internalTransactionHash);
   		const calldata = addOneToStackOffset[op] ? mslice(step.memory, wordToDouble(fromBack(step.stack, 3)), wordToDouble(fromBack(step.stack, 4))) : mslice(step.memory, wordToDouble(fromBack(step.stack, 2)), wordToDouble(fromBack(step.stack, 3)));
 			const internal = {
 				opcode: op,
				metadata: {
   				receipthash: internalTransactionHash,
   				gas: wordToNumber(fromBack(step.stack)),
   				address: wordToAddress(fromBack(step.stack, 1)),
   				calldatahash: ((input) => input === '0x' ? soliditySha3('') : soliditySha3({
  					t: 'bytes',
   					v: input
   				}))(calldata)
   			}
			} as any;
			if (op === 'call' || op === 'callcode') internal.metadata.stateRoot = await getCurrentRoot(step.stateManager);
 			if (addOneToStackOffset[op]) internal.metadata.callvalue = wordToNumber(fromBack(step.stack, 2));
 			sioMap.depthTrigger[step.depth] = {
				current: sioMap.current,
				sio: internal
			};
			if (Number(internal.address) > 0 && Number(internal.address) < 8) sioMap.depthTrigger[step.depth].precompiled = addOneToStackOffset[op] ? [ wordToDouble(fromBack(step.stack, 5)), wordToDouble(fromBack(step.stack, 6)) ] : [ wordToDouble(fromBack(step.stack, 4)), wordToDouble(fromBack(step.stack, 5)) ];
			sioMap.hashToIndex[internalTransactionHash] = sioMap.receipts.length;
 			sioMap.receipts.push((sioMap.current = {
 				origin: sioMap.current.origin,
 				transactionHash: internalTransactionHash,
				path: sioMap.current.path.concat(sioMap.current.internal.length - 1),
 				contractAddress: null,
				callvalue: internal.metadata.callvalue || '0x0',
				callData: calldata,
 				link: sioMap.current.transactionHash,
 				to: internal.metadata.address,
				context: op === 'delegatecall' || op === 'callcode' ? sioMap.current.context : internal.metadata.address,
 				caller: sioMap.currentAddress,
 				sio: [],
 				logs: [],
 				internal: []
 			} as any));
			sioMap.internalCallTrigger = step.depth + 1;
 			if (op !== 'delegatecall') sioMap.currentAddress = internal.metadata.address;
 			break;
 	}
 	sioMap.lastStep = step;
}
import Account from 'ethereumjs-account'

export interface InterpreterOpts {
  pc?: number
}

export interface RunState {
  programCounter: number
  opCode: number
  memory: Memory
  memoryWordCount: BN
  highestMemCost: BN
  stack: Stack
  code: Buffer
  validJumps: number[]
  _common: Common
  stateManager: StateManager
  eei: EEI
}

export interface InterpreterResult {
  runState?: RunState
  exceptionError?: VmError
}

export interface InterpreterStep {
  gasLeft: BN
  stateManager: StateManager
  stack: BN[]
  pc: number
  depth: number
  address: Buffer
  memory: number[]
  memoryWordCount: BN
  opcode: Opcode
  account: Account
}

/**
 * Parses and executes EVM bytecode.
 */
export default class Interpreter {
  _vm: any
  _state: PStateManager
  _runState: RunState
  _eei: EEI

  constructor(vm: any, eei: EEI) {
    this._vm = vm // TODO: remove when not needed
    this._state = vm.pStateManager
    this._eei = eei
    this._runState = {
      programCounter: 0,
      opCode: 0xfe, // INVALID opcode
      memory: new Memory(),
      memoryWordCount: new BN(0),
      highestMemCost: new BN(0),
      stack: new Stack(),
      code: Buffer.alloc(0),
      validJumps: [],
      // TODO: Replace with EEI methods
      _common: this._vm._common,
      stateManager: this._state._wrapped,
      eei: this._eei,
    }
  }

  async run(code: Buffer, opts: InterpreterOpts = {}): Promise<InterpreterResult> {
    this._runState.code = code
    this._runState.programCounter = opts.pc || this._runState.programCounter
    this._runState.validJumps = this._getValidJumpDests(code)

    // Check that the programCounter is in range
    const pc = this._runState.programCounter
    if (pc !== 0 && (pc < 0 || pc >= this._runState.code.length)) {
      throw new Error('Internal error: program counter not in range')
    }

    let err
    // Iterate through the given ops until something breaks or we hit STOP
    while (this._runState.programCounter < this._runState.code.length) {
      const opCode = this._runState.code[this._runState.programCounter]
      this._runState.opCode = opCode
      await this._runStepHook()

      try {
        await this.runStep()
      } catch (e) {
        // STOP is not an exception
        if (e.error !== ERROR.STOP) {
          err = e
        }
        // TODO: Throw on non-VmError exceptions
        break
      }
    }

    return {
      runState: this._runState,
      exceptionError: err,
    }
  }

  /**
   * Executes the opcode to which the program counter is pointing,
   * reducing it's base gas cost, and increments the program counter.
   */
  async runStep(): Promise<void> {
    const opInfo = this.lookupOpInfo(this._runState.opCode)
    // Check for invalid opcode
    if (opInfo.name === 'INVALID') {
      throw new VmError(ERROR.INVALID_OPCODE)
    }

    // Reduce opcode's base fee
    this._eei.useGas(new BN(opInfo.fee))
    // Advance program counter
    this._runState.programCounter++

    // Execute opcode handler
    const opFn = this.getOpHandler(opInfo)
    if (opInfo.isAsync) {
      await opFn.apply(null, [this._runState])
    } else {
      opFn.apply(null, [this._runState])
    }
  }

  /**
   * Get the handler function for an opcode.
   */
  getOpHandler(opInfo: Opcode): OpHandler {
    return opHandlers[opInfo.name]
  }

  /**
   * Get info for an opcode from VM's list of opcodes.
   */
  lookupOpInfo(op: number, full: boolean = false): Opcode {
    const opcode = this._vm._opcodes[op]
      ? this._vm._opcodes[op]
      : { name: 'INVALID', fee: 0, isAsync: false }

    if (full) {
      let name = opcode.name
      if (name === 'LOG') {
        name += op - 0xa0
      }

      if (name === 'PUSH') {
        name += op - 0x5f
      }

      if (name === 'DUP') {
        name += op - 0x7f
      }

      if (name === 'SWAP') {
        name += op - 0x8f
      }
      return { ...opcode, ...{ name } }
    }

    return opcode
  }

  async _runStepHook(): Promise<void> {
    const eventObj: InterpreterStep = {
      pc: this._runState.programCounter,
      gasLeft: this._eei.getGasLeft(),
      opcode: this.lookupOpInfo(this._runState.opCode, true),
      stack: this._runState.stack._store,
      depth: this._eei._env.depth,
      address: this._eei._env.address,
      account: this._eei._env.contract,
      stateManager: this._runState.stateManager,
      memory: this._runState.memory._store, // Return underlying array for backwards-compatibility
      memoryWordCount: this._runState.memoryWordCount,
    }
    /**
     * The `step` event for trace output
     *
     * @event Event: step
     * @type {Object}
     * @property {Number} pc representing the program counter
     * @property {String} opcode the next opcode to be ran
     * @property {BN} gasLeft amount of gasLeft
     * @property {Array} stack an `Array` of `Buffers` containing the stack
     * @property {Account} account the [`Account`](https://github.com/ethereum/ethereumjs-account) which owns the code running
     * @property {Buffer} address the address of the `account`
     * @property {Number} depth the current number of calls deep the contract is
     * @property {Buffer} memory the memory of the VM as a `buffer`
     * @property {BN} memoryWordCount current size of memory in words
     * @property {StateManager} stateManager a [`StateManager`](stateManager.md) instance (Beta API)
     */
		await onStep(this._vm, copyStep(eventObj));
    return this._vm._emit('step', eventObj)
  }

  // Returns all valid jump destinations.
  _getValidJumpDests(code: Buffer): number[] {
    const jumps = []

    for (let i = 0; i < code.length; i++) {
      const curOpCode = this.lookupOpInfo(code[i]).name

      // no destinations into the middle of PUSH
      if (curOpCode === 'PUSH') {
        i += code[i] - 0x5f
      }

      if (curOpCode === 'JUMPDEST') {
        jumps.push(i)
      }
    }

    return jumps
  }
}
