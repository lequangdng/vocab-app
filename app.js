/* =========================================================
   VocabNote – Sổ từ vựng tiếng Anh
   Một ứng dụng web (PWA) chạy offline, đồng bộ Google Drive.
   ========================================================= */
'use strict';

const APP_VERSION = '1.1.0';
const CFG = window.VOCAB_CONFIG || {};

/* ---------------- Tiện ích ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DAY = 864e5;
const pad2 = n => String(n).padStart(2, '0');
const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const startOfDay = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const splitList = s => String(s || '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
const normAns = s => String(s || '').toLowerCase().replace(/[’‘`]/g, "'").replace(/[.!?]+$/, '').replace(/\s+/g, ' ').trim();

function fmtDate(t) {
  if (!t) return '—';
  const d = new Date(t);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function fmtAgo(t) {
  if (!t) return 'chưa bao giờ';
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} ngày trước`;
  return fmtDate(t);
}
function fmtInterval(days) {
  if (days <= 0) return '10 phút';
  if (days === 1) return '1 ngày';
  if (days < 30) return `${days} ngày`;
  if (days < 365) return `${Math.round(days / 30)} tháng`;
  return `${(days / 365).toFixed(1)} năm`;
}
function fmtDue(w) {
  if (status(w) === 'new') return 'Chưa học';
  const d = w.srs.due - Date.now();
  if (d <= 0) return 'Đến hạn ôn';
  if (d < DAY) return 'Hôm nay';
  return `Sau ${Math.ceil(d / DAY)} ngày`;
}

/* ---------------- Icon (SVG nội tuyến) ---------------- */
const ICONS = {
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  cards: '<rect x="3" y="7" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  vol: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  snail: '<path d="M2 18h13a6 6 0 1 0-6-6v2a3 3 0 1 0 3-3"/><path d="M15 18c2 0 4-1 5-3l1-6M18 9l1-4M21 9l1-4"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  cloud: '<path d="M17.5 19H7a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4.5 4.5 0 0 1-1.5 9z"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  dict: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  eraser: '<path d="m7 21-4-4L14 6l7 7-8 8H7z"/><path d="M22 21H7M9 10l7 7"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
  flame: '<path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-6 6-6 10-1-1-2-2-2-4-2 2-1 5-1 6 0 4 3 7 7 7z"/>',
  quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M8 17h8"/>',
  headphones: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 16a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 16a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z"/>',
  ext: '<path d="M14 3h7v7M10 14 21 3M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A5.6 5.6 0 0 0 22 10c0-4.4-4.5-8-10-8z"/>',
  db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>'
};
const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------------- Toast ---------------- */
function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  $('#toast').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2600);
  setTimeout(() => el.remove(), 3000);
}

/* =========================================================
   KHO DỮ LIỆU (lưu cục bộ + đồng bộ Drive)
   ========================================================= */
const DEFAULT_SETTINGS = {
  clientId: '', driveFile: CFG.driveFileName || 'vocab-data.json', autoSync: true,
  accent: 'en-US', voiceURI: '', rate: 0.9, autoSpeak: true,
  theme: 'auto', sessionSize: 20, newPerSession: 10, dailyGoal: 20,
  studySource: 'due', direction: 'en-vi'
};

const Store = {
  data: null, settings: null,
  load() {
    try { this.data = JSON.parse(localStorage.getItem('vn.data')); } catch { this.data = null; }
    if (!this.data || !Array.isArray(this.data.words)) this.data = emptyData();
    this.data.deleted ||= {}; this.data.log ||= {};
    this.data.words = this.data.words.map(normalizeWord);
    try { this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('vn.settings') || '{}') }; }
    catch { this.settings = { ...DEFAULT_SETTINGS }; }
  },
  persist() { try { localStorage.setItem('vn.data', JSON.stringify(this.data)); } catch (e) { toast('Không lưu được dữ liệu: bộ nhớ trình duyệt đầy?', 'error'); } },
  save(sync = true, ids = ['*']) { ids.forEach(id => LocalFile.markDirty(id)); this.persist(); updateBadges(); LocalFile.schedule(); if (sync) Sync.schedule(); },
  saveSettings() { localStorage.setItem('vn.settings', JSON.stringify(this.settings)); },
  get words() { return this.data.words; },
  byId(id) { return this.data.words.find(w => w.id === id); },
  findByText(text, exceptId) { const t = normAns(text); return this.data.words.find(w => w.id !== exceptId && normAns(w.word) === t); },
  upsert(w, sync = true) {
    w.updatedAt = Date.now();
    const i = this.data.words.findIndex(x => x.id === w.id);
    if (i < 0) { this.data.words.unshift(w); this.logDay('added'); } else this.data.words[i] = w;
    this.save(sync, [w.id]);
  },
  remove(id) {
    this.data.words = this.data.words.filter(w => w.id !== id);
    this.data.deleted[id] = Date.now();
    this.save(true, [id]);
  },
  logDay(field, n = 1) {
    const k = dayKey();
    const d = (this.data.log[k] ||= { reviews: 0, correct: 0, added: 0, writes: 0 });
    d[field] = (d[field] || 0) + n;
  }
};
function emptyData() { return { version: 1, words: [], deleted: {}, log: {} }; }

function blankWord() {
  const now = Date.now();
  return {
    id: uid(), word: '', ipa: '', pos: '', meaning: '', notes: '', synonyms: '', antonyms: '',
    examples: [], tags: '', starred: false, learned: false, createdAt: now, updatedAt: now,
    srs: { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: 0 },
    stats: { reviews: 0, correct: 0, wrong: 0, writes: 0, lastStudied: 0 }
  };
}
function normalizeWord(w) {
  const b = blankWord();
  const out = { ...b, ...w };
  out.srs = { ...b.srs, ...(w.srs || {}) };
  out.stats = { ...b.stats, ...(w.stats || {}) };
  out.examples = Array.isArray(w.examples) ? w.examples.map(e => typeof e === 'string' ? { en: e, vi: '' } : { en: e.en || '', vi: e.vi || '' }).filter(e => e.en) : [];
  for (const k of ['word', 'ipa', 'pos', 'meaning', 'notes', 'synonyms', 'antonyms', 'tags']) out[k] = String(out[k] ?? '');
  if (!out.id) out.id = uid();
  out.updatedAt = +out.updatedAt || Date.now();
  out.createdAt = +out.createdAt || out.updatedAt;
  return out;
}

function status(w) {
  if (w.learned || w.srs.interval >= 21) return 'mastered';
  if (!w.stats.reviews) return 'new';
  return 'learning';
}
const isDue = w => !w.learned && w.stats.reviews > 0 && w.srs.due <= Date.now();
const STATUS_LABEL = { new: 'Mới', learning: 'Đang học', mastered: 'Đã thuộc' };
const POS = [
  ['', '— Chọn —'], ['noun', 'Danh từ (n)'], ['verb', 'Động từ (v)'], ['adjective', 'Tính từ (adj)'], ['adverb', 'Trạng từ (adv)'],
  ['pronoun', 'Đại từ (pron)'], ['preposition', 'Giới từ (prep)'], ['conjunction', 'Liên từ (conj)'], ['interjection', 'Thán từ (interj)'],
  ['phrasal verb', 'Cụm động từ (phr v)'], ['idiom', 'Thành ngữ (idiom)'], ['phrase', 'Cụm từ (phrase)'], ['collocation', 'Kết hợp từ (collocation)']
];
const POS_SHORT = { noun: 'n', verb: 'v', adjective: 'adj', adverb: 'adv', pronoun: 'pron', preposition: 'prep', conjunction: 'conj', interjection: 'interj', 'phrasal verb': 'phr v', idiom: 'idiom', phrase: 'phrase', collocation: 'colloc' };
const posTag = p => p ? `<span class="pos">${esc(POS_SHORT[p] || p)}</span>` : '';
const allTags = () => [...new Set(Store.words.flatMap(w => splitList(w.tags)))].sort((a, b) => a.localeCompare(b));

/* ---------- Gộp dữ liệu giữa các thiết bị ---------- */
function mergeData(a, b) {
  const deleted = { ...(a.deleted || {}) };
  for (const [k, v] of Object.entries(b.deleted || {})) deleted[k] = Math.max(deleted[k] || 0, v);
  const map = new Map();
  for (const w of [...(a.words || []), ...(b.words || [])]) {
    const e = map.get(w.id);
    if (!e || (w.updatedAt || 0) > (e.updatedAt || 0)) map.set(w.id, w);
  }
  const words = [...map.values()].filter(w => !(deleted[w.id] && deleted[w.id] >= (w.updatedAt || 0))).map(normalizeWord)
    .sort((x, y) => y.createdAt - x.createdAt);
  const log = {};
  for (const src of [a.log || {}, b.log || {}]) for (const [d, v] of Object.entries(src)) {
    const t = (log[d] ||= {});
    for (const [f, n] of Object.entries(v)) t[f] = Math.max(t[f] || 0, n || 0);
  }
  // bỏ các dấu xoá quá 180 ngày
  const cutoff = Date.now() - 180 * DAY;
  for (const k of Object.keys(deleted)) if (deleted[k] < cutoff) delete deleted[k];
  return { version: 1, words, deleted, log };
}
function signature(d) {
  return d.words.map(w => w.id + ':' + w.updatedAt).sort().join('|') + '#' +
    Object.keys(d.deleted || {}).sort().join(',') + '#' + JSON.stringify(Object.entries(d.log || {}).sort());
}

/* =========================================================
   ĐỌC (Text-to-Speech) & TỪ ĐIỂN
   ========================================================= */
const TTS = {
  voices: [],
  supported: 'speechSynthesis' in window,
  init() {
    if (!this.supported) return;
    const load = () => {
      this.voices = speechSynthesis.getVoices().filter(v => /^en([-_]|$)/i.test(v.lang));
      if (current === 'settings') fillVoiceSelect();
    };
    load();
    speechSynthesis.addEventListener?.('voiceschanged', load);
  },
  pick() {
    const s = Store.settings;
    return this.voices.find(v => v.voiceURI === s.voiceURI)
      || this.voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(s.accent.toLowerCase()) && /google|natural|enhanced|premium|samantha|daniel/i.test(v.name))
      || this.voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(s.accent.toLowerCase()))
      || this.voices[0];
  },
  speak(text, rate) {
    text = String(text || '').trim();
    if (!text) return;
    if (!this.supported) { toast('Trình duyệt này không hỗ trợ đọc văn bản', 'error'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = this.pick();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = Store.settings.accent;
    u.rate = rate || Store.settings.rate;
    speechSynthesis.speak(u);
  }
};
const speakBtn = (text, cls = '', title = 'Nghe phát âm') => text ? `<button type="button" class="icon-btn speak ${cls}" data-speak="${esc(text)}" title="${title}" aria-label="${title}">${icon('vol')}</button>` : '';
const slowBtn = text => text ? `<button type="button" class="icon-btn speak slow" data-speak="${esc(text)}" data-rate="0.55" title="Đọc chậm" aria-label="Đọc chậm">0.5×</button>` : '';

async function lookupWord(word) {
  const r = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word.trim().toLowerCase()));
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('Từ điển lỗi ' + r.status);
  const j = await r.json();
  const out = { word: j[0]?.word || word, ipa: '', audio: '', meanings: [], synonyms: new Set(), antonyms: new Set() };
  for (const e of j) {
    if (!out.ipa) out.ipa = e.phonetic || (e.phonetics || []).find(p => p.text)?.text || '';
    const ph = e.phonetics || [];
    const pref = Store.settings.accent === 'en-GB' ? /-uk\.mp3$/ : /-us\.mp3$/;
    out.audio ||= (ph.find(p => p.audio && pref.test(p.audio)) || ph.find(p => p.audio))?.audio || '';
    for (const m of e.meanings || []) {
      out.meanings.push({ pos: m.partOfSpeech, defs: (m.definitions || []).slice(0, 4).map(d => ({ def: d.definition, ex: d.example || '' })) });
      (m.synonyms || []).forEach(s => out.synonyms.add(s));
      (m.antonyms || []).forEach(s => out.antonyms.add(s));
      (m.definitions || []).forEach(d => { (d.synonyms || []).forEach(s => out.synonyms.add(s)); (d.antonyms || []).forEach(s => out.antonyms.add(s)); });
    }
  }
  out.synonyms = [...out.synonyms].slice(0, 12);
  out.antonyms = [...out.antonyms].slice(0, 8);
  return out;
}
function dictLinks(w) {
  const q = encodeURIComponent(w.trim());
  return `<div class="dict-links">
    <a href="https://dictionary.cambridge.org/dictionary/english-vietnamese/${q}" target="_blank" rel="noopener">${icon('ext', 'sm')}Cambridge Anh–Việt</a>
    <a href="https://www.oxfordlearnersdictionaries.com/search/english/?q=${q}" target="_blank" rel="noopener">${icon('ext', 'sm')}Oxford</a>
    <a href="https://dict.laban.vn/find?type=1&query=${q}" target="_blank" rel="noopener">${icon('ext', 'sm')}Laban</a>
    <a href="https://translate.google.com/?sl=en&tl=vi&text=${q}" target="_blank" rel="noopener">${icon('ext', 'sm')}Google Dịch</a>
    <a href="https://youglish.com/pronounce/${q}/english" target="_blank" rel="noopener">${icon('ext', 'sm')}YouGlish</a>
  </div>`;
}

/* =========================================================
   ÔN TẬP NGẮT QUÃNG (Spaced Repetition – kiểu SM-2)
   q: 0 = Quên, 1 = Khó, 2 = Nhớ, 3 = Dễ
   ========================================================= */
function nextSrs(s0, q) {
  const s = { ...s0 };
  const now = Date.now();
  if (q === 0) {
    if (s.reps > 0) s.lapses = (s.lapses || 0) + 1;
    s.reps = 0; s.interval = 0; s.ease = Math.max(1.3, s.ease - 0.2); s.due = now + 10 * 60e3;
    return s;
  }
  let iv;
  if (s.reps === 0) iv = q === 3 ? 4 : 1;
  else if (s.reps === 1) iv = q === 1 ? 2 : q === 2 ? 3 : 6;
  else iv = Math.max(s.interval + 1, Math.round(s.interval * (q === 1 ? 1.2 : q === 2 ? s.ease : s.ease * 1.3)));
  if (q === 1) s.ease = Math.max(1.3, s.ease - 0.15);
  if (q === 3) s.ease = Math.min(3.5, s.ease + 0.15);
  s.reps++; s.interval = iv; s.due = startOfDay(now) + iv * DAY;
  return s;
}
function applyReview(w, q) {
  w.srs = nextSrs(w.srs, q);
  w.stats.reviews++;
  if (q > 0) w.stats.correct++; else w.stats.wrong++;
  w.stats.lastStudied = Date.now();
  Store.logDay('reviews');
  if (q > 0) Store.logDay('correct');
  Store.upsert(w);
}
const accuracy = w => w.stats.reviews ? Math.round(100 * w.stats.correct / w.stats.reviews) : null;

/* =========================================================
   LƯU TRỮ FILE TRÊN MÁY  (thư mục Vocab-app-folder / vocab-data.json)
   - App điện thoại (Android/iOS): vị trí cố định trong thư mục Documents.
   - Máy tính (Chrome/Edge): người dùng chọn thư mục hoặc chọn file có sẵn.
   - Trình duyệt khác: tải file về / mở file thủ công.
   Bộ nhớ trình duyệt chỉ đóng vai trò bộ đệm làm việc.
   ========================================================= */
const FOLDER = 'Vocab-app-folder', FNAME = 'vocab-data.json';
const isNative = () => !!(window.Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform());
const nativePlatform = () => isNative() ? Capacitor.getPlatform() : 'web';
const nativePlugin = n => window.Capacitor && (Capacitor.Plugins?.[n] || Capacitor.registerPlugin?.(n));
const FILE_GUIDE = 'File dữ liệu VocabNote. Có thể mở và sửa bằng trình soạn thảo văn bản (Notepad, TextEdit, VS Code…), nhớ lưu dạng UTF-8. ' +
  'Mỗi từ là một mục trong "words". Thêm từ mới: chỉ cần thêm {"word": "...", "meaning": "..."} (có thể thêm "ipa", "pos", "notes", "synonyms", "antonyms", "examples": [{"en": "...", "vi": "..."}], "tags"). ' +
  'Giữ nguyên "id" của các từ đã có. Xoá một mục trong "words" để xoá từ đó. Ứng dụng tự nhận thay đổi khi bạn lưu file.';

function orderedWord(w) {
  return { word: w.word, ipa: w.ipa, pos: w.pos, meaning: w.meaning, notes: w.notes, synonyms: w.synonyms, antonyms: w.antonyms,
    examples: w.examples, tags: w.tags, starred: w.starred, learned: w.learned,
    id: w.id, createdAt: w.createdAt, updatedAt: w.updatedAt, srs: w.srs, stats: w.stats };
}
function fileObject() {
  return { app: 'VocabNote', format: 1, guide: FILE_GUIDE, savedAt: new Date().toISOString(), appVersion: APP_VERSION,
    words: Store.words.map(orderedWord), deleted: Store.data.deleted, log: Store.data.log };
}
const fileText = () => JSON.stringify(fileObject(), null, 2);
const wordSig = w => JSON.stringify([w.word, w.ipa, w.pos, w.meaning, w.notes, w.synonyms, w.antonyms, w.examples, w.tags, !!w.starred, !!w.learned, w.srs, w.stats]);

/* Đưa nội dung một file dữ liệu vào sổ.
   mode: 'sync'    – file là bản chính; thay đổi chưa ghi trên máy được giữ lại
         'union'   – gộp, không xoá gì; từ trùng thì giữ bản sửa sau cùng
         'replace' – chỉ dùng dữ liệu trong file */
function adoptFile(j, mode = 'sync') {
  const raw = Array.isArray(j) ? j : (Array.isArray(j?.words) ? j.words : null);
  if (!raw) throw new Error('File không có danh sách "words"');
  const now = Date.now();
  let changed = 0;
  const seen = new Set();
  const local = new Map(Store.words.map(w => [w.id, w]));
  for (const r of raw) {
    if (!r || typeof r !== 'object' || !String(r.word || '').trim()) continue;
    const fresh = !r.id;
    const fw = normalizeWord(r);
    if (fresh || !r.updatedAt) { fw.updatedAt = now; if (!r.createdAt) fw.createdAt = now; }
    if (seen.has(fw.id)) continue;
    seen.add(fw.id);
    const lw = local.get(fw.id);
    if (!lw) {
      if (mode === 'sync' && Store.data.deleted[fw.id] && LocalFile.isDirty(fw.id)) continue;   // vừa xoá trên máy
      if (mode === 'union' && Store.findByText(fw.word)) continue;
      delete Store.data.deleted[fw.id];
      Store.data.words.push(fw); changed++;
      continue;
    }
    if (wordSig(lw) === wordSig(fw)) continue;
    const takeFile = mode === 'replace' || (mode === 'sync' && !LocalFile.isDirty(fw.id)) || (mode === 'union' && fw.updatedAt > lw.updatedAt);
    if (takeFile) { Object.assign(lw, fw, { updatedAt: now }); changed++; }
  }
  if (mode !== 'union') {
    for (const w of [...Store.words]) {
      if (seen.has(w.id) || (mode === 'sync' && LocalFile.isDirty(w.id))) continue;
      Store.data.words.splice(Store.data.words.indexOf(w), 1);
      Store.data.deleted[w.id] = now; changed++;
    }
  }
  for (const [id, t] of Object.entries(j.deleted || {})) {
    const w = Store.byId(id);
    if (w && !seen.has(id) && +t >= w.updatedAt) { Store.data.words.splice(Store.data.words.indexOf(w), 1); changed++; }
    if (!Store.byId(id)) Store.data.deleted[id] = Math.max(Store.data.deleted[id] || 0, +t || 0);
  }
  for (const [d, v] of Object.entries(j.log || {})) {
    const t = (Store.data.log[d] ||= {});
    for (const [f, n] of Object.entries(v || {})) t[f] = Math.max(t[f] || 0, +n || 0);
  }
  Store.data.words.sort((a, b) => b.createdAt - a.createdAt);
  if (changed) { Store.persist(); updateBadges(); onDataChangedExternally(); Sync.schedule(); }
  return changed;
}

const IDB = {
  db() {
    return this._p ||= new Promise((res, rej) => {
      const r = indexedDB.open('vocabnote', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  },
  async op(mode, fn) {
    const db = await this.db();
    return new Promise((res, rej) => { const q = fn(db.transaction('kv', mode).objectStore('kv')); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  },
  get(k) { return this.op('readonly', s => s.get(k)); },
  set(k, v) { return this.op('readwrite', s => s.put(v, k)); },
  del(k) { return this.op('readwrite', s => s.delete(k)); }
};

const LocalFile = {
  kind: 'manual',        // native | fsa | manual
  handle: null, state: 'off', error: '', timer: null, busy: false, again: false, blocked: false,
  dirty: new Set((() => { try { return JSON.parse(localStorage.getItem('vn.fileDirty') || '[]'); } catch { return []; } })()),
  get lastWrite() { return +localStorage.getItem('vn.fileMtime') || 0; },
  set lastWrite(v) { localStorage.setItem('vn.fileMtime', String(v || 0)); },
  get savedAt() { return +localStorage.getItem('vn.fileSavedAt') || 0; },
  get nativeName() { return localStorage.getItem('vn.nativeFile') || FNAME; },
  markDirty(id) { this.dirty.add(id); localStorage.setItem('vn.fileDirty', JSON.stringify([...this.dirty])); },
  clearDirty() { this.dirty.clear(); localStorage.removeItem('vn.fileDirty'); },
  isDirty(id) { return this.dirty.has('*') || this.dirty.has(id); },
  active() { return this.kind === 'native' || (this.kind === 'fsa' && !!this.handle); },
  label() {
    if (this.kind === 'native') return nativePlatform() === 'ios'
      ? `Tệp › Trên iPhone › VocabNote › ${FOLDER} › ${this.nativeName}`
      : `Bộ nhớ trong › Documents › ${FOLDER} › ${this.nativeName}`;
    return localStorage.getItem('vn.filePath') || this.handle?.name || '';
  },
  setState(s, err = '') { this.state = s; this.error = err; renderFileUI(); },

  async init() {
    if (isNative()) {
      this.kind = 'native';
      try { await nativePlugin('Filesystem').requestPermissions?.(); } catch { /* Android 11+ không cần */ }
      await this.safeLoad('sync');
    } else if ('showOpenFilePicker' in window || 'showDirectoryPicker' in window) {
      this.kind = 'fsa';
      let h = null;
      try { h = await IDB.get('fileHandle'); } catch { /* ignore */ }
      if (h) {
        this.handle = h;
        const p = await h.queryPermission({ mode: 'readwrite' }).catch(() => 'prompt');
        if (p === 'granted') await this.safeLoad('sync'); else this.setState('permission');
      } else this.setState('off');
    } else { this.kind = 'manual'; this.setState('off'); }
  },

  /* ---- đọc / ghi thấp tầng ---- */
  async readRaw() {
    if (this.kind === 'native') {
      const FS = nativePlugin('Filesystem');
      const path = FOLDER + '/' + this.nativeName;
      let st;
      try { st = await FS.stat({ path, directory: 'DOCUMENTS' }); }
      catch { return null; }                                   // chưa có file
      const r = await FS.readFile({ path, directory: 'DOCUMENTS', encoding: 'utf8' });
      return { text: typeof r.data === 'string' ? r.data : await r.data.text(), mtime: Number(st.mtime) || 0 };
    }
    const f = await this.handle.getFile();
    return { text: await f.text(), mtime: f.lastModified };
  },
  async statMtime() {
    if (this.kind === 'native') {
      try { const st = await nativePlugin('Filesystem').stat({ path: FOLDER + '/' + this.nativeName, directory: 'DOCUMENTS' }); return Number(st.mtime) || 0; }
      catch { return 0; }
    }
    return (await this.handle.getFile()).lastModified;
  },
  async writeRaw(text) {
    if (this.kind === 'native') {
      const FS = nativePlugin('Filesystem');
      const write = () => FS.writeFile({ path: FOLDER + '/' + this.nativeName, data: text, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true });
      try { await write(); }
      catch (e) {
        // Android: file cũ do bản cài trước tạo ra thì bản cài mới không ghi đè được → dùng tên mới
        if (this.nativeName !== FNAME) throw e;
        localStorage.setItem('vn.nativeFile', `vocab-data-${dayKey().replace(/-/g, '')}.json`);
        await write();
        toast(`Không ghi đè được file cũ, đã lưu sang ${this.nativeName}`);
      }
      return this.statMtime();
    }
    const w = await this.handle.createWritable();
    await w.write(text); await w.close();
    return (await this.handle.getFile()).lastModified;
  },

  /* ---- nạp / lưu ---- */
  async safeLoad(mode) {
    try { return await this.load(mode); }
    catch (e) { console.error(e); this.fail(e); return 0; }
  },
  fail(e) {
    if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') this.setState('permission');
    else if (e?.name === 'NotFoundError' && this.kind === 'fsa') this.setState('error', 'Không tìm thấy file dữ liệu (đã bị xoá, đổi tên hoặc di chuyển?). Hãy chọn lại thư mục/file.');
    else this.setState('error', e?.message || String(e));
  },
  async load(mode = 'sync') {
    const raw = await this.readRaw();
    if (!raw || !raw.text.trim()) { this.markDirty('*'); await this.save(true); return 0; }
    let j;
    try { j = JSON.parse(raw.text.replace(/^﻿/, '')); }
    catch (e) {
      this.blocked = true;
      this.setState('error', 'File dữ liệu đang bị lỗi định dạng nên ứng dụng tạm ngừng ghi để không làm mất nội dung bạn sửa. Hãy sửa lỗi trong file rồi bấm “Tải lại từ file”. (' + e.message + ')');
      return 0;
    }
    this.blocked = false;
    const n = adoptFile(j, mode);
    this.lastWrite = raw.mtime;
    if (n || this.dirty.size || mode !== 'sync' || j.format !== 1) await this.save(true);
    else this.setState('ok');
    return n;
  },
  schedule(delay = 700) {
    if (!this.active() || this.blocked || this.state === 'permission') return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.save(), delay);
  },
  async save(force = false) {
    if (!this.active() || this.blocked) return;
    if (this.busy) { this.again = true; return; }
    clearTimeout(this.timer); this.timer = null;
    this.busy = true;
    try {
      if (!force) {
        const m = await this.statMtime();
        if (m && m > this.lastWrite) {          // file vừa được sửa bên ngoài → nạp trước, rồi mới ghi
          this.busy = false;
          const n = await this.load('sync');
          if (n) toast('Đã cập nhật theo thay đổi trong file dữ liệu');
          return;
        }
      }
      this.setState('saving');
      this.lastWrite = await this.writeRaw(fileText());
      localStorage.setItem('vn.fileSavedAt', String(Date.now()));
      this.clearDirty();
      this.setState('ok');
    } catch (e) { console.error(e); this.fail(e); }
    finally { this.busy = false; if (this.again) { this.again = false; this.schedule(300); } }
  },
  async check() {
    if (!this.active() || this.busy || !['ok', 'error'].includes(this.state)) return;
    try {
      const m = await this.statMtime();
      if (!m) { if (!this.blocked) { this.markDirty('*'); await this.save(true); } return; }   // file bị xoá → tạo lại
      if (m > this.lastWrite || (this.blocked && m !== this.lastWrite)) {
        const n = await this.load('sync');
        if (n) toast('Đã cập nhật theo thay đổi trong file dữ liệu', 'success');
      }
    } catch (e) { this.fail(e); }
  },

  /* ---- thao tác của người dùng (máy tính) ---- */
  async pickFolder() {
    let dir;
    try { dir = await window.showDirectoryPicker({ id: 'vocabnote', mode: 'readwrite', startIn: 'documents' }); }
    catch (e) { if (e.name !== 'AbortError') toast(e.message, 'error'); return; }
    const parent = dir.name;
    if (dir.name !== FOLDER) dir = await dir.getDirectoryHandle(FOLDER, { create: true });
    const fh = await dir.getFileHandle(FNAME, { create: true });
    await this.useHandle(fh, (parent === FOLDER ? '' : parent + ' › ') + FOLDER + ' › ' + FNAME);
  },
  async pickFile() {
    let fh;
    try {
      [fh] = await window.showOpenFilePicker({ id: 'vocabnote', types: [{ description: 'Dữ liệu VocabNote (.json)', accept: { 'application/json': ['.json'] } }] });
      if (await fh.requestPermission({ mode: 'readwrite' }) !== 'granted') { toast('Cần cho phép chỉnh sửa file để lưu dữ liệu', 'error'); return; }
    } catch (e) { if (e.name !== 'AbortError') toast(e.message, 'error'); return; }
    await this.useHandle(fh, fh.name);
  },
  async useHandle(fh, label) {
    this.handle = fh; this.kind = 'fsa';
    await IDB.set('fileHandle', fh).catch(() => {});
    localStorage.setItem('vn.filePath', label);
    try {
      const raw = await this.readRaw();
      let mode = 'replace';
      if (raw && raw.text.trim()) {
        if (Store.words.length) mode = await askMergeMode(raw.text);
        if (!mode) { this.forget(); return; }
        this.lastWrite = 0;
        const n = await this.load(mode);
        toast(`Đã kết nối file dữ liệu (${n} thay đổi)`, 'success');
      } else {
        this.markDirty('*'); await this.save(true);
        toast('Đã tạo file dữ liệu mới', 'success');
      }
    } catch (e) { console.error(e); this.fail(e); }
    if (current === 'settings') renderSettings();
  },
  async regrant() {
    if (!this.handle) return;
    try {
      if (await this.handle.requestPermission({ mode: 'readwrite' }) === 'granted') { await this.safeLoad('sync'); toast('Đã mở lại file dữ liệu', 'success'); }
    } catch (e) { this.fail(e); }
  },
  forget() {
    this.handle = null; IDB.del('fileHandle').catch(() => {});
    localStorage.removeItem('vn.filePath'); localStorage.removeItem('vn.fileMtime');
    this.setState('off');
  }
};

async function askMergeMode(text) {
  let n = '?';
  try { const j = JSON.parse(text); n = (Array.isArray(j) ? j : j.words || []).length; } catch { /* load() sẽ báo lỗi */ }
  const merge = confirm(`File này có ${n} từ, ứng dụng trên máy đang có ${Store.words.length} từ.\n\n• OK: GỘP cả hai (khuyên dùng)\n• Huỷ: chọn cách khác`);
  if (merge) return 'union';
  return confirm('Chỉ dùng dữ liệu trong file và BỎ dữ liệu hiện tại trên máy?') ? 'replace' : null;
}

function renderFileUI() {
  const pill = $('#filePill');
  if (pill) {
    const F = LocalFile;
    const map = {
      ok: ['ok', 'Đã lưu file', 'Đã lưu vào ' + F.label() + ' · ' + fmtAgo(F.savedAt)],
      saving: ['syncing', 'Đang lưu…', 'Đang ghi file dữ liệu'],
      permission: ['auth', 'Mở file dữ liệu', 'Trình duyệt cần bạn cho phép lại quyền ghi vào file dữ liệu – bấm để cho phép'],
      error: ['error', 'Lỗi file', F.error],
      off: ['off', 'Chưa có file', 'Chưa chọn nơi lưu file dữ liệu trên máy – bấm để chọn']
    };
    const [cls, txt, title] = map[F.state] || map.off;
    pill.classList.toggle('hidden', F.kind === 'manual');
    pill.className = 'sync-pill ' + cls + (F.kind === 'manual' ? ' hidden' : '');
    pill.title = title;
    pill.innerHTML = `${icon('file', 'sm')}${cls === 'off' ? '' : '<span class="dot"></span>'}<span class="txt">${txt}</span>`;
  }
  const side = $('#sideFile');
  if (side) side.innerHTML = LocalFile.active()
    ? `<b>${icon('file', 'sm')} File trên máy</b>${esc(LocalFile.label())}`
    : LocalFile.kind === 'fsa' ? `<b>${icon('file', 'sm')} Chưa chọn file</b>Vào Cài đặt để chọn thư mục lưu ${FOLDER}.` : '';
  side?.classList.toggle('hidden', !side.innerHTML);
  if (current === 'settings') { const b = $('#fileStatus'); if (b) b.innerHTML = fileStatusHTML(); }
}

function fileStatusHTML() {
  const F = LocalFile;
  const err = F.state === 'error' ? `<p class="small" style="color:var(--danger);margin:8px 0 0">⚠ ${esc(F.error)}</p>` : '';
  const loc = `<div class="file-path">${icon('file', 'sm')}<span>${esc(F.label())}</span></div>`;
  if (F.kind === 'native') {
    return `${loc}
      <p class="small muted" style="margin:8px 0 12px">Vị trí cố định. Mở bằng ứng dụng ${nativePlatform() === 'ios' ? '<b>Tệp (Files)</b>' : '<b>Files / Quản lý tệp</b>'} để xem, sao chép, gửi đi hoặc chỉnh sửa. Lần lưu gần nhất: ${fmtAgo(F.savedAt)}.</p>
      <div class="row">
        <button class="btn sm primary" data-act="file-save">${icon('check', 'sm')}Lưu ngay</button>
        <button class="btn sm" data-act="file-reload">${icon('refresh', 'sm')}Tải lại từ file</button>
        <button class="btn sm" data-act="import">${icon('upload', 'sm')}Nhập từ file khác</button>
      </div>${err}`;
  }
  if (F.kind === 'fsa') {
    if (!F.handle) return `<p class="small muted" style="margin:0 0 12px">Chọn một thư mục trên máy (vd: Tài liệu / Documents). Ứng dụng sẽ tạo thư mục <b>${FOLDER}</b> và file <b>${FNAME}</b> bên trong, rồi tự lưu mỗi khi có thay đổi. Hoặc chọn một file dữ liệu bạn đã có.</p>
      <div class="row">
        ${'showDirectoryPicker' in window ? `<button class="btn primary" data-act="file-folder">${icon('folder', 'sm')}Chọn thư mục lưu…</button>` : ''}
        <button class="btn" data-act="file-open">${icon('file', 'sm')}Mở file dữ liệu có sẵn…</button>
      </div>`;
    if (F.state === 'permission') return `${loc}<p class="small" style="color:var(--warn);margin:8px 0 12px">Vì lý do bảo mật, mỗi lần mở lại trang trình duyệt cần bạn xác nhận lại quyền ghi vào file này.</p>
      <div class="row"><button class="btn primary" data-act="file-grant">${icon('check', 'sm')}Cho phép truy cập file</button><button class="btn ghost" data-act="file-forget">Chọn nơi khác</button></div>`;
    return `${loc}
      <p class="small muted" style="margin:8px 0 12px">Tự động lưu khi có thay đổi. Nếu bạn sửa file bằng phần mềm khác, ứng dụng sẽ tự cập nhật khi bạn quay lại cửa sổ này. Lần lưu gần nhất: ${fmtAgo(F.savedAt)}.</p>
      <div class="row">
        <button class="btn sm primary" data-act="file-save">${icon('check', 'sm')}Lưu ngay</button>
        <button class="btn sm" data-act="file-reload">${icon('refresh', 'sm')}Tải lại từ file</button>
        ${'showDirectoryPicker' in window ? `<button class="btn sm" data-act="file-folder">${icon('folder', 'sm')}Đổi thư mục…</button>` : ''}
        <button class="btn sm" data-act="file-open">${icon('file', 'sm')}Mở file khác…</button>
        <button class="btn sm ghost" data-act="file-forget">Ngừng dùng file</button>
      </div>${err}`;
  }
  const last = +localStorage.getItem('vn.lastExport') || 0;
  return `<p class="small muted" style="margin:0 0 12px">Trình duyệt này không cho phép trang web tự ghi vào một file trên máy. Bạn vẫn có thể <b>lưu file ${FNAME} về máy</b> (thư mục Tải về / Downloads) và <b>mở lại</b> khi cần. Để tự động lưu vào thư mục ${FOLDER}: trên máy tính hãy dùng Chrome hoặc Edge; trên điện thoại hãy cài <b>app VocabNote</b>.</p>
    <div class="row">
      <button class="btn primary" data-act="export-json">${icon('download', 'sm')}Lưu file về máy</button>
      <button class="btn" data-act="import">${icon('upload', 'sm')}Mở file dữ liệu…</button>
    </div>
    <p class="small ${last && Date.now() - last < 7 * DAY ? 'muted' : ''}" style="margin:10px 0 0;${!last || Date.now() - last >= 7 * DAY ? 'color:var(--warn)' : ''}">Lần lưu file gần nhất: ${fmtAgo(last)}</p>`;
}

/* =========================================================
   GOOGLE DRIVE
   - Dùng Google Identity Services (đăng nhập bằng tài khoản Google
     của chính người dùng) và quyền drive.file (ứng dụng chỉ thấy
     file do chính nó tạo ra).
   - Dữ liệu là 1 file JSON trong "Drive của tôi".
   ========================================================= */
const SCOPES = 'https://www.googleapis.com/auth/drive.file openid email profile';
const Drive = {
  token: null, exp: 0,
  get email() { return localStorage.getItem('vn.email') || ''; },
  restore() {
    try {
      const t = JSON.parse(localStorage.getItem('vn.tok') || 'null');
      if (t && t.exp > Date.now() + 60e3) { this.token = t.token; this.exp = t.exp; }
    } catch { /* ignore */ }
  },
  hasToken() { return !!this.token && this.exp > Date.now() + 30e3; },
  gisReady() { return !!(window.google && google.accounts && google.accounts.oauth2); },
  async getToken(interactive) {
    if (this.hasToken()) return this.token;
    if (isNative()) return this.nativeToken(interactive);
    if (!interactive) { const e = new Error('Cần đăng nhập lại'); e.code = 'auth'; throw e; }
    const cid = Sync.clientId();
    if (!cid) throw new Error('Chưa có Google Client ID. Vào Cài đặt → Google Drive để nhập.');
    for (let i = 0; i < 40 && !this.gisReady(); i++) await sleep(100);
    if (!this.gisReady()) throw new Error('Không tải được thư viện đăng nhập Google. Kiểm tra kết nối mạng.');
    return new Promise((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: cid, scope: SCOPES,
        callback: r => {
          if (r.error) { reject(new Error(r.error_description || r.error)); return; }
          this.token = r.access_token;
          this.exp = Date.now() + (Number(r.expires_in || 3600) - 60) * 1000;
          localStorage.setItem('vn.tok', JSON.stringify({ token: this.token, exp: this.exp }));
          resolve(this.token);
        },
        error_callback: e => reject(new Error(e?.type === 'popup_closed' ? 'Bạn đã đóng cửa sổ đăng nhập Google.' :
          e?.type === 'popup_failed_to_open' ? 'Trình duyệt chặn cửa sổ đăng nhập. Hãy cho phép popup rồi thử lại.' : (e?.message || 'Đăng nhập thất bại')))
      });
      client.requestAccessToken({ prompt: Sync.connected() ? '' : 'consent', login_hint: this.email || undefined });
    });
  },
  // App điện thoại: Google không cho đăng nhập trong WebView → dùng đăng nhập Google gốc của hệ điều hành
  async nativeToken(interactive) {
    const GA = nativePlugin('GoogleAuth');
    if (!GA) throw new Error('Bản app này chưa có module đăng nhập Google.');
    if (!this._gaInit) {
      try { await GA.initialize({ clientId: Sync.clientId(), scopes: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file'], grantOfflineAccess: false }); } catch { /* Android đọc cấu hình từ capacitor.config */ }
      this._gaInit = true;
    }
    let auth = null;
    if (Sync.connected()) { try { auth = await GA.refresh(); } catch { auth = null; } }
    if (!auth?.accessToken) {
      if (!interactive) { const e = new Error('Cần đăng nhập lại'); e.code = 'auth'; throw e; }
      let u;
      try { u = await GA.signIn(); }
      catch (e) { throw new Error(/12501|cancel/i.test(e?.message || '') ? 'Bạn đã huỷ đăng nhập Google.' : 'Đăng nhập Google thất bại: ' + (e?.message || e)); }
      auth = u.authentication || {};
      if (u.email) localStorage.setItem('vn.email', u.email);
      if (u.name || u.displayName) localStorage.setItem('vn.name', u.name || u.displayName);
    }
    if (!auth.accessToken) throw new Error('Không lấy được quyền truy cập Google Drive');
    this.token = auth.accessToken; this.exp = Date.now() + 50 * 60e3;
    localStorage.setItem('vn.tok', JSON.stringify({ token: this.token, exp: this.exp }));
    return this.token;
  },
  async api(url, opts = {}) {
    const tok = await this.getToken(false);
    const r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + tok } });
    if (r.status === 401) { this.token = null; localStorage.removeItem('vn.tok'); const e = new Error('Phiên đăng nhập hết hạn'); e.code = 'auth'; throw e; }
    if (!r.ok) { const e = new Error(`Google Drive lỗi ${r.status}: ${(await r.text()).slice(0, 160)}`); e.status = r.status; throw e; }
    return r;
  },
  async fetchProfile() {
    try {
      const r = await this.api('https://www.googleapis.com/oauth2/v3/userinfo');
      const j = await r.json();
      if (j.email) localStorage.setItem('vn.email', j.email);
      if (j.name) localStorage.setItem('vn.name', j.name);
    } catch { /* không bắt buộc */ }
  },
  fileName() { return (Store.settings.driveFile || FNAME).trim(); },
  fileKey() { return 'vn.fileId:' + (this.email || '') + ':' + this.fileName(); },
  folderKey() { return 'vn.folderId:' + (this.email || ''); },
  clearIds() { localStorage.removeItem(this.fileKey()); localStorage.removeItem(this.folderKey()); },
  async folderId() {
    const cached = localStorage.getItem(this.folderKey());
    if (cached) return cached;
    const q = encodeURIComponent(`name='${FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const j = await (await this.api(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id)&pageSize=5`)).json();
    let id = j.files?.[0]?.id;
    if (!id) {
      const r = await this.api('https://www.googleapis.com/drive/v3/files?fields=id', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: FOLDER, mimeType: 'application/vnd.google-apps.folder' })
      });
      id = (await r.json()).id;
    }
    localStorage.setItem(this.folderKey(), id);
    return id;
  },
  async findFile() {
    const cached = localStorage.getItem(this.fileKey());
    if (cached) return cached;
    const name = this.fileName().replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const folder = await this.folderId();
    const q = encodeURIComponent(`name='${name}' and '${folder}' in parents and trashed=false`);
    const r = await this.api(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)&orderBy=modifiedTime%20desc&pageSize=10`);
    const j = await r.json();
    const id = j.files?.[0]?.id || null;
    if (id) localStorage.setItem(this.fileKey(), id);
    return id;
  },
  async download(id) {
    const r = await this.api(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
    const txt = await r.text();
    try { return JSON.parse(txt); } catch { throw new Error('File trên Drive không đúng định dạng JSON'); }
  },
  async create(data) {
    const boundary = 'vn' + uid();
    const meta = { name: this.fileName(), parents: [await this.folderId()], mimeType: 'application/json', description: 'Dữ liệu sổ từ vựng VocabNote – đừng sửa tay nếu không cần thiết.' };
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n--${boundary}--`;
    const r = await this.api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body
    });
    const j = await r.json();
    localStorage.setItem(this.fileKey(), j.id);
    return j.id;
  },
  async update(id, data) {
    await this.api(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
  },
  disconnect() {
    if (this.token && this.gisReady()) { try { google.accounts.oauth2.revoke(this.token, () => {}); } catch { /* ignore */ } }
    this.token = null; this.exp = 0;
    if (isNative()) { try { nativePlugin('GoogleAuth')?.signOut(); } catch { /* ignore */ } }
    for (const k of Object.keys(localStorage)) if (k.startsWith('vn.fileId:') || k.startsWith('vn.folderId:')) localStorage.removeItem(k);
    ['vn.tok', 'vn.email', 'vn.name', 'vn.drive', 'vn.lastSync'].forEach(k => localStorage.removeItem(k));
  }
};

const Sync = {
  timer: null, busy: false, again: false, state: 'off', error: '',
  get lastSync() { return +localStorage.getItem('vn.lastSync') || 0; },
  clientId() { return (Store.settings.clientId || CFG.googleClientId || '').trim(); },
  connected() { return localStorage.getItem('vn.drive') === '1'; },
  setState(s, err = '') { this.state = s; this.error = err; renderSyncUI(); },
  schedule(delay = 2500) {
    if (!this.connected() || !Store.settings.autoSync) return;
    clearTimeout(this.timer);
    if (this.state !== 'auth') this.setState('pending');
    this.timer = setTimeout(() => this.run(false), delay);
  },
  async run(interactive) {
    if (this.busy) { this.again = true; return; }
    if (!interactive && !this.connected()) return;
    clearTimeout(this.timer);
    this.busy = true; this.setState('syncing');
    try {
      await Drive.getToken(interactive);
      if (!Drive.email) await Drive.fetchProfile();
      let id = await Drive.findFile();
      let remote = null;
      if (id) {
        try { remote = await Drive.download(id); }
        catch (e) {
          if (e.status !== 404) throw e;
          Drive.clearIds(); id = await Drive.findFile();
          if (id) remote = await Drive.download(id);
        }
      }
      const hasRemote = remote && Array.isArray(remote.words) && remote.words.length;
      if (interactive && !this.connected() && hasRemote && Store.words.length) {
        // lần đầu kết nối trên máy này mà máy đã có dữ liệu (vd: máy dùng chung) → hỏi trước khi gộp
        const merge = confirm(`Google Drive của bạn đã có ${remote.words.length} từ, máy này đang có ${Store.words.length} từ.\n\n• OK: GỘP hai nguồn\n• Huỷ: chỉ dùng dữ liệu trên Google Drive (bỏ dữ liệu đang có trên máy này)`);
        if (!merge) { Store.data = emptyData(); LocalFile.markDirty('*'); }
      }
      const base = { words: Store.words, deleted: Store.data.deleted, log: Store.data.log };
      const merged = remote && Array.isArray(remote.words) ? mergeData(base, remote) : mergeData(base, emptyData());
      const remoteSig = remote && Array.isArray(remote.words) ? signature({ words: remote.words, deleted: remote.deleted || {}, log: remote.log || {} }) : '';
      const mergedSig = signature(merged);
      if (mergedSig !== remoteSig) {
        const payload = { app: 'VocabNote', format: 1, guide: FILE_GUIDE, savedAt: new Date().toISOString(), appVersion: APP_VERSION,
          words: merged.words.map(orderedWord), deleted: merged.deleted, log: merged.log };
        if (id) await Drive.update(id, payload); else id = await Drive.create(payload);
      }
      // Gộp lại với dữ liệu cục bộ hiện tại (phòng khi người dùng sửa trong lúc đồng bộ)
      const before = signature(Store.data);
      const beforeMap = new Map(Store.words.map(w => [w.id, w.updatedAt]));
      Store.data = mergeData(Store.data, merged);
      const after = signature(Store.data);
      Store.persist();
      if (before !== after) {
        for (const w of Store.words) if (beforeMap.get(w.id) !== w.updatedAt) LocalFile.markDirty(w.id);
        for (const id of beforeMap.keys()) if (!Store.byId(id)) LocalFile.markDirty(id);
        LocalFile.schedule(200);
      }
      localStorage.setItem('vn.drive', '1');
      localStorage.setItem('vn.lastSync', String(Date.now()));
      this.setState('ok');
      if (before !== after) onDataChangedExternally();
      if (after !== mergedSig) this.again = true;
      if (interactive) toast('Đã đồng bộ với Google Drive', 'success');
    } catch (e) {
      if (e.code === 'auth') this.setState('auth');
      else { console.error(e); this.setState('error', e.message); if (interactive) toast(e.message, 'error'); }
    } finally {
      this.busy = false;
      if (this.again) { this.again = false; this.schedule(1500); }
    }
  }
};

function renderSyncUI() {
  const pill = $('#syncPill');
  const st = Sync.connected() ? Sync.state : 'off';
  const map = {
    off: ['Chưa kết nối Drive', 'Bấm để kết nối Google Drive'],
    idle: ['Google Drive', 'Bấm để đồng bộ'],
    pending: ['Chờ đồng bộ…', 'Có thay đổi chưa đồng bộ'],
    syncing: ['Đang đồng bộ…', 'Đang đồng bộ với Google Drive'],
    ok: ['Đã đồng bộ', 'Đồng bộ lần cuối: ' + fmtAgo(Sync.lastSync)],
    auth: ['Đăng nhập lại', 'Phiên Google đã hết hạn – bấm để đăng nhập lại và đồng bộ'],
    error: ['Lỗi đồng bộ', Sync.error || 'Bấm để thử lại']
  };
  const [txt, title] = map[st] || map.idle;
  pill.className = 'sync-pill ' + st;
  pill.title = title;
  pill.innerHTML = `${st === 'off' ? icon('cloud', 'sm') : '<span class="dot"></span>'}<span class="txt">${txt}</span>`;
  const side = $('#sideSync');
  if (side) side.innerHTML = Sync.connected()
    ? `<b>${esc(Drive.email || 'Google Drive')}</b>${esc(txt)} · ${esc(fmtAgo(Sync.lastSync))}`
    : `<b>${icon('cloud', 'sm')} Chưa kết nối Drive</b>Kết nối Google Drive trong Cài đặt để học trên mọi máy tính.`;
  if (current === 'settings') { const box = $('#driveStatus'); if (box) box.innerHTML = driveStatusHTML(); }
}

function onDataChangedExternally() {
  updateBadges();
  if ($('#editor').open || $('#detail').open) return;
  if (current === 'list') renderListItems();
  else if (current === 'stats') renderStats();
  else if (current === 'study' && !Study.active) renderStudy();
}

/* =========================================================
   ĐIỀU HƯỚNG
   ========================================================= */
let current = 'list';
const VIEWS = {
  list: { title: 'Sổ từ vựng', icon: 'book', label: 'Từ vựng', render: renderList },
  study: { title: 'Học & ôn tập', icon: 'cards', label: 'Học', render: renderStudy },
  write: { title: 'Luyện viết tay', icon: 'pen', label: 'Luyện viết', render: renderWrite },
  stats: { title: 'Thống kê', icon: 'chart', label: 'Thống kê', render: renderStats },
  settings: { title: 'Cài đặt', icon: 'settings', label: 'Cài đặt', render: renderSettings }
};
function buildNav() {
  const html = Object.entries(VIEWS).map(([k, v]) =>
    `<button type="button" data-nav="${k}">${icon(v.icon)}<span>${v.label}</span>${k === 'study' ? '<span class="count hidden"></span>' : ''}</button>`).join('');
  $('#sideNav').innerHTML = html;
  $('#bottomNav').innerHTML = html;
  $('#addBtn').innerHTML = icon('plus') + 'Thêm từ';
  $('#fab').innerHTML = icon('plus');
}
function route() {
  const v = location.hash.replace('#', '') || 'list';
  current = VIEWS[v] ? v : 'list';
  $$('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === current));
  $('#viewTitle').textContent = VIEWS[current].title;
  document.body.classList.toggle('no-fab', current === 'write' || current === 'study');
  if (TTS.supported) speechSynthesis.cancel();
  VIEWS[current].render();
  window.scrollTo(0, 0);
}
const go = v => { if (location.hash === '#' + v) route(); else location.hash = v; };
function updateBadges() {
  const due = Store.words.filter(isDue).length;
  $$('[data-nav="study"] .count').forEach(c => { c.textContent = due; c.classList.toggle('hidden', !due); });
}

/* =========================================================
   MÀN HÌNH: DANH SÁCH TỪ VỰNG
   ========================================================= */
const ListState = { q: '', filter: 'all', sort: 'new', tag: '', limit: 60 };

function renderList() {
  const view = $('#view');
  const words = Store.words;
  if (!words.length) {
    view.innerHTML = `<div class="card empty">
      <div class="big">${icon('book', 'lg')}</div>
      <h3>Sổ từ vựng đang trống</h3>
      <p>Bắt đầu bằng cách thêm từ đầu tiên bạn muốn học, hoặc thử với vài từ mẫu.</p>
      <div class="row" style="justify-content:center">
        <button class="btn primary lg" data-act="add">${icon('plus')}Thêm từ đầu tiên</button>
        <button class="btn lg" data-act="sample">${icon('sparkle')}Dùng dữ liệu mẫu</button>
      </div>
      ${!Sync.connected() ? `<p class="small" style="margin-top:22px">Đã có dữ liệu trên Google Drive? <a href="#settings">Kết nối Google Drive</a> để tải về.</p>` : ''}
    </div>`;
    return;
  }
  const tags = allTags();
  view.innerHTML = `
    <div class="summary" id="summary"></div>
    <div class="toolbar">
      <div class="search">${icon('search')}<input class="input" id="q" type="search" placeholder="Tìm từ, nghĩa, ghi chú, ví dụ…" value="${esc(ListState.q)}" autocomplete="off"></div>
      <select class="input" id="sort" style="width:auto">
        ${[['new', 'Mới thêm'], ['old', 'Cũ nhất'], ['az', 'A → Z'], ['za', 'Z → A'], ['most', 'Học nhiều nhất'], ['least', 'Học ít nhất'], ['hard', 'Hay sai nhất'], ['due', 'Sắp đến hạn']]
          .map(([v, l]) => `<option value="${v}" ${ListState.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
      ${tags.length ? `<select class="input" id="tagSel" style="width:auto"><option value="">Mọi chủ đề</option>${tags.map(t => `<option ${ListState.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>` : ''}
    </div>
    <div class="chips" id="chips"></div>
    <div class="word-list" id="wordList"></div>`;
  $('#q').addEventListener('input', e => { ListState.q = e.target.value; ListState.limit = 60; renderListItems(); });
  $('#sort').addEventListener('change', e => { ListState.sort = e.target.value; renderListItems(); });
  $('#tagSel')?.addEventListener('change', e => { ListState.tag = e.target.value; renderListItems(); });
  renderListItems();
}

function renderListItems() {
  if (current !== 'list') return;
  if (!$('#wordList')) { renderList(); return; }
  const words = Store.words;
  const cnt = { all: words.length, new: 0, learning: 0, mastered: 0, due: 0, starred: 0 };
  for (const w of words) { cnt[status(w)]++; if (isDue(w)) cnt.due++; if (w.starred) cnt.starred++; }
  const today = Store.data.log[dayKey()] || {};
  $('#summary').innerHTML = `
    <div class="card sum-tile"><div class="k">Tổng số từ</div><div class="v">${cnt.all}</div></div>
    <div class="card sum-tile"><div class="k">Đã thuộc</div><div class="v" style="color:var(--success)">${cnt.mastered}</div></div>
    <div class="card sum-tile"><div class="k">Hôm nay đã ôn</div><div class="v">${today.reviews || 0}<span class="muted small"> / ${Store.settings.dailyGoal}</span></div></div>
    <div class="card sum-tile cta" data-act="study-due"><div class="k">Cần ôn ngay</div><div class="v">${cnt.due + Math.min(cnt.new, Store.settings.newPerSession)} →</div></div>`;
  const chips = [['all', 'Tất cả'], ['due', 'Đến hạn ôn'], ['new', 'Mới'], ['learning', 'Đang học'], ['mastered', 'Đã thuộc'], ['starred', '★ Đánh dấu']];
  $('#chips').innerHTML = chips.map(([k, l]) => `<button class="chip ${ListState.filter === k ? 'active' : ''}" data-filter="${k}">${l} <span class="n">${cnt[k]}</span></button>`).join('');

  const q = normAns(ListState.q);
  let list = words.filter(w => {
    if (ListState.filter === 'due' && !isDue(w)) return false;
    if (['new', 'learning', 'mastered'].includes(ListState.filter) && status(w) !== ListState.filter) return false;
    if (ListState.filter === 'starred' && !w.starred) return false;
    if (ListState.tag && !splitList(w.tags).includes(ListState.tag)) return false;
    if (q) {
      const hay = [w.word, w.meaning, w.notes, w.synonyms, w.antonyms, w.tags, ...w.examples.map(e => e.en + ' ' + e.vi)].join(' ').toLowerCase();
      return hay.includes(q);
    }
    return true;
  });
  const S = ListState.sort;
  const acc = w => w.stats.reviews ? w.stats.correct / w.stats.reviews : 2;
  list.sort((a, b) =>
    S === 'old' ? a.createdAt - b.createdAt :
    S === 'az' ? a.word.localeCompare(b.word) :
    S === 'za' ? b.word.localeCompare(a.word) :
    S === 'most' ? b.stats.reviews - a.stats.reviews :
    S === 'least' ? a.stats.reviews - b.stats.reviews :
    S === 'hard' ? acc(a) - acc(b) || b.stats.wrong - a.stats.wrong :
    S === 'due' ? (status(a) === 'new' ? Infinity : a.srs.due) - (status(b) === 'new' ? Infinity : b.srs.due) :
    b.createdAt - a.createdAt);
  // Ưu tiên khớp chính xác ở đầu khi tìm kiếm
  if (q) list.sort((a, b) => (normAns(b.word).startsWith(q) ? 1 : 0) - (normAns(a.word).startsWith(q) ? 1 : 0));

  const shown = list.slice(0, ListState.limit);
  $('#wordList').innerHTML = shown.length ? shown.map(wordRow).join('') +
    (list.length > shown.length ? `<div class="list-foot"><button class="btn" data-act="more">Xem thêm (${list.length - shown.length} từ)</button></div>` : `<div class="list-foot">${list.length} từ</div>`)
    : `<div class="card empty"><h3>Không tìm thấy từ nào</h3><p>Thử từ khoá khác hoặc bỏ bộ lọc.</p>${ListState.q ? `<button class="btn primary" data-act="add-q">${icon('plus')}Thêm “${esc(ListState.q)}”</button>` : ''}</div>`;
}

function wordRow(w) {
  const st = status(w);
  const a = accuracy(w);
  return `<article class="card word-row" data-open="${w.id}">
    <div class="wr-main">
      <div class="wr-top"><span class="wr-word">${esc(w.word)}</span>${w.ipa ? `<span class="wr-ipa">${esc(w.ipa)}</span>` : ''}${posTag(w.pos)}</div>
      <div class="wr-meaning">${esc(w.meaning.replace(/\n/g, ' · ')) || '<i>Chưa có nghĩa</i>'}</div>
    </div>
    <div class="wr-meta">
      ${isDue(w) ? '<span class="badge st-due">Đến hạn</span>' : `<span class="badge st-${st}">${STATUS_LABEL[st]}</span>`}
      <span class="wr-count" title="Số lần học · tỉ lệ đúng">${icon('repeat', 'sm')}${w.stats.reviews}${a !== null ? ` · ${a}%` : ''}</span>
    </div>
    <div class="wr-actions">
      ${speakBtn(w.word)}
      <button type="button" class="icon-btn ${w.starred ? 'on' : ''}" data-star="${w.id}" title="Đánh dấu" aria-label="Đánh dấu">${icon('star')}</button>
    </div>
  </article>`;
}

function addSampleWords() {
  const S = [
    ['resilient', '/rɪˈzɪliənt/', 'adjective', 'kiên cường, mau phục hồi (sau khó khăn)', 'Dùng cho người, cộng đồng, nền kinh tế, vật liệu.\nresilient to/against something', 'tough, strong, adaptable', 'fragile, vulnerable',
      [['Children are often more resilient than adults.', 'Trẻ em thường kiên cường hơn người lớn.'], ['The economy has proved remarkably resilient.', 'Nền kinh tế đã chứng tỏ khả năng phục hồi đáng kể.']], 'IELTS, tính cách'],
    ['procrastinate', '/prəˈkræstɪneɪt/', 'verb', 'trì hoãn, chần chừ', 'Mang nghĩa tiêu cực. Danh từ: procrastination.', 'delay, put off, postpone', '',
      [['Stop procrastinating and start your homework.', 'Đừng trì hoãn nữa, bắt đầu làm bài tập đi.']], 'thói quen'],
    ['meticulous', '/məˈtɪkjələs/', 'adjective', 'tỉ mỉ, kỹ lưỡng', 'meticulous about/in something', 'careful, thorough, precise', 'careless, sloppy',
      [['She is meticulous about her work.', 'Cô ấy rất tỉ mỉ trong công việc.']], 'IELTS, tính cách'],
    ['take something for granted', '/teɪk ˈsʌmθɪŋ fə ˈɡrɑːntɪd/', 'idiom', 'coi là điều hiển nhiên (nên không trân trọng)', '', 'undervalue', 'appreciate',
      [['We often take our health for granted.', 'Chúng ta thường coi sức khỏe là điều hiển nhiên.']], 'thành ngữ'],
    ['ubiquitous', '/juːˈbɪkwɪtəs/', 'adjective', 'có mặt ở khắp nơi, rất phổ biến', 'Trang trọng; hay gặp trong bài viết học thuật.', 'everywhere, omnipresent, widespread', 'rare',
      [['Smartphones have become ubiquitous.', 'Điện thoại thông minh đã trở nên phổ biến khắp nơi.']], 'IELTS, công nghệ'],
    ['negotiate', '/nɪˈɡəʊʃieɪt/', 'verb', 'đàm phán, thương lượng', 'negotiate with somebody / negotiate a deal, a price', 'bargain, discuss', '',
      [['We negotiated a better price with the supplier.', 'Chúng tôi đã thương lượng được giá tốt hơn với nhà cung cấp.']], 'công việc']
  ];
  S.forEach(([word, ipa, pos, meaning, notes, synonyms, antonyms, ex, tags], i) => {
    const w = blankWord();
    Object.assign(w, { word, ipa, pos, meaning, notes, synonyms, antonyms, tags, examples: ex.map(([en, vi]) => ({ en, vi })), createdAt: Date.now() - i * 1000 });
    Store.upsert(w, false);
  });
  Store.save();
  toast('Đã thêm 6 từ mẫu', 'success');
  renderList();
}

/* =========================================================
   CỬA SỔ: THÊM / SỬA TỪ
   ========================================================= */
let editing = null;
function openEditor(id, preset = '') {
  const w = id ? structuredClone(Store.byId(id)) : Object.assign(blankWord(), { word: preset });
  if (!w) return;
  editing = w;
  const dlg = $('#editor');
  dlg.innerHTML = `
  <form id="edForm" style="display:contents" autocomplete="off">
    <div class="dlg-head"><h2>${id ? 'Sửa từ vựng' : 'Thêm từ vựng mới'}</h2>
      <button type="button" class="icon-btn" data-close aria-label="Đóng">${icon('x')}</button></div>
    <div class="dlg-body">
      <div class="field">
        <label for="fWord">Từ vựng / cụm từ *</label>
        <div class="input-group">
          <input id="fWord" required value="${esc(w.word)}" placeholder="vd: resilient" autocapitalize="off" spellcheck="false">
          <button type="button" class="icon-btn speak" id="edSpeak" title="Nghe" aria-label="Nghe">${icon('vol')}</button>
          <button type="button" class="btn soft" id="edLookup">${icon('dict')}<span>Tra từ điển</span></button>
        </div>
        <div class="dup-warn" id="dupWarn"></div>
      </div>
      <div id="dictPanel" class="dict-panel hidden"></div>
      <div class="grid2">
        <div class="field"><label for="fIpa">Phiên âm</label>
          <input id="fIpa" value="${esc(w.ipa)}" placeholder="/rɪˈzɪliənt/" spellcheck="false"></div>
        <div class="field"><label for="fPos">Từ loại</label>
          <select id="fPos">${POS.map(([v, l]) => `<option value="${v}" ${w.pos === v ? 'selected' : ''}>${l}</option>`).join('')}
          ${w.pos && !POS.some(p => p[0] === w.pos) ? `<option selected value="${esc(w.pos)}">${esc(w.pos)}</option>` : ''}</select></div>
      </div>
      <div class="field"><label for="fMeaning">Nghĩa *</label>
        <textarea id="fMeaning" rows="2" placeholder="Nghĩa tiếng Việt (mỗi nghĩa một dòng)">${esc(w.meaning)}</textarea></div>
      <div class="field"><label for="fNotes">Ghi chú cách dùng</label>
        <textarea id="fNotes" rows="2" placeholder="Giới từ đi kèm, ngữ cảnh, dạng từ khác, mẹo nhớ…">${esc(w.notes)}</textarea></div>
      <div class="grid2">
        <div class="field"><label for="fSyn">Từ đồng nghĩa</label>
          <input id="fSyn" value="${esc(w.synonyms)}" placeholder="cách nhau bằng dấu phẩy"></div>
        <div class="field"><label for="fAnt">Từ trái nghĩa</label>
          <input id="fAnt" value="${esc(w.antonyms)}" placeholder="cách nhau bằng dấu phẩy"></div>
      </div>
      <div class="field"><label>Ví dụ</label>
        <div class="ex-list" id="exList"></div>
        <div><button type="button" class="btn sm" id="addEx">${icon('plus', 'sm')}Thêm ví dụ</button></div>
      </div>
      <div class="field"><label for="fTags">Chủ đề / nhãn</label>
        <input id="fTags" value="${esc(w.tags)}" placeholder="vd: IELTS, công việc, du lịch" list="tagList">
        <datalist id="tagList">${allTags().map(t => `<option value="${esc(t)}">`).join('')}</datalist>
        <span class="hint">Dùng để lọc và học theo chủ đề.</span></div>
    </div>
    <div class="dlg-foot">
      ${id ? `<button type="button" class="btn danger" id="edDelete">${icon('trash', 'sm')}Xoá</button>` : `<label class="row small muted" style="gap:6px"><input type="checkbox" id="edAgain"> Thêm tiếp từ khác</label>`}
      <span class="spacer"></span>
      <button type="button" class="btn" data-close>Huỷ</button>
      <button type="submit" class="btn primary">${icon('check', 'sm')}Lưu</button>
    </div>
  </form>`;
  w.examples.forEach(e => addExampleRow(e.en, e.vi));
  if (!w.examples.length) addExampleRow();
  const fWord = $('#fWord');
  const checkDup = () => {
    const d = fWord.value.trim() && Store.findByText(fWord.value, w.id);
    const el = $('#dupWarn');
    el.classList.toggle('show', !!d);
    el.innerHTML = d ? `⚠ Từ này đã có trong sổ: <a href="#" data-open-dup="${d.id}">mở từ đã lưu</a>` : '';
  };
  fWord.addEventListener('input', checkDup);
  fWord.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doLookup(); } });
  $('#edSpeak').onclick = () => TTS.speak(fWord.value);
  $('#edLookup').onclick = doLookup;
  $('#addEx').onclick = () => { addExampleRow(); $('#exList .ex-row:last-child .ex-en').focus(); };
  $('#edForm').onsubmit = e => { e.preventDefault(); saveEditor(); };
  $('#edDelete')?.addEventListener('click', () => { if (confirmDelete(w.id)) dlg.close(); });
  $('#dupWarn').addEventListener('click', e => {
    const a = e.target.closest('[data-open-dup]'); if (!a) return;
    e.preventDefault(); dlg.close(); openDetail(a.dataset.openDup);
  });
  checkDup();
  dlg.showModal();
  if (!id || preset) setTimeout(() => (preset ? $('#fMeaning') : fWord).focus(), 50);
}

function addExampleRow(en = '', vi = '') {
  const row = document.createElement('div');
  row.className = 'ex-row';
  row.innerHTML = `
    <textarea class="ex-en" rows="1" placeholder="Câu ví dụ tiếng Anh">${esc(en)}</textarea>
    <div class="ex-actions">
      <button type="button" class="icon-btn speak" data-ex-speak title="Nghe câu" aria-label="Nghe câu">${icon('vol')}</button>
      <button type="button" class="icon-btn" data-ex-del title="Xoá ví dụ" aria-label="Xoá ví dụ">${icon('x')}</button>
    </div>
    <input class="ex-vi" placeholder="Dịch nghĩa (tuỳ chọn)" value="${esc(vi)}">`;
  row.querySelector('[data-ex-speak]').onclick = () => TTS.speak(row.querySelector('.ex-en').value);
  row.querySelector('[data-ex-del]').onclick = () => row.remove();
  $('#exList').appendChild(row);
}

async function doLookup() {
  const word = $('#fWord').value.trim();
  const panel = $('#dictPanel');
  if (!word) { $('#fWord').focus(); return; }
  panel.classList.remove('hidden');
  panel.innerHTML = `<span class="muted">Đang tra “${esc(word)}”…</span>`;
  let d;
  try { d = await lookupWord(word); }
  catch (e) { panel.innerHTML = `<span style="color:var(--danger)">Không tra được (kiểm tra kết nối mạng).</span>${dictLinks(word)}`; return; }
  if (!d) { panel.innerHTML = `<span class="muted">Từ điển miễn phí không có “${esc(word)}”. Thử tra ở các trang sau:</span>${dictLinks(word)}`; return; }
  const meanings = d.meanings.slice(0, 5);
  panel.innerHTML = `
    <div class="row">
      <h4>${esc(d.word)}</h4><span class="muted">${esc(d.ipa)}</span>
      ${d.audio ? `<button type="button" class="icon-btn speak" id="dAudio" title="Nghe bản ghi âm người bản xứ">${icon('headphones')}</button>` : ''}
      <span class="spacer"></span>
      <button type="button" class="btn sm primary" id="dFill">${icon('sparkle', 'sm')}Điền tự động</button>
      <button type="button" class="icon-btn" id="dClose" aria-label="Đóng">${icon('x')}</button>
    </div>
    <div class="small muted" style="margin-top:4px">Định nghĩa Anh–Anh. Bấm <b>+ Nghĩa</b>/<b>+ Ví dụ</b> để chèn vào ô tương ứng.</div>
    ${meanings.map((m, mi) => `<div class="dict-meaning">${posTag(m.pos)}
      ${m.defs.map((x, di) => `<div class="dict-def"><div class="txt">${esc(x.def)}${x.ex ? `<div class="ex">“${esc(x.ex)}”</div>` : ''}</div>
        <div class="btns"><button type="button" class="mini" data-dm="${mi}.${di}">+ Nghĩa</button>${x.ex ? `<button type="button" class="mini" data-de="${mi}.${di}">+ Ví dụ</button>` : ''}</div></div>`).join('')}
    </div>`).join('')}
    ${d.synonyms.length ? `<div style="margin-top:10px"><b class="small">Đồng nghĩa:</b> ${d.synonyms.map(s => `<button type="button" class="syn" data-dsyn="${esc(s)}">+ ${esc(s)}</button>`).join('')}</div>` : ''}
    ${dictLinks(word)}`;
  const get = k => { const [a, b] = k.split('.').map(Number); return meanings[a].defs[b]; };
  $('#dAudio')?.addEventListener('click', () => new Audio(d.audio).play().catch(() => toast('Không phát được âm thanh', 'error')));
  $('#dClose').onclick = () => panel.classList.add('hidden');
  panel.onclick = e => {
    const m = e.target.closest('[data-dm]'), x = e.target.closest('[data-de]'), s = e.target.closest('[data-dsyn]');
    if (m) { appendLine($('#fMeaning'), get(m.dataset.dm).def); m.disabled = true; }
    if (x) { addExampleRow(get(x.dataset.de).ex); x.disabled = true; cleanEmptyExamples(); }
    if (s) { const cur = splitList($('#fSyn').value); if (!cur.includes(s.dataset.dsyn)) $('#fSyn').value = [...cur, s.dataset.dsyn].join(', '); s.disabled = true; }
  };
  $('#dFill').onclick = () => {
    if (!$('#fIpa').value.trim() && d.ipa) $('#fIpa').value = d.ipa;
    if (!$('#fPos').value && meanings[0]) { const p = meanings[0].pos; if (POS.some(x => x[0] === p)) $('#fPos').value = p; }
    if (!$('#fSyn').value.trim() && d.synonyms.length) $('#fSyn').value = d.synonyms.slice(0, 6).join(', ');
    if (!$('#fAnt').value.trim() && d.antonyms.length) $('#fAnt').value = d.antonyms.slice(0, 4).join(', ');
    if (!$('#fNotes').value.trim() && meanings[0]?.defs[0]) $('#fNotes').value = 'EN: ' + meanings[0].defs[0].def;
    const hasEx = $$('#exList .ex-en').some(t => t.value.trim());
    if (!hasEx) {
      const exs = meanings.flatMap(m => m.defs.filter(x => x.ex).map(x => x.ex)).slice(0, 2);
      exs.forEach(ex => addExampleRow(ex)); cleanEmptyExamples();
    }
    toast('Đã điền thông tin từ từ điển. Hãy bổ sung nghĩa tiếng Việt!');
    if (!$('#fMeaning').value.trim()) $('#fMeaning').focus();
  };
}
function appendLine(el, text) { el.value = el.value.trim() ? el.value.trim() + '\n' + text : text; }
function cleanEmptyExamples() { $$('#exList .ex-row').forEach(r => { if (!r.querySelector('.ex-en').value.trim() && !r.querySelector('.ex-vi').value.trim() && $$('#exList .ex-row').length > 1) r.remove(); }); }

function saveEditor() {
  const w = editing;
  const word = $('#fWord').value.trim().replace(/\s+/g, ' ');
  if (!word) { $('#fWord').focus(); return; }
  const meaning = $('#fMeaning').value.trim();
  if (!meaning) { toast('Hãy nhập nghĩa của từ'); $('#fMeaning').focus(); return; }
  const dup = Store.findByText(word, w.id);
  if (dup && !confirm(`“${word}” đã có trong sổ. Vẫn lưu thành một mục riêng?`)) return;
  Object.assign(w, {
    word, meaning,
    ipa: $('#fIpa').value.trim(), pos: $('#fPos').value, notes: $('#fNotes').value.trim(),
    synonyms: splitList($('#fSyn').value).join(', '), antonyms: splitList($('#fAnt').value).join(', '),
    tags: splitList($('#fTags').value).join(', '),
    examples: $$('#exList .ex-row').map(r => ({ en: r.querySelector('.ex-en').value.trim(), vi: r.querySelector('.ex-vi').value.trim() })).filter(e => e.en)
  });
  const isNew = !Store.byId(w.id);
  Store.upsert(w);
  toast(isNew ? `Đã thêm “${word}”` : 'Đã lưu thay đổi', 'success');
  const again = $('#edAgain')?.checked;
  $('#editor').close();
  refreshCurrent();
  if (again) openEditor(null);
  if (!isNew && $('#detail').dataset.id === w.id && $('#detail').open) openDetail(w.id);
}
function refreshCurrent() {
  if (current === 'list') renderListItems();
  else if (current === 'stats') renderStats();
  else if (current === 'study' && !Study.active) renderStudy();
  else if (current === 'write') renderWrite();
}
function confirmDelete(id) {
  const w = Store.byId(id);
  if (!w || !confirm(`Xoá “${w.word}” khỏi sổ từ vựng?`)) return false;
  Store.remove(id);
  toast('Đã xoá');
  $('#detail').close();
  refreshCurrent();
  return true;
}

/* =========================================================
   CỬA SỔ: CHI TIẾT TỪ
   ========================================================= */
function openDetail(id) {
  const w = Store.byId(id);
  if (!w) return;
  const dlg = $('#detail');
  dlg.dataset.id = id;
  const st = status(w), a = accuracy(w);
  dlg.innerHTML = `
    <div class="dlg-head">
      <span class="badge st-${st}">${STATUS_LABEL[st]}</span>
      <h2></h2>
      <button type="button" class="icon-btn ${w.starred ? 'on' : ''}" data-star="${w.id}" title="Đánh dấu">${icon('star')}</button>
      <button type="button" class="icon-btn" data-close aria-label="Đóng">${icon('x')}</button>
    </div>
    <div class="dlg-body">
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap">
        <div style="flex:1;min-width:0">
          <h3 class="det-word">${esc(w.word)}</h3>
          <div class="det-sub">${w.ipa ? `<span>${esc(w.ipa)}</span>` : ''}${posTag(w.pos)}</div>
        </div>
        ${speakBtn(w.word, 'lg')}${slowBtn(w.word)}
      </div>
      <div class="det-sec"><h5>Nghĩa</h5><div class="det-meaning">${esc(w.meaning)}</div></div>
      ${w.notes ? `<div class="det-sec"><h5>Ghi chú cách dùng</h5><div class="det-notes">${esc(w.notes)}</div></div>` : ''}
      ${w.synonyms ? `<div class="det-sec"><h5>Đồng nghĩa</h5>${splitList(w.synonyms).map(s => `<span class="syn" data-speak="${esc(s)}">${icon('vol', 'sm')}${esc(s)}</span>`).join('')}</div>` : ''}
      ${w.antonyms ? `<div class="det-sec"><h5>Trái nghĩa</h5>${splitList(w.antonyms).map(s => `<span class="syn" data-speak="${esc(s)}">${icon('vol', 'sm')}${esc(s)}</span>`).join('')}</div>` : ''}
      ${w.examples.length ? `<div class="det-sec"><h5>Ví dụ</h5>${w.examples.map(exampleItem).join('')}</div>` : ''}
      ${w.tags ? `<div class="det-sec"><h5>Chủ đề</h5>${splitList(w.tags).map(t => `<span class="tag">#${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="det-sec"><h5>Tiến độ học</h5>
        <div class="stat-grid">
          <div><b>${w.stats.reviews}</b><span>Số lần học</span></div>
          <div><b>${a === null ? '—' : a + '%'}</b><span>Tỉ lệ nhớ đúng</span></div>
          <div><b>${w.stats.writes}</b><span>Lần luyện viết</span></div>
          <div><b>${fmtAgo(w.stats.lastStudied)}</b><span>Học lần cuối</span></div>
          <div><b>${fmtDue(w)}</b><span>Lịch ôn tiếp</span></div>
          <div><b>${fmtDate(w.createdAt)}</b><span>Ngày thêm</span></div>
        </div>
      </div>
      ${dictLinks(w.word)}
    </div>
    <div class="dlg-foot">
      <button type="button" class="btn danger" data-d="del">${icon('trash', 'sm')}<span>Xoá</span></button>
      <button type="button" class="btn" data-d="learned">${icon('check', 'sm')}${w.learned ? 'Bỏ “đã thuộc”' : 'Đánh dấu đã thuộc'}</button>
      <span class="spacer"></span>
      <button type="button" class="btn" data-d="write">${icon('pen', 'sm')}Luyện viết</button>
      <button type="button" class="btn primary" data-d="edit">${icon('pen', 'sm')}Sửa</button>
    </div>`;
  dlg.querySelector('.dlg-foot').onclick = e => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    const act = b.dataset.d;
    if (act === 'del') confirmDelete(id);
    if (act === 'edit') { dlg.close(); openEditor(id); }
    if (act === 'write') { dlg.close(); Write.ids = null; Write.source = 'all'; Write.focusId = id; go('write'); }
    if (act === 'learned') {
      w.learned = !w.learned;
      if (!w.learned && w.srs.interval >= 21) w.srs.interval = 7;
      Store.upsert(w); refreshCurrent(); openDetail(id);
      toast(w.learned ? 'Đã đánh dấu là đã thuộc' : 'Đã đưa trở lại danh sách đang học');
    }
  };
  if (!dlg.open) dlg.showModal();
  if (Store.settings.autoSpeak) TTS.speak(w.word);
}
const exampleItem = e => `<div class="ex-item">${speakBtn(e.en, '', 'Nghe câu ví dụ')}<div><div class="en">${esc(e.en)}</div>${e.vi ? `<div class="vi">${esc(e.vi)}</div>` : ''}</div></div>`;

/* =========================================================
   MÀN HÌNH: HỌC & ÔN TẬP
   ========================================================= */
const Study = { active: false };

function buildQueue(source, size) {
  const words = Store.words;
  let pool;
  if (source === 'due') {
    const due = words.filter(isDue).sort((a, b) => a.srs.due - b.srs.due);
    const fresh = words.filter(w => status(w) === 'new' && !w.learned).sort((a, b) => a.createdAt - b.createdAt).slice(0, Store.settings.newPerSession);
    pool = [...due, ...shuffle(fresh)];
    pool = size ? pool.slice(0, size) : pool;
    return shuffle(pool).map(w => w.id);
  }
  if (source === 'all') pool = words;
  else if (source === 'unlearned') pool = words.filter(w => status(w) !== 'mastered');
  else if (source === 'starred') pool = words.filter(w => w.starred);
  else if (source === 'hard') pool = words.filter(w => w.stats.wrong > 0).sort((a, b) => (a.stats.correct / a.stats.reviews) - (b.stats.correct / b.stats.reviews)).slice(0, size || undefined);
  else if (source === 'recent') pool = [...words].sort((a, b) => b.createdAt - a.createdAt).slice(0, size || 20);
  else if (source.startsWith('tag:')) { const t = source.slice(4); pool = words.filter(w => splitList(w.tags).includes(t)); }
  else pool = words;
  pool = shuffle(pool);
  return (size ? pool.slice(0, size) : pool).map(w => w.id);
}

function renderStudy() {
  if (Study.active) return renderSession();
  const view = $('#view');
  const words = Store.words;
  if (!words.length) {
    view.innerHTML = `<div class="card empty"><div class="big">${icon('cards', 'lg')}</div><h3>Chưa có từ nào để học</h3><p>Hãy thêm vài từ vựng vào sổ trước nhé.</p><button class="btn primary lg" data-act="add">${icon('plus')}Thêm từ</button></div>`;
    return;
  }
  const s = Store.settings;
  const due = words.filter(isDue).length;
  const fresh = words.filter(w => status(w) === 'new').length;
  const today = Store.data.log[dayKey()] || {};
  const pct = Math.min(100, Math.round(100 * (today.reviews || 0) / Math.max(1, s.dailyGoal)));
  const tags = allTags();
  const srcOpts = [['due', `Đến hạn ôn + từ mới (${due} + ${Math.min(fresh, s.newPerSession)})`], ['all', `Tất cả các từ (${words.length})`],
    ['unlearned', 'Chưa thuộc'], ['hard', 'Từ hay sai'], ['recent', 'Từ mới thêm gần đây'], ['starred', '★ Từ đã đánh dấu'],
    ...tags.map(t => ['tag:' + t, 'Chủ đề: ' + t])];
  view.innerHTML = `
    <section class="card study-hero">
      <div>
        <h2>${due ? `Có ${due} từ đến hạn ôn tập` : fresh ? 'Sẵn sàng học từ mới!' : 'Bạn đã ôn hết bài hôm nay 🎉'}</h2>
        <p>${fresh} từ chưa học · ${streak()} ngày học liên tiếp ${streak() ? '🔥' : ''}</p>
      </div>
      <div class="goal"><div class="ring" style="--p:${pct}"><div>${today.reviews || 0}<small>/${s.dailyGoal} lượt</small></div></div></div>
    </section>
    <div class="card opts">
      <div class="field"><label for="stSource">Học từ nào?</label>
        <select id="stSource">${srcOpts.map(([v, l]) => `<option value="${esc(v)}" ${s.studySource === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
      <div class="field"><label for="stSize">Số lượng</label>
        <select id="stSize">${[5, 10, 20, 30, 50, 0].map(n => `<option value="${n}" ${+s.sessionSize === n ? 'selected' : ''}>${n || 'Tất cả'}</option>`).join('')}</select></div>
      <div class="field"><label for="stDir">Chiều hỏi</label>
        <select id="stDir">${[['en-vi', 'Anh → Việt'], ['vi-en', 'Việt → Anh'], ['mixed', 'Trộn lẫn']].map(([v, l]) => `<option value="${v}" ${s.direction === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    </div>
    <div class="mode-grid">
      <button class="mode" data-mode="flash"><div class="ic c1">${icon('cards')}</div><div><b>Thẻ ghi nhớ</b><span>Lật thẻ, tự đánh giá mức độ nhớ. Lịch ôn tự điều chỉnh.</span></div></button>
      <button class="mode" data-mode="quiz"><div class="ic c2">${icon('quiz')}</div><div><b>Trắc nghiệm</b><span>Chọn nghĩa đúng trong 4 đáp án.</span></div></button>
      <button class="mode" data-mode="type"><div class="ic c3">${icon('keyboard')}</div><div><b>Gõ từ</b><span>Xem nghĩa và gõ lại từ tiếng Anh cho đúng chính tả.</span></div></button>
      <button class="mode" data-mode="listen"><div class="ic c5">${icon('headphones')}</div><div><b>Nghe & chép</b><span>Nghe máy đọc rồi gõ lại từ bạn nghe được.</span></div></button>
      <button class="mode" data-mode="write"><div class="ic c4">${icon('pen')}</div><div><b>Luyện viết tay</b><span>Viết từ bằng ngón tay / bút trên màn hình.</span></div></button>
    </div>`;
  $('#stSource').onchange = e => { s.studySource = e.target.value; Store.saveSettings(); };
  $('#stSize').onchange = e => { s.sessionSize = +e.target.value; Store.saveSettings(); };
  $('#stDir').onchange = e => { s.direction = e.target.value; Store.saveSettings(); };
}

function startSession(mode, ids) {
  const s = Store.settings;
  ids ||= buildQueue(s.studySource, +s.sessionSize);
  if (!ids.length) {
    toast(s.studySource === 'due' ? 'Không có từ đến hạn. Thử chọn “Tất cả các từ”.' : 'Không có từ nào phù hợp lựa chọn này.');
    return;
  }
  if (mode === 'write') { Write.ids = ids; Write.idx = 0; go('write'); return; }
  if ((mode === 'quiz') && Store.words.length < 2) { toast('Cần ít nhất 2 từ trong sổ để làm trắc nghiệm.'); return; }
  Object.assign(Study, { active: true, mode, ids, idx: 0, correct: 0, wrong: 0, wrongIds: [], requeued: {}, revealed: false, answered: null, opts: null, dir: null, hint: false, total: ids.length });
  if (current !== 'study') go('study'); else renderSession();
}
function curDir() {
  if (Study.dir) return Study.dir;
  const d = Store.settings.direction;
  Study.dir = d === 'mixed' ? (Math.random() < .5 ? 'en-vi' : 'vi-en') : d;
  return Study.dir;
}
function nextCard() {
  Study.idx++;
  Object.assign(Study, { revealed: false, answered: null, opts: null, dir: null, hint: false, typed: '' });
  renderSession();
}
function renderSession() {
  const view = $('#view');
  // bỏ qua từ đã bị xoá
  while (Study.idx < Study.ids.length && !Store.byId(Study.ids[Study.idx])) Study.idx++;
  if (Study.idx >= Study.ids.length) return renderDone();
  const w = Store.byId(Study.ids[Study.idx]);
  const head = `<div class="sess-head">
      <button class="icon-btn" data-act="end-session" title="Thoát" aria-label="Thoát">${icon('x')}</button>
      <div class="progress"><i style="width:${100 * Study.idx / Study.ids.length}%"></i></div>
      <span class="sess-count">${Study.idx + 1}/${Study.ids.length}</span></div>`;
  const body = Study.mode === 'flash' ? flashHTML(w) : Study.mode === 'quiz' ? quizHTML(w) : typeHTML(w);
  view.innerHTML = `<div class="session">${head}${body}</div>`;
  if (Study.mode === 'type' || Study.mode === 'listen') {
    const inp = $('#typeIn');
    if (inp && !Study.answered) setTimeout(() => inp.focus(), 30);
    $('#typeForm')?.addEventListener('submit', e => { e.preventDefault(); checkTyped(w); });
  }
  const autoSpeak = Store.settings.autoSpeak;
  if (Study.mode === 'listen' && !Study.answered) setTimeout(() => TTS.speak(w.word), 250);
  else if (autoSpeak && !Study.answered && !Study.revealed && curDir() === 'en-vi' && Study.mode !== 'type') TTS.speak(w.word);
}

function wordFace(w, big = true) {
  return `<div class="${big ? 'fw' : 'fw" style="font-size:28px'}">${esc(w.word)}</div>
    <div class="row" style="justify-content:center;gap:6px">${w.ipa ? `<span class="muted">${esc(w.ipa)}</span>` : ''}${posTag(w.pos)}${speakBtn(w.word)}${slowBtn(w.word)}</div>`;
}
function flashHTML(w) {
  const dir = curDir();
  const front = dir === 'en-vi' ? wordFace(w) : `<div class="qlabel muted small">Từ tiếng Anh nào có nghĩa là…</div><div class="fm">${esc(w.meaning)}</div>${posTag(w.pos)}`;
  const back = dir === 'en-vi'
    ? `<div class="fm" style="margin-top:0">${esc(w.meaning)}</div>`
    : wordFace(w, false);
  const extra = `${w.notes ? `<div class="det-notes" style="text-align:left;margin-top:12px">${esc(w.notes)}</div>` : ''}
    ${w.examples.slice(0, 2).map(exampleItem).join('')}
    ${w.synonyms ? `<div class="small muted" style="margin-top:8px">≈ ${esc(w.synonyms)}</div>` : ''}`;
  const prev = q => fmtInterval(nextSrs(w.srs, q).interval);
  return `<div class="card flash" id="flashCard">
      ${front}
      ${Study.revealed ? `<div class="answer">${back}${extra}</div>` : `<div class="tap-hint">Chạm vào thẻ hoặc nhấn phím Cách để xem đáp án</div>`}
    </div>
    ${Study.revealed ? `<div class="rate-row">
        <button class="rate r0" data-rate-q="0">Quên<small>${prev(0)}</small></button>
        <button class="rate r1" data-rate-q="1">Khó<small>${prev(1)}</small></button>
        <button class="rate r2" data-rate-q="2">Nhớ<small>${prev(2)}</small></button>
        <button class="rate r3" data-rate-q="3">Dễ<small>${prev(3)}</small></button></div>
        <div class="kbd-hint">Phím tắt: 1 Quên · 2 Khó · 3 Nhớ · 4 Dễ</div>`
      : `<div style="margin-top:14px"><button class="btn primary lg w100" data-act="reveal">${icon('eye')}Xem đáp án</button></div>`}`;
}
function revealCard() {
  if (Study.revealed) return;
  Study.revealed = true;
  renderSession();
  const w = Store.byId(Study.ids[Study.idx]);
  if (curDir() === 'vi-en' && Store.settings.autoSpeak) TTS.speak(w.word);
}
function rateCard(q) {
  const w = Store.byId(Study.ids[Study.idx]);
  if (!w) return;
  applyReview(w, q);
  if (q === 0) {
    Study.wrong++; if (!Study.wrongIds.includes(w.id)) Study.wrongIds.push(w.id);
    const n = Study.requeued[w.id] || 0;
    if (n < 2) { Study.requeued[w.id] = n + 1; Study.ids.push(w.id); }
  } else Study.correct++;
  nextCard();
}

function quizHTML(w) {
  const dir = curDir();
  if (!Study.opts) {
    const others = shuffle(Store.words.filter(x => x.id !== w.id && normAns(x.meaning) !== normAns(w.meaning) && normAns(x.word) !== normAns(w.word)));
    // ưu tiên đáp án nhiễu cùng từ loại
    others.sort((a, b) => (b.pos === w.pos) - (a.pos === w.pos));
    Study.opts = shuffle([w, ...others.slice(0, 3)]).map(x => x.id);
  }
  const label = x => dir === 'en-vi' ? x.meaning.split('\n')[0] : x.word;
  const q = dir === 'en-vi' ? wordFace(w) : `<div class="fm">${esc(w.meaning)}</div>${posTag(w.pos)}`;
  const ans = Study.answered;
  return `<div class="card q-card"><div class="qlabel">${dir === 'en-vi' ? 'Chọn nghĩa đúng của từ' : 'Chọn từ tiếng Anh đúng'}</div>${q}</div>
    <div class="options">${Study.opts.map((id, i) => {
      const x = Store.byId(id); if (!x) return '';
      const cls = ans ? (id === w.id ? 'correct' : id === ans ? 'wrong' : '') : '';
      return `<button class="opt ${cls}" data-opt="${id}" ${ans ? 'disabled' : ''}><span class="k">${i + 1}</span><span>${esc(label(x))}</span></button>`;
    }).join('')}</div>
    ${ans ? `<div class="feedback ${ans === w.id ? 'ok' : 'bad'}">${ans === w.id ? '✓ Chính xác!' : '✗ Chưa đúng'}
        <div class="ans">${esc(w.word)} ${w.ipa ? `<span class="muted small">${esc(w.ipa)}</span>` : ''}</div><div class="small" style="color:var(--text)">${esc(w.meaning)}</div></div>
      <div style="margin-top:14px"><button class="btn primary lg w100" data-act="next">Tiếp tục →</button></div>` : '<div class="kbd-hint">Phím tắt: 1–4 để chọn</div>'}`;
}
function answerQuiz(id) {
  if (Study.answered) return;
  const w = Store.byId(Study.ids[Study.idx]);
  Study.answered = id;
  const ok = id === w.id;
  applyReview(w, ok ? 2 : 0);
  if (ok) Study.correct++; else { Study.wrong++; if (!Study.wrongIds.includes(w.id)) Study.wrongIds.push(w.id); }
  renderSession();
  if (curDir() === 'vi-en' || !ok) TTS.speak(w.word);
}

function typeHTML(w) {
  const listen = Study.mode === 'listen';
  const ans = Study.answered;
  const mask = w.word.replace(/[A-Za-z]/g, '_').split('').map((c, i) => i === 0 ? w.word[0] : c).join('');
  const prompt = listen
    ? `<div class="qlabel">Nghe và gõ lại từ bạn nghe được</div>
       <div class="row" style="justify-content:center;margin:16px 0 6px">
         <button class="btn soft lg" data-speak="${esc(w.word)}">${icon('vol')}Nghe lại</button>
         <button class="btn lg" data-speak="${esc(w.word)}" data-rate="0.5">${icon('vol')}Đọc chậm</button></div>`
    : `<div class="qlabel">Gõ từ tiếng Anh có nghĩa là</div><div class="fm">${esc(w.meaning)}</div>${posTag(w.pos)}`;
  return `<div class="card q-card">${prompt}
      ${Study.hint && !ans ? `<div class="hint-mask">${esc(mask)}</div>` : ''}
      <form id="typeForm" style="margin-top:18px" autocomplete="off">
        <input id="typeIn" class="input type-input ${ans ? (ans === 'ok' ? 'ok' : 'bad') : ''}" placeholder="Gõ từ tiếng Anh…" value="${esc(Study.typed || '')}"
          autocapitalize="off" autocorrect="off" spellcheck="false" ${ans ? 'readonly' : ''}>
        ${ans ? '' : `<div class="row" style="margin-top:12px">
          <button type="button" class="btn" data-act="hint">${icon('eye', 'sm')}Gợi ý</button>
          <button type="button" class="btn ghost" data-act="skip">Không biết</button>
          <span class="spacer"></span><button type="submit" class="btn primary">Kiểm tra</button></div>`}
      </form>
    </div>
    ${ans ? `<div class="feedback ${ans === 'ok' ? 'ok' : 'bad'}">${ans === 'ok' ? '✓ Chính xác!' : '✗ Đáp án đúng là'}
        <div class="ans">${esc(w.word)} ${speakBtn(w.word)}</div>
        ${ans !== 'ok' && Study.typed ? `<div class="small diff" style="color:var(--text)">Bạn gõ: ${diffHTML(Study.typed, w.word)}</div>` : ''}
        <div class="small" style="color:var(--text)">${w.ipa ? esc(w.ipa) + ' · ' : ''}${esc(w.meaning)}</div></div>
      <div style="margin-top:14px"><button class="btn primary lg w100" data-act="next" id="nextBtn">Tiếp tục →</button></div>` : ''}`;
}
function diffHTML(typed, correct) {
  const a = typed, b = correct;
  return [...a].map((c, i) => c.toLowerCase() === (b[i] || '').toLowerCase() ? esc(c) : `<span class="x">${esc(c)}</span>`).join('') || '(trống)';
}
function checkTyped(w, giveUp = false) {
  if (Study.answered) return;
  const val = giveUp ? '' : $('#typeIn').value;
  if (!giveUp && !val.trim()) { $('#typeIn').focus(); return; }
  Study.typed = val;
  const ok = !giveUp && normAns(val) === normAns(w.word);
  Study.answered = ok ? 'ok' : 'bad';
  applyReview(w, ok ? (Study.hint ? 1 : 2) : 0);
  if (ok) Study.correct++; else { Study.wrong++; if (!Study.wrongIds.includes(w.id)) Study.wrongIds.push(w.id); }
  renderSession();
  TTS.speak(w.word);
  setTimeout(() => $('#nextBtn')?.focus(), 30);
}

function renderDone() {
  const total = Study.correct + Study.wrong;
  const pct = total ? Math.round(100 * Study.correct / total) : 0;
  const wrongs = Study.wrongIds.map(id => Store.byId(id)).filter(Boolean);
  $('#view').innerHTML = `<div class="session"><div class="card done">
    <div class="big" style="width:64px;height:64px;margin:0 auto 10px;border-radius:20px;display:grid;place-items:center;background:var(--success-soft);color:var(--success)">${icon('trophy', 'lg')}</div>
    <h2 style="margin:0">Hoàn thành phiên học!</h2>
    <div class="score">${pct}%</div>
    <div class="muted">${Study.correct} lượt đúng · ${Study.wrong} lượt sai · ${new Set(Study.ids).size} từ</div>
    ${wrongs.length ? `<h4 style="margin:22px 0 0;text-align:left">Từ cần ôn thêm</h4><ul>${wrongs.map(w => `<li><b>${esc(w.word)}</b><span class="muted" style="text-align:right">${esc(w.meaning.split('\n')[0])}</span></li>`).join('')}</ul>` : '<p>Tuyệt vời, bạn không sai từ nào! 🎉</p>'}
    <div class="row" style="justify-content:center;margin-top:18px">
      ${wrongs.length ? `<button class="btn primary" data-act="retry-wrong">${icon('repeat', 'sm')}Học lại từ sai</button>` : ''}
      <button class="btn" data-act="again">${icon('refresh', 'sm')}Phiên mới</button>
      <button class="btn ghost" data-act="end-session">Về trang Học</button>
    </div></div></div>`;
  Study.finished = true;
}

/* =========================================================
   MÀN HÌNH: LUYỆN VIẾT TAY
   ========================================================= */
const Write = {
  ids: null, source: 'all', idx: 0, focusId: null, guide: true, reveal: false, showMeaning: true,
  color: '', size: 5, eraser: false, strokes: [], drawing: null
};
const INK_COLORS = ['ink', '#2563eb', '#dc2626', '#059669', '#7c3aed'];

function writeList() {
  if (Write.ids) return Write.ids.map(id => Store.byId(id)).filter(Boolean);
  const w = Store.words;
  if (Write.source === 'unlearned') return w.filter(x => status(x) !== 'mastered');
  if (Write.source === 'starred') return w.filter(x => x.starred);
  if (Write.source === 'due') return w.filter(isDue);
  if (Write.source === 'random') return Write._rand && Write._rand.length === w.length ? Write._rand.map(id => Store.byId(id)).filter(Boolean) : (Write._rand = shuffle(w).map(x => x.id)).map(id => Store.byId(id));
  return w;
}

function renderWrite() {
  const view = $('#view');
  let list = writeList();
  if (Write.focusId) { const i = list.findIndex(w => w.id === Write.focusId); if (i < 0) { Write.ids = null; Write.source = 'all'; list = writeList(); } Write.idx = Math.max(0, list.findIndex(w => w.id === Write.focusId)); Write.focusId = null; }
  if (!list.length) {
    view.innerHTML = `<div class="card empty"><div class="big">${icon('pen', 'lg')}</div><h3>Chưa có từ để luyện viết</h3>
      <p>${Store.words.length ? 'Không có từ nào trong nhóm đã chọn.' : 'Hãy thêm từ vựng vào sổ trước.'}</p>
      ${Store.words.length ? `<button class="btn primary" data-act="write-all">Luyện tất cả các từ</button>` : `<button class="btn primary" data-act="add">${icon('plus')}Thêm từ</button>`}</div>`;
    return;
  }
  Write.idx = ((Write.idx % list.length) + list.length) % list.length;
  const w = list[Write.idx];
  const sources = [['all', 'Tất cả từ'], ['unlearned', 'Chưa thuộc'], ['due', 'Đến hạn ôn'], ['starred', '★ Đánh dấu'], ['random', 'Ngẫu nhiên']];
  view.innerHTML = `<div class="write">
    <div class="card write-head">
      <button class="icon-btn" data-w="prev" aria-label="Từ trước">${icon('left')}</button>
      <div class="ww">
        ${Write.showMeaning ? `<div class="m">${esc(w.meaning.split('\n')[0])} ${posTag(w.pos)}</div>` : ''}
        <div class="w ${Write.reveal || Write.guide ? '' : 'blur'}">${esc(w.word)}</div>
        <div class="meta">${Write.idx + 1}/${list.length}${w.ipa ? ' · ' + esc(w.ipa) : ''} · đã viết ${w.stats.writes} lần</div>
      </div>
      ${speakBtn(w.word)}
      <button class="icon-btn" data-w="next" aria-label="Từ tiếp">${icon('right')}</button>
    </div>
    <div class="write-bar">
      ${Write.ids ? `<span class="chip active">Phiên học (${list.length} từ)</span><button class="btn sm ghost" data-w="exit-session">Bỏ chọn</button>` :
        `<select class="input write-select" id="wSource">${sources.map(([v, l]) => `<option value="${v}" ${Write.source === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`}
      <button class="btn sm toggle-btn ${Write.guide ? 'active' : ''}" data-w="guide" title="Hiện chữ mẫu mờ để tô theo">${icon('eye', 'sm')}Chữ mẫu</button>
      ${!Write.guide ? `<button class="btn sm toggle-btn ${Write.reveal ? 'active' : ''}" data-w="reveal">${Write.reveal ? 'Ẩn đáp án' : 'Xem đáp án'}</button>` : ''}
      <button class="btn sm toggle-btn ${Write.showMeaning ? 'active' : ''}" data-w="meaning">Nghĩa</button>
    </div>
    <div class="pad-box" id="padBox"><canvas id="padBg"></canvas><canvas id="padInk"></canvas></div>
    <div class="pad-tools">
      ${INK_COLORS.map(c => `<button class="swatch ${!Write.eraser && (Write.color || 'ink') === c ? 'active' : ''}" data-color="${c}" style="background:${c === 'ink' ? 'var(--ink)' : c}" aria-label="Màu bút"></button>`).join('')}
      <span class="sep" style="width:1px;height:24px;background:var(--border);margin:0 2px"></span>
      ${[3, 5, 9].map(s => `<button class="size-dot ${Write.size === s ? 'active' : ''}" data-size="${s}" aria-label="Cỡ bút ${s}"><i style="width:${s + 2}px;height:${s + 2}px"></i></button>`).join('')}
      <button class="icon-btn toggle-btn ${Write.eraser ? 'active' : ''}" data-w="eraser" title="Tẩy">${icon('eraser')}</button>
      <button class="icon-btn" data-w="undo" title="Hoàn tác">${icon('undo')}</button>
      <button class="icon-btn" data-w="clear" title="Xoá bảng">${icon('trash')}</button>
      <span class="spacer"></span>
      <button class="btn primary" data-w="done">${icon('check', 'sm')}Xong · từ tiếp</button>
    </div>
  </div>`;
  $('#wSource')?.addEventListener('change', e => { Write.source = e.target.value; Write.idx = 0; Write._rand = null; Write.strokes = []; renderWrite(); });
  setupPad(w);
}

function setupPad(w) {
  const box = $('#padBox'), bg = $('#padBg'), ink = $('#padInk');
  if (!box) return;
  Write.word = w;
  const resize = () => {
    const r = box.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    for (const c of [bg, ink]) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); }
    Write.cw = r.width; Write.ch = r.height;
    drawBg(); redrawInk();
  };
  resize();
  Write.resize = resize;
  if (document.fonts?.load) document.fonts.load('48px "Patrick Hand"').then(() => { if (Write.word === w) drawBg(); }).catch(() => {});

  const pos = e => { const r = ink.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, e.pointerType === 'pen' ? (e.pressure || .5) : .5]; };
  ink.onpointerdown = e => {
    if (Write.drawing && Write.drawing.pid !== e.pointerId) return;   // chống chạm nhầm lòng bàn tay
    e.preventDefault();
    ink.setPointerCapture(e.pointerId);
    const s = { color: Write.color || 'ink', size: Write.size, eraser: Write.eraser, pts: [pos(e)], pid: e.pointerId };
    Write.drawing = s; Write.strokes.push(s);
    drawDot(s);
  };
  ink.onpointermove = e => {
    const s = Write.drawing;
    if (!s || s.pid !== e.pointerId) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (evs.length ? evs : [e])) { s.pts.push(pos(ev)); drawSegment(s, s.pts.length - 1); }
  };
  const end = e => { if (Write.drawing && Write.drawing.pid === e.pointerId) Write.drawing = null; };
  ink.onpointerup = end; ink.onpointercancel = end;
}

function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function rowMetrics() {
  const h = Write.ch;
  const rowH = Math.max(96, Math.min(160, h / 3.2));
  return { rowH, rows: Math.max(1, Math.floor((h - 8) / rowH)) };
}
function drawBg() {
  const c = $('#padBg'); if (!c) return;
  const ctx = c.getContext('2d');
  const W = Write.cw, H = Write.ch;
  ctx.clearRect(0, 0, W, H);
  const { rowH, rows } = rowMetrics();
  const rule = cssVar('--rule'), strong = cssVar('--rule-strong'), mid = cssVar('--rule-mid');
  const top0 = (H - rows * rowH) / 2;
  const w = Write.word;
  for (let r = 0; r < rows; r++) {
    const y = top0 + r * rowH;
    const asc = y + rowH * .18, xh = y + rowH * .42, base = y + rowH * .68, desc = y + rowH * .90;
    const line = (yy, color, dash = [], width = 1) => { ctx.beginPath(); ctx.setLineDash(dash); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.moveTo(14, yy); ctx.lineTo(W - 14, yy); ctx.stroke(); };
    line(asc, rule); line(xh, mid, [6, 6]); line(base, strong, [], 1.4); line(desc, rule);
    if (Write.guide && w && r < 2) {
      let fs = (base - asc) * 1.05;
      ctx.font = `${fs}px "Patrick Hand", "Comic Sans MS", cursive`;
      const maxW = W - 48;
      const tw = ctx.measureText(w.word).width;
      if (tw > maxW) { fs *= maxW / tw; ctx.font = `${fs}px "Patrick Hand", "Comic Sans MS", cursive`; }
      ctx.setLineDash([]);
      ctx.globalAlpha = r === 0 ? .30 : .14;
      ctx.fillStyle = cssVar('--ink');
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(w.word, 24, base);
      ctx.globalAlpha = 1;
    }
  }
  ctx.setLineDash([]);
}
function strokeStyle(ctx, s) {
  ctx.globalCompositeOperation = s.eraser ? 'destination-out' : 'source-over';
  ctx.strokeStyle = ctx.fillStyle = s.color === 'ink' ? cssVar('--ink') : s.color;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
}
const widthOf = (s, p) => (s.eraser ? s.size * 4 : s.size) * (0.55 + p * 0.9);
function drawDot(s) {
  const ctx = $('#padInk')?.getContext('2d'); if (!ctx) return;
  strokeStyle(ctx, s);
  const [x, y, p] = s.pts[0];
  ctx.beginPath(); ctx.arc(x, y, widthOf(s, p) / 2, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}
function drawSegment(s, i) {
  const ctx = $('#padInk')?.getContext('2d'); if (!ctx || i < 1) return;
  strokeStyle(ctx, s);
  const p0 = s.pts[i - 2] || s.pts[i - 1], p1 = s.pts[i - 1], p2 = s.pts[i];
  const m1 = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], m2 = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  ctx.lineWidth = widthOf(s, p2[2]);
  ctx.beginPath(); ctx.moveTo(m1[0], m1[1]); ctx.quadraticCurveTo(p1[0], p1[1], m2[0], m2[1]); ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}
function redrawInk() {
  const c = $('#padInk'); if (!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, Write.cw, Write.ch);
  for (const s of Write.strokes) { drawDot(s); for (let i = 1; i < s.pts.length; i++) drawSegment(s, i); }
}
function writeAction(a) {
  const list = writeList();
  if (a === 'prev' || a === 'next') { Write.idx += a === 'next' ? 1 : -1; Write.strokes = []; Write.reveal = false; renderWrite(); }
  else if (a === 'done') {
    const w = list[Write.idx];
    if (w && Write.strokes.length) { w.stats.writes++; Store.logDay('writes'); Store.upsert(w); }
    if (Write.ids && Write.idx >= list.length - 1) { toast('Đã luyện viết hết các từ trong phiên! 🎉', 'success'); Write.ids = null; Write.idx = 0; }
    else Write.idx++;
    Write.strokes = []; Write.reveal = false; renderWrite();
    const nw = writeList()[Write.idx]; if (nw && Store.settings.autoSpeak) TTS.speak(nw.word);
  }
  else if (a === 'undo') { Write.strokes.pop(); redrawInk(); }
  else if (a === 'clear') { Write.strokes = []; redrawInk(); }
  else if (a === 'eraser') { Write.eraser = !Write.eraser; renderWrite(); }
  else if (a === 'guide') { Write.guide = !Write.guide; renderWrite(); }
  else if (a === 'reveal') { Write.reveal = !Write.reveal; renderWrite(); }
  else if (a === 'meaning') { Write.showMeaning = !Write.showMeaning; renderWrite(); }
  else if (a === 'exit-session') { Write.ids = null; Write.idx = 0; Write.strokes = []; renderWrite(); }
}

/* =========================================================
   MÀN HÌNH: THỐNG KÊ
   ========================================================= */
function streak() {
  const log = Store.data.log;
  const active = k => { const d = log[k]; return d && ((d.reviews || 0) + (d.writes || 0)) > 0; };
  let n = 0, t = Date.now();
  if (!active(dayKey(t))) t -= DAY;
  while (active(dayKey(t))) { n++; t -= DAY; }
  return n;
}
function renderStats() {
  const view = $('#view');
  const words = Store.words;
  const cnt = { new: 0, learning: 0, mastered: 0 };
  let reviews = 0, correct = 0, writes = 0;
  for (const w of words) { cnt[status(w)]++; reviews += w.stats.reviews; correct += w.stats.correct; writes += w.stats.writes; }
  const due = words.filter(isDue).length;
  const tomorrow = words.filter(w => !w.learned && w.stats.reviews && w.srs.due > Date.now() && w.srs.due <= startOfDay() + 2 * DAY).length;
  const days = [...Array(14)].map((_, i) => { const t = Date.now() - (13 - i) * DAY; const k = dayKey(t); return { k, t, d: Store.data.log[k] || {} }; });
  const max = Math.max(1, ...days.map(x => x.d.reviews || 0));
  const total = Math.max(1, words.length);
  const hard = words.filter(w => w.stats.reviews >= 2 && w.stats.wrong > 0).sort((a, b) => a.stats.correct / a.stats.reviews - b.stats.correct / b.stats.reviews).slice(0, 8);
  const addedWeek = words.filter(w => w.createdAt > Date.now() - 7 * DAY).length;
  view.innerHTML = `
    <div class="stats-grid">
      <div class="card stat"><div class="k">${icon('book', 'sm')}Tổng số từ</div><div class="v">${words.length}</div><div class="s">+${addedWeek} trong 7 ngày qua</div></div>
      <div class="card stat"><div class="k">${icon('flame', 'sm')}Chuỗi ngày học</div><div class="v">${streak()}</div><div class="s">ngày liên tiếp</div></div>
      <div class="card stat"><div class="k">${icon('clock', 'sm')}Đến hạn ôn</div><div class="v">${due}</div><div class="s">${tomorrow} từ đến hạn ngày mai</div></div>
      <div class="card stat"><div class="k">${icon('target', 'sm')}Tỉ lệ nhớ đúng</div><div class="v">${reviews ? Math.round(100 * correct / reviews) : 0}%</div><div class="s">${reviews} lượt ôn · ${writes} lượt viết</div></div>
    </div>
    <div class="two-col">
      <div class="card pad"><h3>Lượt ôn tập 14 ngày qua</h3>
        <div class="bars">${days.map((x, i) => `<div class="bar" title="${x.k}: ${x.d.reviews || 0} lượt ôn, ${x.d.correct || 0} đúng, ${x.d.added || 0} từ mới, ${x.d.writes || 0} lượt viết">
          <span class="n">${x.d.reviews || ''}</span>
          <div class="col ${!x.d.reviews ? 'zero' : ''} ${i === 13 ? 'today' : ''}" style="height:${100 * (x.d.reviews || 0) / max}%"></div>
          <span class="d">${i === 13 ? 'H.nay' : new Date(x.t).getDate() + '/' + (new Date(x.t).getMonth() + 1)}</span></div>`).join('')}</div>
      </div>
      <div class="card pad"><h3>Mức độ ghi nhớ</h3>
        <div class="dist"><i style="width:${100 * cnt.mastered / total}%;background:var(--success)"></i><i style="width:${100 * cnt.learning / total}%;background:var(--warn)"></i><i style="width:${100 * cnt.new / total}%;background:var(--primary)"></i></div>
        <div class="legend"><span style="--c:var(--success)">Đã thuộc: <b>${cnt.mastered}</b></span><span style="--c:var(--warn)">Đang học: <b>${cnt.learning}</b></span><span style="--c:var(--primary)">Mới: <b>${cnt.new}</b></span></div>
        <h3 style="margin-top:22px">Từ hay quên nhất</h3>
        ${hard.length ? `<ul class="hard-list">${hard.map(w => `<li data-open="${w.id}"><b>${esc(w.word)}</b><span class="muted small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(w.meaning.split('\n')[0])}</span><span class="pct">${Math.round(100 * w.stats.correct / w.stats.reviews)}%</span></li>`).join('')}</ul>
          <button class="btn soft w100" style="margin-top:12px" data-act="study-hard">${icon('repeat', 'sm')}Ôn lại các từ này</button>` : '<p class="muted small">Chưa có dữ liệu. Hãy học vài phiên nhé!</p>'}
      </div>
    </div>`;
}

/* =========================================================
   MÀN HÌNH: CÀI ĐẶT
   ========================================================= */
let installPrompt = null;
function driveStatusHTML() {
  const cid = Sync.clientId();
  if (!Sync.connected()) {
    return `<div class="drive-box"><div class="av">${icon('cloud')}</div><div class="who"><b>Chưa kết nối</b><span class="small muted">Dữ liệu chưa được đưa lên Google Drive.</span></div>
      <button class="btn primary" data-act="drive-connect" ${cid ? '' : 'disabled'}>${icon('cloud', 'sm')}Kết nối Google Drive</button></div>
      ${cid ? '' : '<p class="small" style="color:var(--warn)">⚠ Cần nhập Google Client ID bên dưới trước khi kết nối.</p>'}`;
  }
  const name = localStorage.getItem('vn.name') || '';
  return `<div class="drive-box"><div class="av">${esc((name || Drive.email || 'G')[0].toUpperCase())}</div>
    <div class="who"><b>${esc(Drive.email || 'Tài khoản Google')}</b><span class="small muted">Drive › ${FOLDER} › ${esc(Drive.fileName())} · ${Sync.state === 'error' ? `<span style="color:var(--danger)">${esc(Sync.error)}</span>` : 'đồng bộ ' + fmtAgo(Sync.lastSync)}</span></div>
    <button class="btn primary" data-act="drive-sync">${icon('refresh', 'sm')}Đồng bộ ngay</button>
    <button class="btn ghost" data-act="drive-disconnect">${icon('logout', 'sm')}Ngắt kết nối</button></div>
    ${isNative() ? '' : `<p class="small muted" style="margin:-4px 0 12px">Đang học trên máy tính công cộng / máy người khác? Khi học xong hãy bấm
      <button class="btn sm danger" data-act="drive-wipe-local" style="margin-left:4px">${icon('logout', 'sm')}Đăng xuất & xoá dữ liệu trên máy này</button></p>`}`;
}
function renderSettings() {
  const s = Store.settings;
  $('#view').innerHTML = `
  <section class="card set-sec">
    <h3>${icon('folder')}Lưu file trên ${isNative() ? 'điện thoại' : 'máy'}</h3>
    <p class="desc">Dữ liệu được lưu thành file <b>${FNAME}</b> trong thư mục <b>${FOLDER}</b> để học khi không có mạng và sao lưu nhanh. Bạn có thể mở file để xem hoặc chỉnh sửa.</p>
    <div id="fileStatus">${fileStatusHTML()}</div>
  </section>

  <section class="card set-sec">
    <h3>${icon('cloud')}Google Drive – học mọi lúc, mọi nơi</h3>
    <p class="desc">Mỗi người đăng nhập bằng tài khoản Google của mình. Dữ liệu được lưu vào <b>${FOLDER} › ${esc(Drive.fileName())}</b> trong Google Drive riêng của người đó. Ở bất kỳ máy tính nào có internet, chỉ cần mở trang VocabNote và kết nối Google Drive là lấy được dữ liệu ra học.</p>
    <div id="driveStatus">${driveStatusHTML()}</div>
    <div class="set-row"><div class="t"><b>Tự động đồng bộ</b><span>Bật: tự gửi thay đổi lên Drive và lấy dữ liệu mới khi mở ứng dụng. Tắt: chỉ đồng bộ khi bạn bấm “Đồng bộ ngay”.</span></div>
      <label class="switch"><input type="checkbox" id="sAuto" ${s.autoSync ? 'checked' : ''}><span></span></label></div>
    <div class="set-row"><div class="t"><b>Tên file dữ liệu trên Drive</b><span>Đổi tên để tách nhiều sổ khác nhau (vd: sổ của con, sổ IELTS).</span></div>
      <input class="input" id="sFile" style="max-width:240px" value="${esc(s.driveFile)}"></div>
    <details class="help" ${Sync.clientId() ? '' : 'open'}>
      <summary>Cấu hình Google Client ID ${CFG.googleClientId ? '(đã được cài sẵn)' : ''}</summary>
      <div class="field" style="margin-top:10px"><label for="sCid">Google OAuth Client ID</label>
        <input id="sCid" value="${esc(s.clientId)}" placeholder="${CFG.googleClientId ? 'Đang dùng Client ID cài sẵn trong config.js' : 'xxxxxxxx.apps.googleusercontent.com'}" spellcheck="false">
        <span class="hint">Chỉ cần làm 1 lần bởi người triển khai ứng dụng. Xem README.md để biết cách tạo.</span></div>
      <ol class="steps">
        <li>Vào <a href="https://console.cloud.google.com/" target="_blank" rel="noopener">Google Cloud Console</a> → tạo dự án mới.</li>
        <li>Bật <b>Google Drive API</b> (APIs &amp; Services → Library).</li>
        <li>Cấu hình <b>OAuth consent screen</b> (External), thêm email người dùng vào Test users hoặc Publish.</li>
        <li>Credentials → Create credentials → <b>OAuth client ID</b> → loại <b>Web application</b>.</li>
        <li>Authorized JavaScript origins: thêm <code>${esc(location.origin)}</code></li>
        <li>Sao chép Client ID và dán vào ô trên.</li>
      </ol>
    </details>
  </section>

  <section class="card set-sec">
    <h3>${icon('vol')}Phát âm</h3>
    <div class="set-row"><div class="t"><b>Giọng đọc</b><span>Anh–Mỹ hoặc Anh–Anh</span></div>
      <select class="input" id="sAccent"><option value="en-US" ${s.accent === 'en-US' ? 'selected' : ''}>🇺🇸 Anh – Mỹ</option><option value="en-GB" ${s.accent === 'en-GB' ? 'selected' : ''}>🇬🇧 Anh – Anh</option><option value="en-AU" ${s.accent === 'en-AU' ? 'selected' : ''}>🇦🇺 Anh – Úc</option></select></div>
    <div class="set-row"><div class="t"><b>Chọn giọng cụ thể</b><span id="voiceInfo">Các giọng có sẵn trên thiết bị</span></div>
      <select class="input" id="sVoice" style="max-width:260px"></select></div>
    <div class="set-row"><div class="t"><b>Tốc độ đọc</b><span id="rateVal">${s.rate}×</span></div>
      <input type="range" id="sRate" min="0.5" max="1.3" step="0.05" value="${s.rate}">
      <button class="btn sm" data-speak="The quick brown fox jumps over the lazy dog.">${icon('vol', 'sm')}Thử</button></div>
    <div class="set-row"><div class="t"><b>Tự động đọc từ</b><span>Đọc to từ vựng khi mở thẻ, xem chi tiết.</span></div>
      <label class="switch"><input type="checkbox" id="sAutoSpeak" ${s.autoSpeak ? 'checked' : ''}><span></span></label></div>
  </section>

  <section class="card set-sec">
    <h3>${icon('target')}Mục tiêu học tập</h3>
    <div class="set-row"><div class="t"><b>Mục tiêu mỗi ngày</b><span>Số lượt ôn tập</span></div>
      <input class="input" type="number" id="sGoal" min="5" max="500" value="${s.dailyGoal}"></div>
    <div class="set-row"><div class="t"><b>Số từ mới mỗi phiên</b><span>Khi học “Đến hạn ôn + từ mới”</span></div>
      <input class="input" type="number" id="sNew" min="0" max="100" value="${s.newPerSession}"></div>
  </section>

  <section class="card set-sec">
    <h3>${icon('palette')}Giao diện</h3>
    <div class="set-row"><div class="t"><b>Chế độ màu</b></div>
      <select class="input" id="sTheme"><option value="auto" ${s.theme === 'auto' ? 'selected' : ''}>Theo hệ thống</option><option value="light" ${s.theme === 'light' ? 'selected' : ''}>Sáng</option><option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Tối</option></select></div>
    <div class="set-row"><div class="t"><b>Cài lên thiết bị</b><span>Dùng như ứng dụng riêng, mở nhanh từ màn hình chính, chạy cả khi offline.</span></div>
      <button class="btn" id="installBtn">${icon('phone', 'sm')}Cài ứng dụng</button></div>
  </section>

  <section class="card set-sec">
    <h3>${icon('db')}Dữ liệu</h3>
    <div class="set-row"><div class="t"><b>Xuất dữ liệu</b><span>Tạo thêm một bản sao (JSON đầy đủ, hoặc CSV mở bằng Excel/Google Sheets)</span></div>
      <button class="btn sm" data-act="export-json">${icon('download', 'sm')}JSON</button><button class="btn sm" data-act="export-csv">${icon('download', 'sm')}CSV</button></div>
    <div class="set-row"><div class="t"><b>Nhập dữ liệu</b><span>Từ file JSON của VocabNote hoặc CSV (cột: word, ipa, pos, meaning, notes, synonyms, antonyms, examples, tags)</span></div>
      <button class="btn sm" data-act="import">${icon('upload', 'sm')}Chọn file</button><input type="file" id="importFile" accept=".json,.csv,text/csv,application/json" hidden></div>
    <div class="set-row"><div class="t"><b>Đặt lại tiến độ học</b><span>Giữ từ vựng, xoá số lần học & lịch ôn</span></div>
      <button class="btn sm danger" data-act="reset-progress">Đặt lại</button></div>
    <div class="set-row"><div class="t"><b>Xoá toàn bộ từ vựng</b><span>${Sync.connected() ? 'Cũng sẽ xoá trên Google Drive khi đồng bộ.' : 'Không thể hoàn tác.'}</span></div>
      <button class="btn sm danger" data-act="wipe">${icon('trash', 'sm')}Xoá hết</button></div>
  </section>
  <p class="small muted" style="text-align:center">VocabNote v${APP_VERSION} · Dữ liệu của bạn chỉ lưu trên thiết bị và Google Drive của chính bạn.</p>`;

  fillVoiceSelect();
  const bind = (id, key, conv = v => v, after) => $(id).addEventListener('change', e => {
    s[key] = conv(e.target.type === 'checkbox' ? e.target.checked : e.target.value); Store.saveSettings(); after?.();
  });
  bind('#sAuto', 'autoSync', v => v, () => s.autoSync && Sync.schedule(300));
  bind('#sFile', 'driveFile', v => v.trim() || 'VocabNote-data.json', () => { renderSyncUI(); if (Sync.connected()) Sync.run(true); });
  bind('#sCid', 'clientId', v => v.trim(), () => { const b = $('#driveStatus'); if (b) b.innerHTML = driveStatusHTML(); });
  bind('#sAccent', 'accent', v => v, () => { s.voiceURI = ''; Store.saveSettings(); fillVoiceSelect(); TTS.speak('Hello, welcome to VocabNote.'); });
  bind('#sVoice', 'voiceURI', v => v, () => TTS.speak('Hello, this is my voice.'));
  bind('#sAutoSpeak', 'autoSpeak');
  bind('#sGoal', 'dailyGoal', v => Math.max(1, +v || 20));
  bind('#sNew', 'newPerSession', v => Math.max(0, +v || 0));
  bind('#sTheme', 'theme', v => v, applyTheme);
  $('#sRate').addEventListener('input', e => { s.rate = +e.target.value; $('#rateVal').textContent = s.rate + '×'; Store.saveSettings(); });
  $('#importFile').addEventListener('change', e => { const f = e.target.files[0]; if (f) importFile(f); e.target.value = ''; });
  $('#installBtn').addEventListener('click', doInstall);
}
function fillVoiceSelect() {
  const sel = $('#sVoice'); if (!sel) return;
  const s = Store.settings;
  const vs = TTS.voices.filter(v => v.lang.replace('_', '-').toLowerCase().startsWith(s.accent.toLowerCase()));
  const list = vs.length ? vs : TTS.voices;
  sel.innerHTML = `<option value="">Tự động (khuyên dùng)</option>` + list.map(v => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === s.voiceURI ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('');
  const info = $('#voiceInfo');
  if (info) info.textContent = !TTS.supported ? 'Trình duyệt không hỗ trợ đọc' : TTS.voices.length ? `${list.length} giọng phù hợp trên thiết bị này` : 'Đang tải danh sách giọng…';
}
function applyTheme() {
  const t = Store.settings.theme;
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name="theme-color"]').content = dark ? '#0b1020' : '#4f46e5';
  if (current === 'write') { drawBg(); redrawInk(); }
}
async function doInstall() {
  if (installPrompt) { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; updateInstallUI(); return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  alert(ios
    ? 'Trên iPhone/iPad: mở trang bằng Safari → bấm nút Chia sẻ (ô vuông có mũi tên) → chọn “Thêm vào MH chính”.'
    : 'Trên Android (Chrome): bấm menu ⋮ → “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.\nTrên máy tính (Chrome/Edge): bấm biểu tượng cài đặt ở thanh địa chỉ.');
}
function updateInstallUI() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  $('#installBtnSide').classList.toggle('hidden', !installPrompt || standalone);
}

/* ---------- Xuất / nhập ---------- */
async function download(name, text, type) {
  if (isNative()) {
    try {
      await nativePlugin('Filesystem').writeFile({ path: FOLDER + '/' + name, data: text, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true });
      toast(`Đã lưu ${FOLDER}/${name}`, 'success');
    } catch (e) { toast('Không lưu được: ' + e.message, 'error'); }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function exportJSON() {
  download(isNative() || LocalFile.active() ? `vocab-data-backup-${dayKey()}.json` : FNAME, fileText(), 'application/json');
  localStorage.setItem('vn.lastExport', String(Date.now()));
  renderFileUI();
}
function exportCSV() {
  const cols = ['word', 'ipa', 'pos', 'meaning', 'notes', 'synonyms', 'antonyms', 'examples', 'tags', 'status', 'reviews', 'accuracy', 'created'];
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = Store.words.map(w => [w.word, w.ipa, w.pos, w.meaning, w.notes, w.synonyms, w.antonyms, w.examples.map(e => e.vi ? `${e.en} :: ${e.vi}` : e.en).join(' | '), w.tags,
    STATUS_LABEL[status(w)], w.stats.reviews, accuracy(w) ?? '', fmtDate(w.createdAt)].map(q).join(','));
  download(`vocabnote-${dayKey()}.csv`, '﻿' + [cols.join(','), ...rows].join('\r\n'), 'text/csv;charset=utf-8');
}
function parseCSV(text) {
  const rows = []; let row = [], f = '', inQ = false;
  text = text.replace(/^﻿/, '');
  const delim = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else inQ = false; } else f += c; }
    else if (c === '"') inQ = true;
    else if (c === delim) { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
async function importFile(file) {
  const text = await file.text();
  let incoming = [];
  try {
    if (/\.json$/i.test(file.name) || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      const j = JSON.parse(text.replace(/^\ufeff/, ''));
      const mode = Store.words.length ? await askMergeMode(text) : 'replace';
      if (!mode) return;
      const n = adoptFile(j, mode);
      LocalFile.markDirty('*'); Store.save();
      toast(`Đã nhập dữ liệu từ ${file.name} (${n} thay đổi)`, 'success');
      refreshCurrent();
      return;
    } else {
      const rows = parseCSV(text);
      const head = rows.shift().map(h => h.trim().toLowerCase());
      const idx = n => head.findIndex(h => h === n || (n === 'word' && (h === 'từ' || h === 'tu')) || (n === 'meaning' && (h === 'nghĩa' || h === 'nghia')));
      const I = Object.fromEntries(['word', 'ipa', 'pos', 'meaning', 'notes', 'synonyms', 'antonyms', 'examples', 'tags'].map(k => [k, idx(k)]));
      if (I.word < 0) { I.word = 0; if (I.meaning < 0) I.meaning = 1; rows.unshift(head); }
      incoming = rows.map(r => {
        const g = k => I[k] >= 0 ? (r[I[k]] || '').trim() : '';
        const w = blankWord();
        Object.assign(w, { word: g('word'), ipa: g('ipa'), pos: g('pos'), meaning: g('meaning'), notes: g('notes'), synonyms: g('synonyms'), antonyms: g('antonyms'), tags: g('tags'),
          examples: g('examples').split('|').map(x => x.trim()).filter(Boolean).map(x => { const [en, vi = ''] = x.split('::'); return { en: en.trim(), vi: vi.trim() }; }) });
        return w;
      }).filter(w => w.word);
    }
  } catch (e) { toast('File không hợp lệ: ' + e.message, 'error'); return; }
  if (!incoming.length) { toast('Không tìm thấy từ vựng nào trong file', 'error'); return; }
  let added = 0, skipped = 0;
  for (const w of incoming) {
    if (Store.byId(w.id)) { const cur = Store.byId(w.id); if (w.updatedAt > cur.updatedAt) Object.assign(cur, w); else skipped++; continue; }
    if (Store.findByText(w.word)) { skipped++; continue; }
    delete Store.data.deleted[w.id];
    Store.data.words.push(w); added++;
  }
  Store.data.words.sort((a, b) => b.createdAt - a.createdAt);
  Store.save();
  toast(`Đã nhập ${added} từ${skipped ? `, bỏ qua ${skipped} từ trùng` : ''}`, 'success');
}

/* =========================================================
   SỰ KIỆN TOÀN CỤC
   ========================================================= */
document.addEventListener('click', e => {
  const t = e.target;
  const sp = t.closest('[data-speak]');
  if (sp) { e.stopPropagation(); TTS.speak(sp.dataset.speak, sp.dataset.rate ? +sp.dataset.rate : undefined); return; }
  const star = t.closest('[data-star]');
  if (star) {
    e.stopPropagation();
    const w = Store.byId(star.dataset.star); if (!w) return;
    w.starred = !w.starred; Store.upsert(w);
    $$(`[data-star="${w.id}"]`).forEach(b => b.classList.toggle('on', w.starred));
    if (current === 'list' && ListState.filter === 'starred') renderListItems();
    return;
  }
  const nav = t.closest('[data-nav]');
  if (nav) { if (nav.dataset.nav === 'study' && Study.active && current === 'study') { /* giữ phiên */ } go(nav.dataset.nav); return; }
  if (t.closest('[data-close]')) { t.closest('dialog')?.close(); return; }
  const open = t.closest('[data-open]');
  if (open) { openDetail(open.dataset.open); return; }
  const filter = t.closest('[data-filter]');
  if (filter) { ListState.filter = filter.dataset.filter; ListState.limit = 60; renderListItems(); return; }
  const mode = t.closest('[data-mode]');
  if (mode) { startSession(mode.dataset.mode); return; }
  const rq = t.closest('[data-rate-q]');
  if (rq) { rateCard(+rq.dataset.rateQ); return; }
  const opt = t.closest('[data-opt]');
  if (opt) { answerQuiz(opt.dataset.opt); return; }
  const wa = t.closest('[data-w]');
  if (wa) { writeAction(wa.dataset.w); return; }
  const col = t.closest('[data-color]');
  if (col) { Write.color = col.dataset.color; Write.eraser = false; renderWrite(); return; }
  const sz = t.closest('[data-size]');
  if (sz) { Write.size = +sz.dataset.size; renderWrite(); return; }
  if (t.closest('#flashCard') && !Study.revealed && !t.closest('button')) { revealCard(); return; }

  const act = t.closest('[data-act]')?.dataset.act;
  if (!act) return;
  switch (act) {
    case 'add': openEditor(null); break;
    case 'add-q': openEditor(null, ListState.q.trim()); break;
    case 'sample': addSampleWords(); break;
    case 'more': ListState.limit += 100; renderListItems(); break;
    case 'study-due': Store.settings.studySource = 'due'; Store.saveSettings(); startSession('flash'); break;
    case 'study-hard': startSession('flash', buildQueue('hard', 20)); break;
    case 'reveal': revealCard(); break;
    case 'next': nextCard(); break;
    case 'hint': Study.hint = true; Study.typed = $('#typeIn')?.value || ''; renderSession(); break;
    case 'skip': checkTyped(Store.byId(Study.ids[Study.idx]), true); break;
    case 'end-session': Study.active = false; renderStudy(); break;
    case 'retry-wrong': startSession(Study.mode, shuffle(Study.wrongIds)); break;
    case 'again': { const m = Study.mode; Study.active = false; startSession(m); break; }
    case 'write-all': Write.ids = null; Write.source = 'all'; renderWrite(); break;
    case 'drive-connect': Sync.run(true).then(() => current === 'settings' && renderSettings()); break;
    case 'drive-sync': Sync.run(true); break;
    case 'drive-wipe-local':
      if (confirm('Đăng xuất Google và XOÁ toàn bộ dữ liệu VocabNote trong trình duyệt của máy này?\nDữ liệu trên Google Drive vẫn còn nguyên.')) {
        clearTimeout(Sync.timer); Drive.disconnect();
        Object.keys(localStorage).filter(k => k.startsWith('vn.')).forEach(k => localStorage.removeItem(k));
        IDB.del('fileHandle').catch(() => {}).finally(() => { location.hash = ''; location.reload(); });
      }
      break;
    case 'file-save': LocalFile.save(true).then(() => LocalFile.state === 'ok' && toast('Đã lưu file dữ liệu', 'success')); break;
    case 'file-reload': LocalFile.blocked = false; LocalFile.safeLoad('sync').then(n => toast(n ? `Đã cập nhật ${n} thay đổi từ file` : 'Dữ liệu đã khớp với file')); break;
    case 'file-folder': LocalFile.pickFolder(); break;
    case 'file-open': LocalFile.pickFile(); break;
    case 'file-grant': LocalFile.regrant(); break;
    case 'file-forget': if (confirm('Ngừng lưu vào file này? (File vẫn còn trên máy, dữ liệu trong ứng dụng không bị xoá)')) { LocalFile.forget(); renderSettings(); } break;
    case 'drive-disconnect':
      if (confirm('Ngắt kết nối Google Drive? Dữ liệu vẫn được giữ trên máy này và trên Drive.')) { Drive.disconnect(); Sync.setState('off'); renderSettings(); }
      break;
    case 'export-json': exportJSON(); break;
    case 'export-csv': exportCSV(); break;
    case 'import': $('#importFile').click(); break;
    case 'reset-progress':
      if (confirm('Đặt lại toàn bộ tiến độ học (số lần học, lịch ôn, trạng thái đã thuộc)?')) {
        const b = blankWord();
        Store.words.forEach(w => { w.srs = { ...b.srs }; w.stats = { ...b.stats }; w.learned = false; w.updatedAt = Date.now(); });
        Store.data.log = {}; Store.save(); toast('Đã đặt lại tiến độ');
      }
      break;
    case 'wipe':
      if (confirm('Xoá TOÀN BỘ từ vựng? Hành động này không thể hoàn tác.') && confirm('Bạn chắc chắn chứ?')) {
        const now = Date.now(); Store.words.forEach(w => { Store.data.deleted[w.id] = now; });
        Store.data.words = []; Store.save(); toast('Đã xoá toàn bộ'); go('list');
      }
      break;
  }
});

// Đóng dialog khi bấm ra ngoài (nền mờ)
$$('dialog').forEach(d => d.addEventListener('click', e => {
  if (e.target !== d) return;
  const r = d.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
}));
$('#detail').addEventListener('close', () => { if (TTS.supported) speechSynthesis.cancel(); });

$('#addBtn').addEventListener('click', () => openEditor(null));
$('#fab').addEventListener('click', () => openEditor(null));
$('#syncPill').addEventListener('click', () => { if (!Sync.connected()) go('settings'); else Sync.run(true); });
$('#installBtnSide').addEventListener('click', doInstall);
$('#filePill').addEventListener('click', () => {
  const F = LocalFile;
  if (F.state === 'permission') F.regrant();
  else if (F.state === 'ok') F.save(true).then(() => toast('Đã lưu file dữ liệu', 'success'));
  else go('settings');
});

document.addEventListener('keydown', e => {
  if (document.querySelector('dialog[open]')) return;
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  if (current === 'study' && Study.active && !Study.finished) {
    if (Study.mode === 'flash' && !typing) {
      if ((e.key === ' ' || e.key === 'Enter') && !Study.revealed) { e.preventDefault(); revealCard(); }
      else if (Study.revealed && ['1', '2', '3', '4'].includes(e.key)) rateCard(+e.key - 1);
    } else if (Study.mode === 'quiz' && !typing) {
      if (!Study.answered && ['1', '2', '3', '4'].includes(e.key)) { const id = Study.opts?.[+e.key - 1]; if (id) answerQuiz(id); }
      else if (Study.answered && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); nextCard(); }
    }
    return;
  }
  if (!typing && current === 'list' && (e.key === '/' )) { e.preventDefault(); $('#q')?.focus(); }
  if (!typing && (e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openEditor(null); }
});

let resizeT;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (current === 'write') Write.resize?.(); }, 120); });
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

window.addEventListener('focus', () => LocalFile.check());
setInterval(() => { if (document.visibilityState === 'visible') LocalFile.check(); }, 10e3);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') LocalFile.check();
  if (document.visibilityState === 'hidden' && LocalFile.timer) LocalFile.save();
  if (document.visibilityState === 'visible' && Sync.connected() && Drive.hasToken() && Date.now() - Sync.lastSync > 30e3) Sync.run(false);
  if (document.visibilityState === 'hidden' && Sync.state === 'pending') Sync.run(false);
});
setInterval(() => { if (document.visibilityState === 'visible' && Sync.connected() && Drive.hasToken() && !Sync.busy) Sync.run(false); else renderSyncUI(); }, 5 * 60e3);

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; updateInstallUI(); });
window.addEventListener('appinstalled', () => { installPrompt = null; updateInstallUI(); toast('Đã cài VocabNote!', 'success'); });

/* =========================================================
   KHỞI ĐỘNG
   ========================================================= */
(function init() {
  Store.load();
  applyTheme();
  buildNav();
  TTS.init();
  Drive.restore();
  window.addEventListener('hashchange', route);
  route();
  updateBadges();
  if (Sync.connected()) Sync.state = Drive.hasToken() || isNative() ? 'idle' : 'auth';
  renderSyncUI();
  renderFileUI();
  LocalFile.init().finally(() => {
    if (Sync.connected() && Store.settings.autoSync && (Drive.hasToken() || isNative())) Sync.run(false);
  });
  if (isNative()) document.documentElement.classList.add('native');
  if (!isNative() && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW', err));
  }
})();
