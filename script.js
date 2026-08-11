const root=document.documentElement;
const savedTheme=localStorage.getItem("theme");
if(savedTheme)root.dataset.theme=savedTheme;
document.querySelector(".theme-toggle").addEventListener("click",()=>{
  root.dataset.theme=root.dataset.theme==="light"?"dark":"light";
  localStorage.setItem("theme",root.dataset.theme);
});
const menu=document.querySelector(".menu-toggle");
const links=document.querySelector(".nav-links");
menu.addEventListener("click",()=>{
  const open=links.classList.toggle("open");
  menu.setAttribute("aria-expanded",String(open));
});
links.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{links.classList.remove("open");menu.setAttribute("aria-expanded","false")}));
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");observer.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));
const bootScreen=document.querySelector(".boot-screen");
if(bootScreen)window.addEventListener("load",()=>setTimeout(()=>bootScreen.classList.add("hide"),450));
document.querySelectorAll("[data-download]").forEach(link=>link.addEventListener("click",e=>{e.preventDefault();alert("Replace this placeholder with your release or repository URL before publishing.") }));

document.getElementById("year").textContent=new Date().getFullYear();

// Resources panel
async function loadResources() {
  const listEl = document.getElementById('resourceList');
  try {
    const res = await fetch('/api/resources');
    const body = await res.json();
    const items = body?.resources || [];
    if (!items.length) { listEl.innerHTML = '<p>No resources available.</p>'; return; }
    listEl.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('article');
      card.className = 'resource-card';
      card.innerHTML = `<h3><a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.title}</a></h3><p>${item.description||''}</p><div class="resource-actions"><button data-save>Save</button><a class="text-link" href="${item.url}" target="_blank" rel="noopener noreferrer">Open</a></div>`;
      card.querySelector('[data-save]').addEventListener('click',()=>{
        const saved = JSON.parse(localStorage.getItem('dorks.savedResources')||'[]');
        saved.unshift(item); localStorage.setItem('dorks.savedResources', JSON.stringify(saved.slice(0,200)));
        alert('Saved to local library');
      });
      listEl.appendChild(card);
    });
  } catch (e) { listEl.innerHTML = '<p>Failed to load resources.</p>'; }
}

// Generator: load templates, wire UI
async function loadTemplates() {
  try {
    const r = await fetch('/assets/templates.json');
    const data = await r.json();
    const select = document.getElementById('genCategory');
    select.innerHTML = '';
    for (const key of Object.keys(data.categories)) {
      const opt = document.createElement('option');
      opt.value = key; opt.textContent = data.categories[key].label || key;
      select.appendChild(opt);
    }
    return data.categories;
  } catch (e) {
    console.error('Failed to load templates', e);
    return {};
  }
}

function renderSaved() {
  const savedEl = document.getElementById('savedList');
  const saved = JSON.parse(localStorage.getItem('dorks.savedQueries')||'[]');
  if (!saved.length) { savedEl.innerHTML = '<p>No saved queries.</p>'; return; }
  savedEl.innerHTML = '';
  saved.forEach((q, idx) => {
    const row = document.createElement('div'); row.className = 'saved-item';
    row.innerHTML = `<code>${q}</code> <button data-copy>Copy</button> <button data-remove>Remove</button>`;
    row.querySelector('[data-copy]').addEventListener('click',()=>{ navigator.clipboard.writeText(q).then(()=>alert('Copied')); });
    row.querySelector('[data-remove]').addEventListener('click',()=>{ saved.splice(idx,1); localStorage.setItem('dorks.savedQueries', JSON.stringify(saved); renderSaved(); });
    savedEl.appendChild(row);
  });
}

function uniqueRandom(items, count) {
  const out = new Set();
  const max = Math.min(count, items.length);
  while (out.size < max) out.add(items[Math.floor(Math.random()*items.length)]);
  return Array.from(out);
}

async function wireGenerator() {
  const categories = await loadTemplates();
  const domainInput = document.getElementById('genDomain');
  const generateBtn = document.getElementById('generateBtn');
  const resultsEl = document.getElementById('genResults');
  const exportBtn = document.getElementById('exportSaved');

  generateBtn.addEventListener('click',()=>{
    const cat = document.getElementById('genCategory').value;
    const count = Math.max(1, Math.min(50, Number(document.getElementById('genCount').value||5)));
    const domain = (domainInput.value||'{domain}').trim() || '{domain}';
    const templates = (categories[cat] && categories[cat].templates) ? categories[cat].templates : [];
    if (!templates.length) { resultsEl.innerHTML = '<p>No templates for this category.</p>'; return; }
    const chosen = uniqueRandom(templates, count).map(t => t.replace('{domain}', domain));
    resultsEl.innerHTML = '';
    chosen.forEach(q => {
      const el = document.createElement('div'); el.className = 'query-result';
      el.innerHTML = `<code>${q}</code> <button class="button" data-copy>Copy</button> <button class="button" data-save>Save</button>`;
      el.querySelector('[data-copy]').addEventListener('click',()=>{ navigator.clipboard.writeText(q).then(()=>alert('Copied')); });
      el.querySelector('[data-save]').addEventListener('click',()=>{
        const saved = JSON.parse(localStorage.getItem('dorks.savedQueries')||'[]'); saved.unshift(q); localStorage.setItem('dorks.savedQueries', JSON.stringify(saved.slice(0,500))); renderSaved();
      });
      resultsEl.appendChild(el);
    });
  });

  exportBtn.addEventListener('click',()=>{
    const saved = JSON.parse(localStorage.getItem('dorks.savedQueries')||'[]');
    const blob = new Blob([JSON.stringify(saved, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'saved-queries.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  renderSaved();
}

window.addEventListener('load',()=>{ loadResources(); wireGenerator(); if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{}); });
