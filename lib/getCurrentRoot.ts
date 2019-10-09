'use strict';

async function getCurrentRoot(stateManager) {
	stateManager._cache._trie = stateManager._trie;
	stateManager._cache.checkpoint();
	stateManager._trie.checkpoint();
	await new Promise((resolve, reject) => stateManager._cache.flush((err) => err ? reject(err) : resolve()));
	const root = '0x' + stateManager._trie.root.toString('hex');
	return root;
};

export default getCurrentRoot;
