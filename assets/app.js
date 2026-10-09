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

const categories = [
  {id:'carbon',name:'Carbon–carbon bond formation',short:'C–C bond formation',description:'Build the backbone of organic molecules.',color:'#7c9464',light:'#f0f4e9',icon:'bond'},
  {id:'oxidation',name:'Oxidation & reduction',short:'Oxidation & reduction',description:'A little give and take. Of electrons.',color:'#ae9865',light:'#f8f4e9',icon:'arrows'},
  {id:'rearrangement',name:'Rearrangements',short:'Rearrangements',description:'Same atoms. A whole new arrangement.',color:'#9c89af',light:'#f4f0f8',icon:'shuffle'},
  {id:'substitution',name:'Substitution & elimination',short:'Substitution & elimination',description:'Make a switch. Or make a double bond.',color:'#789ba8',light:'#edf4f6',icon:'arrows'},
  {id:'pericyclic',name:'Pericyclic reactions',short:'Pericyclic reactions',description:'Follow the electrons around the ring.',color:'#b18a73',light:'#f8f0ea',icon:'ring'},
  {id:'functional',name:'Functional group transformations',short:'Functional groups',description:'New possibilities, one group at a time.',color:'#8d9b70',light:'#f1f4e9',icon:'flask'},
];
// Each prompt describes the transformation without revealing its named reaction.
const reactions = [
  ['aldol','Aldol condensation','carbon','An enolate and a carbonyl join to build a new carbon–carbon bond.','An enolate adds to an aldehyde or ketone, giving a β-hydroxy carbonyl that dehydrates to an α,β-unsaturated carbonyl. Which reaction is this?','Dilute base or acid; heat promotes dehydration.','Carbonyl + enolizable carbonyl → α,β-unsaturated carbonyl','The enolate attacks a carbonyl electrophile. Dehydration of the β-hydroxy intermediate extends conjugation.','Foundational'],
  ['grignard','Grignard reaction','carbon','Organomagnesium reagents turn carbonyl compounds into alcohols.','An organomagnesium halide adds to a ketone in dry ether. Acidic workup gives a tertiary alcohol. Identify the reaction.','1. RMgX, dry ether or THF  2. H₃O⁺','Ketone + RMgX → tertiary alcohol','The carbon bonded to magnesium acts as a nucleophile. Water must be excluded until workup because it destroys the reagent.','Foundational'],
  ['suzuki','Suzuki–Miyaura coupling','carbon','Connect organic fragments with an organoboron coupling partner.','An aryl halide couples with an arylboronic acid using a palladium catalyst and base. Which named reaction forms the biaryl?','Pd catalyst, base; aryl halide and organoboron reagent.','Ar–X + Ar′–B(OH)₂ → Ar–Ar′','Oxidative addition, transmetalation, and reductive elimination link the two carbon fragments in this palladium-catalyzed coupling.','Intermediate'],
  ['wittig','Wittig reaction','carbon','Replace a carbonyl oxygen with a carbon–carbon double bond.','An aldehyde reacts with a phosphonium ylide to form an alkene and triphenylphosphine oxide. Name the reaction.','Phosphonium ylide, typically made using a strong base.','R₂C=O + Ph₃P=CHR → R₂C=CHR + Ph₃P=O','The carbonyl and ylide form an oxaphosphetane intermediate. Its fragmentation is driven by formation of the strong phosphorus–oxygen bond.','Foundational'],
  ['swern','Swern oxidation','oxidation','Oxidize alcohols under mild, anhydrous conditions.','DMSO is activated with oxalyl chloride at low temperature, followed by an alcohol and triethylamine. Which oxidation is used?','DMSO, (COCl)₂, then Et₃N; typically −78 °C initially.','Primary alcohol → aldehyde; secondary alcohol → ketone','Activated DMSO converts the alcohol to an alkoxysulfonium intermediate. Base-induced elimination yields the carbonyl compound.','Intermediate'],
  ['clemmensen','Clemmensen reduction','oxidation','Reduce aldehyde and ketone carbonyls to methylene groups in acid.','A ketone is converted to a methylene group using zinc amalgam and concentrated hydrochloric acid. Identify the reduction.','Zn(Hg), concentrated HCl.','R–CO–R′ → R–CH₂–R′','This reduction removes the carbonyl oxygen under strongly acidic conditions. Substrates must tolerate acid.','Foundational'],
  ['wolff','Wolff–Kishner reduction','oxidation','Remove a carbonyl oxygen under strongly basic conditions.','An aldehyde or ketone is treated with hydrazine, then strong base and heat, to replace C=O with CH₂. Name the reaction.','NH₂NH₂, KOH, high-boiling solvent, heat.','R–CO–R′ → R–CH₂–R′ + N₂','The carbonyl forms a hydrazone. Base and heat promote loss of nitrogen, producing the reduced carbon skeleton.','Foundational'],
  ['birch','Birch reduction','oxidation','Partially reduce an aromatic ring to a nonconjugated diene.','An aromatic ring is treated with sodium or lithium in liquid ammonia and an alcohol proton source to form a 1,4-cyclohexadiene. Name the reduction.','Li or Na, liquid NH₃, alcohol.','Arene → 1,4-cyclohexadiene','Sequential electron transfers and protonations reduce the aromatic ring without fully saturating it. Substituents influence regioselectivity.','Intermediate'],
  ['beckmann','Beckmann rearrangement','rearrangement','Transform an oxime into an amide or a ring-expanded lactam.','A ketoxime undergoes acid-promoted rearrangement. The group anti to the departing oxime hydroxyl migrates to nitrogen, giving an amide. Which reaction is this?','Acid activation, such as H₂SO₄; ketoxime substrate.','Ketoxime → amide (cyclic ketoxime → lactam)','Migration occurs with the group anti to the leaving group. Cyclic ketoximes give ring-expanded lactams.','Intermediate'],
  ['pinacol','Pinacol rearrangement','rearrangement','Rearrange a vicinal diol into a carbonyl compound.','A vicinal diol loses water under acidic conditions, followed by a 1,2-shift that produces an aldehyde or ketone. Identify the rearrangement.','Acid, often H₂SO₄.','Vicinal diol → rearranged carbonyl + H₂O','Protonation and loss of water create a carbocation. An adjacent group migrates as the remaining hydroxyl forms a carbonyl.','Intermediate'],
  ['hofmann','Hofmann rearrangement','rearrangement','Convert a primary amide into an amine with one fewer carbon.','A primary amide reacts with bromine and aqueous sodium hydroxide, yielding a primary amine with one fewer carbon atom. Name the reaction.','Br₂, NaOH, H₂O.','R–CONH₂ → R–NH₂ + CO₂','An N-bromoamide rearranges to an isocyanate. Hydrolysis and decarboxylation remove the original carbonyl carbon.','Intermediate'],
  ['baeyer','Baeyer–Villiger oxidation','rearrangement','Insert an oxygen beside a ketone carbonyl to form an ester.','A ketone reacts with a peroxyacid to give an ester; a cyclic ketone gives a ring-expanded lactone. Which named reaction occurs?','Peroxyacid, such as mCPBA.','Ketone + peroxyacid → ester','A group migrates to an adjacent oxygen of the peroxide intermediate. This reaction is both an oxidation and a rearrangement.','Intermediate'],
  ['williamson','Williamson ether synthesis','substitution','Use an alkoxide and an alkyl electrophile to make an ether.','An alkoxide displaces a halide from a primary alkyl halide by an SN2 mechanism, forming an ether. Identify the synthesis.','Alkoxide (RO⁻), preferably a primary alkyl halide or sulfonate.','RO⁻ + R′–X → R–O–R′','The alkoxide attacks by SN2. Primary electrophiles are preferred because steric hindrance favors elimination with secondary or tertiary substrates.','Foundational'],
  ['sandmeyer','Sandmeyer reaction','substitution','Replace an aromatic diazonium group using copper(I) salts.','An aryl diazonium salt is treated with CuCl, CuBr, or CuCN to replace the diazonium group. Which reaction is this?','Aryl diazonium salt; CuCl, CuBr, or CuCN.','Ar–N₂⁺ → Ar–Cl, Ar–Br, or Ar–CN','Copper(I) mediates replacement of the diazonium group, with nitrogen gas released. This provides access to substituted aromatic compounds.','Intermediate'],
  ['finkelstein','Finkelstein reaction','substitution','Exchange alkyl chlorides or bromides for iodides.','An alkyl bromide is treated with sodium iodide in acetone. Sodium bromide precipitates as the alkyl iodide forms. Identify the reaction.','NaI in acetone; typically a primary alkyl chloride or bromide.','R–Br + NaI → R–I + NaBr↓','An SN2 halide exchange is driven by precipitation of NaCl or NaBr from acetone. Primary substrates react most readily.','Foundational'],
  ['chugaev','Chugaev elimination','substitution','Form an alkene by heating a xanthate ester.','An alcohol is converted to a xanthate ester, then heated to form an alkene through a cyclic syn-elimination transition state. Name this elimination.','1. Base, CS₂, then MeI  2. Heat.','Alcohol → xanthate ester → alkene','The xanthate undergoes intramolecular syn elimination through a six-membered cyclic transition state. A suitable β-hydrogen is required.','Advanced'],
  ['diels','Diels–Alder reaction','pericyclic','Bring a diene and a dienophile together in a six-membered ring.','A conjugated diene and an alkene combine in a concerted [4+2] cycloaddition, producing a cyclohexene. Which reaction is this?','Conjugated diene in an s-cis conformation; dienophile; often heat.','Conjugated diene + alkene → cyclohexene','Six π electrons reorganize in one concerted step, forming two σ bonds and a new π bond. The dienophile’s relative stereochemistry is retained.','Foundational'],
  ['cope','Cope rearrangement','pericyclic','Reorganize a 1,5-diene through a concerted [3,3] shift.','Heating a 1,5-diene shifts one carbon–carbon σ bond and two π bonds in a concerted [3,3]-sigmatropic rearrangement. Name the reaction.','Heat; 1,5-diene substrate.','1,5-Diene → isomeric 1,5-diene','A six-electron cyclic transition state, often chair-like, reorganizes the carbon framework. The equilibrium favors the more stable product.','Intermediate'],
  ['claisen','Claisen rearrangement','pericyclic','Turn an allyl vinyl ether into an unsaturated carbonyl compound.','An allyl vinyl ether is heated and undergoes a [3,3]-sigmatropic shift to produce a γ,δ-unsaturated carbonyl compound. Identify the rearrangement.','Heat; allyl vinyl ether substrate.','Allyl vinyl ether → γ,δ-unsaturated carbonyl','This concerted six-electron rearrangement creates a C–C bond. Formation of a stable carbonyl group favors the product.','Intermediate'],
  ['ene','Alder–ene reaction','pericyclic','Transfer an allylic hydrogen while making a new σ bond.','An alkene with an allylic hydrogen reacts with an enophile in a concerted process that forms a σ bond, shifts a double bond, and transfers hydrogen. Name the reaction.','Alkene bearing an allylic H and an enophile; heat or Lewis acid.','Ene + enophile → new σ bond + shifted alkene','The ene reaction reorganizes six electrons in a cyclic transition state, transferring an allylic hydrogen to the enophile.','Advanced'],
  ['fischer','Fischer esterification','functional','Join a carboxylic acid and an alcohol to make an ester.','A carboxylic acid and an alcohol are heated with a catalytic strong acid to form an ester and water. Name the reaction.','Alcohol, carboxylic acid, catalytic H₂SO₄; heat.','R–COOH + R′–OH ⇌ R–COOR′ + H₂O','Acid-catalyzed nucleophilic acyl substitution is reversible. Excess alcohol or removal of water shifts the equilibrium toward the ester.','Foundational'],
  ['gabriel','Gabriel synthesis','functional','Prepare primary amines using a protected nitrogen nucleophile.','Potassium phthalimide alkylates a primary alkyl halide. Cleavage with hydrazine then releases a primary amine. Identify the synthesis.','1. Potassium phthalimide, primary R–X  2. NH₂NH₂.','Primary alkyl halide → primary amine','Phthalimide undergoes SN2 alkylation and prevents overalkylation of nitrogen. Cleavage releases the primary amine.','Intermediate'],
  ['hell','Hell–Volhard–Zelinsky reaction','functional','Halogenate a carboxylic acid at its α carbon.','A carboxylic acid bearing an α-hydrogen is treated with Br₂ and PBr₃, then water, to give an α-bromo acid. Name the reaction.','Br₂, catalytic PBr₃ (or red phosphorus); then H₂O.','R–CH₂–COOH → R–CHBr–COOH','The acid is converted to an acyl bromide, which enolizes and undergoes α-bromination. Hydrolysis restores the carboxylic acid group.','Intermediate'],
  ['ritter','Ritter reaction','functional','Combine a carbocation precursor and a nitrile to make an amide.','An alcohol that readily forms a carbocation reacts with a nitrile in strong acid. Hydrolysis gives an N-substituted amide. Name this reaction.','Nitrile, carbocation-forming alcohol or alkene, strong acid; water.','R–OH + R′–CN → R′–CONH–R','The nitrile nitrogen traps a carbocation to form a nitrilium ion. Water then adds, ultimately yielding the amide.','Advanced'],
].map(([id,name,category,summary,question,reagents,equation,explanation,difficulty])=>({id,name,category,summary,question,reagents,equation,explanation,difficulty}));

const storageKey = 'catalyst-progress-v1';
let state = {saved:[], attempts:[], sessions:[]};
let storageAvailable = true;
try { const raw = JSON.parse(localStorage.getItem(storageKey)); if(raw && Array.isArray(raw.saved) && Array.isArray(raw.attempts) && Array.isArray(raw.sessions)) state = raw; } catch { storageAvailable = false; }
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{storageAvailable=false;document.querySelector('.local-status').innerHTML='Progress saved for this visit';}}
if(!storageAvailable) document.querySelector('.local-status').innerHTML='Progress saved for this visit';
let page = 'dashboard', searchTerm = '', quiz = null;
state.selectedCategories = Array.isArray(state.selectedCategories)
  ? categories.filter(c => state.selectedCategories.includes(c.id)).map(c => c.id)
  : categories.map(c => c.id);
const selectedReactions = () => reactions.filter(r => state.selectedCategories.includes(r.category));
const main = document.querySelector('main');
const quizDialog = document.querySelector('#quiz-dialog');
const reactionDialog = document.querySelector('#reaction-dialog');
let detailReactionId = null;
let detailTab = 'reaction';
const categoryFor = id => categories.find(c=>c.id===id);
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
    [new Set(state.attempts.map(a => a.id)).size, '/ 24', 'Reactions practiced'],
    [state.attempts.length ? Math.round(correct / state.attempts.length * 100) + '%' : '—', '', 'Accuracy'],
    [state.sessions.length, '', 'Quizzes completed'],
    [streak(), streak() === 1 ? 'day' : 'days', 'Current streak'],
  ];
  return `<div class="stats-grid">${stats.map(([value, unit, label]) => `<div><div class="stat-value">${value}<small>${unit}</small></div><div class="stat-label">${label}</div></div>`).join('')}</div>`;
}

function setupCategories() {
  document.querySelector('#category-options').insertAdjacentHTML('beforeend', `
    <label class="category-option all-categories"><input type="checkbox" id="all-categories"><span>All categories</span></label>
    ${categories.map(c => `<label class="category-option"><input type="checkbox" data-category-select="${c.id}"><span>${c.name}</span></label>`).join('')}`);
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
    <div class="actions"><button class="button primary" data-start="mixed" ${selectedReactions().length ? '' : 'disabled'}>Start quiz</button><button class="text-button" data-start="daily" ${selectedReactions().length ? '' : 'disabled'}>Daily challenge</button><a class="text-button" href="#library">Browse reactions</a></div>
    <section class="home-section"><div class="section-heading"><h2>All-time progress</h2><a class="text-button" href="#statistics">View statistics</a></div>${statsMarkup()}</section>`;
}

function filteredReactions(saved = page === 'saved') {
  return reactions.filter(r => (!saved || state.saved.includes(r.id)) &&
    state.selectedCategories.includes(r.category) &&
    `${r.name} ${r.summary} ${r.reagents} ${r.equation}`.toLowerCase().includes(searchTerm.toLowerCase()));
}

function library(saved = false) {
  main.innerHTML = heading(saved ? 'Saved reactions' : 'Reaction library') + `
    <div class="search-row"><label class="search-box"><input id="reaction-search" aria-label="Search reactions" placeholder="Search reactions or reagents" value="${escapeHTML(searchTerm)}"></label></div>
    <div class="section-heading"><p id="result-count"></p><button class="text-button" data-start="collection">Quiz this selection</button></div>
    <div class="library-list" id="library-results"></div>`;
  renderLibraryResults(saved);
  document.querySelector('#reaction-search').addEventListener('input', e => { searchTerm = e.target.value; renderLibraryResults(saved); });
}

function renderLibraryResults(saved) {
  const filtered = filteredReactions(saved);
  document.querySelector('#result-count').textContent = `${filtered.length} reaction${filtered.length === 1 ? '' : 's'}`;
  document.querySelector('[data-start="collection"]').disabled = !filtered.length;
  document.querySelector('#library-results').innerHTML = filtered.length ? filtered.map(r => `
    <article class="reaction-row"><button class="text-button reaction-name" data-detail="${r.id}">${r.name}</button>
    <span class="reaction-category">${categoryFor(r.category).short}</span>
    <button class="bookmark-button ${state.saved.includes(r.id) ? 'saved' : ''}" data-save="${r.id}" aria-label="${state.saved.includes(r.id) ? 'Unsave' : 'Save'} ${r.name}" aria-pressed="${state.saved.includes(r.id)}">${icon('bookmark')}</button></article>`).join('') :
    `<div class="empty-state"><p>${!state.selectedCategories.length ? 'Select at least one category.' : saved && !state.saved.length ? 'No saved reactions. Bookmark reactions in the library.' : 'No matches. Try a different search or category.'}</p>${saved && !state.saved.length ? '<a href="#library">Browse reactions</a>' : ''}</div>`;
}

function practice() {
  const modes = [
    ['Quick quiz', 'Up to 5 questions from selected categories.', 'mixed'],
    ['Daily challenge', 'A daily mix from selected categories.', 'daily'],
    ['Review mistakes', 'Reactions you last answered incorrectly.', 'review'],
    ['Saved reactions', 'Practice your bookmarked reactions.', 'saved'],
  ];
  main.innerHTML = heading('Practice') + `<div class="practice-list">${modes.map(([title, description, mode]) => `<div class="practice-row"><div><h3>${title}</h3><p>${description}</p></div><button class="text-button" data-start="${mode}" aria-label="Start ${title.toLowerCase()}" ${selectedReactions().length ? '' : 'disabled'}>Start →</button></div>`).join('')}</div>`;
}

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
      const count = reactions.filter(r => r.category === c.id && mastery.has(r.id)).length;
      return `<div class="progress-row"><div class="progress-label"><span>${c.short}</span><span>${count} / 4</span></div><div class="progress-track"><div style="width:${count / 4 * 100}%"></div></div></div>`;
    }).join('')}<p class="chart-note">Mastery = 3 consecutive correct answers.</p></section></div>
    <section><h2>Quiz history</h2>${historyMarkup()}</section>`;
}

function render() {
  page = location.hash.slice(1) || 'dashboard';
  if (!['dashboard','library','practice','statistics','saved'].includes(page)) page = 'dashboard';
  document.querySelectorAll('[data-page]').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
    if (a.dataset.page === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  ({dashboard, library, practice, statistics, saved:() => library(true)})[page]();
}

function toggleSave(id) {
  if (state.saved.includes(id)) { state.saved = state.saved.filter(x => x !== id); toast('Reaction removed.'); }
  else { state.saved.push(id); toast('Reaction saved.'); }
  persist();
  if (page === 'library' || page === 'saved') renderLibraryResults(page === 'saved');
  if (reactionDialog.open) showDetail(id, detailTab);
}

function bookFigure(figure, name, type) {
  return `<figure class="book-figure"><a href="${figure.image}" target="_blank" rel="noopener" aria-label="Open ${escapeHTML(name)} ${type} figure at full size"><img src="${figure.image}" alt="${escapeHTML(name)}: ${escapeHTML(figure.caption || type)}" loading="lazy"></a><figcaption>${escapeHTML(figure.caption || type)} <span>p. ${figure.printedPage} · <a href="${figure.image}" target="_blank" rel="noopener">Full size ↗</a></span></figcaption></figure>`;
}

function detailPanel(r, tab) {
  const source = bookReactions[r.id];
  if (tab === 'reaction') {
    return `${source?.reaction ? bookFigure(source.reaction, r.name, 'reaction scheme') : ''}
      <div class="detail-section"><h3>Transformation</h3><p class="detail-equation">${r.equation}</p></div>
      <div class="detail-section"><h3>Reagents & conditions</h3><p>${r.reagents}</p></div>`;
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
  detailReactionId = id;
  detailTab = tab;
  const source = bookReactions[id];
  reactionDialog.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span>${categoryFor(r.category).short}</span><button class="close-button" data-close="reaction" aria-label="Close reaction">×</button></div>
    <h2 id="reaction-title">${r.name}</h2>
    <div class="reaction-tabs" role="tablist" aria-label="Reaction details">${[['reaction','Reaction'],['mechanism','Mechanism'],['applications','Applications']].map(([key, label]) => `<button role="tab" id="tab-${key}" aria-controls="reaction-panel" aria-selected="${tab === key}" tabindex="${tab === key ? 0 : -1}" data-detail-tab="${key}">${label}</button>`).join('')}</div>
    <section id="reaction-panel" role="tabpanel" tabindex="0" aria-labelledby="tab-${tab}">${detailPanel(r, tab)}</section>
    ${source ? `<p class="book-citation">Kürti & Czakó, <cite>Strategic Applications of Named Reactions in Organic Synthesis</cite> (2005), ${source.pages.length === 1 ? 'p.' : 'pp.'} ${source.pages.join('–')}. Figures from your supplied copy.</p>` : ''}
    <div class="detail-actions"><button class="button primary" data-start="${r.category}">Quiz this category</button><button class="button secondary" data-save="${r.id}">${state.saved.includes(r.id) ? 'Unsave reaction' : 'Save reaction'}</button></div></div>`;
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
  let pool = selectedReactions(), title = 'Quick quiz';
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
    pool = pool.filter(r => state.selectedCategories.includes(r.category));
  } else if (categoryFor(mode)) { pool = pool.filter(r => r.category === mode); title = categoryFor(mode).short; }
  if (!pool.length) { toast('No reactions in this selection.'); return; }
  quiz = {mode, title, questions:(mode === 'daily' ? pool : shuffle(pool)).slice(0,5), index:0, correct:0, answered:false, started:Date.now(), finished:false};
  if (reactionDialog.open) reactionDialog.close();
  renderQuestion(); quizDialog.showModal();
}

function renderQuestion() {
  const r = quiz.questions[quiz.index];
  const selected = selectedReactions();
  const same = selected.filter(x => x.category === r.category && x.id !== r.id);
  const distractors = shuffle([...same, ...shuffle(selected.filter(x => x.category !== r.category)).slice(0,2)]).slice(0,3);
  quiz.options = shuffle([r, ...distractors]); quiz.answered = false;
  quizDialog.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span>${quiz.title} · ${quiz.index + 1} / ${quiz.questions.length}</span><button class="close-button" data-close="quiz" aria-label="Exit quiz">×</button></div>
    <div class="quiz-progress"><div style="width:${quiz.index / quiz.questions.length * 100}%"></div></div><span class="badge quiz-category">${categoryFor(r.category).short}</span>
    <h2 id="quiz-title">Name the reaction</h2><p class="question-text">${r.question}</p><div class="answers">${quiz.options.map((option,i) => `<button class="answer" data-answer="${option.id}"><span>${String.fromCharCode(65+i)}</span>${option.name}</button>`).join('')}</div>
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
reactionDialog.addEventListener('keydown', e => {
  if (!e.target.matches('[data-detail-tab]') || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  const tabs = ['reaction', 'mechanism', 'applications'];
  const index = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (tabs.indexOf(detailTab) + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
  selectDetailTab(tabs[index]);
});
document.addEventListener('click', e => {
  const button = e.target.closest('button'); if (!button) return;
  if (button.dataset.start) startQuiz(button.dataset.start);
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
render();
