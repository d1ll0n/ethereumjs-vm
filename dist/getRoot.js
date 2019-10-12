"use strict";
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
var clone = require('clone');
var level = require('level-mem');
var WriteStream = require('level-ws');
function getRoot(stateManager) {
    return __awaiter(this, void 0, void 0, function () {
        var newTrie, scratch_1, _cache, _checkpoints, _oldCache;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    newTrie = stateManager._trie.copy();
                    newTrie._checkpoints = stateManager._trie._checkpoints.slice();
                    if (!newTrie._scratch) return [3 /*break*/, 2];
                    scratch_1 = level();
                    return [4 /*yield*/, new Promise(function (resolve, reject) { return newTrie.createScratchReadStream(newTrie._scratch).pipe(WriteStream(scratch_1)).on('end', function () { return resolve(); }); })];
                case 1:
                    _a.sent();
                    newTrie._scratch = scratch_1;
                    newTrie._getDBs = [newTrie._scratch].concat(newTrie._getDBs.slice(1));
                    newTrie.__putDBs = newTrie._putDBs;
                    newTrie._putDBs = [newTrie._scratch];
                    newTrie._putRaw = newTrie.putRaw;
                    newTrie.putRaw = stateManager._trie.putRaw;
                    _a.label = 2;
                case 2:
                    _cache = stateManager;
                    _checkpoints = _cache._checkpoints, _oldCache = _cache._cache;
                    _cache._trie = newTrie;
                    _cache._checkpoints = _checkpoints.slice();
                    return [4 /*yield*/, new Promise(function (resolve, reject) { return _cache.flush(function (err) { return err ? reject(err) : resolve(); }); })];
                case 3:
                    _a.sent();
                    _cache._cache = _oldCache;
                    _cache._checkpoints = _checkpoints;
                    return [2 /*return*/, newTrie._root];
            }
        });
    });
}
exports.default = getRoot;
//# sourceMappingURL=getRoot.js.map