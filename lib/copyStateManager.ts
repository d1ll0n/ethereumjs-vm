const clone = require('clone');
const levelup = require('levelup');
const WriteStream = require('level-ws');
const memdown = require('memdown')

async function copyStateManager(stateManager) {
  const newTrie = stateManager._trie.copy() as any;
  if (newTrie._scratch) {
    const scratch = levelup(memdown());
    const oldScratch = newTrie._scratch;
    newTrie._scratch = scratch;
    newTrie._getDBs = [newTrie._scratch].concat(newTrie._getDBs);
    newTrie.__putDBs = newTrie._putDBs;
    newTrie._putDBs = [newTrie._scratch];
    newTrie._putRaw = newTrie.putRaw;
    newTrie.putRaw = stateManager._trie.putRaw;
    newTrie._checkpoints = stateManager._trie._checkpoints.slice();
    await new Promise((resolve, reject) => newTrie.createScratchReadStream(oldScratch)
      .pipe(WriteStream(scratch))
      .on('close', (err, result) => err ? reject(err) : resolve(result)))
  }
  return Object.assign({}, stateManager, {
    _trie: newTrie,
  	_cache: Object.assign(clone(stateManager._cache), {
  		_checkpoints: stateManager._cache._checkpoints.slice()
  	})
	});
}

export default copyStateManager;
