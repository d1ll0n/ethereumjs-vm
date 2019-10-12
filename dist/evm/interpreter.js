"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var BN = require("bn.js");
var exceptions_1 = require("../exceptions");
var memory_1 = require("./memory");
var stack_1 = require("./stack");
var opFns_js_1 = require("./opFns.js");
var getRoot_1 = require("../getRoot");
var _a = require('ethereumjs-util'), toHex = _a.toHex, addHexPrefix = _a.addHexPrefix, stripHexPrefix = _a.stripHexPrefix, bufferToHex = _a.bufferToHex;
var _b = require('web3-utils'), soliditySha3 = _b.soliditySha3, leftPad = _b.leftPad;
var copyStep = function (step) { return Object.assign({}, step, {
    opcode: Object.assign({}, step.opcode),
    stack: step.stack.slice(),
    memory: step.memory.slice()
}); };
var addOneToStackOffset = [
    'callcode',
    'call'
].reduce(function (r, v) {
    r[v] = true;
    return r;
}, {});
var fromBack = function (ary, n) {
    if (n === void 0) { n = 0; }
    return ary[ary.length - (1 + n)];
};
var formatWord = function (word) { return addHexPrefix(leftPad(word.toString(16), 64)); };
var wordToBool = function (word) { return !word.isZero(); };
var wordToNumber = function (word) { return word.toString(10); };
var wordToDouble = function (word) { return Number(word); };
var byteLength = function (word) { return Math.ceil(stripHexPrefix(word.toString(16)).length / 2); };
var wordToAddress = function (word) { return addHexPrefix(leftPad(word.toString(16), 64).substr(24)); };
var mslice = function (segment, start, length) { return addHexPrefix(segment.map(function (v) { return leftPad(v.toString(16), 2); }).join('').substr(start * 2, length * 2)); };
function onStep(vm, step) {
    return __awaiter(this, void 0, void 0, function () {
        var sioMap, op, returndata, _a, current, precompiled, sio, lastOp, _b, _c, _d, _e, _f, topicCount, topics, data, log_1, internalTransactionHash, calldata, internal, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    sioMap = vm.sioMap;
                    delete sioMap.possibleUncaughtFailure;
                    op = step.opcode.name.toLowerCase();
                    if (!sioMap.depthTrigger[step.depth]) return [3 /*break*/, 2];
                    delete sioMap.lastReturnData;
                    _a = sioMap.depthTrigger[step.depth], current = _a.current, precompiled = _a.precompiled, sio = _a.sio;
                    lastOp = sioMap.lastStep.opcode.name.toLowerCase();
                    if (precompiled)
                        Object.assign(sio.metadata, {
                            returndatasize: precompiled[1],
                            returndata: mslice(step.memory, precompiled[0], precompiled[1]),
                            callsuccess: true
                        });
                    else
                        switch (lastOp) {
                            case 'return':
                            case 'revert':
                            case 'invalid':
                                returndata = lastOp === 'invalid' ? '0x' : mslice(sioMap.lastStep.memory, wordToDouble(fromBack(sioMap.lastStep.stack)), wordToDouble(fromBack(sioMap.lastStep.stack, 1)));
                                Object.assign(sio.metadata, {
                                    returndatasize: byteLength(returndata),
                                    returndata: returndata,
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
                    _b = sioMap.current;
                    return [4 /*yield*/, getRoot_1.default(sioMap.lastStep.stateManager)];
                case 1:
                    _b.stateRootLeave = _h.sent();
                    sioMap.current.callsuccess = sio.metadata.callsuccess;
                    sioMap.current = current;
                    sioMap.currentAddress = sioMap.current.caller;
                    delete sioMap.depthTrigger[step.depth];
                    Array(sioMap.lastStep.depth - step.depth).fill(0).forEach(function () {
                        sioMap.callStack.pop();
                    });
                    sioMap.depth = step.depth;
                    _h.label = 2;
                case 2:
                    if (!step.stack)
                        return [2 /*return*/];
                    if (!sioMap.trigger) return [3 /*break*/, 9];
                    _c = sioMap.trigger.opcode;
                    switch (_c) {
                        case 'sload': return [3 /*break*/, 3];
                        case 'sstore': return [3 /*break*/, 4];
                        case 'balance': return [3 /*break*/, 6];
                        case 'blockhash': return [3 /*break*/, 7];
                    }
                    return [3 /*break*/, 8];
                case 3:
                    sioMap.trigger.metadata.value = formatWord(fromBack(step.stack));
                    sioMap.current.sio.push(sioMap.trigger);
                    return [3 /*break*/, 8];
                case 4:
                    _d = sioMap.trigger.metadata;
                    return [4 /*yield*/, getRoot_1.default(step.stateManager)];
                case 5:
                    _d.stateRoot = _h.sent();
                    sioMap.current.sio.push(sioMap.trigger);
                    return [3 /*break*/, 8];
                case 6:
                    sioMap.trigger.metadata.balance = wordToNumber(fromBack(step.stack));
                    sioMap.current.sio.push(sioMap.trigger);
                    return [3 /*break*/, 8];
                case 7:
                    sioMap.trigger.metadata.number = wordToNumber(fromBack(step.stack));
                    sioMap.current.sio.push(sioMap.trigger);
                    return [3 /*break*/, 8];
                case 8:
                    delete sioMap.trigger;
                    _h.label = 9;
                case 9:
                    if (!sioMap.internalCallTrigger) return [3 /*break*/, 12];
                    if (!(step.depth === sioMap.internalCallTrigger)) return [3 /*break*/, 11];
                    _e = sioMap.current;
                    return [4 /*yield*/, getRoot_1.default(step.stateManager)];
                case 10:
                    _e.stateRootEnter = _h.sent();
                    _h.label = 11;
                case 11:
                    delete sioMap.internalCallTrigger;
                    _h.label = 12;
                case 12:
                    _f = op;
                    switch (_f) {
                        case 'sstore': return [3 /*break*/, 13];
                        case 'sload': return [3 /*break*/, 14];
                        case 'balance': return [3 /*break*/, 15];
                        case 'blockhash': return [3 /*break*/, 16];
                        case 'log0': return [3 /*break*/, 17];
                        case 'log1': return [3 /*break*/, 17];
                        case 'log2': return [3 /*break*/, 17];
                        case 'log3': return [3 /*break*/, 17];
                        case 'log4': return [3 /*break*/, 17];
                        case 'return': return [3 /*break*/, 18];
                        case 'revert': return [3 /*break*/, 19];
                        case 'invalid': return [3 /*break*/, 19];
                        case 'call': return [3 /*break*/, 20];
                        case 'callcode': return [3 /*break*/, 20];
                        case 'delegatecall': return [3 /*break*/, 20];
                        case 'staticcall': return [3 /*break*/, 20];
                    }
                    return [3 /*break*/, 23];
                case 13:
                    sioMap.trigger = {
                        opcode: op,
                        metadata: {
                            slot: formatWord(fromBack(step.stack)),
                            value: formatWord(fromBack(step.stack, 1))
                        }
                    };
                    return [3 /*break*/, 23];
                case 14:
                    sioMap.trigger = {
                        opcode: op,
                        metadata: {
                            slot: formatWord(fromBack(step.stack))
                        }
                    };
                    return [3 /*break*/, 23];
                case 15:
                    sioMap.trigger = {
                        opcode: op,
                        metadata: {
                            address: wordToAddress(fromBack(step.stack))
                        }
                    };
                    return [3 /*break*/, 23];
                case 16:
                    sioMap.trigger = {
                        opcode: op,
                        metadata: {
                            hash: formatWord(fromBack(step.stack))
                        }
                    };
                    return [3 /*break*/, 23];
                case 17:
                    topicCount = Number(op[op.length - 1]);
                    topics = Array(topicCount).fill(0).map(function (_, i) { return formatWord(fromBack(step.stack, i + 2)); });
                    data = mslice(step.memory, wordToDouble(fromBack(step.stack, 0)), wordToDouble(fromBack(step.stack, 1)));
                    log_1 = {
                        address: sioMap.currentAddress,
                        data: data,
                        removed: false,
                        topics: topics,
                        transactionHash: sioMap.receipts[0].transactionHash
                    };
                    sioMap.callStack.concat(sioMap.receipts.indexOf(sioMap.current)).forEach(function (index) {
                        sioMap.receipts[index].logs.push(log_1);
                    });
                    return [3 /*break*/, 23];
                case 18:
                    sioMap.lastReturnData = mslice(step.memory, wordToDouble(fromBack(step.stack)), wordToDouble(fromBack(step.stack, 1)));
                    return [3 /*break*/, 23];
                case 19:
                    sioMap.possibleUncaughtFailure = true;
                    if (op === 'revert')
                        sioMap.lastReturnData = mslice(step.memory, wordToDouble(fromBack(step.stack)), wordToDouble(fromBack(step.stack, 1)));
                    return [3 /*break*/, 23];
                case 20:
                    sioMap.callStack.push(sioMap.receipts.indexOf(sioMap.current));
                    sioMap.depth++;
                    internalTransactionHash = soliditySha3({
                        t: 'bytes32',
                        v: sioMap.current.transactionHash
                    }, {
                        t: 'uint256',
                        v: sioMap.current.internal.length
                    });
                    sioMap.current.internal.push(internalTransactionHash);
                    calldata = addOneToStackOffset[op] ? mslice(step.memory, wordToDouble(fromBack(step.stack, 3)), wordToDouble(fromBack(step.stack, 4))) : mslice(step.memory, wordToDouble(fromBack(step.stack, 2)), wordToDouble(fromBack(step.stack, 3)));
                    internal = {
                        opcode: op,
                        metadata: {
                            receipthash: internalTransactionHash,
                            gas: wordToNumber(fromBack(step.stack)),
                            address: wordToAddress(fromBack(step.stack, 1)),
                            calldatahash: (function (input) { return input === '0x' ? soliditySha3('') : soliditySha3({
                                t: 'bytes',
                                v: input
                            }); })(calldata)
                        }
                    };
                    if (!(op === 'call' || op === 'callcode')) return [3 /*break*/, 22];
                    _g = internal.metadata;
                    return [4 /*yield*/, getRoot_1.default(step.stateManager)];
                case 21:
                    _g.stateRoot = _h.sent();
                    _h.label = 22;
                case 22:
                    if (addOneToStackOffset[op])
                        internal.metadata.callvalue = wordToNumber(fromBack(step.stack, 2));
                    sioMap.depthTrigger[step.depth] = {
                        current: sioMap.current,
                        sio: internal
                    };
                    if (Number(internal.address) > 0 && Number(internal.address) < 8)
                        sioMap.depthTrigger[step.depth].precompiled = addOneToStackOffset[op] ? [wordToDouble(fromBack(step.stack, 5)), wordToDouble(fromBack(step.stack, 6))] : [wordToDouble(fromBack(step.stack, 4)), wordToDouble(fromBack(step.stack, 5))];
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
                    }));
                    sioMap.internalCallTrigger = step.depth + 1;
                    if (op !== 'delegatecall')
                        sioMap.currentAddress = internal.metadata.address;
                    return [3 /*break*/, 23];
                case 23:
                    sioMap.lastStep = step;
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Parses and executes EVM bytecode.
 */
var Interpreter = /** @class */ (function () {
    function Interpreter(vm, eei) {
        this._vm = vm; // TODO: remove when not needed
        this._state = vm.pStateManager;
        this._eei = eei;
        this._runState = {
            programCounter: 0,
            opCode: 0xfe,
            memory: new memory_1.default(),
            memoryWordCount: new BN(0),
            highestMemCost: new BN(0),
            stack: new stack_1.default(),
            code: Buffer.alloc(0),
            validJumps: [],
            // TODO: Replace with EEI methods
            _common: this._vm._common,
            stateManager: this._state._wrapped,
            eei: this._eei,
        };
    }
    Interpreter.prototype.run = function (code, opts) {
        if (opts === void 0) { opts = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var pc, err, opCode, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this._runState.code = code;
                        this._runState.programCounter = opts.pc || this._runState.programCounter;
                        this._runState.validJumps = this._getValidJumpDests(code);
                        pc = this._runState.programCounter;
                        if (pc !== 0 && (pc < 0 || pc >= this._runState.code.length)) {
                            throw new Error('Internal error: program counter not in range');
                        }
                        _a.label = 1;
                    case 1:
                        if (!(this._runState.programCounter < this._runState.code.length)) return [3 /*break*/, 7];
                        opCode = this._runState.code[this._runState.programCounter];
                        this._runState.opCode = opCode;
                        return [4 /*yield*/, this._runStepHook()];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, this.runStep()];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_1 = _a.sent();
                        // STOP is not an exception
                        if (e_1.error !== exceptions_1.ERROR.STOP) {
                            err = e_1;
                        }
                        // TODO: Throw on non-VmError exceptions
                        return [3 /*break*/, 7];
                    case 6: return [3 /*break*/, 1];
                    case 7: return [2 /*return*/, {
                            runState: this._runState,
                            exceptionError: err,
                        }];
                }
            });
        });
    };
    /**
     * Executes the opcode to which the program counter is pointing,
     * reducing it's base gas cost, and increments the program counter.
     */
    Interpreter.prototype.runStep = function () {
        return __awaiter(this, void 0, void 0, function () {
            var opInfo, opFn;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        opInfo = this.lookupOpInfo(this._runState.opCode);
                        // Check for invalid opcode
                        if (opInfo.name === 'INVALID') {
                            throw new exceptions_1.VmError(exceptions_1.ERROR.INVALID_OPCODE);
                        }
                        // Reduce opcode's base fee
                        this._eei.useGas(new BN(opInfo.fee));
                        // Advance program counter
                        this._runState.programCounter++;
                        opFn = this.getOpHandler(opInfo);
                        if (!opInfo.isAsync) return [3 /*break*/, 2];
                        return [4 /*yield*/, opFn.apply(null, [this._runState])];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        opFn.apply(null, [this._runState]);
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get the handler function for an opcode.
     */
    Interpreter.prototype.getOpHandler = function (opInfo) {
        return opFns_js_1.handlers[opInfo.name];
    };
    /**
     * Get info for an opcode from VM's list of opcodes.
     */
    Interpreter.prototype.lookupOpInfo = function (op, full) {
        if (full === void 0) { full = false; }
        var opcode = this._vm._opcodes[op]
            ? this._vm._opcodes[op]
            : { name: 'INVALID', fee: 0, isAsync: false };
        if (full) {
            var name = opcode.name;
            if (name === 'LOG') {
                name += op - 0xa0;
            }
            if (name === 'PUSH') {
                name += op - 0x5f;
            }
            if (name === 'DUP') {
                name += op - 0x7f;
            }
            if (name === 'SWAP') {
                name += op - 0x8f;
            }
            return __assign(__assign({}, opcode), { name: name });
        }
        return opcode;
    };
    Interpreter.prototype._runStepHook = function () {
        return __awaiter(this, void 0, void 0, function () {
            var eventObj;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        eventObj = {
                            pc: this._runState.programCounter,
                            gasLeft: this._eei.getGasLeft(),
                            opcode: this.lookupOpInfo(this._runState.opCode, true),
                            stack: this._runState.stack._store,
                            depth: this._eei._env.depth,
                            address: this._eei._env.address,
                            account: this._eei._env.contract,
                            stateManager: this._runState.stateManager,
                            memory: this._runState.memory._store,
                            memoryWordCount: this._runState.memoryWordCount,
                        };
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
                        return [4 /*yield*/, onStep(this._vm, copyStep(eventObj))];
                    case 1:
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
                        _a.sent();
                        return [2 /*return*/, this._vm._emit('step', eventObj)];
                }
            });
        });
    };
    // Returns all valid jump destinations.
    Interpreter.prototype._getValidJumpDests = function (code) {
        var jumps = [];
        for (var i = 0; i < code.length; i++) {
            var curOpCode = this.lookupOpInfo(code[i]).name;
            // no destinations into the middle of PUSH
            if (curOpCode === 'PUSH') {
                i += code[i] - 0x5f;
            }
            if (curOpCode === 'JUMPDEST') {
                jumps.push(i);
            }
        }
        return jumps;
    };
    return Interpreter;
}());
exports.default = Interpreter;
//# sourceMappingURL=interpreter.js.map