const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');
const root = join(__dirname, '..');
const context = vm.createContext({TextEncoder});
vm.runInContext('const window = globalThis;', context);
for (const file of ['reactions.js', 'li-data.js', 'mundy-data.js', 'catalog.js', 'backend.js']) {
  vm.runInContext(readFileSync(join(root, 'assets', file), 'utf8'), context, {filename: file});
}
vm.runInContext(`
const sourceCatalog = [...reactionCatalog, ...liCatalog, ...mundyCatalog];
const reactions = consolidateReactions(sourceCatalog, liCoverage, mundyCoverage);
const catalog = {reactions: reactions.map(r => r.id), categories: bookCategories.map(c => c.id),
  mundyCategories: [...new Set(mundyCatalog.flatMap(r => r.categories))], books: ['all', 'kurti', 'li', 'mundy']};
`, context);
const read = expression => JSON.parse(vm.runInContext(`JSON.stringify(${expression})`, context));
const evaluate = expression => vm.runInContext(expression, context);

test('one study entry per reaction, including alternate names across sources', () => {
  const reactions = read('reactions');
  assert.equal(reactions.length, 468);
  assert.equal(new Set(reactions.map(r => r.id)).size, reactions.length);
  const normalize = name => name.normalize('NFKD').replace(/[^a-z0-9]/gi, '').toLowerCase();
  assert.equal(new Set(reactions.map(r => normalize(r.name))).size, reactions.length);
  for (const [oldId, id] of Object.entries(read('reactionIdAliases'))) {
    assert(!reactions.some(r => r.id === oldId));
    const target = reactions.find(r => r.id === id);
    const old = target.mergedEntries.find(r => r.id === oldId);
    assert(old);
    assert(target.aliases.includes(old.name));
    assert(target.books.includes('mundy'));
  }
  // A similar surname or a different transformation must not collapse a card.
  for (const id of ['pinacol', 'mundy-pinacol-coupling', 'wolff', 'wolff-rearrangement',
    'mundy-woodward-cis-hydroxylation', 'prevost-reaction', 'mundy-azo-cope-rearrangement', 'aza-cope-rearrangement']) {
    assert(reactions.some(r => r.id === id), id);
  }
});

test('every Mundy addition has reviewed existing categories in both manifest and generated data', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'scripts/mundy-entries.json'), 'utf8'));
  const categories = new Set(read('catalog.categories'));
  for (const r of read('mundyCatalog')) {
    assert(r.categories.length > 0);
    assert(r.categories.every(id => categories.has(id) && id !== 'not-listed'));
    assert.equal(r.category, r.categories[0]);
    const entry = manifest.find(e => e.id === r.id && e.status === 'new');
    assert.deepEqual(r.categories, entry.categories);
    assert.equal(r.summary, entry.summary);
  }
  const expected = {
    'mundy-dowdbeckwith-ring-expansion': ['ring-expansion', 'radical-reactions'],
    'mundy-rosenmund-reduction': ['reduction'],
    'mundy-duff-reaction': ['electrophilic-aromatic-substitution'],
    'mundy-leimgruberbatcho-indole-synthesis': ['heterocycle-formation', 'reduction'],
    'mundy-liebeskindsrogl-coupling': ['transition-metal-catalyzed-couplings'],
  };
  for (const [id, categories] of Object.entries(expected)) {
    const r = read(`reactions.find(r => r.id === '${id}')`);
    assert(categories.every(c => r.categories.includes(c)));
  }
});

test('overlapping categories and every book produce unique study pools', () => {
  const reactions = read('reactions');
  for (const book of ['all', 'kurti', 'li', 'mundy']) {
    const selected = new Set(['heterocycle-formation', 'pericyclic-reactions', 'rearrangements']);
    const pool = reactions.filter(r => (book === 'all' || r.books.includes(book)) && r.categories.some(c => selected.has(c)));
    assert(pool.length);
    assert.equal(new Set(pool.map(r => r.id)).size, pool.length);
  }
  assert.equal(reactions.filter(r => r.books.includes('mundy')).length, 403);
  assert.equal(reactions.filter(r => r.sourceBook === 'mundy').length, 181);
});

const oldState = {
  saved: ['mundy-kulinkovich-reaction', 'kulinkovich-reaction', 'mundy-smith-indole-synthesis'],
  attempts: [{id: 'mundy-kulinkovich-reaction', correct: true, at: '2026-10-25T12:00:00Z'},
    {id: 'kulinkovich-reaction', correct: false, at: '2026-10-26T12:00:00Z'}],
  sessions: [{title: 'Old quiz', total: 2, correct: 1, seconds: 14, at: '2026-10-26T12:00:00Z'}],
  flashcardReviews: {
    'mundy-kulinkovich-reaction': {rating: 'known', at: '2026-10-26T12:00:00Z'},
    'kulinkovich-reaction': {rating: 'again', at: '2026-10-25T12:00:00Z'},
  },
  categoryVersion: 3, selectedCategories: ['mundy-additions'], bookFilter: 'all',
};
function migrate(state, cloud = false) {
  context.input = JSON.parse(JSON.stringify(state));
  return read(cloud ? 'window.validateStudyBackup({schema_version: 1, payload: input}, catalog)' : 'migrateStudyProgress(input, catalog)');
}

test('local upgrades and cloud restores retain saves, all attempts, sessions and latest ratings', () => {
  for (const cloud of [false, true]) {
    const result = migrate(oldState, cloud);
    assert.deepEqual(result.saved, ['kulinkovich-reaction', 'madelung-indole-synthesis']);
    assert.deepEqual(result.attempts, oldState.attempts.map(a => ({...a, id: 'kulinkovich-reaction'})));
    assert.deepEqual(result.sessions, oldState.sessions);
    assert.deepEqual(result.flashcardReviews, {'kulinkovich-reaction': oldState.flashcardReviews['mundy-kulinkovich-reaction']});
    assert.equal(result.bookFilter, 'mundy');
    assert.equal(result.categoryVersion, 4);
    assert.deepEqual(result.selectedCategories, read('catalog.categories'));
    assert.deepEqual(migrate(result, cloud), result, 'Migration must be idempotent');
  }
});

test('category migration preserves all, custom, mixed and intentionally empty selections', () => {
  for (const cloud of [false, true]) {
    for (const selectedCategories of [[], ['oxidation'], ['not-listed', 'reduction']]) {
      const result = migrate({...oldState, selectedCategories}, cloud);
      assert.deepEqual(new Set(result.selectedCategories), new Set(selectedCategories));
      assert.equal(result.bookFilter, 'all');
    }
    const all = migrate({...oldState, selectedCategories: [...read('catalog.categories'), 'mundy-additions']}, cloud);
    assert.deepEqual(all.selectedCategories, read('catalog.categories'));
    assert.equal(all.bookFilter, 'all');
    const mixed = migrate({...oldState, selectedCategories: ['not-listed', 'mundy-additions']}, cloud);
    assert(mixed.selectedCategories.includes('not-listed'));
    assert(mixed.selectedCategories.includes('oxidation'));
    assert(!mixed.selectedCategories.includes('mundy-additions'));
    assert.equal(mixed.bookFilter, 'all');
    const legacy = migrate({...oldState, categoryVersion: 1, selectedCategories: ['old-category']}, cloud);
    assert.deepEqual(legacy.selectedCategories, read('catalog.categories'));
  }
});

test('cloud validation still rejects malformed data before migration', () => {
  context.input = {...oldState, attempts: [{id: 'mundy-kulinkovich-reaction', correct: 'yes', at: 'bad'}]};
  assert.throws(() => evaluate('window.validateStudyBackup({schema_version: 1, payload: input}, catalog)'), /invalid/);
});

test('folders survive migration and cloud round trips without duplicate or unsaved memberships', () => {
  const savedFolders = [
    {id: 'folder-one', name: 'Exam revision', reactionIds: ['mundy-kulinkovich-reaction', 'kulinkovich-reaction', 'unknown', 'aldol']},
    {id: 'folder-two', name: 'Later', reactionIds: ['kulinkovich-reaction', 'mundy-smith-indole-synthesis']},
  ];
  for (const cloud of [false, true]) {
    assert.deepEqual(migrate(oldState, cloud).savedFolders, []);
    const result = migrate({...oldState, savedFolders}, cloud);
    assert.deepEqual(result.savedFolders, [
      {id: 'folder-one', name: 'Exam revision', reactionIds: ['kulinkovich-reaction']},
      {id: 'folder-two', name: 'Later', reactionIds: ['madelung-indole-synthesis']},
    ]);
    assert.deepEqual(migrate(result, cloud), result);
  }
});

test('cloud validation rejects malformed folders before replacing local progress', () => {
  for (const savedFolders of [null, {}, [{id: 'bad"id', name: 'Exam', reactionIds: []}],
    [{id: 'folder-one', name: ' ', reactionIds: []}],
    [{id: 'folder-one', name: 'x'.repeat(81), reactionIds: []}],
    [{id: 'folder-one', name: 'Exam', reactionIds: [null]}]]) {
    assert.throws(() => migrate({...oldState, savedFolders}, true), /invalid/);
  }
});
