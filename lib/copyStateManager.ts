const clone = require('clone');

function copyStateManager(stateManager) {
  return Object.assign({}, stateManager, {
    _trie: stateManager._trie.copy(),
  	_cache: Object.assign(clone(stateManager._cache), {
  		_checkpoints: stateManager._cache._checkpoints.slice()
  	})
	});
}

export default copyStateManager;
