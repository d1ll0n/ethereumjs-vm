import BN = require('bn.js')
const {
  generateAddress,
  generateAddress2,
  KECCAK256_NULL,
  MAX_INTEGER,
  toBuffer,
	stripHexPrefix,
  zeros,
} = require('ethereumjs-util');
const { Buffer } = require('safe-buffer');
import Account from 'ethereumjs-account'
import { ERROR, VmError } from '../exceptions'
import PStateManager from '../state/promisified'
import { getPrecompile, PrecompileFunc } from './precompiles'
import TxContext from './txContext'
import Message from './message'
import EEI from './eei'
import { default as Interpreter, InterpreterOpts, RunState } from './interpreter'

const Block = require('ethereumjs-block')

/**
 * Result of executing a message via the [[EVM]].
 */
export interface EVMResult {
  /**
   * Amount of gas used by the transaction
   */
  gasUsed: BN
  /**
   * Address of created account durint transaction, if any
   */
  createdAddress?: Buffer
  /**
   * Contains the results from running the code, if any, as described in [[runCode]]
   */
  execResult: ExecResult
}

export interface Exit {
  to?: Buffer
  caller?: Buffer
  value?: BN
  data?: Buffer
  // gas: BN
}

/**
 * Result of executing a call via the [[EVM]].
 */
export interface ExecResult {
  runState?: RunState
  /**
   * Description of the exception, if any occured
   */
  exceptionError?: VmError
  /**
   * Amount of gas left
   */
  gas?: BN
  /**
   * Amount of gas the code used to run
   */
  gasUsed: BN
  /**
   * Return value from the contract
   */
  returnValue: Buffer
  /**
   * Array of logs that the contract emitted
   */
  logs?: any[]
  /**
   * Array of outgoing transactions
  */
  exits?: Exit[]
  /**
   * Amount of gas to refund from deleting storage values
   */
  gasRefund?: BN
  /**
   * A map from the accounts that have self-destructed to the addresses to send their funds to
   */
  selfdestruct?: { [k: string]: Buffer }
}

export interface NewContractEvent {
  address: Buffer
  // The deployment code
  code: Buffer
}

export function OOGResult(gasLimit: BN): ExecResult {
  return {
    returnValue: Buffer.alloc(0),
    gasUsed: gasLimit,
    exceptionError: new VmError(ERROR.OUT_OF_GAS),
  }
}

/**
 * EVM is responsible for executing an EVM message fully
 * (including any nested calls and creates), processing the results
 * and storing them to state (or discarding changes in case of exceptions).
 * @ignore
 */
export default class EVM {
  _vm: any
  _state: PStateManager
  _tx: TxContext
  _block: any

  constructor(vm: any, txContext: TxContext, block: any) {
    this._vm = vm
    this._state = this._vm.pStateManager
    this._tx = txContext
    this._block = block
  }

  /**
   * Executes an EVM message, determining whether it's a call or create
   * based on the `to` address. It checkpoints the state and reverts changes
   * if an exception happens during the message execution.
   */
  async executeMessage(message: Message): Promise<EVMResult> {
    await this._vm._emit('beforeMessage', message)

    await this._state.checkpoint()

    let result
    if (message.to) {
      result = await this._executeCall(message)
    } else {
      result = await this._executeCreate(message)
    }

    const err = result.execResult.exceptionError
    if (err) {
      console.log(`Caught error!`)
      console.log(err)
      result.execResult.logs = []
      result.execResult.exits = [];
      await this._state.revert()
      if (message.isCompiled) {
        // Empty precompiled contracts need to be deleted even in case of OOG
        // because the bug in both Geth and Parity led to deleting RIPEMD precompiled in this case
        // see https://github.com/ethereum/go-ethereum/pull/3341/files#diff-2433aa143ee4772026454b8abd76b9dd
        // We mark the account as touched here, so that is can be removed among other touched empty accounts (after tx finalization)
        if (err.error === ERROR.OUT_OF_GAS) {
          await this._touchAccount(message.to)
        }
      }
    } else {
      await this._state.commit()
    }

    await this._vm._emit('afterMessage', result)

    return result
  }

  async _executeCall(message: Message): Promise<EVMResult> {
    const account = await this._state.getAccount(message.caller)
    // Reduce tx value from sender
    if (!message.delegatecall && !message.fromMainnet) {
      await this._reduceSenderBalance(account, message)
    }
    // Load `to` account
    const toAccount = await this._state.getAccount(message.to)
    // Add tx value to the `to` account
    if (!message.delegatecall) {
      await this._addToBalance(toAccount, message)
    }

    // Load code
    await this._loadCode(message)
    if (!message.code || message.code.length === 0) {
      return {
        gasUsed: new BN(0),
        execResult: {
          gasUsed: new BN(0),
          returnValue: Buffer.alloc(0),
        },
      }
    }

    let result: ExecResult
    if (message.isCompiled) {
      result = this.runPrecompile(message.code as PrecompileFunc, message.data, message.gasLimit, message.value, message.caller)
    } else {
      result = await this.runInterpreter(message)
    }

    return {
      gasUsed: result.gasUsed,
      execResult: result,
    }
  }

  async _executeCreate(message: Message): Promise<EVMResult> {
    console.log('Executing create...')
    const account = await this._state.getAccount(message.caller)
    // Reduce tx value from sender
    if (!message.fromMainnet) await this._reduceSenderBalance(account, message)

    message.code = message.data
    message.data = Buffer.alloc(0)
    message.to = await this._generateAddress(message)
    let toAccount = await this._state.getAccount(message.to)
    // Check for collision
    if (
      (toAccount.nonce && new BN(toAccount.nonce).gtn(0)) ||
      toAccount.codeHash.compare(KECCAK256_NULL) !== 0
    ) {
      return {
        gasUsed: message.gasLimit,
        createdAddress: message.to,
        execResult: {
          returnValue: Buffer.alloc(0),
          exceptionError: new VmError(ERROR.CREATE_COLLISION),
          gasUsed: message.gasLimit,
        },
      }
    }

    await this._state.clearContractStorage(message.to)

    const newContractEvent: NewContractEvent = {
      address: message.to,
      code: message.code,
    }

    await this._vm._emit('newContract', newContractEvent)

    toAccount = await this._state.getAccount(message.to)
    toAccount.nonce = new BN(toAccount.nonce).addn(1).toArrayLike(Buffer)

    // Add tx value to the `to` account
    await this._addToBalance(toAccount, message)

    if (!message.code || message.code.length === 0) {
      return {
        gasUsed: new BN(0),
        createdAddress: message.to,
        execResult: {
          gasUsed: new BN(0),
          returnValue: Buffer.alloc(0),
        },
      }
    }

    let result = await this.runInterpreter(message)

    // fee for size of the return value
    let totalGas = result.gasUsed
    if (!result.exceptionError) {
      const returnFee = new BN(
        result.returnValue.length * this._vm._common.param('gasPrices', 'createData'),
      )
      totalGas = totalGas.add(returnFee)
    } else {
      console.log(`VM ERROR`)
      console.log(result.exceptionError)
    }

    // if not enough gas
    if (
      message.fromMainnet || 
      totalGas.lte(message.gasLimit) &&
      (this._vm.allowUnlimitedContractSize || result.returnValue.length <= 24576)
    ) {
      result.gasUsed = totalGas
    } else {
      result = { ...result, ...OOGResult(message.gasLimit) }
    }

    // Save code if a new contract was created
    if (!result.exceptionError && result.returnValue && result.returnValue.toString() !== '') {
      console.log('Stored code!')
      await this._state.putContractCode(message.to, result.returnValue)
    }
    const _code = await this._state.getContractCode(message.to)
    console.log(`Created Contract at ${message.to.toString('hex')} with code:`)
    console.log(_code)
    console.log(message)
    if (message.fromMainnet) console.log(`Expected Contract at ${message.mainnetAddress.toString('hex')}`)
    const retval = {
      gasUsed: result.gasUsed,
      createdAddress: message.to,
      execResult: result,
    }
		if (message.fromMainnet) {
		  retval.gasUsed = new BN(0);
		  retval.execResult.gasUsed = new BN(0);
		}
		return retval;
  }

  /**
   * Starts the actual bytecode processing for a CALL or CREATE, providing
   * it with the [[EEI]].
   */
  async runInterpreter(message: Message, opts: InterpreterOpts = {}): Promise<ExecResult> {
    const env = {
      blockchain: this._vm.blockchain, // Only used in BLOCKHASH
      address: message.to || zeros(32),
      caller: message.caller || zeros(32),
      callData: message.data || Buffer.from([0]),
      callValue: message.value || new BN(0),
      code: message.code as Buffer,
      isStatic: message.isStatic || false,
      depth: message.depth || 0,
      gasPrice: this._tx.gasPrice,
      origin: this._tx.origin || message.caller || zeros(32),
      block: this._block || new Block(),
      contract: await this._state.getAccount(message.to || zeros(32)),
    }
    const eei = new EEI(env, this._state, this, this._vm._common, message.gasLimit.clone())
    if (message.selfdestruct) {
      eei._result.selfdestruct = message.selfdestruct
    }

    const interpreter = new Interpreter(this._vm, eei)
    const interpreterRes = message.mainnetAddress ? {
      runState: interpreter._runState,
      exceptionError: undefined,
    } : await interpreter.run(message.code as Buffer, opts)

    let result = eei._result
    let gasUsed = message.gasLimit.sub(eei._gasLeft)
    if (interpreterRes.exceptionError) {
      if (interpreterRes.exceptionError.error !== ERROR.REVERT) {
        gasUsed = message.gasLimit
      }

      // Clear the result on error
      result = {
        ...result,
        logs: [],
        exits: [],
        gasRefund: new BN(0),
        selfdestruct: {},
      }
    }
    let returnValue;
    if (message.mainnetAddress) returnValue = message.code as Buffer;
    else returnValue = result.returnValue ? result.returnValue : Buffer.alloc(0)
    return {
      ...result,
      runState: {
        ...interpreterRes.runState!,
        ...result,
        ...eei._env,
      },
      exceptionError: interpreterRes.exceptionError,
      gas: eei._gasLeft,
      gasUsed,
      returnValue,
    }
  }

  /**
   * Returns code for precompile at the given address, or undefined
   * if no such precompile exists.
   */
  getPrecompile(address: Buffer): PrecompileFunc {
    return getPrecompile(address.toString('hex'))
  }

  /**
   * Executes a precompiled contract with given data and gas limit.
   */
  runPrecompile(code: PrecompileFunc, data: Buffer, gasLimit: BN, value: BN, caller: Buffer): ExecResult {
    if (typeof code !== 'function') {
      throw new Error('Invalid precompile')
    }

    const opts = {
      data,
      gasLimit,
      _common: this._vm._common,
      value,
      caller,
    }

    return code(opts)
  }

  async _loadCode(message: Message): Promise<void> {
    if (!message.code) {
      const precompile = this.getPrecompile(message.codeAddress)
      if (precompile) {
        message.code = precompile
        message.isCompiled = true
      } else {
        message.code = await this._state.getContractCode(message.codeAddress)
        message.isCompiled = false
      }
    }
  }

  async _generateAddress(message: Message): Promise<Buffer> {
    let addr
    if (message.mainnetAddress) {
      addr = Buffer.isBuffer(message.mainnetAddress) ? message.mainnetAddress : Buffer.from(stripHexPrefix(message.mainnetAddress), 'hex');
    } else if (message.salt) {
      addr = generateAddress2(message.caller, message.salt, message.code as Buffer)
    } else {
      const acc = await this._state.getAccount(message.caller)
      const newNonce = new BN(acc.nonce).subn(1)
      addr = generateAddress(message.caller, newNonce.toArrayLike(Buffer))
    }
		console.log(addr);
    return addr
  }

  async _reduceSenderBalance(account: Account, message: Message): Promise<void> {
    if (message.fromMainnet) return;
    const newBalance = new BN(account.balance).sub(message.value)
    account.balance = toBuffer(newBalance)
    return this._state.putAccount(toBuffer(message.caller), account)
  }

  async _addToBalance(toAccount: Account, message: Message): Promise<void> {
    const newBalance = new BN(toAccount.balance).add(message.value)
    if (newBalance.gt(MAX_INTEGER)) {
      throw new Error('Value overflow')
    }
    toAccount.balance = toBuffer(newBalance)
    // putAccount as the nonce may have changed for contract creation
    return this._state.putAccount(toBuffer(message.to), toAccount)
  }

  async _touchAccount(address: Buffer): Promise<void> {
    const acc = await this._state.getAccount(address)
    return this._state.putAccount(address, acc)
  }
}
