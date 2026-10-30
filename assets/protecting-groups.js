'use strict';

let protectingSearch = '', protectingChapter = 'all', protectingSection = 'all', protectingOffset = 0;
let protectingCurrentId = null, protectingSelection = [], protectingTab = 'protection';
const protectingPageSize = 60;
const protectingLabels = {protection: 'Protection conditions', deprotection: 'Deprotection conditions', source: 'Source & notes'};

function protectingMatches() {
  const terms = searchKey(protectingSearch).split(/\s+/).filter(Boolean);
  return protectingGroupCatalog.entries.filter(entry =>
    (protectingChapter === 'all' || entry.chapter === protectingChapter) &&
    (protectingSection === 'all' || entry.category === protectingSection) &&
    terms.every(term => searchKey(`${entry.name} ${entry.category} ${entry.searchText}`).includes(term)));
}

function protectingGroups() {
  main.innerHTML = heading('Protecting groups') + `<p class="intro">Greene’s <em>Protective Groups in Organic Synthesis</em>, fourth edition (2007). Browse in the book’s chapter and section order, with the original conditions and reaction schemes.</p>
    <div class="protecting-filters">
      <label class="search-box">Search groups<input id="protecting-search" type="search" placeholder="Name or abbreviation, e.g. Boc, silyl" value="${escapeHTML(protectingSearch)}"></label>
      <label>Chapter<select id="protecting-chapter"><option value="all">All chapters</option>${protectingGroupCatalog.chapters.map(chapter => `<option value="${chapter.id}">${chapter.number}. ${escapeHTML(chapter.name)}</option>`).join('')}</select></label>
      <label>Section<select id="protecting-section"></select></label>
    </div>
    <p class="catalog-note">${protectingGroupCatalog.entries.filter(e => e.kind === 'group').length.toLocaleString()} group listings, plus ${protectingGroupCatalog.entries.filter(e => e.kind === 'section').length} section introductions and general methods. Some entries share procedures or only cite references; the source excerpt shows what the book provides.</p>
    <p id="protecting-count" class="muted" role="status"></p><div id="protecting-results"></div>
    <div class="protecting-pagination"><button class="button secondary" data-protecting-page="-1">Previous</button><span id="protecting-page" class="muted"></span><button class="button secondary" data-protecting-page="1">Next</button></div>`;
  document.querySelector('#protecting-chapter').value = protectingChapter;
  updateProtectingSections();
  renderProtectingResults();
  document.querySelector('#protecting-search').addEventListener('input', event => {
    protectingSearch = event.target.value; protectingOffset = 0; renderProtectingResults();
  });
  document.querySelector('#protecting-chapter').addEventListener('change', event => {
    protectingChapter = event.target.value; protectingSection = 'all'; protectingOffset = 0;
    updateProtectingSections(); renderProtectingResults();
  });
  document.querySelector('#protecting-section').addEventListener('change', event => {
    protectingSection = event.target.value; protectingOffset = 0; renderProtectingResults();
  });
}

function updateProtectingSections() {
  const sections = [...new Set(protectingGroupCatalog.entries.filter(entry => protectingChapter === 'all' || entry.chapter === protectingChapter).map(entry => entry.category))];
  const select = document.querySelector('#protecting-section');
  select.innerHTML = '<option value="all">All sections</option>' + sections.map(section => `<option value="${escapeHTML(section)}">${escapeHTML(section)}</option>`).join('');
  select.value = protectingSection;
}

function renderProtectingResults() {
  const entries = protectingMatches();
  protectingOffset = Math.min(protectingOffset, Math.max(0, Math.floor((entries.length - 1) / protectingPageSize) * protectingPageSize));
  const shown = entries.slice(protectingOffset, protectingOffset + protectingPageSize);
  document.querySelector('#protecting-count').textContent = `${entries.length.toLocaleString()} entries${entries.length ? ` · Showing ${protectingOffset + 1}–${protectingOffset + shown.length}` : ''}`;
  let chapterId, category;
  document.querySelector('#protecting-results').innerHTML = shown.map(entry => {
    const chapter = protectingGroupCatalog.chapters.find(c => c.id === entry.chapter);
    let label = '';
    if (chapterId !== entry.chapter) {
      label += `<h2 class="protecting-chapter-heading">${chapter.number}. ${escapeHTML(chapter.name)}</h2>`;
      chapterId = entry.chapter; category = null;
    }
    if (category !== entry.category) {
      label += `<h3 class="protecting-section-heading">${escapeHTML(entry.category)}</h3>`;
      category = entry.category;
    }
    return `${label}<article class="protecting-row"><button class="text-button" data-protecting-id="${entry.id}">${escapeHTML(entry.name)}</button><span class="muted">${entry.kind === 'section' ? 'Section · ' : ''}p. ${entry.page}</span></article>`;
  }).join('') || '<p class="empty-state">No matching groups. Try another name, abbreviation, chapter, or section.</p>';
  document.querySelector('[data-protecting-page="-1"]').disabled = protectingOffset === 0;
  document.querySelector('[data-protecting-page="1"]').disabled = protectingOffset + protectingPageSize >= entries.length;
  document.querySelector('#protecting-page').textContent = entries.length ? `Page ${Math.floor(protectingOffset / protectingPageSize) + 1} of ${Math.ceil(entries.length / protectingPageSize)}` : '';
}

function protectingFigures(regions, entry, tab) {
  return regions.map(region => {
    const image = `assets/protecting-groups/page-${String(region.page).padStart(4, '0')}.webp`;
    const height = protectingGroupCatalog.pageHeight * (region.bottom - region.top);
    return `<figure class="book-figure"><a href="${image}" target="_blank" rel="noopener" aria-label="Open source page ${region.page} for ${escapeHTML(entry.name)}">
      <div class="book-figure-region" style="aspect-ratio:${protectingGroupCatalog.pageWidth}/${height}"><img src="${image}" alt="${escapeHTML(entry.name)}: ${protectingLabels[tab]}, Greene fourth edition, page ${region.page}" loading="lazy" style="top:${-region.top / (region.bottom - region.top) * 100}%"></div></a>
      <figcaption>Greene, fourth edition · p. ${region.page}<a href="${image}" target="_blank" rel="noopener">Full source page ↗</a></figcaption></figure>`;
  }).join('');
}

function protectingPanel(entry, tab) {
  let note = '';
  let regions = entry[tab];
  if (tab !== 'source' && !regions.length) {
    regions = entry.source;
    note = `<p class="account-notice">This entry has no separately labeled ${tab === 'protection' ? 'Formation' : 'Cleavage'} section. Its discussion, schemes, or reference listing are shown below; no additional procedure has been inferred.</p>`;
  } else if (tab !== 'source' && entry.combined) {
    note = '<p class="muted">The book presents formation and cleavage together. Both directions are retained in these excerpts.</p>';
  }
  return note + protectingFigures(regions, entry, tab);
}

function showProtectingGroup(id, tab = null) {
  const entry = protectingGroupCatalog.entries.find(entry => entry.id === id);
  if (!entry) return;
  tab ||= entry.kind === 'section' ? 'source' : 'protection';
  const dialog = document.querySelector('#protecting-dialog');
  if (!dialog.open) protectingSelection = protectingMatches().map(entry => entry.id);
  if (!protectingSelection.includes(id)) protectingSelection = [id];
  protectingCurrentId = id; protectingTab = tab;
  const position = protectingSelection.indexOf(id);
  const chapter = protectingGroupCatalog.chapters.find(c => c.id === entry.chapter);
  dialog.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span>${position + 1} / ${protectingSelection.length} · ${escapeHTML(chapter.name)}</span><button class="close-button" data-protecting-close aria-label="Close protecting group">×</button></div>
    <h2 id="protecting-title" tabindex="-1">${escapeHTML(entry.name)}</h2><p class="muted">${escapeHTML(entry.category)} · Contents reference: p. ${entry.page}</p>
    <div class="reaction-tabs" role="tablist" aria-label="Protecting group conditions">${Object.entries(protectingLabels).map(([key, label]) => `<button role="tab" id="protecting-tab-${key}" data-protecting-tab="${key}" aria-controls="protecting-panel" aria-selected="${tab === key}">${label}</button>`).join('')}</div>
    <section id="protecting-panel" role="tabpanel" aria-labelledby="protecting-tab-${tab}">${protectingPanel(entry, tab)}</section>
    <p class="book-citation">Peter G. M. Wuts and Theodora W. Greene, <cite>Greene’s Protective Groups in Organic Synthesis</cite>, fourth edition, Wiley (2007). Original source excerpts; the right-hand download notice is cropped out.</p>
    <div class="flashcard-navigation"><button class="button secondary" data-protecting-step="-1" ${position === 0 ? 'disabled' : ''}>Previous group</button><button class="button secondary" data-protecting-step="1" ${position === protectingSelection.length - 1 ? 'disabled' : ''}>Next group</button></div></div>`;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  dialog.querySelector('#protecting-title').focus({preventScroll: true});
}

function selectProtectingTab(tab) {
  const entry = protectingGroupCatalog.entries.find(entry => entry.id === protectingCurrentId);
  if (!entry || !Object.hasOwn(protectingLabels, tab)) return;
  protectingTab = tab;
  const dialog = document.querySelector('#protecting-dialog');
  dialog.querySelectorAll('[data-protecting-tab]').forEach(button => button.setAttribute('aria-selected', String(button.dataset.protectingTab === tab)));
  const panel = dialog.querySelector('#protecting-panel');
  panel.setAttribute('aria-labelledby', `protecting-tab-${tab}`);
  panel.innerHTML = protectingPanel(entry, tab);
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.protectingId) showProtectingGroup(button.dataset.protectingId);
  else if (button.dataset.protectingTab) selectProtectingTab(button.dataset.protectingTab);
  else if (button.hasAttribute('data-protecting-close')) document.querySelector('#protecting-dialog').close();
  else if (button.dataset.protectingStep) {
    const id = protectingSelection[protectingSelection.indexOf(protectingCurrentId) + Number(button.dataset.protectingStep)];
    if (id) showProtectingGroup(id, protectingTab);
  } else if (button.dataset.protectingPage) {
    protectingOffset += Number(button.dataset.protectingPage) * protectingPageSize;
    renderProtectingResults(); document.querySelector('#protecting-count').scrollIntoView({block: 'center'});
  }
});

document.querySelector('#protecting-dialog').addEventListener('click', event => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});
document.querySelector('#protecting-dialog').addEventListener('keydown', event => {
  const tab = event.target.closest('[data-protecting-tab]');
  if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const names = Object.keys(protectingLabels);
  const index = event.key === 'Home' ? 0 : event.key === 'End' ? names.length - 1 : (names.indexOf(tab.dataset.protectingTab) + (event.key === 'ArrowLeft' ? -1 : 1) + names.length) % names.length;
  selectProtectingTab(names[index]); document.querySelector(`[data-protecting-tab="${names[index]}"]`).focus();
});
