'use strict';

const icons = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  flask: '<path d="M9 3h6M10 3v6L4 19a1.4 1.4 0 0 0 1.2 2h13.6a1.4 1.4 0 0 0 1.2-2L14 9V3M7 15h10"/><path d="M10 18h.01M14 17h.01"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
  chart: '<path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4"/>',
  bookmark: '<path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4V4Z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  flame: '<path d="M13 3c1 6-4 6-3 11 2 0 3-2 3-4 4 2 6 5 4 9-3 5-11 3-12-2-1-5 4-8 8-14Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-12 4h2m4 0h2m-8 3h2"/>',
  bond: '<path d="m4 8 8-5 8 5v9l-8 4-8-4V8Zm4 2 4-3m5 3v5m-9 0 4 2"/>',
  shuffle: '<path d="M3 6h3c4 0 7 12 11 12h4m-4-4 4 4-4 4M3 18h3c2 0 3-3 4-5m3-3c1-3 2-4 4-4h4m-4-4 4 4-4 4"/>',
  arrows: '<path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4"/>',
  ring: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z"/><circle cx="12" cy="12" r="5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  book: '<path d="M12 5v16M3 3c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 3-2-3-5-4-9-3V3Z"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.flask}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));

const categories = bookCategories;
const reactions = reactionCatalog;

const storageKey = 'catalyst-progress-v1';
let state = {saved:[], attempts:[], sessions:[]};
let storageAvailable = true;
try { const raw = JSON.parse(localStorage.getItem(storageKey)); if(raw && Array.isArray(raw.saved) && Array.isArray(raw.attempts) && Array.isArray(raw.sessions)) state = raw; } catch { storageAvailable = false; }
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{storageAvailable=false;document.querySelector('.local-status').innerHTML='Progress saved for this visit';}}
if(!storageAvailable) document.querySelector('.local-status').innerHTML='Progress saved for this visit';
let page = 'dashboard', searchTerm = '', quiz = null;
// Retain bookmarks and quiz history when upgrading the original six-category app.
if (state.categoryVersion !== 2) {
  state.selectedCategories = categories.map(c => c.id);
  state.categoryVersion = 2;
}
state.selectedCategories = Array.isArray(state.selectedCategories)
  ? categories.filter(c => state.selectedCategories.includes(c.id)).map(c => c.id)
  : categories.map(c => c.id);
const inCategory = (r, id) => r.categories.includes(id);
const isSelected = r => r.categories.some(id => state.selectedCategories.includes(id));
const selectedReactions = () => reactions.filter(isSelected);
function studyPool(mode) {
  if (mode === 'all') return [...reactions];
  if (categoryFor(mode)) return reactions.filter(r => inCategory(r, mode));
  if (mode === 'collection') return filteredReactions();
  const pool = selectedReactions();
  return mode === 'saved' ? pool.filter(r => state.saved.includes(r.id)) : pool;
}
function selectionTitle() {
  return state.selectedCategories.length === categories.length ? 'All reactions'
    : state.selectedCategories.map(id => categoryFor(id).short).join(' · ');
}
const main = document.querySelector('main');
const quizDialog = document.querySelector('#quiz-dialog');
const reactionDialog = document.querySelector('#reaction-dialog');
let detailReactionId = null;
let detailTab = 'reaction';
const detailTabs = {reaction:'Reaction & conditions', outline:'Outline / history', mechanism:'Mechanism', applications:'Synthetic applications'};
const availableTabs = (tabs, r) => Object.entries(tabs).filter(([key]) => key !== 'applications' || bookReactions[r.id]?.applications?.length);
const categoryFor = id => categories.find(c=>c.id===id);
const categoryLabel = r => r.categories.map(id => categoryFor(id).short).join(' · ');
const colorStyle = c => `--category-color:${c.color};--category-light:${c.light}`;
const escapeHTML = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
function shuffle(items){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
function toast(message){const t=document.querySelector('#toast');t.textContent=message;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2300);}
function streak(){const days = new Set(state.attempts.map(a=>dayKey(new Date(a.at)))); let n=0;const date=new Date();if(!days.has(dayKey(date)))date.setDate(date.getDate()-1);while(days.has(dayKey(date))){n++;date.setDate(date.getDate()-1);}return n;}
function mastered(){return new Set(reactions.filter(r=>{const history=state.attempts.filter(a=>a.id===r.id).slice(-3);return history.length===3&&history.every(a=>a.correct);}).map(r=>r.id));}

function heading(title) {
  return `<div class="page-heading"><h1>${title}</h1></div>`;
}

function statsMarkup() {
  const correct = state.attempts.filter(a => a.correct).length;
  const stats = [
    [new Set(state.attempts.map(a => a.id)).size, `/ ${reactions.length}`, 'Reactions practiced'],
    [state.attempts.length ? Math.round(correct / state.attempts.length * 100) + '%' : '—', '', 'Accuracy'],
    [state.sessions.length, '', 'Quizzes completed'],
    [streak(), streak() === 1 ? 'day' : 'days', 'Current streak'],
  ];
  return `<div class="stats-grid">${stats.map(([value, unit, label]) => `<div><div class="stat-value">${value}<small>${unit}</small></div><div class="stat-label">${label}</div></div>`).join('')}</div>`;
}

function setupCategories() {
  document.querySelector('#category-options').insertAdjacentHTML('beforeend', `
    <label class="category-option all-categories"><input type="checkbox" id="all-categories"><span>All categories</span></label>
    ${categories.map(c => `<label class="category-option"><input type="checkbox" data-category-select="${c.id}"><span>${c.name} <small>(${reactions.filter(r => inCategory(r,c.id)).length})</small></span></label>`).join('')}`);
  document.querySelector('#category-options').addEventListener('change', e => {
    if (e.target.id === 'all-categories') {
      state.selectedCategories = e.target.checked ? categories.map(c => c.id) : [];
    } else if (e.target.dataset.categorySelect) {
      const id = e.target.dataset.categorySelect;
      state.selectedCategories = e.target.checked
        ? [...state.selectedCategories, id]
        : state.selectedCategories.filter(selected => selected !== id);
    } else return;
    persist();
    syncCategories();
    if (page === 'library' || page === 'saved') renderLibraryResults(page === 'saved');
    else render();
  });
  syncCategories();
}

function syncCategories() {
  const all = document.querySelector('#all-categories');
  all.checked = state.selectedCategories.length === categories.length;
  all.indeterminate = state.selectedCategories.length > 0 && !all.checked;
  document.querySelectorAll('[data-category-select]').forEach(input => {
    input.checked = state.selectedCategories.includes(input.dataset.categorySelect);
  });
  document.querySelector('#selection-count').textContent = `${selectedReactions().length} reactions selected`;
}

function dashboard() {
  main.innerHTML = heading('Named reactions') + `
    <p class="intro">${selectedReactions().length ? `${selectedReactions().length} reactions selected. Quiz yourself or browse the library.` : 'Select at least one category to start.'}</p>
    <div class="actions"><button class="button primary" data-start="selected" ${selectedReactions().length ? '' : 'disabled'}>Quiz all selected</button><button class="button secondary" data-flashcards="selected" ${selectedReactions().length ? '' : 'disabled'}>Study flashcards</button><button class="text-button" data-start="mixed" ${selectedReactions().length ? '' : 'disabled'}>Quick quiz</button><button class="text-button" data-start="daily" ${selectedReactions().length ? '' : 'disabled'}>Daily challenge</button><a class="text-button" href="#library">Browse reactions</a></div>
    <p class="catalog-note">250 book entries, plus your original Fischer esterification card. Categories follow appendix 8.3 (pp. 508–517); reactions can belong to more than one category.</p>
    <section class="home-section"><div class="section-heading"><h2>All-time progress</h2><a class="text-button" href="#statistics">View statistics</a></div>${statsMarkup()}</section>`;
}

function filteredReactions(saved = page === 'saved') {
  return reactions.filter(r => (!saved || state.saved.includes(r.id)) &&
    isSelected(r) &&
    `${r.name} ${r.bookName || ''} ${r.summary} ${r.reagents} ${r.equation} ${categoryLabel(r)}`.toLowerCase().includes(searchTerm.toLowerCase()));
}

function library(saved = false) {
  main.innerHTML = heading(saved ? 'Saved reactions' : 'Reaction library') + `
    <div class="search-row"><label class="search-box"><input id="reaction-search" aria-label="Search reactions" placeholder="Search reactions or reagents" value="${escapeHTML(searchTerm)}"></label></div>
    <div class="section-heading"><p id="result-count"></p><div class="actions"><button class="text-button" data-flashcards="collection">Flashcards</button><button class="text-button" data-start="collection">Quiz this selection</button></div></div>
    <div class="library-list" id="library-results"></div>`;
  renderLibraryResults(saved);
  document.querySelector('#reaction-search').addEventListener('input', e => { searchTerm = e.target.value; renderLibraryResults(saved); });
}

function renderLibraryResults(saved) {
  const filtered = filteredReactions(saved);
  document.querySelector('#result-count').textContent = `${filtered.length} reaction${filtered.length === 1 ? '' : 's'}`;
  document.querySelector('[data-start="collection"]').disabled = !filtered.length;
  document.querySelector('[data-flashcards="collection"]').disabled = !filtered.length;
  document.querySelector('#library-results').innerHTML = filtered.length ? filtered.map(r => `
    <article class="reaction-row"><button class="text-button reaction-name" data-detail="${r.id}">${r.name}</button>
    <span class="reaction-category">${categoryLabel(r)}</span>
    <button class="bookmark-button ${state.saved.includes(r.id) ? 'saved' : ''}" data-save="${r.id}" aria-label="${state.saved.includes(r.id) ? 'Unsave' : 'Save'} ${r.name}" aria-pressed="${state.saved.includes(r.id)}">${icon('bookmark')}</button></article>`).join('') :
    `<div class="empty-state"><p>${!state.selectedCategories.length ? 'Select at least one category.' : saved && !state.saved.length ? 'No saved reactions. Bookmark reactions in the library.' : 'No matches. Try a different search or category.'}</p>${saved && !state.saved.length ? '<a href="#library">Browse reactions</a>' : ''}</div>`;
}

function practice() {
  const modes = [
    ['Quick quiz', 'Up to 5 questions from selected categories.', 'mixed'],
    ['Quiz every selected reaction', `${selectedReactions().length} questions from your selected categories, without repeats.`, 'selected'],
    ['All reactions', `All ${reactions.length} reactions, regardless of sidebar selection.`, 'all'],
    ['Daily challenge', 'A daily mix from selected categories.', 'daily'],
    ['Review mistakes', 'Reactions you last answered incorrectly.', 'review'],
    ['Saved reactions', 'Practice your bookmarked reactions.', 'saved'],
  ];
  main.innerHTML = heading('Practice') + `<div class="practice-list">${modes.map(([title, description, mode]) => `<div class="practice-row"><div><h3>${title}</h3><p>${description}</p></div><button class="text-button" data-start="${mode}" aria-label="Start ${title.toLowerCase()}" ${mode === 'all' || selectedReactions().length ? '' : 'disabled'}>Start →</button></div>`).join('')}</div>
    <h2>Practice by appendix category</h2><p class="muted">Each quiz draws from the category shown. Use the sidebar to combine categories in a quick quiz.</p><div class="practice-list">${categories.map(c => `<div class="practice-row"><div><h3>${c.name}</h3><p>${reactions.filter(r => inCategory(r,c.id)).length} reactions</p></div><div class="actions"><button class="text-button" data-start="${c.id}" aria-label="Quiz ${c.name}">Quiz</button><button class="text-button" data-flashcards="${c.id}" aria-label="Flashcards for ${c.name}">Cards</button></div></div>`).join('')}</div>`;
}

const flashcardDialog = document.querySelector('#flashcard-dialog');
const cardModes = {reaction:'Reaction & conditions', name:'Name', mechanism:'Mechanism', outline:'Outline / history'};
const cardViews = {reaction:'Reaction & conditions', outline:'Outline / history', name:'Name', mechanism:'Mechanism', applications:'Synthetic applications'};
// The former "General outline" recall mode asked for the scheme and conditions.
if (state.flashcardViewVersion !== 2 && state.flashcardMode === 'outline') state.flashcardMode = 'reaction';
state.flashcardViewVersion = 2;
if (!Object.hasOwn(cardModes, state.flashcardMode)) state.flashcardMode = 'name';
let deck = null;
function cardModeOptions() {
  return Object.entries(cardModes).map(([value, label]) => `<option value="${value}" ${state.flashcardMode === value ? 'selected' : ''}>${label}</option>`).join('');
}
function flashcards() {
  const count = selectedReactions().length;
  const studied = Object.keys(state.flashcardReviews || {}).length;
  main.innerHTML = heading('Flashcards') + `
    <p class="intro">Study ${count} reactions from: ${escapeHTML(selectionTitle() || 'no categories selected')}. Choose what to recall, then flip to check your answer.</p>
    <label class="flashcard-direction" for="flashcard-mode">Recall
      <select id="flashcard-mode" data-card-mode>${cardModeOptions()}</select>
    </label>
    <p class="muted">Name: identify the reaction from its book figure and reagents. Reaction & conditions, Mechanism, or Outline / history: recall the selected topic from a name. Flip to explore the answer tabs, including synthetic applications.</p>
    <div class="actions"><button class="button primary" data-flashcards="selected" ${count ? '' : 'disabled'}>Study ${count} cards</button><button class="button secondary" data-flashcards="saved" ${selectedReactions().some(r => state.saved.includes(r.id)) ? '' : 'disabled'}>Study saved cards</button></div>
    <p class="catalog-note">${studied} cards reviewed. Choose one or more appendix categories in the sidebar. Your flashcard reviews are saved separately from quiz accuracy.</p>`;
}

function startFlashcards(mode) {
  const pool = studyPool(mode);
  if (!pool.length) { toast('No cards in this selection.'); return; }
  deck = {cards:shuffle(pool), original:[...pool], index:0, revealed:false, ratings:{}, mode:state.flashcardMode, answerView:state.flashcardMode,
    title:categoryFor(mode)?.short || `${mode==='saved' || (mode==='collection' && page==='saved') ? 'Saved · ' : ''}${selectionTitle()}`, finished:false};
  if (reactionDialog.open) reactionDialog.close();
  renderFlashcard(); flashcardDialog.showModal();
}

function cardAnswer(r, view) {
  if (view === 'name') return `<h3>${escapeHTML(r.name)}</h3><p class="muted">${escapeHTML(categoryLabel(r))}</p>`;
  return `<h3>${escapeHTML(r.name)}</h3>${detailPanel(r, view)}`;
}

function renderFlashcard() {
  const r = deck.cards[deck.index];
  const views = availableTabs(cardViews, r);
  if (!views.some(([key]) => key === deck.answerView)) deck.answerView = deck.mode;
  flashcardDialog.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span>${escapeHTML(deck.title)} · ${deck.index+1} / ${deck.cards.length}</span><button class="close-button" data-close="flashcards" aria-label="Close flashcards">×</button></div>
    <div class="quiz-progress"><div style="width:${deck.index/deck.cards.length*100}%"></div></div>
    <label class="flashcard-direction" for="deck-card-mode">Recall<select id="deck-card-mode" data-card-mode>${cardModeOptions()}</select></label>
    <h2 id="flashcard-title" tabindex="-1">${deck.revealed ? cardViews[deck.answerView] : deck.mode==='name' ? 'Name the reaction' : `Recall: ${cardModes[deck.mode]}`}</h2>
    ${deck.revealed ? `<div class="reaction-tabs" role="tablist" aria-label="Answer view">${views.map(([value,label]) => `<button role="tab" id="card-tab-${value}" data-card-view="${value}" aria-controls="card-answer" aria-selected="${deck.answerView===value}" tabindex="${deck.answerView===value ? 0 : -1}">${label}</button>`).join('')}</div>` : ''}
    <div class="flashcard-content" ${deck.revealed ? `id="card-answer" role="tabpanel" tabindex="0" aria-labelledby="card-tab-${deck.answerView}"` : 'aria-live="polite"'}>${deck.revealed
      ? cardAnswer(r, deck.answerView)
      : deck.mode==='name' ? bookFigure(bookSections[r.id].reaction, '', 'Reaction & conditions', true)
      : `<p class="flashcard-prompt">${escapeHTML(r.name)}</p>`}</div>
    <div class="flashcard-controls"><button class="button ${deck.revealed ? 'secondary' : 'primary'}" data-card-flip>${deck.revealed ? 'Flip back' : 'Flip card'}</button>${deck.revealed ? `<button class="button secondary" data-card-rate="again">Study again</button><button class="button primary" data-card-rate="known">Got it</button>` : ''}</div>
    <div class="flashcard-navigation"><button class="text-button" data-card-prev ${deck.index ? '' : 'disabled'}>← Previous</button><button class="text-button" data-card-shuffle>Shuffle deck</button><button class="text-button" data-card-next>${deck.index===deck.cards.length-1 ? 'Finish' : 'Next →'}</button></div>
    <p class="catalog-note">Use ← / → to navigate. Space flips the card when a control is not focused.${deck.ratings[r.id] ? ` Your rating: ${deck.ratings[r.id]==='known' ? 'Got it' : 'Study again'}.` : ''}</p></div>`;
  flashcardDialog.scrollTop = 0;
}

function flipCard() {
  if (!deck || deck.finished) return;
  deck.revealed = !deck.revealed;
  deck.answerView = deck.mode;
  renderFlashcard();
  flashcardDialog.querySelector('#flashcard-title').focus({preventScroll:true});
}

function moveCard(step) {
  if (!deck || deck.finished) return;
  if (deck.index+step >= deck.cards.length) { finishDeck(); return; }
  deck.index = Math.max(0,deck.index+step); deck.revealed = false;
  renderFlashcard(); flashcardDialog.querySelector('[data-card-flip]').focus();
}

function rateCard(rating) {
  if (!deck || !deck.revealed || deck.finished) return;
  const id = deck.cards[deck.index].id;
  deck.ratings[id] = rating;
  state.flashcardReviews ||= {};
  state.flashcardReviews[id] = {rating, at:new Date().toISOString()};
  persist(); moveCard(1);
}

function finishDeck() {
  deck.finished = true;
  const known = deck.cards.filter(r => deck.ratings[r.id]==='known').length;
  const again = deck.cards.filter(r => deck.ratings[r.id]==='again').length;
  flashcardDialog.innerHTML = `<div class="dialog-inner results"><div class="dialog-top"><span>${escapeHTML(deck.title)}</span><button class="close-button" data-close="flashcards" aria-label="Close flashcards">×</button></div>
    <h2 id="flashcard-title">Deck complete</h2><p>${known} got it · ${again} study again · ${deck.cards.length-known-again} unrated</p>
    <div class="result-actions"><button class="button secondary" data-close="flashcards">Done</button><button class="button secondary" data-card-restart>Restart deck</button><button class="button primary" data-card-review ${known===deck.cards.length ? 'disabled' : ''}>Review remaining cards</button></div></div>`;
  flashcardDialog.querySelector('[data-card-restart]').focus();
  if (page==='flashcards') flashcards();
}

flashcardDialog.addEventListener('keydown', e => {
  if (!deck || deck.finished) return;
  if (e.target.closest('select,input,textarea')) return;
  if (e.target.matches('[data-card-view]') && ['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) {
    e.preventDefault();
    selectCardView(adjacentTab(availableTabs(cardViews, deck.cards[deck.index]).map(([key]) => key), deck.answerView, e.key));
    return;
  }
  if (e.key==='ArrowLeft' || e.key==='ArrowRight') { e.preventDefault(); moveCard(e.key==='ArrowLeft' ? -1 : 1); }
  if (e.code==='Space' && !e.target.closest('button,a,summary,input,select')) {
    e.preventDefault(); flipCard();
  }
});
flashcardDialog.addEventListener('close', () => { if (page==='flashcards') flashcards(); });

function historyMarkup() {
  if (!state.sessions.length) return '<p class="muted">No completed quizzes yet.</p>';
  return [...state.sessions].reverse().slice(0, 20).map(s => `<div class="history-row"><div><h4>${escapeHTML(s.title)}</h4><p>${new Date(s.at).toLocaleDateString('en-US', {month:'short', day:'numeric'})} · ${s.total} questions · ${Math.max(1, Math.round(s.seconds / 60))} min</p></div><span class="history-score">${s.correct} / ${s.total}</span></div>`).join('');
}

function statistics() {
  const mastery = mastered();
  const days = Array.from({length:7}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    return {day:d.toLocaleDateString('en-US', {weekday:'short'}), count:state.attempts.filter(a => dayKey(new Date(a.at)) === dayKey(d)).length};
  });
  const max = Math.max(5, ...days.map(d => d.count));
  main.innerHTML = heading('Statistics') + statsMarkup() + `<div class="lower-grid">
    <section><h2>This week</h2><p class="muted">Questions answered</p><div class="chart">${days.map(d => `<div class="chart-column"><div class="chart-count">${d.count}</div><div class="chart-bar" style="height:${d.count / max * 110}px" aria-label="${d.day}: ${d.count} answers"></div><span>${d.day}</span></div>`).join('')}</div></section>
    <section><h2>Mastery by category</h2>${categories.map(c => {
      const members = reactions.filter(r => inCategory(r,c.id));
      const count = members.filter(r => mastery.has(r.id)).length;
      return `<div class="progress-row"><div class="progress-label"><span>${c.short}</span><span>${count} / ${members.length}</span></div><div class="progress-track"><div style="width:${members.length ? count / members.length * 100 : 0}%"></div></div></div>`;
    }).join('')}<p class="chart-note">Mastery = 3 consecutive correct answers.</p></section></div>
    <section><h2>Quiz history</h2>${historyMarkup()}</section>`;
}

function render() {
  page = location.hash.slice(1) || 'dashboard';
  if (!['dashboard','library','practice','statistics','saved','flashcards'].includes(page)) page = 'dashboard';
  document.querySelectorAll('[data-page]').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
    if (a.dataset.page === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  ({dashboard, library, practice, statistics, flashcards, saved:() => library(true)})[page]();
}

function toggleSave(id) {
  if (state.saved.includes(id)) { state.saved = state.saved.filter(x => x !== id); toast('Reaction removed.'); }
  else { state.saved.push(id); toast('Reaction saved.'); }
  persist();
  if (page === 'library' || page === 'saved') renderLibraryResults(page === 'saved');
  if (reactionDialog.open) showDetail(id, detailTab);
}

function bookFigure(figure, name, type, prompt = false) {
  const v = figure.viewport;
  const caption = prompt ? 'Reaction & conditions' : figure.caption || type;
  const description = prompt ? 'Book reaction scheme showing reactants, products, reagents and conditions. Identify the named reaction.' : `${name}: ${caption}`;
  const image = `<img src="${figure.image}" alt="${escapeHTML(description)}" loading="${prompt ? 'eager' : 'lazy'}"${v ? ` style="top:${-v.top/(v.bottom-v.top)*100}%"` : ''}>`;
  return `<figure class="book-figure"><a href="${figure.image}" target="_blank" rel="noopener" aria-label="${escapeHTML(prompt ? 'Open reaction figure at full size' : `Open ${name} ${type} source figure at full size`)}">${v ? `<div class="book-figure-region" style="aspect-ratio:${v.width}/${v.height*(v.bottom-v.top)}">${image}</div>` : image}</a><figcaption>${escapeHTML(caption)} <span>p. ${figure.printedPage} · <a href="${figure.image}" target="_blank" rel="noopener">${v ? 'Full source' : 'Full size'} ↗</a></span></figcaption></figure>`;
}

function detailPanel(r, tab) {
  const source = bookReactions[r.id];
  const sections = bookSections[r.id];
  if (tab === 'reaction') {
    return bookFigure(sections.reaction, r.name, 'reaction & conditions');
  }
  if (tab === 'outline') {
    return sections?.outline ? bookFigure(sections.outline, r.name, 'outline / history')
      : `<p>${escapeHTML(r.explanation)}</p><p class="muted">${escapeHTML(sections?.outlineNote || 'A separate outline/history section is not available for this reaction.')}</p>`;
  }
  if (tab === 'mechanism') {
    return `<p class="mechanism-summary">${r.explanation}</p>${source?.mechanism ? bookFigure(source.mechanism, r.name, 'mechanism') : `<p class="muted">${escapeHTML(source?.mechanismNote || 'A mechanism figure for this reaction has not been located in this copy.')}</p>`}`;
  }
  return source?.applications?.length
    ? `${source.applicationIntro ? `<p class="mechanism-summary">${escapeHTML(source.applicationIntro)}</p>` : ''}${source.applications.map(figure => bookFigure(figure, r.name, 'synthetic applications')).join('')}`
    : '<p class="muted">An applications page for this reaction has not been located in this copy.</p>';
}

function showDetail(id, tab = 'reaction') {
  const r = reactions.find(r => r.id === id);
  if (!r) return;
  const tabs = availableTabs(detailTabs, r);
  if (!tabs.some(([key]) => key === tab)) tab = 'reaction';
  detailReactionId = id;
  detailTab = tab;
  const source = bookReactions[id];
  reactionDialog.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span>${categoryLabel(r)}</span><button class="close-button" data-close="reaction" aria-label="Close reaction">×</button></div>
    <h2 id="reaction-title">${r.name}</h2>
    <div class="reaction-tabs" role="tablist" aria-label="Reaction details">${tabs.map(([key, label]) => `<button role="tab" id="tab-${key}" aria-controls="reaction-panel" aria-selected="${tab === key}" tabindex="${tab === key ? 0 : -1}" data-detail-tab="${key}">${label}</button>`).join('')}</div>
    <section id="reaction-panel" role="tabpanel" tabindex="0" aria-labelledby="tab-${tab}">${detailPanel(r, tab)}</section>
    ${source ? `<p class="book-citation">Kürti & Czakó, <cite>Strategic Applications of Named Reactions in Organic Synthesis</cite> (2005), ${source.pages.length === 1 ? 'p.' : 'pp.'} ${source.pages.join('–')}. Figures from your supplied copy.</p>` : ''}
    <div class="detail-section"><h3>Study by category</h3><div class="actions">${r.categories.map(id => `<button class="text-button" data-start="${id}">Quiz: ${categoryFor(id).short}</button>`).join('')}</div><p class="muted">${r.appendixPages.length ? `Appendix 8.3, pp. ${r.appendixPages.join(', ')}.` : r.supplemental ? 'Preserved from your original library; this reaction has no dedicated chapter.' : 'This chapter is not listed in the book’s appendix 8.3 category table.'}</p></div>
    <div class="detail-actions"><button class="button secondary" data-save="${r.id}">${state.saved.includes(r.id) ? 'Unsave reaction' : 'Save reaction'}</button></div></div>`;
  if (!reactionDialog.open) reactionDialog.showModal();
}

function selectDetailTab(tab, focus = true) {
  detailTab = tab;
  const r = reactions.find(r => r.id === detailReactionId);
  reactionDialog.querySelectorAll('[data-detail-tab]').forEach(button => {
    const active = button.dataset.detailTab === tab;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    if (active && focus) button.focus();
  });
  const panel = document.querySelector('#reaction-panel');
  panel.setAttribute('aria-labelledby', `tab-${tab}`);
  panel.innerHTML = detailPanel(r, tab);
}

function startQuiz(mode) {
  let pool = studyPool(mode), title = 'Quick quiz';
  if (!pool.length) { toast('Select at least one category.'); return; }
  if (mode === 'review') {
    pool = pool.filter(r => { const attempts = state.attempts.filter(a => a.id === r.id); return attempts.length && !attempts[attempts.length - 1].correct; });
    title = 'Review mistakes';
    if (!pool.length) { toast('No mistakes in the selected categories.'); return; }
  } else if (mode === 'saved') {
    pool = pool.filter(r => state.saved.includes(r.id)); title = 'Saved reactions';
    if (!pool.length) { toast('No saved reactions in the selected categories.'); return; }
  } else if (mode === 'collection') {
    pool = filteredReactions(); title = state.selectedCategories.length === 1 ? categoryFor(state.selectedCategories[0]).short : 'Selected reactions';
    if (!pool.length) { toast('No reactions selected.'); return; }
  } else if (mode === 'daily') {
    title = 'Daily challenge';
    let seed = [...dayKey()].reduce((n,c) => n * 31 + c.charCodeAt(0), 0) >>> 0;
    pool = [...reactions];
    for (let i = pool.length - 1; i > 0; i--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const j = seed % (i + 1); [pool[i],pool[j]] = [pool[j],pool[i]];
    }
    pool = pool.filter(isSelected);
  } else if (categoryFor(mode)) { title = categoryFor(mode).short; }
  else if (mode === 'all') { title = 'All reactions'; }
  else if (mode === 'selected') { title = selectionTitle(); }
  if (!pool.length) { toast('No reactions in this selection.'); return; }
  const ordered = mode === 'daily' ? pool : shuffle(pool);
  quiz = {mode, title, pool:[...pool], questions:['mixed','daily'].includes(mode) ? ordered.slice(0,5) : ordered, index:0, correct:0, answered:false, started:Date.now(), finished:false};
  if (reactionDialog.open) reactionDialog.close();
  renderQuestion(); quizDialog.showModal();
}

function renderQuestion() {
  const r = quiz.questions[quiz.index];
  // Prefer the actual quiz pool; fill tiny selections without repeating answers.
  const candidates = shuffle(quiz.pool.filter(x => x.id !== r.id));
  const used = new Set([r.id,...candidates.map(x => x.id)]);
  const distractors = [...candidates,...shuffle(reactions.filter(x => !used.has(x.id)))].slice(0,3);
  quiz.options = shuffle([r, ...distractors]); quiz.answered = false;
  quizDialog.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span>${quiz.title} · ${quiz.index + 1} / ${quiz.questions.length}</span><button class="close-button" data-close="quiz" aria-label="Exit quiz">×</button></div>
    <div class="quiz-progress"><div style="width:${quiz.index / quiz.questions.length * 100}%"></div></div><span class="badge quiz-category">${escapeHTML(quiz.title)}</span>
    <h2 id="quiz-title">Name the reaction</h2><p class="question-text">${escapeHTML(r.question)}</p><div class="answers">${quiz.options.map((option,i) => `<button class="answer" data-answer="${option.id}"><span>${String.fromCharCode(65+i)}</span>${escapeHTML(option.name)}</button>`).join('')}</div>
    <div id="answer-feedback" aria-live="polite"></div><div class="quiz-footer"><button class="button primary" id="next-question" disabled>${quiz.index === quiz.questions.length - 1 ? 'See results' : 'Next question'} →</button></div></div>`;
}

function answer(id) {
  if (!quiz || quiz.answered || quiz.finished) return;
  quiz.answered = true;
  const r = quiz.questions[quiz.index], correct = id === r.id;
  if (correct) quiz.correct++;
  state.attempts.push({id:r.id, correct, at:new Date().toISOString()}); persist();
  quizDialog.querySelectorAll('[data-answer]').forEach(button => {
    button.disabled = true;
    if (button.dataset.answer === r.id) button.classList.add('correct');
    else if (button.dataset.answer === id) button.classList.add('incorrect');
  });
  document.querySelector('#answer-feedback').innerHTML = `<div class="answer-feedback"><strong>${correct ? 'Correct.' : `Correct answer: ${r.name}.`}</strong>${r.explanation}</div>`;
  const next = document.querySelector('#next-question'); next.disabled = false; next.focus();
}

function nextQuestion() {
  if (!quiz?.answered || quiz.finished) return;
  if (quiz.index < quiz.questions.length - 1) { quiz.index++; renderQuestion(); quizDialog.querySelector('[data-answer]').focus(); return; }
  quiz.finished = true;
  const seconds = Math.round((Date.now() - quiz.started) / 1000);
  state.sessions.push({title:quiz.title, total:quiz.questions.length, correct:quiz.correct, seconds, at:new Date().toISOString()}); persist();
  quizDialog.innerHTML = `<div class="dialog-inner results"><div class="dialog-top"><span>${quiz.title}</span><button class="close-button" data-close="quiz" aria-label="Close results">×</button></div>
    <h2 id="quiz-title">Quiz complete</h2><div class="result-score">${quiz.correct}<span> / ${quiz.questions.length}</span></div>
    <div class="result-metrics"><div><strong>${Math.round(quiz.correct / quiz.questions.length * 100)}%</strong><span>Accuracy</span></div><div><strong>${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2,'0')}</strong><span>Time</span></div><div><strong>${streak()}</strong><span>Day streak</span></div></div>
    <div class="result-actions"><button class="button secondary" data-close="quiz">Done</button><button class="button primary" data-retry>Try again</button></div></div>`;
  render();
}

function requestExit() {
  if (!quiz || quiz.finished) { quizDialog.close(); render(); return; }
  if (quizDialog.querySelector('.quiz-exit')) return;
  const section = document.createElement('div'); section.className = 'quiz-exit';
  section.innerHTML = '<strong>Leave quiz?</strong><p>Answered questions are saved. This session will remain incomplete.</p><div class="result-actions"><button class="button secondary" data-continue>Continue</button><button class="button primary" data-exit>Leave</button></div>';
  quizDialog.querySelector('.dialog-inner').prepend(section); section.querySelector('[data-continue]').focus();
}

quizDialog.addEventListener('cancel', e => { e.preventDefault(); requestExit(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && quizDialog.open) { e.preventDefault(); requestExit(); } });
reactionDialog.addEventListener('click', e => { if (e.target === reactionDialog) reactionDialog.close(); });
function adjacentTab(tabs, current, key) {
  return tabs[key === 'Home' ? 0 : key === 'End' ? tabs.length-1 : (tabs.indexOf(current) + (key === 'ArrowRight' ? 1 : tabs.length-1)) % tabs.length];
}
function selectCardView(view) {
  deck.answerView = view;
  renderFlashcard(); flashcardDialog.querySelector(`[data-card-view="${view}"]`).focus();
}
reactionDialog.addEventListener('keydown', e => {
  if (!e.target.matches('[data-detail-tab]') || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  selectDetailTab(adjacentTab(availableTabs(detailTabs, reactions.find(r => r.id === detailReactionId)).map(([key]) => key), detailTab, e.key));
});
document.addEventListener('change', e => {
  if (!e.target.matches('[data-card-mode]')) return;
  state.flashcardMode = e.target.value;
  persist();
  if (flashcardDialog.open && deck && !deck.finished) {
    deck.mode = state.flashcardMode; deck.answerView = deck.mode; deck.revealed = false;
    renderFlashcard(); flashcardDialog.querySelector('[data-card-mode]').focus();
  }
});
document.addEventListener('click', e => {
  const button = e.target.closest('button'); if (!button) return;
  if (button.dataset.flashcards) startFlashcards(button.dataset.flashcards);
  else if (button.dataset.close === 'flashcards') flashcardDialog.close();
  else if (button.hasAttribute('data-card-flip')) flipCard();
  else if (button.dataset.cardView && deck?.revealed) {
    selectCardView(button.dataset.cardView);
  }
  else if (button.hasAttribute('data-card-next')) moveCard(1);
  else if (button.hasAttribute('data-card-prev')) moveCard(-1);
  else if (button.dataset.cardRate) rateCard(button.dataset.cardRate);
  else if (button.hasAttribute('data-card-shuffle')) { deck.cards=shuffle(deck.cards); deck.index=0; deck.revealed=false; renderFlashcard(); flashcardDialog.querySelector('[data-card-flip]').focus(); }
  else if (button.hasAttribute('data-card-review') || button.hasAttribute('data-card-restart')) {
    deck.cards=shuffle(button.hasAttribute('data-card-review') ? deck.cards.filter(r => deck.ratings[r.id]!=='known') : deck.original);
    deck.index=0; deck.revealed=false; deck.finished=false; deck.ratings={}; renderFlashcard(); flashcardDialog.querySelector('[data-card-flip]').focus();
  }
  else if (button.dataset.start) startQuiz(button.dataset.start);
  else if (button.dataset.save) toggleSave(button.dataset.save);
  else if (button.dataset.detail) showDetail(button.dataset.detail);
  else if (button.dataset.detailTab) selectDetailTab(button.dataset.detailTab);
  else if (button.dataset.answer) answer(button.dataset.answer);
  else if (button.id === 'next-question') nextQuestion();
  else if (button.dataset.close === 'reaction') reactionDialog.close();
  else if (button.dataset.close === 'quiz') requestExit();
  else if (button.hasAttribute('data-continue')) button.closest('.quiz-exit').remove();
  else if (button.hasAttribute('data-exit')) { quizDialog.close(); quiz = null; render(); }
  else if (button.hasAttribute('data-retry')) { const mode = quiz.mode; quizDialog.close(); startQuiz(mode); }
});
window.addEventListener('hashchange', () => { render(); window.scrollTo({top:0, behavior:'instant'}); });
setupCategories();
if (window.matchMedia('(max-width: 700px)').matches) document.querySelector('.category-sidebar details').open = false;
persist();
render();
