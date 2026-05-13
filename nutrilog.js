/* ============================================================
   NutriLog — Lógica de la aplicación
   ============================================================ */

'use strict';

// ── STORAGE ──────────────────────────────────────────────────
const STORAGE_KEY = 'nutrilog_v2';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function persist(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getDay(key) {
  const data = load();
  return data[key] || { meals: [], activities: [] };
}

function saveDay(key, dayObj) {
  const data = load();
  data[key] = dayObj;
  persist(data);
}

// ── FECHAS ───────────────────────────────────────────────────
let curDate = todayKey();

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function shiftKey(key, delta) {
  const d = parseKey(key);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const MESES     = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS      = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const DIAS_S    = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES_S   = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function labelDate(key) {
  const d    = parseKey(key);
  const m    = key.split('-')[1] - 1;
  const dd   = key.split('-')[2] - 0;
  const y    = key.split('-')[0];
  const hoy  = todayKey();
  const ayer = shiftKey(hoy, -1);

  if (key === hoy)  return `Hoy — ${DIAS[d.getDay()]}, ${dd} de ${MESES[m]}`;
  if (key === ayer) return `Ayer — ${DIAS[d.getDay()]}, ${dd} de ${MESES[m]}`;
  return `${DIAS[d.getDay()]}, ${dd} de ${MESES[m]} ${y}`;
}

function labelShort(key) {
  const d  = parseKey(key);
  const m  = key.split('-')[1] - 1;
  const dd = key.split('-')[2] - 0;
  const y  = key.split('-')[0];
  return `${DIAS_S[d.getDay()]} ${dd} ${MESES_S[m]} ${y}`;
}

function shiftDay(delta) {
  curDate = delta === 0 ? todayKey() : shiftKey(curDate, delta);
  renderHoy();
}

// ── TABS ─────────────────────────────────────────────────────
function switchTab(name, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

  btn.classList.add('active');
  document.getElementById(`panel-${name}`).classList.add('active');

  // El FAB solo aparece en la vista de hoy
  document.getElementById('fab-wrap').style.display = name === 'hoy' ? 'flex' : 'none';

  if (name === 'historial') renderHistory();
}

// ── RENDER HOY ───────────────────────────────────────────────
function renderHoy() {
  document.getElementById('hoy-title').textContent = labelDate(curDate);
  document.getElementById('hdr-date').textContent  = curDate;

  const day = getDay(curDate);

  // ── PUNTO 1: Ordenar por hora antes de renderizar ──────────
  const sortedMeals = [...day.meals].sort((a, b) =>
    (a.time || '99:99').localeCompare(b.time || '99:99')
  );
  const sortedActs = [...day.activities].sort((a, b) =>
    (a.time || '99:99').localeCompare(b.time || '99:99')
  );

  const totalIngredientes = day.meals.reduce((acc, m) => acc + m.ingredients.length, 0);

  document.getElementById('s-meals').textContent = day.meals.length;
  document.getElementById('s-ings').textContent  = totalIngredientes;
  document.getElementById('s-acts').textContent  = day.activities.length;

  const mealsList = document.getElementById('meals-list');
  mealsList.innerHTML = sortedMeals.length
    ? sortedMeals.map((m, i) => mealCard(m, i, curDate, day.meals)).join('')
    : `<div class="empty"><div class="empty-icon">🍽</div>Sin comidas registradas.<br>Toca + para añadir.</div>`;

  const actsList = document.getElementById('acts-list');
  actsList.innerHTML = sortedActs.length
    ? sortedActs.map((a, i) => actCard(a, i, curDate, day.activities)).join('')
    : `<div class="empty"><div class="empty-icon">⚡</div>Sin actividad registrada.<br>Toca + para añadir.</div>`;
}

// ── TEMPLATES DE CARDS ───────────────────────────────────────
const MEAL_ICONS = { desayuno: '🌅', almuerzo: '☀️', cena: '🌙', merienda: '🍎' };

// Nota: sortedList es la lista ordenada para display; originalList es la del storage (para el idx real)
function mealCard(meal, sortedIdx, dateKey, originalList) {
  const icon  = MEAL_ICONS[meal.type] || '🍴';
  const chips = meal.ingredients.map(g => `<span class="chip">${esc(g)}</span>`).join('');
  const note  = meal.notes ? `<div class="card-note">${esc(meal.notes)}</div>` : '';

  // Índice real en el array original (por id, seguro contra reordenamientos)
  const realIdx = originalList
    ? originalList.findIndex(m => m.id === meal.id)
    : sortedIdx;

  const onDel = dateKey === curDate
    ? `delMeal(${realIdx})`
    : `delMealH('${dateKey}', ${realIdx}); renderHistory()`;

  return `
    <div class="card">
      <div class="card-top">
        <div class="card-left">
          <div class="card-name">
            ${icon} ${esc(meal.name || meal.type)}
            <span class="meal-tag tag-${meal.type}">${meal.type}</span>
          </div>
          ${meal.time ? `<div class="card-meta">🕐 ${meal.time}</div>` : ''}
        </div>
        <button class="card-delete" onclick="${onDel}">✕</button>
      </div>
      ${chips ? `<div class="chips">${chips}</div>` : ''}
      ${note}
    </div>`;
}

function actCard(act, sortedIdx, dateKey, originalList) {
  const realIdx = originalList
    ? originalList.findIndex(a => a.id === act.id)
    : sortedIdx;

  const onDel = dateKey === curDate
    ? `delAct(${realIdx})`
    : `delActH('${dateKey}', ${realIdx}); renderHistory()`;

  return `
    <div class="card activity">
      <div class="card-top">
        <div class="card-left">
          <div class="card-name">⚡ Esfuerzo físico</div>
          ${act.time ? `<div class="card-meta">🕐 ${act.time}</div>` : ''}
        </div>
        <button class="card-delete" onclick="${onDel}">✕</button>
      </div>
      <div class="card-note">${esc(act.description)}</div>
    </div>`;
}

// ── MODAL COMIDA ─────────────────────────────────────────────
let currentIngredients = [];

function openMealModal() {
  closeFab();
  currentIngredients = [];

  ['m-name', 'm-notes', 'm-ing'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('m-time').value = nowHHMM();
  document.getElementById('m-chips').innerHTML = '';
  document.querySelectorAll('.type-pill').forEach(p => p.classList.remove('sel'));

  document.getElementById('meal-bd').classList.add('open');
}

function closeMealModal() {
  document.getElementById('meal-bd').classList.remove('open');
}

function pickType(el) {
  document.querySelectorAll('.type-pill').forEach(p => p.classList.remove('sel'));
  el.classList.add('sel');
}

function addIng() {
  const input = document.getElementById('m-ing');
  const val   = input.value.trim();
  if (!val) return;

  currentIngredients.push(val);
  input.value = '';
  renderIngs();
  input.focus();
}

function removeIng(idx) {
  currentIngredients.splice(idx, 1);
  renderIngs();
}

function renderIngs() {
  document.getElementById('m-chips').innerHTML = currentIngredients
    .map((g, i) => `
      <span class="ing-chip">
        ${esc(g)}
        <button class="ing-chip-rm" onclick="removeIng(${i})">✕</button>
      </span>`)
    .join('');
}

function saveMeal() {
  const typeEl = document.querySelector('.type-pill.sel');
  const type   = typeEl ? typeEl.dataset.v : 'merienda';
  const name   = document.getElementById('m-name').value.trim() || type;
  const time   = document.getElementById('m-time').value;
  const notes  = document.getElementById('m-notes').value.trim();

  const day = getDay(curDate);
  day.meals.push({
    id: Date.now(),
    type,
    name,
    time,
    ingredients: [...currentIngredients],
    notes
  });

  saveDay(curDate, day);
  closeMealModal();
  renderHoy();
  toast('Comida guardada');
}

// ── PUNTO 3: Soft delete con undo ────────────────────────────
let undoStack = null; // { key, type, idx, item, render }

function delMeal(idx) {
  const day  = getDay(curDate);
  const item = day.meals.splice(idx, 1)[0];
  saveDay(curDate, day);
  undoStack = { key: curDate, type: 'meal', idx, item, render: 'hoy' };
  renderHoy();
  toastUndo('Comida eliminada');
}

function delMealH(key, idx) {
  const day  = getDay(key);
  const item = day.meals.splice(idx, 1)[0];
  saveDay(key, day);
  undoStack = { key, type: 'meal', idx, item, render: 'history' };
  toastUndo('Comida eliminada');
}

function delAct(idx) {
  const day  = getDay(curDate);
  const item = day.activities.splice(idx, 1)[0];
  saveDay(curDate, day);
  undoStack = { key: curDate, type: 'act', idx, item, render: 'hoy' };
  renderHoy();
  toastUndo('Actividad eliminada');
}

function delActH(key, idx) {
  const day  = getDay(key);
  const item = day.activities.splice(idx, 1)[0];
  saveDay(key, day);
  undoStack = { key, type: 'act', idx, item, render: 'history' };
  toastUndo('Actividad eliminada');
}

function undoDelete() {
  if (!undoStack) return;
  const { key, type, idx, item, render } = undoStack;
  const day = getDay(key);

  if (type === 'meal') {
    day.meals.splice(idx, 0, item);
  } else {
    day.activities.splice(idx, 0, item);
  }

  saveDay(key, day);
  undoStack = null;

  if (render === 'hoy') renderHoy();
  else renderHistory();
  toast('Restaurado ✓');
}

// ── MODAL ACTIVIDAD ──────────────────────────────────────────
function openActModal() {
  closeFab();
  document.getElementById('a-desc').value = '';
  document.getElementById('a-time').value = nowHHMM();
  document.getElementById('act-bd').classList.add('open');
}

function closeActModal() {
  document.getElementById('act-bd').classList.remove('open');
}

function saveAct() {
  const desc = document.getElementById('a-desc').value.trim();
  if (!desc) { toast('Describe la actividad'); return; }

  const time = document.getElementById('a-time').value;
  const day  = getDay(curDate);
  day.activities.push({ id: Date.now(), description: desc, time });

  saveDay(curDate, day);
  closeActModal();
  renderHoy();
  toast('Actividad guardada');
}

// ── DATE PICKER ──────────────────────────────────────────────
function openDatePicker() {
  document.getElementById('dp-input').value = curDate;
  document.getElementById('dp-bd').classList.add('open');
}

function closeDatePicker() {
  document.getElementById('dp-bd').classList.remove('open');
}

function applyDate() {
  const val = document.getElementById('dp-input').value;
  if (val) { curDate = val; renderHoy(); }
  closeDatePicker();
}

// ── HISTORIAL ────────────────────────────────────────────────
function renderHistory() {
  const data  = load();
  const dates = Object.keys(data).sort((a, b) => b.localeCompare(a));
  const cont  = document.getElementById('hist-list');

  if (!dates.length) {
    cont.innerHTML = `<div class="empty"><div class="empty-icon">📅</div>No hay registros aún.</div>`;
    return;
  }

  cont.innerHTML = dates.map(key => {
    const day   = data[key];
    const total = day.meals.length + day.activities.length;

    // Ordenar también en historial
    const sortedMeals = [...day.meals].sort((a, b) =>
      (a.time || '99:99').localeCompare(b.time || '99:99')
    );
    const sortedActs = [...day.activities].sort((a, b) =>
      (a.time || '99:99').localeCompare(b.time || '99:99')
    );

    const cards = [
      ...sortedMeals.map((m, i) => mealCard(m, i, key, day.meals)),
      ...sortedActs.map((a, i)  => actCard(a, i, key, day.activities))
    ].join('');

    return `
      <div class="hist-day">
        <div class="hist-day-hd">
          ${labelShort(key)}
          <span class="hist-count">${total} registro${total !== 1 ? 's' : ''}</span>
        </div>
        ${cards || `<div class="empty" style="padding:12px">Sin datos</div>`}
      </div>`;
  }).join('');
}

// ── EXPORTAR ─────────────────────────────────────────────────
function buildJSON() {
  const data  = load();
  const dates = Object.keys(data).sort();

  return JSON.stringify({
    exportado_en: new Date().toISOString(),
    app: 'NutriLog',
    nota: 'Registro de alimentación. Ingredientes en texto libre con cantidades aproximadas.',
    dias: dates.map(key => ({
      fecha: key,
      comidas: data[key].meals.map(m => ({
        tipo:         m.type,
        nombre:       m.name,
        hora:         m.time || null,
        ingredientes: m.ingredients,
        notas:        m.notes || null
      })),
      actividad_fisica: data[key].activities.map(a => ({
        hora:        a.time || null,
        descripcion: a.description
      }))
    }))
  }, null, 2);
}

function buildCSV() {
  const data  = load();
  const dates = Object.keys(data).sort();
  const rows  = [['fecha', 'tipo', 'nombre', 'hora', 'ingredientes', 'notas']];

  dates.forEach(key => {
    data[key].meals.forEach(m => {
      rows.push([key, m.type, m.name || '', m.time || '', m.ingredients.join(' | '), m.notes || '']);
    });
    data[key].activities.forEach(a => {
      rows.push([key, 'actividad', '', a.time || '', '', a.description]);
    });
  });

  return rows
    .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

function buildMD() {
  const data  = load();
  const dates = Object.keys(data).sort((a, b) => b.localeCompare(a));
  let md = `# NutriLog — Historial\n\n_Exportado: ${new Date().toLocaleString('es-CO')}_\n\n---\n\n`;

  dates.forEach(key => {
    const day = data[key];
    md += `## ${labelShort(key)}\n\n`;

    if (day.meals.length) {
      md += `### Comidas\n\n`;
      day.meals.forEach(m => {
        md += `**${m.type.charAt(0).toUpperCase() + m.type.slice(1)}`;
        if (m.name && m.name !== m.type) md += ` — ${m.name}`;
        md += `**`;
        if (m.time) md += ` _(${m.time})_`;
        md += `\n`;
        if (m.ingredients.length) md += `- Ingredientes: ${m.ingredients.join(', ')}\n`;
        if (m.notes)              md += `- Notas: ${m.notes}\n`;
        md += '\n';
      });
    }

    if (day.activities.length) {
      md += `### Actividad física\n\n`;
      day.activities.forEach(a => {
        if (a.time) md += `_(${a.time})_ `;
        md += `${a.description}\n\n`;
      });
    }

    md += '---\n\n';
  });

  return md;
}

function doExport(fmt) {
  const formats = {
    json: ['application/json', 'json', buildJSON],
    csv:  ['text/csv',         'csv',  buildCSV],
    md:   ['text/markdown',    'md',   buildMD]
  };

  const [mime, ext, buildFn] = formats[fmt];
  const blob = new Blob([buildFn()], { type: mime });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `nutrilog_${todayKey()}.${ext}`;
  a.click();
  toast(`Descargando .${ext}`);
}

function doCopy(fmt) {
  const content = fmt === 'json' ? buildJSON() : buildMD();
  navigator.clipboard.writeText(content)
    .then(()  => toast('Copiado al portapapeles'))
    .catch(() => toast('No se pudo copiar'));
}

function doPreview(fmt, previewId) {
  const el = document.getElementById(previewId);

  if (el.classList.contains('show')) {
    el.classList.remove('show');
    return;
  }

  document.querySelectorAll('.preview').forEach(p => p.classList.remove('show'));

  const txt = fmt === 'json' ? buildJSON() : buildMD();
  el.textContent = txt.slice(0, 2000) + (txt.length > 2000 ? '\n\n[... truncado]' : '');
  el.classList.add('show');
}

// ── PUNTO 2: Import JSON ──────────────────────────────────────
function openImport() {
  document.getElementById('import-file').click();
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const parsed = JSON.parse(ev.target.result);

      // Validar estructura básica
      if (!parsed.dias || !Array.isArray(parsed.dias)) {
        toast('Archivo inválido — formato no reconocido');
        return;
      }

      const existing = load();
      let imported = 0;
      let merged   = 0;

      parsed.dias.forEach(dia => {
        if (!dia.fecha) return;

        const key   = dia.fecha;
        const meals = (dia.comidas || []).map(c => ({
          id:          Date.now() + Math.random(),
          type:        c.tipo        || 'merienda',
          name:        c.nombre      || c.tipo || 'merienda',
          time:        c.hora        || '',
          ingredients: c.ingredientes || [],
          notes:       c.notas       || ''
        }));
        const activities = (dia.actividad_fisica || []).map(a => ({
          id:          Date.now() + Math.random(),
          description: a.descripcion || '',
          time:        a.hora        || ''
        }));

        if (existing[key]) {
          // Merge: añadir solo los que no existan (por nombre+hora como heurística)
          meals.forEach(m => {
            const dup = existing[key].meals.some(
              em => em.name === m.name && em.time === m.time
            );
            if (!dup) existing[key].meals.push(m);
          });
          activities.forEach(a => {
            const dup = existing[key].activities.some(
              ea => ea.description === a.description && ea.time === a.time
            );
            if (!dup) existing[key].activities.push(a);
          });
          merged++;
        } else {
          existing[key] = { meals, activities };
          imported++;
        }
      });

      persist(existing);
      renderHoy();
      toast(`Importado: ${imported} días nuevos, ${merged} combinados`);

    } catch {
      toast('Error al leer el archivo');
    }

    // Reset input para permitir reimportar el mismo archivo
    e.target.value = '';
  };

  reader.readAsText(file);
}

function nukAll() {
  if (!confirm('¿Borrar todos los datos? Esta acción no se puede deshacer.')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHoy();
  toast('Datos eliminados');
}

// ── FAB ──────────────────────────────────────────────────────
function toggleFab() {
  const opts = document.getElementById('fab-opts');
  const btn  = document.getElementById('fab-btn');
  const open = opts.classList.toggle('open');
  btn.classList.toggle('open', open);
}

function closeFab() {
  document.getElementById('fab-opts').classList.remove('open');
  document.getElementById('fab-btn').classList.remove('open');
}

// ── UTILS ────────────────────────────────────────────────────
function nowHHMM() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── PUNTO 3: Toast con botón Deshacer ────────────────────────
let toastTimer;

function toast(msg) {
  const el = document.getElementById('toast');
  el.innerHTML = esc(msg);
  el.classList.add('on');
  el.classList.remove('undo');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 2400);
}

function toastUndo(msg) {
  const el = document.getElementById('toast');
  el.innerHTML = `${esc(msg)} <button class="toast-undo-btn" onclick="undoDelete()">Deshacer</button>`;
  el.classList.add('on', 'undo');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('on', 'undo');
    undoStack = null; // expiró la ventana de undo
  }, 4000);
}

// Cerrar modales al hacer clic en el backdrop
document.querySelectorAll('.backdrop').forEach(bd => {
  bd.addEventListener('click', e => {
    if (e.target === bd) {
      bd.classList.remove('open');
      closeFab();
    }
  });
});

// ── FAVICON DINÁMICO (isotipo) ───────────────────────────────
(function generateFavicon() {
  const canvas  = document.createElement('canvas');
  canvas.width  = 32;
  canvas.height = 32;
  const ctx     = canvas.getContext('2d');

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  ctx.fillStyle = '#212320';
  roundedRect(0, 0, 32, 32, 7);
  ctx.fill();

  ctx.strokeStyle = '#3a3d34';
  ctx.lineWidth   = 0.8;
  roundedRect(0, 0, 32, 32, 7);
  ctx.stroke();

  ctx.lineCap = 'round';

  ctx.globalAlpha  = 0.28;
  ctx.strokeStyle  = '#e8e6df';
  ctx.lineWidth    = 2.2;
  ctx.beginPath(); ctx.moveTo(6, 10); ctx.lineTo(26, 10); ctx.stroke();

  ctx.globalAlpha  = 1;
  ctx.strokeStyle  = '#c8a96e';
  ctx.lineWidth    = 2.6;
  ctx.beginPath(); ctx.moveTo(6, 16); ctx.lineTo(26, 16); ctx.stroke();

  ctx.globalAlpha  = 0.55;
  ctx.strokeStyle  = '#e8e6df';
  ctx.lineWidth    = 2.2;
  ctx.beginPath(); ctx.moveTo(6, 22); ctx.lineTo(19, 22); ctx.stroke();

  ctx.globalAlpha = 1;

  const link = document.createElement('link');
  link.rel   = 'icon';
  link.href  = canvas.toDataURL();
  document.head.appendChild(link);
})();

// ── PWA SERVICE WORKER (archivo real) ───────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// ── INIT ─────────────────────────────────────────────────────
renderHoy();
