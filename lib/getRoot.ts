const clone = require('clone');
const level = require('level-mem');
const WriteStream = require('level-ws');

async function getRoot(stateManager) {
  const newTrie = stateManager._trie.copy() as any;
	newTrie._checkpoints = stateManager._trie._checkpoints.slice();
  if (newTrie._scratch) {
    const scratch = level();
		await new Promise((resolve, reject) => newTrie.createScratchReadStream(newTrie._scratch).pipe(WriteStream(scratch)).on('end', () => resolve()));
    newTrie._scratch = scratch;
    newTrie._getDBs = [newTrie._scratch].concat(newTrie._getDBs.slice(1));
    newTrie.__putDBs = newTrie._putDBs;
    newTrie._putDBs = [newTrie._scratch];
    newTrie._putRaw = newTrie.putRaw;
    newTrie.putRaw = stateManager._trie.putRaw;
  }
	const _cache = stateManager;
	const {
	  _checkpoints,
		_cache: _oldCache
  } = _cache;
	_cache._trie = newTrie;
	_cache._checkpoints = _checkpoints.slice();
	await new Promise((resolve, reject) => _cache.flush((err) => err ? reject(err) : resolve()));
	_cache._cache = _oldCache;
	_cache._checkpoints = _checkpoints;
	return newTrie._root;
}

export default getRoot;
