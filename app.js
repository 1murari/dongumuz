'use strict';
(() => {
  const C = window.CONTENT;
  const KEY = 'dongumuz.v1';

  // ---------------------------------------------------------------- tarih yardımcıları
  const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const WD = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const WD_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const pad = n => String(n).padStart(2, '0');
  const dnum = s => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
  const fromNum = n => { const d = new Date(n * 864e5); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
  const addDays = (s, n) => fromNum(dnum(s) + n);
  const diff = (a, b) => dnum(b) - dnum(a);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const weekday = s => new Date(dnum(s) * 864e5).getUTCDay();
  const fmt = s => { const n = s.split('-').map(Number); return `${n[2]} ${MONTHS[n[1] - 1]}`; };
  const fmtS = s => { const n = s.split('-').map(Number); return `${n[2]} ${MONTHS[n[1] - 1].slice(0, 3)}`; };
  const fmtW = s => `${fmt(s)} ${WD[weekday(s)]}`;
  const rel = (s, T) => { const n = diff(T, s); return n === 0 ? 'bugün' : n === 1 ? 'yarın' : n === -1 ? 'dün' : n > 0 ? `${n} gün sonra` : `${-n} gün önce`; };
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const median = a => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ago = ts => { const s = (Date.now() - ts) / 1000; return s < 60 ? 'az önce' : s < 3600 ? `${Math.floor(s / 60)} dk önce` : s < 86400 ? `${Math.floor(s / 3600)} saat önce` : `${Math.floor(s / 86400)} gün önce`; };

  // Türkçe ek: ek('Murat','e') -> Murat’a, ek('Merve','in') -> Merve’nin
  function ek(name, kind) {
    const n = String(name || '').trim(), low = n.toLocaleLowerCase('tr');
    const V = 'aeıioöuü'; let last = 'e';
    for (const ch of low) if (V.includes(ch)) last = ch;
    const endV = V.includes(low.slice(-1)), back = 'aıou'.includes(last), round = 'ouöü'.includes(last);
    const hard = 'fstkçşhp'.includes(low.slice(-1));
    const i4 = back ? (round ? 'u' : 'ı') : (round ? 'ü' : 'i'), a2 = back ? 'a' : 'e';
    const s = { i: (endV ? 'y' : '') + i4, e: (endV ? 'y' : '') + a2, den: (hard ? 't' : 'd') + a2 + 'n', in: (endV ? 'n' : '') + i4 + 'n' }[kind];
    return `${esc(n)}’${s}`;
  }

  // ---------------------------------------------------------------- durum
  const DEFAULTS = () => ({
    role: null,
    set: { her: 'Merve', him: 'Murat', herPhone: '', himPhone: '', cycle: 28, period: 5, luteal: 14, attach: true, link: true, wa: 'app' },
    periods: [],   // [{s, e}] e: '' -> bitiş girilmedi
    days: {},      // 'YYYY-MM-DD' -> günlük kayıt
    custom: [],    // [{id, t}] kendi eklediği belirtiler
    reqs: [],      // gönderilen istekler
    partner: null, // Murat tarafı: Merve'den gelen veri
  });
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY));
      if (o) { const d = DEFAULTS(); return { ...d, ...o, set: { ...d.set, ...o.set } }; }
    } catch (e) { /* bozuk veri: sıfırdan başla */ }
    return DEFAULTS();
  }
  let S = load();
  const U = { tab: 'home', prevTab: 'home', logDate: null, cal: null, req: { items: [], when: '', note: '' }, sheet: null, ob: 'role', obv: {}, shv: {} };

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Kaydedilemedi!'); }
    refreshSync();
  }
  let saveTimer;
  const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); };

  // ---------------------------------------------------------------- döngü motoru
  function engineOf(periods, st, logs) {
    const ps = (periods || []).filter(p => p && p.s).slice().sort((a, b) => (a.s < b.s ? -1 : 1));
    const all = [];
    for (let i = 0; i < ps.length - 1; i++) all.push(diff(ps[i].s, ps[i + 1].s));
    const lens = all.filter(L => L >= 18 && L <= 45); // 45+ genelde unutulmuş kayıt
    const r = lens.slice(-6);
    const avg = r.length >= 3 ? Math.round(mean(r)) : Math.round((r.reduce((a, b) => a + b, 0) + st.cycle * (3 - r.length)) / 3);
    const pl = ps.filter(p => p.e).map(p => diff(p.s, p.e) + 1).filter(x => x >= 1 && x <= 14).slice(-6);
    const pLen = pl.length ? Math.round(mean(pl)) : st.period;
    const l12 = lens.slice(-12);
    const hist = l12.length >= 3 ? l12 : [];
    return {
      ps, lens, avg, pLen, logs: logs || {}, luteal: st.luteal || 14, ovCache: {},
      minC: Math.min(avg - 2, ...hist), maxC: Math.max(avg + 2, ...hist),
      irregular: hist.length >= 3 && Math.max(...hist) - Math.min(...hist) > 7,
    };
  }

  // Tarihin ait olduğu döngü (geçmiş, şu anki ya da tahmini)
  function cycleOf(E, date, T) {
    const ps = E.ps;
    if (!ps.length || date < ps[0].s) return null;
    let i = ps.length - 1;
    while (i > 0 && ps[i].s > date) i--;
    const p = ps[i];
    if (i < ps.length - 1) return { start: p.s, len: diff(p.s, ps[i + 1].s), p, known: true };
    const exp = addDays(p.s, E.avg);
    if (date < exp) return { start: p.s, len: E.avg, p, current: true };
    if (T > exp) {
      if (date <= T) return { start: p.s, len: E.avg, p, current: true, late: true };
      const base = addDays(T, 1), k = Math.floor(diff(base, date) / E.avg);
      return { start: addDays(base, k * E.avg), len: E.avg, predicted: true };
    }
    const k = Math.floor(diff(exp, date) / E.avg);
    return { start: addDays(exp, k * E.avg), len: E.avg, predicted: true };
  }

  // Yumurtlama günü (döngü günü). Pozitif ovülasyon testi varsa ona göre.
  function ovuDay(E, c) {
    if (E.ovCache[c.start] != null) return E.ovCache[c.start];
    let O = c.len - E.luteal;
    if (!c.predicted) {
      const end = c.known ? addDays(c.start, c.len) : addDays(c.start, 60);
      let best = 0;
      for (const [d, L] of Object.entries(E.logs)) {
        if (L.ov === 'pos' && d >= c.start && d < end) { const cd = diff(c.start, d) + 1; if (!best || cd < best) best = cd; }
      }
      if (best) O = best + 1; // LH yükselişinden ~1 gün sonra yumurtlama
    }
    return (E.ovCache[c.start] = Math.max(O, 6));
  }

  function dayInfo(E, date, T) {
    const c = cycleOf(E, date, T);
    if (!c) return null;
    const cd = diff(c.start, date) + 1, len = c.len, O = ovuDay(E, c);
    let period = false, pPred = false;
    if (c.predicted) { if (cd <= E.pLen) period = pPred = true; }
    else {
      const end = c.p.e || addDays(c.p.s, E.pLen - 1);
      if (date <= end) { period = true; pPred = !c.p.e && date > T; }
    }
    const late = !!c.late && cd > len + 1; // len+1 = beklenen gün

    const fertile = cd >= O - 5 && cd <= O + 1;
    let risk;
    if (late) risk = 1;
    else if (cd >= O - 2 && cd <= O) risk = 3;
    else if (fertile) risk = 2;
    else if (c.known ? cd >= O - 7 && cd <= O + 2 : cd >= Math.max(1, E.minC - 18) && cd <= E.maxC - 11) risk = 1; // Ogino-Knaus tamponu
    else risk = 0;
    const L = E.logs[date];
    if (L && L.mucus === 'yumurta' && risk < 2) risk = 2;
    if (L && L.ov === 'pos') risk = 3;
    let phase;
    if (late) phase = 'gecikme';
    else if (period) phase = 'regl';
    else if (cd >= O - 2 && cd <= O + 1) phase = 'yumurtlama';
    else if (cd < O - 2) phase = 'folikuler';
    else if (cd > len - 5) phase = 'pms';
    else phase = 'luteal';
    return { date, cd, len, O, phase, risk, period, pPred, fertile, ovu: cd === O, late, lateDays: late ? cd - len - 1 : 0, start: c.start, predicted: !!c.predicted, known: !!c.known };
  }

  function statusOf(E, T) {
    const ti = dayInfo(E, T, T);
    if (!ti) return null;
    const next = ti.late ? null : addDays(ti.start, ti.len);
    let cs = ti.start, O = ti.O;
    if (ti.cd > O + 1 || ti.late) { const ni = dayInfo(E, next || addDays(T, 1), T); cs = ni.start; O = ni.O; }
    return {
      ...ti, next, toNext: next ? diff(T, next) : null,
      fertStart: addDays(cs, O - 6), fertEnd: addDays(cs, O), ovuDate: addDays(cs, O - 1),
      pmsStart: ti.late ? null : addDays(ti.start, ti.len - 5),
    };
  }

  const mE = () => engineOf(S.periods, S.set, S.days);
  const pE = () => S.partner ? engineOf(S.partner.periods, { cycle: S.partner.cycle || 28, period: S.partner.period || 5, luteal: S.partner.luteal || 14 }, S.partner.days) : null;
  const curE = () => (S.role === 'merve' ? mE() : pE());
  const curLogs = () => (S.role === 'merve' ? S.days : (S.partner && S.partner.days) || {});

  function phaseLine(st) {
    if (st.late) return `Regl ${st.lateDays} gün gecikti`;
    if (st.phase === 'regl') return `Regl · ${st.cd}. gün`;
    const ph = C.PHASES[st.phase];
    return `${ph.name} · döngünün ${st.cd}. günü · regl ~${st.toNext === 0 ? 'bugün' : st.toNext + ' gün sonra'}`;
  }
  const pick = (arr, n, seed) => { const out = []; for (let i = 0; i < Math.min(n, arr.length); i++) out.push(arr[(seed + i) % arr.length]); return out; };

  // ---------------------------------------------------------------- regl işlemleri (Merve)
  const sortPeriods = () => S.periods.sort((a, b) => (a.s < b.s ? -1 : 1));
  function periodIndexAt(date) {
    const pLen = mE().pLen;
    return S.periods.findIndex(p => date >= p.s && date <= (p.e || addDays(p.s, pLen - 1)));
  }
  function ongoingPeriod() {
    const T = today();
    const p = S.periods[S.periods.length - 1];
    return p && !p.e && p.s <= T && diff(p.s, T) <= 10 ? p : null;
  }
  function dayLog(d) { return S.days[d] || (S.days[d] = {}); }
  function cleanDay(d) {
    const L = S.days[d];
    if (!L) return;
    for (const k of Object.keys(L)) {
      const v = L[k];
      if (v === '' || v == null || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)) delete L[k];
    }
    if (!Object.keys(L).length) delete S.days[d];
  }

  function startPeriod(date) {
    const T = today();
    if (!date || date > T) { toast('İleri bir tarih seçilemez'); return false; }
    if (periodIndexAt(date) >= 0) { toast('Bu gün zaten regl olarak kayıtlı'); return false; }
    const E = mE();
    const near = S.periods.find(p => p.s > date && diff(date, p.s) <= 7);
    if (near) near.s = date; // başlangıcı öne çekiyor
    else {
      const prev = [...S.periods].reverse().find(p => p.s < date);
      if (prev && diff(prev.s, date) < 15 &&
        !confirm(`Önceki regl başlangıcından sadece ${diff(prev.s, date)} gün sonra. Lekelenme olabilir. Yine de yeni regl olarak kaydedilsin mi?`)) return false;
      if (prev && !prev.e) prev.e = addDays(prev.s, Math.min(E.pLen, diff(prev.s, date)) - 1);
      S.periods.push({ s: date, e: diff(date, T) > 10 ? addDays(date, E.pLen - 1) : '' });
    }
    sortPeriods();
    const L = dayLog(date);
    if (!L.flow) L.flow = 'm';
    save();
    return true;
  }
  function endPeriod(date) {
    let i = -1;
    S.periods.forEach((p, k) => { if (p.s <= date) i = k; });
    if (i < 0 || diff(S.periods[i].s, date) > 14) { toast('Bu tarihte devam eden regl yok'); return false; }
    S.periods[i].e = date;
    save();
    return true;
  }
  function removeDay(date) {
    const i = periodIndexAt(date);
    if (i < 0) return;
    const p = S.periods[i], end = p.e || addDays(p.s, mE().pLen - 1);
    if (p.s === end) S.periods.splice(i, 1);
    else if (date === p.s) p.s = addDays(date, 1);
    else p.e = addDays(date, -1);
    save();
  }
  function extendable(date) {
    const pLen = mE().pLen;
    return S.periods.find(p => { const end = p.e || addDays(p.s, pLen - 1); return date > end && diff(end, date) <= 3; });
  }

  // ---------------------------------------------------------------- eşitleme (Merve -> Murat, WhatsApp linkiyle)
  const b64u = bytes => { let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
  async function pipe(bytes, Stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new Stream('deflate'))).arrayBuffer()); }

  function syncPayload() {
    const T = today(), d = {};
    const put = (k, L, all) => {
      const o = d[k] || {};
      if (all) {
        if (L.flow) o.f = L.flow;
        if (L.pains && Object.keys(L.pains).length) o.p = L.pains;
        if (L.sym && L.sym.length) o.s = L.sym;
        if (L.mood && L.mood.length) o.m = L.mood;
      }
      if (L.sex) o.x = L.sex;
      if (L.ov) o.o = L.ov;
      if (Object.keys(o).length) d[k] = o;
    };
    for (const [k, L] of Object.entries(S.days)) {
      const age = diff(k, T);
      if (age >= 0 && age < 7) put(k, L, true);
      else if (age >= 0 && age <= 45) put(k, L, false); // gebelik riski hesabı için
    }
    const cs = {};
    S.custom.forEach(c => { cs[c.id] = c.t; });
    return { v: 1, n: S.set.her, h: S.set.him, ph: S.set.herPhone, p: S.periods.slice(-10).map(p => [p.s, p.e || '']), c: S.set.cycle, l: S.set.period, u: S.set.luteal, d, cs, t: Date.now() };
  }
  let syncCode = '', syncTimer;
  function refreshSync() {
    syncCode = '';
    if (S.role !== 'merve') return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      const bytes = new TextEncoder().encode(JSON.stringify(syncPayload()));
      try { syncCode = 'z' + b64u(await pipe(bytes, CompressionStream)); } catch (e) { syncCode = 'j' + b64u(bytes); }
    }, 250);
  }
  const appUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');
  function syncLink() {
    const code = syncCode || 'j' + b64u(new TextEncoder().encode(JSON.stringify(syncPayload())));
    return `${appUrl()}#s=${code}`;
  }
  async function decodeSync(code) {
    let bytes = unb64u(code.slice(1));
    if (code[0] === 'z') bytes = await pipe(bytes, DecompressionStream);
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  async function importCode(code) {
    let o;
    try { o = await decodeSync(code); } catch (e) { o = null; }
    if (!o || o.v !== 1 || !Array.isArray(o.p)) { toast('Güncelleme okunamadı'); return false; }
    if (S.role === 'merve') { toast(`Bu link ${ek(S.set.him, 'in')} telefonu için`); return false; }
    if (S.partner && S.partner.t > o.t) { toast('Bu güncelleme eski; daha yenisi zaten var'); return false; }
    const days = {};
    for (const [k, v] of Object.entries(o.d || {})) {
      days[k] = { flow: v.f || '', pains: v.p || {}, sym: v.s || [], mood: v.m || [], sex: v.x || '', ov: v.o || '' };
    }
    S.partner = { periods: o.p.map(([s, e]) => ({ s, e })), cycle: o.c, period: o.l, luteal: o.u, days, cs: o.cs || {}, t: o.t };
    if (o.n) S.set.her = o.n;
    if (o.h) S.set.him = o.h;
    if (o.ph && !S.set.herPhone) S.set.herPhone = o.ph;
    S.role = 'murat';
    save();
    U.tab = 'home';
    render();
    toast(`${ek(S.set.her, 'den')} güncelleme alındı ✓`);
    return true;
  }

  // ---------------------------------------------------------------- WhatsApp
  function phoneNorm(p) {
    let d = String(p || '').replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (d.startsWith('0')) d = '90' + d.slice(1);
    if (d.length === 10 && d[0] === '5') d = '90' + d;
    return d;
  }
  const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function sendWA(phone, text) {
    const n = phoneNorm(phone), t = encodeURIComponent(text);
    if (!n) toast('Numara kayıtlı değil, kişiyi WhatsApp’ta seçeceksin');
    if (S.set.wa === 'app' && isIOS()) { location.href = `whatsapp://send?${n ? `phone=${n}&` : ''}text=${t}`; return; }
    const url = `https://wa.me/${n}?text=${t}`;
    if (!window.open(url, '_blank')) location.href = url;
  }
  const reqItem = id => { for (const g of C.REQUEST_GROUPS) { const it = g.items.find(x => x.id === id); if (it) return it; } return null; };
  function todayText(d) {
    const L = S.days[d];
    if (!L) return '';
    const parts = [];
    for (const [id, lv] of Object.entries(L.pains || {})) { const p = C.PAINS.find(x => x.id === id); if (p) parts.push(`${p.t} (${C.PAIN_LEVELS[lv]})`); }
    (L.sym || []).forEach(id => { const s = C.SYMPTOMS.find(x => x.id === id) || S.custom.find(x => x.id === id); if (s) parts.push(s.t); });
    const moods = (L.mood || []).map(id => (C.MOODS.find(x => x.id === id) || {}).t).filter(Boolean);
    if (moods.length) parts.push('Ruh hali: ' + moods.join(', '));
    return parts.join(', ');
  }
  function requestText(items, when, note, forPreview) {
    const T = today(), st = statusOf(mE(), T);
    const lines = [`${S.set.him} 💛`];
    if (when) lines.push(C.WHEN.find(w => w.id === when).t);
    items.forEach(id => { const it = reqItem(id); if (it) lines.push(`• ${it.e} ${it.m}`); });
    if (note) lines.push(`📝 ${note}`);
    const extra = [];
    if (S.set.attach) { const tt = todayText(T); if (tt) extra.push(`🩺 Bugün: ${tt}`); }
    if (st) extra.push(`📅 ${phaseLine(st)}`);
    if (extra.length) lines.push('', ...extra);
    if (S.set.link) lines.push('', `🔄 ${forPreview ? '[uygulama güncelleme linki]' : syncLink()}`);
    return lines.join('\n');
  }
  function logRequest(items, when, note) {
    S.reqs.unshift({ t: Date.now(), items, when, note });
    S.reqs = S.reqs.slice(0, 20);
    save();
  }

  // ---------------------------------------------------------------- simgeler
  const ICON = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    plus: '<circle cx="12" cy="12" r="9.5"/><path d="M12 8v8M8 12h8"/>',
    heart: '<path d="M12 20s-7.5-4.6-9.3-9.2C1.4 7.4 3.6 4 7 4c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8C19.5 15.4 12 20 12 20z"/>',
    chart: '<path d="M5 20v-8M11 20V5M17 20v-5M3 20h18"/>',
    book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v16H5.5A1.5 1.5 0 0 0 4 20.5zM4 20.5A1.5 1.5 0 0 0 5.5 22H20"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    left: '<path d="M15 6l-6 6 6 6"/>',
    right: '<path d="M9 6l6 6-6 6"/>',
  };
  const svg = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;

  // ---------------------------------------------------------------- ortak parçalar
  function top(title, sub, right) {
    const btn = right != null ? right : `<button class="icon-btn" data-a="tab" data-v="settings" aria-label="Ayarlar">${svg('sliders')}</button>`;
    return `<header class="top"><div class="grow">${sub ? `<div class="sub">${sub}</div>` : ''}<h1>${title}</h1></div>${btn}</header>`;
  }
  const backBtn = () => `<button class="icon-btn" data-a="back" aria-label="Geri">${svg('back')}</button>`;
  function tabbar() {
    const tabs = S.role === 'merve'
      ? [['home', 'Bugün', 'home'], ['cal', 'Takvim', 'cal'], ['log', 'Kaydet', 'plus'], ['ask', 'İstek', 'heart'], ['stats', 'Analiz', 'chart']]
      : [['home', 'Bugün', 'home'], ['cal', 'Takvim', 'cal'], ['guide', 'Rehber', 'book'], ['settings', 'Ayarlar', 'sliders']];
    return `<div class="tabbar"><nav>${tabs.map(([id, t, ic]) => `<button class="${U.tab === id ? 'on' : ''}${id === 'log' ? ' plus' : ''}" data-a="tab" data-v="${id}">${svg(ic)}<span>${t}</span></button>`).join('')}</nav></div>`;
  }
  const li = arr => arr.map(x => `<li>${esc(x)}</li>`).join('');
  const PC = ph => `var(--c-${ph})`;

  function arc(cx, cy, r, a0, a1) {
    const p = a => { const t = (a - 90) * Math.PI / 180; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; };
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  function ring(st, E) {
    const len = st.len, total = st.late ? st.cd : len, R = 104, W = 16, gap = 2;
    const deg = d => (d / total) * 360;
    let segs = [[1, E.pLen, 'regl'], [E.pLen + 1, st.O - 3, 'folikuler'], [st.O - 2, st.O + 1, 'yumurtlama'], [st.O + 2, len - 5, 'luteal'], [len - 4, len, 'pms'], [len + 1, total, 'gecikme']];
    let prev = 0;
    segs = segs.map(([a, b, ph]) => { a = Math.max(a, prev + 1); b = Math.min(b, total); prev = Math.max(prev, b); return [a, b, ph]; }).filter(([a, b]) => b >= a);
    let out = '';
    for (const [a, b, ph] of segs) {
      const a0 = deg(a - 1) + gap / 2;
      out += `<path d="${arc(120, 120, R, a0, deg(b) - gap / 2)}" stroke="${PC(ph)}" stroke-opacity=".22" stroke-width="${W}" fill="none"/>`;
      if (a <= st.cd) out += `<path d="${arc(120, 120, R, a0, deg(Math.min(b, st.cd)) - gap / 2)}" stroke="${PC(ph)}" stroke-width="${W}" fill="none"/>`;
    }
    const t = ((deg(st.cd - 0.5) - 90) * Math.PI) / 180;
    out += `<circle cx="${(120 + R * Math.cos(t)).toFixed(2)}" cy="${(120 + R * Math.sin(t)).toFixed(2)}" r="11" fill="var(--card)" stroke="var(--ink)" stroke-width="3"/>`;
    return `<svg viewBox="0 0 240 240" aria-hidden="true">${out}</svg>`;
  }

  function heroCard(st, E, who) {
    const ph = C.PHASES[st.phase];
    const T = today();
    let k, big, v;
    if (st.late) { k = 'Regl gecikti'; big = `${st.lateDays} gün`; v = `Beklenen: ${fmtS(addDays(st.start, st.len))}`; }
    else if (st.phase === 'regl') { k = who === 'murat' ? `${esc(S.set.her)} regl` : 'Regl'; big = `${st.cd}. gün`; v = `Sonraki ~${fmtS(st.next)}`; }
    else { k = 'Sonraki regl'; big = st.toNext === 0 ? 'Bugün' : st.toNext === 1 ? 'Yarın' : `${st.toNext} gün`; v = `${fmtS(st.next)} · döngü ${st.cd}. gün`; }
    let actions = '';
    if (who === 'merve') {
      actions = ongoingPeriod()
        ? `<button class="btn primary block" data-a="endPeriod" data-d="${T}">✓ Regl bugün bitti</button><button class="btn ghost" data-a="sheet" data-v="pickEnd">Başka bir gün bitti</button>`
        : `<button class="btn primary block" data-a="startPeriod" data-d="${T}">🩸 Regl bugün başladı</button><button class="btn ghost" data-a="sheet" data-v="pickStart">Başka bir gün başladı</button>`;
      actions = `<div class="stack" style="width:100%;margin-top:14px">${actions}</div>`;
    }
    return `<section class="card hero">
      <div class="ring">${ring(st, E)}<div class="center"><div class="k">${k}</div><div class="big">${big}</div><div class="v muted">${v}</div></div></div>
      <div class="pills"><span class="pill"><i class="dot" style="background:${PC(st.phase)}"></i>${ph.emoji} ${ph.name}</span>
      <span class="pill"><i class="dot" style="background:var(--r${st.risk})"></i>Gebelik riski: ${C.RISK[st.risk].t}</span></div>
      ${actions}</section>`;
  }

  function riskStrip(E, T) {
    let h = '<div class="strip">';
    for (let i = 0; i < 7; i++) {
      const d = addDays(T, i), inf = dayInfo(E, d, T);
      h += `<div><span>${i === 0 ? 'Bugün' : WD_SHORT[(weekday(d) + 6) % 7]}</span><i style="background:var(--r${inf ? inf.risk : 0})"></i></div>`;
    }
    return h + '</div>';
  }
  function riskCard(st, E, T) {
    const r = C.RISK[st.risk];
    return `<section class="card"><h2>🤰 Gebelik riski</h2>
      <span class="pill" style="background:color-mix(in srgb, var(--r${st.risk}) 16%, transparent);color:var(--r${st.risk})">● Bugün: ${r.t}</span>
      <p class="small" style="margin-top:10px">${esc(r.d)}</p>
      <h3>Önümüzdeki 7 gün</h3>${riskStrip(E, T)}
      <div class="legend"><span><i style="background:var(--r0)"></i>Düşük</span><span><i style="background:var(--r1)"></i>Orta</span><span><i style="background:var(--r2)"></i>Yüksek</span><span><i style="background:var(--r3)"></i>Çok yüksek</span></div>
      <div class="sep"></div>
      <div class="list">
        <div class="li"><span class="ic">🌿</span><div class="grow"><div class="t">Doğurgan pencere</div><div class="s">${fmtS(st.fertStart)} – ${fmtS(st.fertEnd)} · ${st.fertStart <= T && T <= st.fertEnd ? 'şu an' : rel(st.fertStart, T)}</div></div></div>
        <div class="li"><span class="ic">🥚</span><div class="grow"><div class="t">Tahmini yumurtlama</div><div class="s">${fmtW(st.ovuDate)} · ${rel(st.ovuDate, T)}</div></div></div>
      </div>
      ${E.irregular ? '<p class="small" style="margin-top:8px">⚠️ Döngülerin düzensiz; tahminler daha az güvenilir.</p>' : ''}
      <p class="tiny muted" style="margin-top:10px">Bu bir doğum kontrol yöntemi değildir. Tahmin takvime dayanır; ovülasyon testi ve akıntı kaydı tahmini iyileştirir.</p></section>`;
  }

  function alerts(st, E, logs, T, who) {
    let h = '';
    const her = esc(S.set.her);
    if (st.late) {
      const unprot = Object.entries(logs).some(([d, L]) => L.sex === 'u' && d >= st.start && d <= T);
      h += `<section class="card warn"><h2>⏳ Regl ${st.lateDays} gün gecikti</h2><p class="small">${unprot
        ? 'Bu döngüde korunmasız ilişki kaydı var. Gebelik testi yapmak iyi olur (en iyisi sabah ilk idrarla).'
        : 'Stres, yoğun antrenman, uyku ve beslenme değişikliği gecikmeye yol açabilir. 7 günü geçerse test yapın ya da doktora danışın.'}</p></section>`;
    }
    const risky = Object.entries(logs).filter(([d, L]) => L.sex === 'u' && d >= st.start && d <= T)
      .map(([d]) => ({ d, inf: dayInfo(E, d, T) })).filter(x => x.inf && x.inf.risk >= 1).sort((a, b) => (a.d < b.d ? 1 : -1));
    if (risky.length && !st.late) {
      const x = risky[0], age = diff(x.d, T);
      const testDate = st.next ? [addDays(st.next, 1), addDays(x.d, 14)].sort()[1] : addDays(x.d, 21);
      h += `<section class="card danger"><h2>⚠️ Gebelik riski</h2>
        <p class="small">${fmt(x.d)} tarihinde (${C.RISK[x.inf.risk].t.toLowerCase()} riskli gün) korunmasız ilişki kaydı var.</p>
        ${age <= 3 ? '<p class="small"><b>İlişkiden sonraki 72 saat içindeyseniz:</b> acil kontrasepsiyon (ertesi gün hapı) ne kadar erken alınırsa o kadar etkili. Hemen bir eczacıya ya da doktora danışın.</p>' : ''}
        <p class="small">Test için en güvenilir zaman: <b>${fmt(testDate)}</b> (regl gecikirse ya da ilişkiden 3 hafta sonra).</p></section>`;
    }
    const pos = Object.entries(logs).find(([d, L]) => L.preg === 'pos' && d >= st.start);
    if (pos) h += `<section class="card tinted"><h2>💛 Gebelik testi pozitif</h2><p class="small">${fmt(pos[0])} tarihinde pozitif test kaydı var. Bir jinekoloğa görünmek iyi olur.</p></section>`;
    if (who === 'murat' && !st.late) {
      const toPms = st.pmsStart ? diff(T, st.pmsStart) : -1;
      if (st.phase !== 'pms' && st.phase !== 'regl' && toPms >= 1 && toPms <= 3)
        h += `<section class="card warn"><h2>🌧️ ${toPms === 1 ? 'Yarın' : toPms + ' gün sonra'} PMS başlıyor</h2><p class="small">Çikolata stokla, planları hafiflet, sabır modunu aç. ${her} için ped/ağrı kesici evde var mı?</p></section>`;
      if (st.toNext != null && st.toNext <= 2 && st.phase !== 'regl')
        h += `<section class="card warn"><h2>🩸 Regl ${st.toNext === 0 ? 'bugün' : rel(st.next, T)} bekleniyor</h2><p class="small">Sıcak su torbası hazır olsun.</p></section>`;
    }
    return h;
  }

  function upcomingCard(st, E, T) {
    const rows = [];
    if (st.next) rows.push(['🩸', 'Sonraki regl', `${fmtW(st.next)} · ${rel(st.next, T)}`]);
    rows.push(['🌿', 'Doğurgan pencere', `${fmtS(st.fertStart)} – ${fmtS(st.fertEnd)}`]);
    if (st.pmsStart && st.pmsStart > T) rows.push(['🌧️', 'PMS başlangıcı', `${fmtS(st.pmsStart)} · ${rel(st.pmsStart, T)}`]);
    const src = E.lens.length ? `${E.lens.length} döngüden öğrenildi` : 'başlangıç ayarlarından';
    return `<section class="card"><h2>📅 Yaklaşanlar</h2><div class="list">${rows.map(([i, t, s]) => `<div class="li"><span class="ic">${i}</span><div class="grow"><div class="t">${t}</div><div class="s">${s}</div></div></div>`).join('')}</div>
      <p class="tiny muted" style="margin-top:8px">Ortalama döngü ${E.avg} gün, regl ${E.pLen} gün (${src}).</p></section>`;
  }

  // Hızlı istek kutucukları: dokununca seçilir, gönderme alttaki çubukla
  const quickOn = q => q.items.every(id => U.req.items.includes(id));
  const quickTiles = () => `<div class="tiles">${C.QUICK_REQUESTS.map((q, i) => `<button class="tile ${quickOn(q) ? 'on' : ''}" data-a="quickToggle" data-i="${i}"><span class="e">${q.e}</span><span class="t">${q.t}</span></button>`).join('')}</div>`;
  function sendBar() {
    const n = U.req.items.length;
    if (S.role !== 'merve' || !n || !['home', 'ask'].includes(U.tab)) return '';
    const emojis = U.req.items.map(id => (reqItem(id) || {}).e).join(' ');
    return `<div class="sendbar"><div class="grow"><b>Seçilenler</b><div class="e">${emojis}</div></div>
      <button class="btn sm" data-a="reqClear">Temizle</button><button class="btn wa sm" data-a="sendReq">Gönder</button></div>`;
  }

  // ---------------------------------------------------------------- kayıt parçaları
  const lvDots = lv => `<span class="lv">${[1, 2, 3].map(i => `<i class="${i <= lv ? 'f' : ''}"></i>`).join('')}</span>`;
  const painChip = (p, d, lv) => `<button class="chip ${lv ? 'on' : ''}" data-a="pain" data-id="${p.id}" data-d="${d}">${p.e} ${p.t}${lv ? lvDots(lv) : ''}</button>`;
  const togChip = (k, it, d, on) => `<button class="chip ${on ? 'on' : ''}" data-a="tg" data-k="${k}" data-id="${it.id}" data-d="${d}">${it.e ? it.e + ' ' : ''}${esc(it.t)}</button>`;
  const seg = (k, opts, d, val) => `<div class="seg">${opts.map(o => `<button class="${(val || '') === o.id ? 'on' : ''}" data-a="one" data-k="${k}" data-v="${o.id}" data-d="${d}">${o.t}</button>`).join('')}</div>`;
  const oneChips = (k, opts, d, val) => `<div class="chips">${opts.map(o => `<button class="chip ${(val || '') === o.id ? 'on' : ''}" data-a="one" data-k="${k}" data-v="${o.id}" data-d="${d}">${o.t}</button>`).join('')}</div>`;

  function logSummary(L, cs) {
    if (!L) return '';
    const out = [];
    const fl = C.FLOW.find(f => f.id === L.flow);
    if (L.flow) out.push(`🩸 Kanama: ${fl.t}`);
    for (const [id, lv] of Object.entries(L.pains || {})) { const p = C.PAINS.find(x => x.id === id); if (p) out.push(`${p.e} ${p.t} · ${C.PAIN_LEVELS[lv]}`); }
    (L.sym || []).forEach(id => { const s = C.SYMPTOMS.find(x => x.id === id); out.push(s ? `${s.e} ${s.t}` : `• ${(cs && cs[id]) || (S.custom.find(x => x.id === id) || {}).t || 'Özel belirti'}`); });
    (L.mood || []).forEach(id => { const m = C.MOODS.find(x => x.id === id); if (m) out.push(`${m.e} ${m.t}`); });
    if (L.sex) out.push(C.SEX.find(x => x.id === L.sex).t);
    if (L.mucus) out.push(`Akıntı: ${C.MUCUS.find(x => x.id === L.mucus).t}`);
    if (L.ov) out.push(`Ovülasyon testi: ${C.OVTEST.find(x => x.id === L.ov).t}`);
    if (L.preg) out.push(`Gebelik testi: ${C.PREGTEST.find(x => x.id === L.preg).t}`);
    (L.meds || []).forEach(id => { const m = C.MEDS.find(x => x.id === id); if (m) out.push(`${m.e} ${m.t}`); });
    if (L.train) out.push(`🏋️ Antrenman: ${C.TRAIN.find(x => x.id === L.train).t}`);
    if (L.temp) out.push(`🌡️ ${L.temp} °C`);
    if (!out.length && !L.note) return '';
    return `<div class="chips">${out.map(x => `<span class="pill">${esc(x)}</span>`).join('')}</div>${L.note ? `<p class="small muted" style="margin-top:8px">📝 ${esc(L.note)}</p>` : ''}`;
  }

  function periodControls(d, T) {
    if (d > T) return '<p class="small muted">İleri tarihler için kayıt yapılamaz.</p>';
    const i = periodIndexAt(d);
    let h = '<div class="stack">';
    if (i < 0) {
      h += `<button class="btn primary block" data-a="startPeriod" data-d="${d}">🩸 Regl bu gün başladı</button>`;
      if (extendable(d)) h += `<button class="btn block" data-a="extendDay" data-d="${d}">Önceki regle ekle (uzat)</button>`;
    } else {
      h += `<div class="btn-row"><button class="btn" data-a="endPeriod" data-d="${d}">✓ Bu gün bitti</button><button class="btn" data-a="removeDay" data-d="${d}">Bu günü çıkar</button></div>`;
    }
    return h + '</div>';
  }

  // ---------------------------------------------------------------- ekranlar: Merve
  function vMerveHome() {
    const T = today(), E = mE(), st = statusOf(E, T);
    let h = top(`Merhaba ${esc(S.set.her)}`, fmtW(T)) + '<main>';
    if (!st) {
      return h + `<section class="card"><h2>🩸 Son regl tarihin</h2><p class="small muted">Tahminler için son reglinin başladığı günü gir.</p>
        <div class="stack" style="margin-top:12px"><button class="btn primary block" data-a="startPeriod" data-d="${T}">Bugün başladı</button>
        <button class="btn block" data-a="sheet" data-v="pickStart">Başka bir gün başladı</button></div></section></main>`;
    }
    const ph = C.PHASES[st.phase], seed = dnum(T), him = S.set.him;
    const L = S.days[T] || {};
    h += heroCard(st, E, 'merve');
    h += alerts(st, E, S.days, T, 'merve');
    const quickPains = ['kramp', 'bel', 'bas', 'gogus'].map(id => painChip(C.PAINS.find(p => p.id === id), T, (L.pains || {})[id] || 0)).join('');
    const quickSym = ['siskinlik', 'yorgunluk'].map(id => togChip('sym', C.SYMPTOMS.find(s => s.id === id), T, (L.sym || []).includes(id))).join('');
    const quickMood = ['hassas', 'sinirli', 'mutlu'].map(id => togChip('mood', C.MOODS.find(s => s.id === id), T, (L.mood || []).includes(id))).join('');
    h += `<section class="card"><h2>Bugün nasılsın?<button class="right" data-a="logDate" data-d="${T}">Detaylı kayıt →</button></h2>
      <div class="chips">${quickPains}${quickSym}${quickMood}</div>
      <p class="tiny muted" style="margin-top:8px">Ağrıya her dokunuşta şiddet artar: hafif → orta → şiddetli → kapalı.</p></section>`;
    h += `<section class="card"><h2>💌 ${ek(him, 'den')} iste<button class="right" data-a="tab" data-v="ask">Tümü →</button></h2>
      ${quickTiles()}
      <p class="tiny muted" style="margin-top:8px">İstediğin kadarını seç, alttaki <b>Gönder</b>’e bas: hepsi tek mesajda WhatsApp’ta ${ek(him, 'e')} gider.</p></section>`;
    h += riskCard(st, E, T);
    h += `<section class="card"><h2>${ph.emoji} ${ph.name} fazı: kendin için</h2><p class="small muted">${esc(ph.her)}</p><ul class="tips" style="margin-top:10px">${li(ph.self)}</ul></section>`;
    h += `<section class="card tinted"><h2>💙 ${ek(him, 'in')} bu fazdaki görevi</h2><p class="small">${esc(ph.murat.summary)}</p>
      <ul class="tips" style="margin-top:10px">${li(pick(ph.murat.do, 3, seed))}</ul>
      <button class="btn wa block" style="margin-top:12px" data-a="sendGuide">Bu rehberi ${ek(him, 'e')} gönder</button>
      <button class="btn ghost block" data-a="tab" data-v="guide">${ek(him, 'in')} tüm rehberini gör →</button></section>`;
    h += upcomingCard(st, E, T);
    h += `<section class="card"><h2>🔄 ${ek(him, 'in')} uygulaması</h2><p class="small muted">${esc(him)} senin döngünü, gönderdiğin güncellemelerle görür. İsteklerine güncelleme linki otomatik eklenir. Regl başlayınca ve bitince de bir güncelleme gönder.</p>
      <button class="btn block" style="margin-top:12px" data-a="sendSync">WhatsApp ile güncelleme gönder</button></section>`;
    return h + '</main>';
  }

  function vLog() {
    const T = today(), d = U.logDate && U.logDate <= T ? U.logDate : T;
    U.logDate = d;
    const L = S.days[d] || {}, E = mE(), inf = dayInfo(E, d, T);
    const syms = [...C.SYMPTOMS, ...S.custom];
    let h = top('Kayıt', '', '') + '<main>';
    h += `<section class="card"><div class="cal-head"><button class="icon-btn" data-a="logNav" data-n="-1" aria-label="Önceki gün">${svg('left')}</button>
      <div class="center"><b>${fmtW(d)}</b><div class="tiny muted">${d === T ? 'Bugün' : `<button class="btn ghost" style="padding:0" data-a="logDate" data-d="${T}">Bugüne dön</button>`}</div></div>
      <button class="icon-btn" data-a="logNav" data-n="1" ${d >= T ? 'disabled style="opacity:.3"' : ''} aria-label="Sonraki gün">${svg('right')}</button></div>
      <p class="small muted center" style="margin-bottom:12px">${inf ? `Döngünün ${inf.cd}. günü · ${C.PHASES[inf.phase].emoji} ${C.PHASES[inf.phase].name} · Gebelik riski: ${C.RISK[inf.risk].t}` : 'Henüz regl kaydı yok'}</p>
      ${periodControls(d, T)}</section>`;
    h += `<section class="card"><h2>🩸 Kanama</h2>${seg('flow', C.FLOW, d, L.flow)}</section>`;
    h += `<section class="card"><h2>Ağrılar</h2><div class="chips">${C.PAINS.map(p => painChip(p, d, (L.pains || {})[p.id] || 0)).join('')}</div>
      <p class="tiny muted" style="margin-top:8px">Her dokunuşta: hafif → orta → şiddetli → kapalı.</p></section>`;
    h += `<section class="card"><h2>Belirtiler</h2><div class="chips">${syms.map(s => togChip('sym', s, d, (L.sym || []).includes(s.id))).join('')}
      <button class="chip add" data-a="addCustom">＋ Ekle</button></div></section>`;
    h += `<section class="card"><h2>Ruh hali</h2><div class="chips">${C.MOODS.map(m => togChip('mood', m, d, (L.mood || []).includes(m.id))).join('')}</div></section>`;
    h += `<section class="card"><h2>💞 İlişki</h2>${seg('sex', C.SEX, d, L.sex)}
      ${inf ? `<p class="small muted" style="margin-top:8px">Bu günün gebelik riski: <b style="color:var(--r${inf.risk})">${C.RISK[inf.risk].t}</b></p>` : ''}</section>`;
    h += `<section class="card"><h2>🌿 Doğurganlık işaretleri</h2>
      <h3 style="margin-top:0">Akıntı</h3>${oneChips('mucus', C.MUCUS, d, L.mucus)}
      <p class="tiny muted" style="margin-top:6px">“Yumurta akı gibi” kaygan akıntı, doğurgan günlerin işaretidir.</p>
      <h3>Ovülasyon testi</h3>${seg('ov', C.OVTEST, d, L.ov)}
      <h3>Gebelik testi</h3>${seg('preg', C.PREGTEST, d, L.preg)}
      <h3>Bazal vücut ısısı</h3><input class="in" type="text" inputmode="decimal" placeholder="örn. 36,5" data-in="temp" value="${L.temp || ''}"></section>`;
    h += `<section class="card"><h2>💊 İlaç ve antrenman</h2><div class="chips">${C.MEDS.map(m => togChip('meds', m, d, (L.meds || []).includes(m.id))).join('')}</div>
      <h3>Antrenman</h3>${seg('train', C.TRAIN, d, L.train)}</section>`;
    h += `<section class="card"><h2>📝 Not</h2><textarea class="in" data-in="note" placeholder="Bugün nasıldı?">${esc(L.note || '')}</textarea>
      <p class="tiny muted" style="margin-top:8px">Her şey otomatik kaydedilir. Notlar ${ek(S.set.him, 'e')} gönderilmez.</p></section>`;
    return h + '</main>';
  }

  function vAsk() {
    const him = S.set.him, R = U.req;
    let h = top(`${ek(him, 'den')} iste`, 'WhatsApp’tan tek dokunuşla', '') + '<main>';
    h += `<section class="card"><h2>⚡ Sık istenenler</h2>${quickTiles()}<p class="tiny muted" style="margin-top:8px">Birden fazla seçebilirsin; aşağıdan daha fazlasını da ekle.</p></section>`;
    h += `<section class="card"><h2>🧺 Daha fazla</h2>${C.REQUEST_GROUPS.map(g => `<h3>${g.t}</h3><div class="tiles small">${g.items.map(it => `<button class="tile ${R.items.includes(it.id) ? 'on' : ''}" data-a="reqToggle" data-id="${it.id}"><span class="e">${it.e}</span><span class="t">${it.t}</span></button>`).join('')}</div>`).join('')}
      <h3>Ne zaman?</h3><div class="chips">${C.WHEN.map(w => `<button class="chip ${R.when === w.id ? 'on' : ''}" data-a="reqWhen" data-v="${w.id}">${w.t}</button>`).join('')}</div>
      <h3>Not</h3><textarea class="in" data-in="reqNote" placeholder="İstersen bir şey ekle...">${esc(R.note)}</textarea>
      <div class="toggle" style="margin-top:10px"><span class="small">Bugünkü ağrılarımı ekle</span><button class="sw ${S.set.attach ? 'on' : ''}" data-a="tog" data-k="attach" aria-label="Ağrıları ekle"></button></div>
      <div class="toggle"><span class="small">${ek(him, 'in')} uygulamasını güncelle (link)</span><button class="sw ${S.set.link ? 'on' : ''}" data-a="tog" data-k="link" aria-label="Güncelleme linki"></button></div>
      <h3>Önizleme</h3><div class="preview" id="req-preview">${esc(requestText(R.items, R.when, R.note, true))}</div>
      <button class="btn wa block" style="margin-top:12px" data-a="sendReq" ${R.items.length || R.note ? '' : 'disabled'}>WhatsApp’tan gönder${R.items.length ? ` (${R.items.length})` : ''}</button></section>`;
    if (S.reqs.length) {
      h += `<section class="card"><h2>🕘 Son istekler</h2><div class="list">${S.reqs.slice(0, 6).map((r, i) => `<div class="li"><span class="ic">${(reqItem(r.items[0]) || { e: '📝' }).e}</span>
        <div class="grow"><div class="t">${r.items.map(id => (reqItem(id) || {}).t).filter(Boolean).join(', ') || esc(r.note)}</div><div class="s">${ago(r.t)}</div></div>
        <button class="btn sm" data-a="resendReq" data-i="${i}">Tekrar</button></div>`).join('')}</div></section>`;
    }
    return h + '</main>';
  }

  function patterns(E, T) {
    const map = {};
    for (const [d, L] of Object.entries(S.days)) {
      const inf = dayInfo(E, d, T);
      if (!inf || d > T) continue;
      const add = (key, label, lv) => {
        const m = map[key] || (map[key] = { label, n: 0, ph: {}, cds: [], before: [], sev3: 0 });
        m.n++;
        m.ph[inf.phase] = (m.ph[inf.phase] || 0) + 1;
        m.cds.push(inf.cd);
        if (inf.known) m.before.push(inf.len - inf.cd + 1);
        if (lv === 3) m.sev3++;
      };
      for (const [id, lv] of Object.entries(L.pains || {})) { const p = C.PAINS.find(x => x.id === id); if (p) add('p' + id, `${p.e} ${p.t}`, lv); }
      (L.sym || []).forEach(id => { const s = C.SYMPTOMS.find(x => x.id === id) || S.custom.find(x => x.id === id); if (s) add('s' + id, `${s.e || '•'} ${s.t}`); });
      (L.mood || []).forEach(id => { const m = C.MOODS.find(x => x.id === id); if (m) add('m' + id, `${m.e} ${m.t}`); });
    }
    return Object.values(map).filter(m => m.n >= 2).sort((a, b) => b.n - a.n).slice(0, 10);
  }
  const PH_ORDER = ['regl', 'folikuler', 'yumurtlama', 'luteal', 'pms', 'gecikme'];
  function patternText(m) {
    const top = Object.entries(m.ph).sort((a, b) => b[1] - a[1])[0][0];
    if (top === 'regl') return `genelde reglin ${median(m.cds)}. günü`;
    if ((top === 'pms' || top === 'luteal') && m.before.length) return `genelde reglden ~${median(m.before)} gün önce`;
    return `genelde ${C.PHASES[top].name.toLowerCase()} fazında`;
  }
  function doctorFlags(E, T) {
    const f = [];
    if (E.lens.length >= 2 && (E.avg < 21 || E.avg > 35)) f.push(`Ortalama döngün ${E.avg} gün (normal aralık 21-35).`);
    if (E.pLen > 7) f.push(`Reglin ortalama ${E.pLen} gün sürüyor (7 günden uzun).`);
    if (E.irregular) f.push(`Döngü uzunluğun ${Math.min(...E.lens.slice(-12))}-${Math.max(...E.lens.slice(-12))} gün arasında değişiyor.`);
    let sev = 0, spot = 0, odd = false;
    for (const [d, L] of Object.entries(S.days)) {
      if (diff(d, T) > 100) continue;
      if (Object.values(L.pains || {}).some(v => v === 3)) sev++;
      if (L.flow && periodIndexAt(d) < 0) spot++;
      if (L.mucus === 'farkli') odd = true;
    }
    if (sev >= 4) f.push(`Son 3 ayda ${sev} gün şiddetli ağrı kaydettin.`);
    if (spot >= 2) f.push(`Regl dışında ${spot} gün kanama/lekelenme kaydın var.`);
    if (odd) f.push('Alışılmadık akıntı kaydettin.');
    return f;
  }
  function vStats() {
    const T = today(), E = mE();
    const l12 = E.lens.slice(-12);
    let h = top('Analiz', '', '') + '<main>';
    h += `<section class="card"><div class="stat-grid">
      <div class="stat"><div class="n">${E.avg}</div><div class="l">ortalama döngü (gün)</div></div>
      <div class="stat"><div class="n">${E.pLen}</div><div class="l">ortalama regl (gün)</div></div>
      <div class="stat"><div class="n">${l12.length >= 2 ? `${Math.min(...l12)}–${Math.max(...l12)}` : '—'}</div><div class="l">döngü aralığı</div></div>
      <div class="stat"><div class="n">${E.lens.length}</div><div class="l">kayıtlı döngü</div></div></div>
      ${E.lens.length < 3 ? '<p class="tiny muted" style="margin-top:10px">3 döngü kaydettikten sonra tahminler tamamen senin verine göre yapılır.</p>' : ''}</section>`;
    const ps = E.ps;
    if (ps.length) {
      const rows = [];
      for (let i = Math.max(0, ps.length - 8); i < ps.length; i++) {
        const p = ps[i], nx = ps[i + 1];
        const len = nx ? diff(p.s, nx.s) : diff(p.s, T) + 1;
        rows.push({ s: p.s, len, pd: diff(p.s, p.e || addDays(p.s, E.pLen - 1)) + 1, cur: !nx });
      }
      const max = Math.max(...rows.map(r => r.len), E.avg);
      h += `<section class="card"><h2>📊 Döngü geçmişi</h2><div class="bars">${rows.reverse().map(r => `<div class="bar-row"><span class="muted">${r.cur ? 'Şimdi' : fmtS(r.s)}</span>
        <div class="bar"><div class="c" style="width:${(r.len / max) * 100}%"></div><div class="p" style="width:${(Math.min(r.pd, r.len) / max) * 100}%"></div></div><b>${r.len}</b></div>`).join('')}</div>
        <div class="legend"><span><i style="background:var(--c-regl)"></i>Regl</span><span><i style="background:color-mix(in srgb, var(--accent) 25%, transparent)"></i>Döngü</span></div></section>`;
    }
    const pats = patterns(E, T);
    h += `<section class="card"><h2>🔎 Belirti örüntülerin</h2>${pats.length ? pats.map(m => `<div class="freq"><div class="grow"><div class="t" style="font-weight:600">${esc(m.label)}</div>
      <div class="s small muted">${m.n} kez · ${patternText(m)}${m.sev3 ? ` · ${m.sev3} kez şiddetli` : ''}</div>
      <div class="pbar">${PH_ORDER.filter(p => m.ph[p]).map(p => `<i style="flex:${m.ph[p]};background:${PC(p)}"></i>`).join('')}</div></div></div>`).join('')
      : '<p class="small muted">Birkaç gün ağrı ve belirti kaydettikçe burada hangi belirtinin döngünün hangi gününde geldiğini göreceksin.</p>'}</section>`;
    const flags = doctorFlags(E, T);
    h += `<section class="card ${flags.length ? 'warn' : ''}"><h2>🩺 Doktora danış</h2>
      ${flags.length ? `<ul class="tips">${li(flags)}</ul><p class="small" style="margin-top:8px">Bunlar teşhis değil; bir jinekoloğa danışmak iyi olur.</p>` : '<p class="small muted">Kayıtlarında dikkat çeken bir şey yok.</p>'}
      <details class="acc"><summary class="small">Ne zaman doktora gitmeli?</summary><div class="body"><ul class="tips">${li(C.DOCTOR)}</ul></div></details>
      <button class="btn block" style="margin-top:6px" data-a="shareReport">Doktor için özet paylaş</button></section>`;
    h += `<section class="card"><h2>🗂️ Regl geçmişi<button class="right" data-a="sheet" data-v="addPeriod">＋ Geçmiş ekle</button></h2><div class="list">
      ${S.periods.slice().reverse().map(p => { const i = S.periods.indexOf(p); const end = p.e || addDays(p.s, E.pLen - 1); return `<div class="li"><span class="ic">🩸</span><div class="grow"><div class="t">${fmt(p.s)}</div><div class="s">${diff(p.s, end) + 1} gün${p.e ? '' : ' (bitiş girilmedi)'}</div></div><button class="btn sm" data-a="delPeriod" data-i="${i}">Sil</button></div>`; }).join('') || '<p class="small muted">Kayıt yok.</p>'}</div></section>`;
    return h + '</main>';
  }

  function reportText() {
    const T = today(), E = mE();
    const lines = [`Regl özeti — ${S.set.her} (${fmt(T)} ${T.slice(0, 4)})`, ''];
    lines.push(`Ortalama döngü: ${E.avg} gün${E.lens.length >= 2 ? ` (aralık ${Math.min(...E.lens)}–${Math.max(...E.lens)})` : ''}`);
    lines.push(`Ortalama regl süresi: ${E.pLen} gün`, '', 'Son regller:');
    const ps = E.ps;
    ps.slice(-8).forEach(p => {
      const i = ps.indexOf(p), nx = ps[i + 1];
      lines.push(`• ${fmt(p.s)} ${p.s.slice(0, 4)} — ${diff(p.s, p.e || addDays(p.s, E.pLen - 1)) + 1} gün${nx ? `, döngü ${diff(p.s, nx.s)} gün` : ''}`);
    });
    const pats = patterns(E, T);
    if (pats.length) { lines.push('', 'Sık görülen belirtiler:'); pats.forEach(m => lines.push(`• ${m.label.replace(/^\S+\s/, '')}: ${m.n} gün, ${patternText(m)}${m.sev3 ? `, ${m.sev3} kez şiddetli` : ''}`)); }
    const flags = doctorFlags(E, T);
    if (flags.length) { lines.push('', 'Dikkat:'); flags.forEach(f => lines.push('• ' + f)); }
    return lines.join('\n');
  }

  // ---------------------------------------------------------------- ekranlar: Murat
  function vHisHome() {
    const T = today(), E = pE(), her = S.set.her;
    let h = top(`Merhaba ${esc(S.set.him)}`, fmtW(T)) + '<main>';
    if (!E || !E.ps.length) {
      return h + `<section class="card"><h2>🔗 ${ek(her, 'in')} döngüsünü bağla</h2>
        <p class="small">Sen hiçbir tarih girmiyorsun; her şeyi ${esc(her)} kendi telefonunda girer.</p>
        <ol class="small" style="margin:10px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:6px">
          <li>${esc(her)} uygulamayı kendi telefonuna kurup <b>Ben ${esc(her)}</b> ile başlasın.</li>
          <li>Ana sayfada <b>“WhatsApp ile güncelleme gönder”</b>e bassın.</li>
          <li>Gelen mesaja basılı tut → <b>Kopyala</b>, sonra aşağıdaki düğmeye bas.</li></ol>
        <button class="btn primary block" style="margin-top:14px" data-a="paste">📋 Mesajı yapıştır</button></section></main>`;
    }
    const st = statusOf(E, T), ph = C.PHASES[st.phase], seed = dnum(T);
    const P = S.partner;
    h += `<section class="card tinted row"><div class="grow small">${P.t ? `Son güncelleme: <b>${ago(P.t)}</b>` : 'Elle girilen veri'}</div><button class="btn sm" data-a="paste">📋 Yapıştır</button></section>`;
    if (P.t && Date.now() - P.t > 35 * 864e5) h += `<section class="card warn"><p class="small">Uzun süredir güncelleme gelmedi. Tahminler eski veriye dayanıyor; ${ek(her, 'den')} bir güncelleme iste.</p></section>`;
    h += heroCard(st, E, 'murat');
    h += alerts(st, E, P.days || {}, T, 'murat');
    h += `<section class="card"><h2>🎯 Bugün nasıl davranmalısın?</h2><p class="small">${esc(ph.murat.summary)}</p>
      <h3>Yap</h3><ul class="tips">${li(pick(ph.murat.do, 3, seed))}</ul>
      <h3>Yapma</h3><ul class="tips no">${li(pick(ph.murat.dont, 2, seed))}</ul>
      <h3>Söyleyebileceğin bir cümle</h3><ul class="tips say">${li(pick(ph.murat.say, 1, seed))}</ul>
      ${ph.murat.surprise.length ? `<h3>Sürpriz fikri</h3><ul class="tips say">${li(pick(ph.murat.surprise, 1, seed))}</ul>` : ''}
      <button class="btn ghost" style="margin-top:6px" data-a="tab" data-v="guide">Tüm rehber →</button></section>`;
    // Merve'nin son kaydı (bugün ya da dün)
    const recent = [T, addDays(T, -1)].find(d => P.days && P.days[d] && (P.days[d].flow || Object.keys(P.days[d].pains || {}).length || (P.days[d].sym || []).length || (P.days[d].mood || []).length));
    if (recent) {
      const L = P.days[recent];
      const ids = [...Object.entries(L.pains || {}).sort((a, b) => b[1] - a[1]).map(([id]) => id), ...(L.sym || []), ...(L.mood || [])];
      const tips = [...new Set(ids.map(id => C.HIS_TIPS[id]).filter(Boolean))].slice(0, 5);
      if (L.flow === 'h') tips.unshift('Yoğun kanama: çok yorulabilir. Ped stoğunu kontrol et, demirli bir yemek hazırla.');
      h += `<section class="card"><h2>🩺 ${ek(her, 'in')} durumu · ${recent === T ? 'bugün' : 'dün'}</h2>${logSummary(L, P.cs)}
        ${tips.length ? `<h3>Buna göre</h3><ul class="tips">${li(tips)}</ul>` : ''}</section>`;
    }
    h += riskCard(st, E, T);
    h += `<section class="card"><h2>💬 ${ek(her, 'e')} yaz</h2>${S.set.herPhone ? '' : `<label class="f" style="margin-bottom:12px">${ek(her, 'in')} numarası (bir kez)<input class="in" type="tel" placeholder="05xx xxx xx xx" data-in="set.herPhone"></label>`}<div class="stack">${C.HIS_QUICK.map((m, i) => `<button class="btn block" style="justify-content:flex-start" data-a="hisQuick" data-i="${i}">${esc(m)}</button>`).join('')}</div></section>`;
    h += upcomingCard(st, E, T);
    if (st.phase !== 'regl') h += `<section class="card"><h2>🩸 ${esc(her)} regl oldu mu?</h2><p class="small muted">Güncelleme gelmediyse ama regl başladıysa buradan işaretle.</p>
      <button class="btn block" style="margin-top:10px" data-a="herStartToday">Bugün başladı</button></section>`;
    return h + '</main>';
  }

  function vGuide() {
    const T = today(), E = curE(), st = E && E.ps.length ? statusOf(E, T) : null;
    let h = top('Rehber', S.role === 'merve' ? `${ek(S.set.him, 'in')} gördüğü rehber` : `${ek(S.set.her, 'in')} döngüsü ve senin rolün`, S.role === 'merve' ? backBtn() : '') + '<main>';
    h += `<section class="card">${['regl', 'folikuler', 'yumurtlama', 'luteal', 'pms', 'gecikme'].map(k => {
      const ph = C.PHASES[k], m = ph.murat;
      return `<details class="acc" ${st && st.phase === k ? 'open' : ''}><summary><span class="pill"><i class="dot" style="background:${PC(k)}"></i>${ph.emoji} ${ph.name}</span>${st && st.phase === k ? '<span class="tiny muted">şu an</span>' : ''}</summary><div class="body">
        <p class="small muted">${esc(ph.her)}</p><p class="small" style="margin-top:6px"><b>${esc(m.summary)}</b></p>
        <h3>Yap</h3><ul class="tips">${li(m.do)}</ul><h3>Yapma</h3><ul class="tips no">${li(m.dont)}</ul>
        <h3>Söyle</h3><ul class="tips say">${li(m.say)}</ul>
        ${m.surprise.length ? `<h3>Sürpriz</h3><ul class="tips say">${li(m.surprise)}</ul>` : ''}
        ${m.intimacy ? `<h3>Yakınlık</h3><p class="small">${esc(m.intimacy)}</p>` : ''}</div></details>`;
    }).join('')}</section>`;
    h += `<section class="card"><h2>🩺 Ağrıya ve ruh haline göre</h2><div class="list">${[...C.PAINS, ...C.SYMPTOMS, ...C.MOODS].filter(x => C.HIS_TIPS[x.id]).map(x => `<div class="li"><span class="ic">${x.e}</span><div class="grow small">${esc(C.HIS_TIPS[x.id])}</div></div>`).join('')}</div></section>`;
    h += `<section class="card"><h2>Ne zaman doktora?</h2><ul class="tips">${li(C.DOCTOR)}</ul></section>`;
    return h + '</main>';
  }

  // ---------------------------------------------------------------- takvim
  function vCal() {
    const T = today(), E = curE(), logs = curLogs();
    if (!U.cal) U.cal = T.slice(0, 7);
    const [y, m] = U.cal.split('-').map(Number);
    const first = `${U.cal}-01`, offset = (weekday(first) + 6) % 7, dim = new Date(y, m, 0).getDate();
    const start = addDays(first, -offset), cells = Math.ceil((offset + dim) / 7) * 7;
    let grid = WD_SHORT.map(w => `<div class="wd">${w}</div>`).join('');
    for (let i = 0; i < cells; i++) {
      const d = addDays(start, i), inf = E && E.ps.length ? dayInfo(E, d, T) : null, L = logs[d];
      const cls = ['day'];
      if (d.slice(0, 7) !== U.cal) cls.push('out');
      if (inf) {
        if (inf.period && !inf.pPred) cls.push('period');
        else if (inf.period) cls.push('pperiod');
        else if (inf.ovu) cls.push('ovu');
        else if (inf.fertile) cls.push('fertile');
      }
      if (d === T) cls.push('today');
      let dots = '';
      if (L) {
        if (Object.keys(L.pains || {}).length) dots += '<i></i>';
        if (L.sex) dots += '<i></i>';
        if ((L.mood || []).length || (L.sym || []).length) dots += '<i></i>';
      }
      grid += `<button class="${cls.join(' ')}" data-a="day" data-d="${d}">${Number(d.slice(8))}${dots ? `<span class="dots">${dots}</span>` : ''}</button>`;
    }
    let h = top('Takvim', S.role === 'murat' ? esc(S.set.her) : '') + '<main>';
    h += `<section class="card"><div class="cal-head"><button class="icon-btn" data-a="calNav" data-n="-1" aria-label="Önceki ay">${svg('left')}</button>
      <div class="center"><b>${MONTHS[m - 1]} ${y}</b>${U.cal !== T.slice(0, 7) ? `<div><button class="btn ghost" style="padding:0" data-a="calToday">Bugüne dön</button></div>` : ''}</div>
      <button class="icon-btn" data-a="calNav" data-n="1" aria-label="Sonraki ay">${svg('right')}</button></div>
      <div class="cal-grid">${grid}</div>
      <div class="legend"><span><i style="background:var(--c-regl)"></i>Regl</span><span><i style="border:2px dashed var(--c-regl)"></i>Tahmini regl</span>
      <span><i style="background:var(--c-fertile-soft);border:1px solid var(--c-yumurtlama)"></i>Doğurgan</span><span><i style="background:var(--c-yumurtlama)"></i>Yumurtlama</span><span>• kayıt var</span></div>
      <p class="tiny muted" style="margin-top:8px">Bir güne dokun: ${S.role === 'merve' ? 'kayıt ekle, regl başlangıcını/bitişini düzelt.' : 'o günün bilgisi.'}</p></section>`;
    return h + '</main>';
  }

  // ---------------------------------------------------------------- ayarlar
  function stepper(path, val, min, max, suffix) {
    return `<div class="stepper"><button data-a="step" data-k="${path}" data-n="-1" data-min="${min}" data-max="${max}" aria-label="Azalt">−</button><b>${val} ${suffix}</b><button data-a="step" data-k="${path}" data-n="1" data-min="${min}" data-max="${max}" aria-label="Artır">＋</button></div>`;
  }
  function vSettings() {
    const s = S.set, merve = S.role === 'merve';
    let h = top('Ayarlar', '', merve ? backBtn() : '') + '<main>';
    h += `<section class="card"><h2>👥 Kişiler</h2><div class="stack">
      <div class="btn-row"><label class="f">Takip eden<input class="in" data-in="set.her" value="${esc(s.her)}"></label><label class="f">Partner<input class="in" data-in="set.him" value="${esc(s.him)}"></label></div>
      ${merve ? `<label class="f">${ek(s.him, 'in')} WhatsApp numarası<input class="in" type="tel" placeholder="05xx xxx xx xx" data-in="set.himPhone" value="${esc(s.himPhone)}"></label>`
        : `<label class="f">${ek(s.her, 'in')} WhatsApp numarası<input class="in" type="tel" placeholder="05xx xxx xx xx" data-in="set.herPhone" value="${esc(s.herPhone)}"></label>`}</div></section>`;
    if (merve) {
      h += `<section class="card"><h2>🔁 Döngü</h2><p class="small muted">Başlangıç değerleri. Kayıt ekledikçe uygulama senin gerçek ortalamanı öğrenir.</p><div class="stack" style="margin-top:12px">
        <label class="f">Döngü uzunluğu${stepper('set.cycle', s.cycle, 20, 45, 'gün')}</label>
        <label class="f">Regl süresi${stepper('set.period', s.period, 2, 10, 'gün')}</label>
        <label class="f">Luteal faz (yumurtlamadan regle)${stepper('set.luteal', s.luteal, 10, 16, 'gün')}</label></div></section>`;
      h += `<section class="card"><h2>💌 İstek mesajları</h2>
        <div class="toggle"><span class="small">Bugünkü ağrılarımı ekle</span><button class="sw ${s.attach ? 'on' : ''}" data-a="tog" data-k="attach" aria-label="Ağrıları ekle"></button></div>
        <div class="toggle"><span class="small">${ek(s.him, 'in')} uygulaması için güncelleme linki ekle</span><button class="sw ${s.link ? 'on' : ''}" data-a="tog" data-k="link" aria-label="Güncelleme linki"></button></div></section>`;
    } else {
      const P = S.partner;
      h += `<section class="card"><h2>🔗 ${ek(s.her, 'in')} döngüsü</h2>
        <p class="small muted">${P && P.t ? `Son güncelleme ${ago(P.t)}. ` : ''}${esc(s.her)} güncelleme gönderdiğinde mesajı kopyalayıp “Yapıştır”a bas.</p>
        <button class="btn primary block" style="margin-top:10px" data-a="paste">📋 Mesajı yapıştır</button></section>`;
    }
    h += `<section class="card"><h2>🟢 WhatsApp</h2>${`<div class="seg">${[['app', 'Uygulamayı aç'], ['web', 'wa.me linki']].map(([id, t]) => `<button class="${s.wa === id ? 'on' : ''}" data-a="setWa" data-v="${id}">${t}</button>`).join('')}</div>`}
      <p class="tiny muted" style="margin-top:8px">iPhone’da mesaj WhatsApp’ta açılmazsa “wa.me linki”ni seç.</p></section>`;
    h += `<section class="card"><h2>💾 Yedek</h2><p class="small muted">Uygulamayı Ana Ekran’a eklediysen veriler kalıcıdır. Yine de arada bir yedek al.</p>
      <div class="btn-row" style="margin-top:12px"><button class="btn" data-a="export">Yedeği indir</button><label class="btn" style="position:relative">Yedeği yükle<input type="file" accept="application/json,.json" data-in="import" style="position:absolute;inset:0;opacity:0"></label></div></section>`;
    h += `<section class="card"><h2>🔒 Gizlilik</h2><p class="small">Hesap yok, reklam yok, sunucu yok. Tüm kayıtlar sadece bu telefonda durur. ${esc(s.him)} sadece ${esc(s.her)} WhatsApp’tan güncelleme gönderdiğinde (notlar hariç) ağrı, ruh hali ve döngü bilgilerini görür.</p></section>`;
    h += `<section class="card"><h2>ℹ️ Hakkında</h2><p class="small muted">Tahminler: son 6 döngünün ortalaması, yumurtlama = sonraki reglden ${s.luteal} gün önce, doğurgan pencere = yumurtlamadan 5 gün önce ile 1 gün sonrası (Wilcox, NEJM 1995 / BMJ 2000), düzensiz döngülerde Ogino-Knaus tamponu. Bu uygulama tıbbi cihaz ya da doğum kontrol yöntemi değildir.</p></section>`;
    h += `<section class="card"><div class="stack"><button class="btn block" data-a="switchRole">Rolü değiştir (şu an: ${esc(merve ? s.her : s.him)})</button><button class="btn danger block" data-a="wipe">Tüm verileri sil</button></div></section>`;
    return h + '</main>';
  }

  // ---------------------------------------------------------------- ilk açılış
  function vOnboard() {
    const her = S.set.her, him = S.set.him, T = today(), v = U.obv;
    if (U.ob === 'merve') {
      return `<div class="ob"><div class="logo">🌸</div><h1>Merhaba ${esc(her)}</h1><p class="lead">Birkaç bilgiyle tahminler hemen başlasın.</p>
        <div class="card stack">
          <label class="f">Son reglin hangi gün başladı?<input class="in" type="date" max="${T}" data-in="ob.last" value="${v.last || ''}"></label>
          <label class="f">Reglin genelde kaç gün sürer?${stepper('ob.p', v.p || 5, 2, 10, 'gün')}</label>
          <label class="f">Döngün kaç gün? <span class="tiny">(bilmiyorsan 28 kalsın)</span>${stepper('ob.c', v.c || 28, 20, 45, 'gün')}</label>
          <details><summary class="small muted">＋ Önceki regl tarihlerin (isteğe bağlı, tahminleri hemen iyileştirir)</summary><div class="stack" style="margin-top:10px">
            <input class="in" type="date" max="${T}" data-in="ob.p1" value="${v.p1 || ''}"><input class="in" type="date" max="${T}" data-in="ob.p2" value="${v.p2 || ''}"></div></details>
          <label class="f">${ek(him, 'in')} WhatsApp numarası<input class="in" type="tel" placeholder="05xx xxx xx xx" data-in="ob.phone" value="${esc(v.phone || '')}"></label>
        </div>
        <button class="btn primary block" data-a="obDone" data-v="merve">Başla</button><button class="btn ghost" data-a="obRole" data-v="role">← Geri</button></div>`;
    }
    return `<div class="ob"><div class="logo">🌸💙</div><h1>Döngümüz</h1>
      <p class="lead">${esc(her)} ve ${esc(him)} için regl takibi.<br>Veriler sadece bu telefonda kalır.</p>
      <button class="role" data-a="obRole" data-v="merve"><span class="e">🌸</span><span><b>Ben ${esc(her)}</b><span class="muted small">Döngümü takip edeceğim</span></span></button>
      <button class="role" data-a="obRole" data-v="murat"><span class="e">💙</span><span><b>Ben ${esc(him)}</b></span></button>
      <details class="card"><summary class="small muted">İsimleri değiştir</summary><div class="btn-row" style="margin-top:10px">
        <input class="in" data-in="set.her" value="${esc(her)}" aria-label="Takip edenin adı"><input class="in" data-in="set.him" value="${esc(him)}" aria-label="Partnerin adı"></div></details></div>`;
  }

  // ---------------------------------------------------------------- alt sayfa (sheet)
  function sheetHtml() {
    const sh = U.sheet, T = today(), v = U.shv;
    if (!sh) return '';
    let b = '';
    if (sh.type === 'day') {
      const d = sh.date, E = curE(), inf = E && E.ps.length ? dayInfo(E, d, T) : null;
      const L = curLogs()[d];
      b = `<h2>${fmtW(d)}${d === T ? ' · Bugün' : ''}</h2>`;
      if (inf) b += `<div class="chips" style="margin:8px 0 12px"><span class="pill"><i class="dot" style="background:${PC(inf.phase)}"></i>${C.PHASES[inf.phase].emoji} ${C.PHASES[inf.phase].name}</span><span class="pill">Döngü ${inf.cd}. gün</span><span class="pill"><i class="dot" style="background:var(--r${inf.risk})"></i>Risk: ${C.RISK[inf.risk].t}</span>${d > T ? '<span class="pill">Tahmin</span>' : ''}</div>`;
      b += logSummary(L, S.role === 'murat' && S.partner ? S.partner.cs : null) || (d <= T ? '<p class="small muted">Bu gün için kayıt yok.</p>' : '');
      if (S.role === 'merve' && d <= T) b += `<div class="sep"></div>${periodControls(d, T)}<button class="btn block" style="margin-top:10px" data-a="logDate" data-d="${d}">✏️ Bu günün kaydı</button>`;
    } else if (sh.type === 'pickStart' || sh.type === 'pickEnd') {
      b = `<h2>${sh.type === 'pickStart' ? 'Regl hangi gün başladı?' : 'Regl hangi gün bitti?'}</h2><input class="in" type="date" max="${T}" data-in="sh.date" value="${v.date || T}">
        <button class="btn primary block" style="margin-top:12px" data-a="${sh.type === 'pickStart' ? 'confirmStart' : 'confirmEnd'}">Kaydet</button>`;
    } else if (sh.type === 'addPeriod') {
      b = `<h2>Geçmiş regl ekle</h2><div class="stack"><label class="f">Başlangıç<input class="in" type="date" max="${T}" data-in="sh.date" value="${v.date || ''}"></label>
        <label class="f">Kaç gün sürdü?${stepper('sh.len', v.len || S.set.period, 1, 12, 'gün')}</label>
        <button class="btn primary block" data-a="confirmAdd">Ekle</button></div>`;
    } else if (sh.type === 'notify') {
      b = `<h2>${sh.ended ? '✓ Regl bitti olarak kaydedildi' : '🩸 Regl başladı olarak kaydedildi'}</h2><p class="small muted">${ek(S.set.him, 'e')} haber verelim mi? Onun uygulaması da güncellenir.</p>
        <button class="btn wa block" style="margin-top:12px" data-a="sendNotice" data-v="${sh.ended ? 'end' : 'start'}">WhatsApp’tan haber ver</button>
        <button class="btn ghost block" data-a="closeSheet">Şimdi değil</button>`;
    } else if (sh.type === 'paste') {
      b = `<h2>Mesajı yapıştır</h2><p class="small muted">WhatsApp’ta ${ek(S.set.her, 'in')} mesajına basılı tut → Kopyala. Sonra aşağıdaki kutuya yapıştır.</p>
        <textarea class="in" style="margin-top:10px" data-in="sh.text" placeholder="Mesajı buraya yapıştır">${esc(v.text || '')}</textarea>
        <button class="btn primary block" style="margin-top:12px" data-a="confirmPaste">İçe aktar</button>`;
    } else if (sh.type === 'linkOpened') {
      b = `<h2>✓ Güncelleme alındı</h2><p class="small">Bu güncelleme tarayıcıya kaydedildi.</p>
        <p class="small muted" style="margin-top:8px">Uygulamayı <b>Ana Ekran’daki simgeden</b> kullanıyorsan oranın verisi ayrıdır: aşağıdaki düğmeyle linki kopyala, uygulamayı aç ve “📋 Yapıştır”a bas.</p>
        <button class="btn primary block" style="margin-top:12px" data-a="copyLink">Linki kopyala</button><button class="btn ghost block" data-a="closeSheet">Tamam</button>`;
    }
    return `<div class="backdrop" data-a="closeSheet"></div><div class="sheet" role="dialog"><div class="grab"></div>${b}</div>`;
  }

  // ---------------------------------------------------------------- render
  const VIEWS_HER = { home: vMerveHome, cal: vCal, log: vLog, ask: vAsk, stats: vStats, settings: vSettings, guide: vGuide };
  const VIEWS_HIM = { home: vHisHome, cal: vCal, guide: vGuide, settings: vSettings };
  function render() {
    document.documentElement.dataset.role = S.role || 'merve';
    const app = document.getElementById('app');
    if (!S.role) app.innerHTML = vOnboard();
    else {
      const views = S.role === 'merve' ? VIEWS_HER : VIEWS_HIM;
      if (!views[U.tab]) U.tab = 'home';
      const bar = sendBar();
      app.innerHTML = views[U.tab]() + (bar ? '<div style="height:76px"></div>' + bar : '') + tabbar();
    }
    document.getElementById('sheet').innerHTML = sheetHtml();
  }
  function go(tab) {
    if (tab !== U.tab) { U.prevTab = U.tab; U.tab = tab; }
    U.sheet = null;
    render();
    window.scrollTo(0, 0);
  }
  function openSheet(sheet) { U.sheet = sheet; U.shv = {}; render(); }
  let toastTimer;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  // ---------------------------------------------------------------- yol yardımcıları (stepper / input)
  function setPath(path, val) {
    const [root, key] = path.split('.');
    if (root === 'set') S.set[key] = val;
    else if (root === 'ob') U.obv[key] = val;
    else if (root === 'sh') U.shv[key] = val;
  }
  function getPath(path) {
    const [root, key] = path.split('.');
    return root === 'set' ? S.set[key] : root === 'ob' ? U.obv[key] : U.shv[key];
  }
  function ensurePartner() {
    if (!S.partner) S.partner = { periods: [], cycle: 28, period: 5, luteal: 14, days: {}, cs: {}, t: 0 };
  }

  // ---------------------------------------------------------------- eylemler
  async function doPaste() {
    try {
      const t = await navigator.clipboard.readText();
      const m = t.match(/#s=([A-Za-z0-9_-]+)/);
      if (m) { await importCode(m[1]); return; }
      toast('Panoda güncelleme linki bulunamadı');
    } catch (e) { /* izin yok: elle yapıştırma */ }
    openSheet({ type: 'paste' });
  }
  function sendRequest(items, when, note) {
    sendWA(S.set.himPhone, requestText(items, when, note));
    logRequest(items, when, note);
  }

  const A = {
    tab: el => go(el.dataset.v),
    back: () => go(U.prevTab && U.prevTab !== U.tab ? U.prevTab : 'home'),
    sheet: el => openSheet({ type: el.dataset.v }),
    closeSheet: () => { U.sheet = null; render(); },
    day: el => openSheet({ type: 'day', date: el.dataset.d }),

    startPeriod: el => { if (startPeriod(el.dataset.d)) { U.sheet = { type: 'notify' }; render(); } },
    confirmStart: () => { if (startPeriod(U.shv.date || today())) { U.sheet = { type: 'notify' }; render(); } },
    endPeriod: el => { if (endPeriod(el.dataset.d)) { U.sheet = { type: 'notify', ended: true }; render(); } },
    confirmEnd: () => { if (endPeriod(U.shv.date || today())) { U.sheet = { type: 'notify', ended: true }; render(); } },
    removeDay: el => { removeDay(el.dataset.d); render(); },
    extendDay: el => { const p = extendable(el.dataset.d); if (p) { p.e = el.dataset.d; save(); render(); } },
    delPeriod: el => { if (confirm('Bu regl kaydı silinsin mi?')) { S.periods.splice(Number(el.dataset.i), 1); save(); render(); } },
    confirmAdd: () => {
      const d = U.shv.date, len = U.shv.len || S.set.period;
      if (!d) return toast('Başlangıç tarihi seç');
      if (periodIndexAt(d) >= 0) return toast('Bu tarihte zaten regl kaydı var');
      S.periods.push({ s: d, e: addDays(d, len - 1) });
      sortPeriods(); save(); U.sheet = null; render(); toast('Eklendi');
    },
    sendNotice: el => {
      const st = statusOf(mE(), today());
      const head = el.dataset.v === 'end' ? '✅ Reglim bitti.' : '🩸 Reglim başladı. Bu birkaç gün bana iyi bak 💛';
      sendWA(S.set.himPhone, `${head}\n${st ? `📅 ${phaseLine(st)}\n` : ''}\n🔄 ${syncLink()}`);
      U.sheet = null; render();
    },

    logDate: el => { U.logDate = el.dataset.d; go('log'); },
    logNav: el => { const T = today(), d = addDays(U.logDate || T, Number(el.dataset.n)); if (d <= T) { U.logDate = d; render(); } },
    pain: el => {
      const L = dayLog(el.dataset.d);
      L.pains = L.pains || {};
      const lv = ((L.pains[el.dataset.id] || 0) + 1) % 4;
      if (lv) L.pains[el.dataset.id] = lv; else delete L.pains[el.dataset.id];
      cleanDay(el.dataset.d); save(); render();
    },
    tg: el => {
      const { k, id, d } = el.dataset, L = dayLog(d);
      const arr = L[k] || [];
      L[k] = arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];
      cleanDay(d); save(); render();
    },
    one: el => {
      const { k, v, d } = el.dataset, L = dayLog(d);
      L[k] = L[k] === v ? '' : v;
      cleanDay(d); save(); render();
      if (k === 'sex' && v === 'u') { const inf = dayInfo(mE(), d, today()); if (inf && inf.risk >= 2) toast(`Dikkat: ${C.RISK[inf.risk].t.toLowerCase()} riskli gün`); }
    },
    addCustom: () => {
      const t = (prompt('Yeni belirti adı:') || '').trim();
      if (!t) return;
      const id = 'c' + Date.now().toString(36);
      S.custom.push({ id, t });
      const L = dayLog(U.logDate || today());
      L.sym = [...(L.sym || []), id];
      save(); render();
    },

    quickToggle: el => {
      const q = C.QUICK_REQUESTS[Number(el.dataset.i)], R = U.req;
      R.items = quickOn(q) ? R.items.filter(id => !q.items.includes(id)) : [...R.items, ...q.items.filter(id => !R.items.includes(id))];
      render();
    },
    reqClear: () => { U.req = { items: [], when: '', note: '' }; render(); },
    reqToggle: el => { const R = U.req, id = el.dataset.id; R.items = R.items.includes(id) ? R.items.filter(x => x !== id) : [...R.items, id]; render(); },
    reqWhen: el => { U.req.when = U.req.when === el.dataset.v ? '' : el.dataset.v; render(); },
    sendReq: () => { const R = U.req; sendRequest(R.items, R.when, R.note.trim()); U.req = { items: [], when: '', note: '' }; render(); },
    resendReq: el => { const r = S.reqs[Number(el.dataset.i)]; sendRequest(r.items, r.when, r.note); },
    sendGuide: () => {
      const st = statusOf(mE(), today()), ph = C.PHASES[st.phase], seed = dnum(today());
      const text = [`💙 ${S.set.him}, şu an ${ph.emoji} ${ph.name} fazındayım (${phaseLine(st)}).`, '', ph.murat.summary, '',
        'Bu günlerde:', ...pick(ph.murat.do, 4, seed).map(x => `✅ ${x}`), ...pick(ph.murat.dont, 2, seed).map(x => `🚫 ${x}`), '', `🔄 ${syncLink()}`].join('\n');
      sendWA(S.set.himPhone, text);
    },
    sendSync: () => {
      const st = statusOf(mE(), today());
      sendWA(S.set.himPhone, `🔄 Döngü güncellemem\n${st ? `📅 ${phaseLine(st)}\n` : ''}\n${syncLink()}\n\n(Linke dokun ya da bu mesajı kopyalayıp uygulamada “Yapıştır”a bas.)`);
    },
    hisQuick: el => sendWA(S.set.herPhone, C.HIS_QUICK[Number(el.dataset.i)]),
    herStartToday: () => {
      ensurePartner();
      const T = today(), E = pE();
      const inf = E.ps.length ? dayInfo(E, T, T) : null;
      if (inf && inf.period && !inf.pPred) return toast('Zaten regl olarak görünüyor');
      S.partner.periods.push({ s: T, e: '' });
      save(); render(); toast('İşaretlendi');
    },

    paste: () => doPaste(),
    confirmPaste: async () => {
      const m = String(U.shv.text || '').match(/#s=([A-Za-z0-9_-]+)/);
      if (!m) return toast('Mesajda güncelleme linki yok');
      U.sheet = null;
      await importCode(m[1]);
    },
    copyLink: async () => {
      try { await navigator.clipboard.writeText(U.sheet.link); toast('Kopyalandı. Şimdi uygulamayı aç → Yapıştır'); } catch (e) { toast('Kopyalanamadı'); }
    },

    calNav: el => { const [y, m] = U.cal.split('-').map(Number); const d = new Date(y, m - 1 + Number(el.dataset.n), 1); U.cal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; render(); },
    calToday: () => { U.cal = null; render(); },

    step: el => {
      const { k, n, min, max } = el.dataset;
      const cur = Number(getPath(k)) || Number(k === 'ob.p' ? 5 : k === 'sh.len' ? S.set.period : 28);
      setPath(k, Math.min(Number(max), Math.max(Number(min), cur + Number(n))));
      if (k.startsWith('set.')) save();
      render();
    },
    tog: el => { S.set[el.dataset.k] = !S.set[el.dataset.k]; save(); render(); },
    setWa: el => { S.set.wa = el.dataset.v; save(); render(); },

    obRole: el => {
      if (el.dataset.v === 'murat') { S.role = 'murat'; U.tab = 'home'; save(); render(); window.scrollTo(0, 0); return; } // Murat bir şey girmez
      U.ob = el.dataset.v; U.obv = {}; render(); window.scrollTo(0, 0);
    },
    obDone: () => {
      const v = U.obv, T = today();
      if (!v.last) return toast('Son regl tarihini seç');
      const P = v.p || 5;
      S.set.period = P; S.set.cycle = v.c || 28;
      if (v.phone) S.set.himPhone = v.phone;
      S.periods = [...new Set([v.p1, v.p2].filter(d => d && d < v.last))].map(s => ({ s, e: addDays(s, P - 1) }));
      S.periods.push({ s: v.last, e: diff(v.last, T) >= P ? addDays(v.last, P - 1) : '' });
      sortPeriods();
      S.role = 'merve';
      U.tab = 'home';
      save(); render(); window.scrollTo(0, 0);
    },

    export: async () => {
      const name = `dongumuz-yedek-${today()}.json`;
      const file = new File([JSON.stringify(S, null, 1)], name, { type: 'application/json' });
      try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; } } catch (e) { if (e.name === 'AbortError') return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file); a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    },
    shareReport: async () => {
      const text = reportText();
      try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e.name === 'AbortError') return; }
      try { await navigator.clipboard.writeText(text); toast('Özet kopyalandı'); } catch (e) { toast('Paylaşılamadı'); }
    },
    switchRole: () => {
      if (!confirm('Rol değiştirilsin mi? Kayıtlar silinmez.')) return;
      S.role = null; U.ob = 'role'; save(); render();
    },
    wipe: () => {
      if (!confirm('Tüm kayıtlar bu telefondan kalıcı olarak silinecek. Emin misin?')) return;
      localStorage.removeItem(KEY); S = DEFAULTS(); U.ob = 'role'; U.tab = 'home'; render();
    },
  };

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-a]');
    if (!el || el.disabled) return;
    const fn = A[el.dataset.a];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('input', e => {
    const el = e.target, k = el.dataset.in;
    if (!k) return;
    if (k === 'note') {
      const d = U.logDate || today();
      dayLog(d).note = el.value;
      cleanDay(d); saveSoon();
    } else if (k === 'reqNote') {
      U.req.note = el.value;
      const pv = document.getElementById('req-preview');
      if (pv) pv.textContent = requestText(U.req.items, U.req.when, U.req.note, true);
      document.querySelectorAll('[data-a="sendReq"]').forEach(btn => { btn.disabled = !(U.req.items.length || U.req.note.trim()); });
    } else if (k.startsWith('ob.') || k.startsWith('sh.')) setPath(k, el.value);
  });
  document.addEventListener('change', e => {
    const el = e.target, k = el.dataset.in;
    if (!k) return;
    if (k.startsWith('set.')) {
      const val = el.value.trim();
      if ((k === 'set.her' || k === 'set.him') && !val) { render(); return; }
      setPath(k, val); save(); render();
    } else if (k === 'temp') {
      const d = U.logDate || today(), n = parseFloat(el.value.replace(',', '.'));
      dayLog(d).temp = n >= 34 && n <= 40 ? n : '';
      cleanDay(d); save(); render();
    } else if (k === 'import') {
      const f = el.files && el.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const o = JSON.parse(r.result);
          if (!o || !o.set || !Array.isArray(o.periods)) throw new Error('bad');
          if (!confirm('Yedek yüklenecek ve bu telefondaki mevcut veri değiştirilecek. Devam?')) return;
          const d = DEFAULTS();
          S = { ...d, ...o, set: { ...d.set, ...o.set } };
          save(); U.tab = 'home'; render(); toast('Yedek yüklendi');
        } catch (err) { toast('Bu dosya geçerli bir yedek değil'); }
      };
      r.readAsText(f);
    }
  });

  // ---------------------------------------------------------------- başlangıç
  function housekeeping() {
    if (S.role !== 'merve') return;
    const T = today(), pLen = mE().pLen;
    S.periods.forEach(p => { if (!p.e && diff(p.s, T) > 10) p.e = addDays(p.s, pLen - 1); });
  }
  async function importFromHash() {
    const m = location.hash.match(/#s=([A-Za-z0-9_-]+)/);
    if (!m) return;
    history.replaceState(null, '', location.pathname + location.search);
    const ok = await importCode(m[1]);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (ok && !standalone) { U.sheet = { type: 'linkOpened', link: `${appUrl()}#s=${m[1]}` }; render(); }
  }
  async function init() {
    housekeeping();
    render();
    refreshSync();
    await importFromHash();
    window.addEventListener('hashchange', importFromHash);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !document.activeElement.matches('input,textarea')) render(); });
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  init();
})();
