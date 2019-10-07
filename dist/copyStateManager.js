"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var clone = require('clone');
function copyStateManager(stateManager) {
    return Object.assign({}, stateManager, {
        _trie: stateManager._trie.copy(),
        _cache: Object.assign(clone(stateManager._cache), {
            _checkpoints: stateManager._cache._checkpoints.slice()
        })
    });
}
exports.default = copyStateManager;
//# sourceMappingURL=copyStateManager.js.map