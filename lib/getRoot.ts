import Cache from './state/cache'

async function getRoot(stateManager) {
	const newTrie = stateManager._trie.copy(true) as any;
	newTrie._checkpoints = stateManager._trie._checkpoints.slice(0)
	const cache = new Cache(newTrie);
	stateManager._cache._cache.forEach((key, value) => {
		cache._cache = cache._cache.insert(key, value)
	});
	await new Promise((resolve, reject) => cache.flush((err: Error) => err ? reject(err) : resolve()));
	return newTrie._root;
}

export default getRoot;
