'use strict';

// Reviewed overlaps, not fuzzy name matches: similarly named reactions can have
// different chemistry. Keep source records and figures, but study each entry once.
const reactionIdAliases = {
  'mundy-kulinkovich-reaction': 'kulinkovich-reaction',
  // The existing Kornblum scheme explicitly includes the Ganem oxidation.
  'mundy-ganem-oxidation': 'kornblum-oxidation',
  // The existing Madelung scheme and mechanism both include the Smith synthesis.
  'mundy-smith-indole-synthesis': 'madelung-indole-synthesis',
  // Fischer indolization of a cyclic ketone arylhydrazone gives tetrahydrocarbazole.
  'mundy-borschedrechsel-cyclization': 'fischer-indole-synthesis',
};

function consolidateReactions(catalog, liCoverage, mundyCoverage) {
  const entries = catalog.map(r => ({...r, categories: [...r.categories],
    sourceBook: r.sourceBook || 'kurti', mergedEntries: [],
    books: [...new Set([r.sourceBook || 'kurti',
      ...(liCoverage[r.id] ? ['li'] : []), ...(mundyCoverage[r.id] ? ['mundy'] : [])])],
  }));
  const byId = new Map(entries.map(r => [r.id, r]));
  for (const [oldId, id] of Object.entries(reactionIdAliases)) {
    const old = byId.get(oldId), target = byId.get(id);
    if (!old || !target) throw new Error(`Missing reaction merge: ${oldId} → ${id}`);
    target.aliases = [target.aliases, old.name, old.aliases].filter(Boolean).join('; ');
    target.books = [...new Set([...target.books, ...old.books])];
    target.categories = [...new Set([...target.categories, ...old.categories])];
    // A typed Mundy membership replaces the fallback for an unclassified chapter.
    if (target.categories.length > 1) target.categories = target.categories.filter(c => c !== 'not-listed');
    target.category = target.categories[0];
    target.mergedEntries.push(old);
  }
  return entries.filter(r => !Object.hasOwn(reactionIdAliases, r.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Used for browser upgrades and validated cloud restores. Always remap IDs so
// importing an older backup also preserves saves, answers and the latest rating.
function migrateStudyProgress(data, catalog) {
  const canonicalId = id => Object.hasOwn(reactionIdAliases, id) ? reactionIdAliases[id] : id;
  const reviews = {};
  for (const [oldId, review] of Object.entries(data.flashcardReviews || {})) {
    const id = canonicalId(oldId);
    if (!Object.hasOwn(reviews, id) || Date.parse(review.at) > Date.parse(reviews[id].at)) {
      Object.defineProperty(reviews, id, {value: review, enumerable: true, configurable: true, writable: true});
    }
  }
  let selected = Array.isArray(data.selectedCategories) ? data.selectedCategories : catalog.categories;
  let bookFilter = data.bookFilter;
  if (!data.categoryVersion || data.categoryVersion < 2) selected = catalog.categories;
  if (data.categoryVersion < 4 && selected.includes('mundy-additions')) {
    // A former Mundy-only selection is now expressed by the source filter.
    if (selected.length === 1) {
      selected = catalog.categories;
      if (!bookFilter || bookFilter === 'all') bookFilter = 'mundy';
    } else {
      selected = [...new Set([...selected, ...catalog.mundyCategories])];
    }
  }
  const saved = [...new Set(data.saved.map(canonicalId))];
  const savedIds = new Set(saved.filter(id => catalog.reactions.includes(id)));
  const folderIds = new Set(), filedIds = new Set();
  const savedFolders = [];
  for (const folder of Array.isArray(data.savedFolders) ? data.savedFolders : []) {
    if (!folder || typeof folder.id !== 'string' || !/^folder-[a-z0-9-]+$/.test(folder.id) ||
        folderIds.has(folder.id) || typeof folder.name !== 'string' || !folder.name.trim() ||
        !Array.isArray(folder.reactionIds)) continue;
    folderIds.add(folder.id);
    const reactionIds = [];
    for (const oldId of folder.reactionIds) {
      const id = canonicalId(oldId);
      if (!savedIds.has(id) || filedIds.has(id)) continue;
      filedIds.add(id); reactionIds.push(id);
    }
    savedFolders.push({id: folder.id, name: folder.name.trim().slice(0, 80), reactionIds});
  }
  return {...data,
    saved, savedFolders,
    attempts: data.attempts.map(a => ({...a, id: canonicalId(a.id)})),
    flashcardReviews: reviews,
    selectedCategories: catalog.categories.filter(id => selected.includes(id)),
    categoryVersion: 4, bookFilter,
  };
}
