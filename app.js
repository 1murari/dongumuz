'use strict';
(() => {
  const C = window.CONTENT;
  const NOTIFY = !!window.DONGU_CONFIG.notify; // bildirimler (sabah 10:00 + istek bildirimi) şimdilik kapalı olabilir
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
    const s = { i: (endV ? 'y' : '') + i4, e: (endV ? 'y' : '') + a2, den: (hard ? 't' : 'd') + a2 + 'n', in: (endV ? 'n' : '') + i4 + 'n', le: (endV ? 'y' : '') + 'l' + a2 }[kind];
    return `${esc(n)}’${s}`;
  }

  // ---------------------------------------------------------------- durum
  const DEFAULTS = () => ({
    role: null,
    set: { her: 'Merve', him: 'Murat', cycle: 28, period: 5, luteal: 14 },
    periods: [],   // [{s, e}] e: '' -> bitiş girilmedi
    days: {},      // 'YYYY-MM-DD' -> günlük kayıt
    custom: [],    // [{id, t}] kendi eklediği belirtiler
    reqs: [],      // gönderilen istekler [{id, t, items, when, sent}]
    pair: null,    // {code, linked} iki telefonu bağlayan kod
    partner: null, // Murat tarafı: Merve'nin son durumu
    inbox: [],     // Murat tarafı: Merve'den gelen istekler
    inboxSeen: 0,  // Murat'ın en son gördüğü mesaj zamanı
  });
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY));
      if (o) { const d = DEFAULTS(); return { ...d, ...o, set: { ...d.set, ...o.set } }; }
    } catch (e) { /* bozuk veri: sıfırdan başla */ }
    return DEFAULTS();
  }
  let S = load();
  const U = { tab: 'home', prevTab: 'home', logDate: null, cal: null, req: { items: [], when: '' }, sheet: null, ob: 'role', obv: {}, shv: {} };

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Kaydedilemedi!'); }
  }
  function save() { persist(); schedulePush(); }
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

  // ---------------------------------------------------------------- bağlantı (Merve -> Murat, uçtan uca şifreli; sync.js)
  const SY = window.DonguSync;
  function statePayload() {
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
    return { v: 2, n: S.set.her, h: S.set.him, p: S.periods.slice(-10).map(p => [p.s, p.e || '']), c: S.set.cycle, l: S.set.period, u: S.set.luteal, d, cs, t: Date.now() };
  }
  function applyState(o) {
    const days = {};
    for (const [k, v] of Object.entries(o.d || {})) days[k] = { flow: v.f || '', pains: v.p || {}, sym: v.s || [], mood: v.m || [], sex: v.x || '', ov: v.o || '' };
    S.partner = { periods: (o.p || []).map(([s, e]) => ({ s, e })), cycle: o.c, period: o.l, luteal: o.u, days, cs: o.cs || {}, t: o.t };
    if (o.n) S.set.her = o.n;
    if (o.h) S.set.him = o.h;
  }
  const softRender = () => { const a = document.activeElement; if (!a || !a.matches('input,textarea')) render(); };

  // Merve: her kayıttan sonra durumu gönder, bekleyen istekleri yolla
  let pushTimer, pushing = false;
  function schedulePush() {
    if (S.role !== 'merve' || !S.pair) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, 1500);
  }
  async function pushNow() {
    if (S.role !== 'merve' || !S.pair || pushing) return;
    pushing = true;
    const before = JSON.stringify([S.pair.linked, S.reqs.map(r => r.sent)]);
    try {
      await SY.putState(S.pair.code, statePayload());
      await SY.putDoc(S.pair.code, 'sched', buildSchedule());
      for (const r of S.reqs.filter(x => !x.sent).reverse()) {
        await SY.putMsg(S.pair.code, { id: r.id, items: r.items, when: r.when, t: r.t });
        r.sent = true;
        if (NOTIFY) SY.notify(S.pair.code, 'Döngümüz', `${S.set.her} senden bir şey istiyor 💌`).catch(() => {});
      }
      if (!S.pair.linked && (await SY.isLinked(S.pair.code))) S.pair.linked = Date.now();
    } catch (e) { /* internet yok: sonra tekrar denenir */ }
    pushing = false;
    if (JSON.stringify([S.pair.linked, S.reqs.map(r => r.sent)]) !== before) { persist(); softRender(); }
  }

  // Murat: Merve'nin durumunu ve yeni istekleri çek
  let pulling = false;
  async function pullNow(manual) {
    if (S.role !== 'murat' || !S.pair || pulling) return;
    pulling = true;
    try {
      const st = await SY.getState(S.pair.code);
      if (st) applyState(st);
      const last = S.inbox.length ? S.inbox[S.inbox.length - 1].st : 0;
      const ids = new Set(S.inbox.map(m => m.id));
      const fresh = (await SY.msgsAfter(S.pair.code, last)).filter(m => !ids.has(m.id));
      S.inbox = [...S.inbox, ...fresh].slice(-200);
      S.pair.pulledAt = Date.now();
      persist();
      softRender();
      maybeShowNews();
      if (manual) toast('Güncellendi ✓');
    } catch (e) { if (manual) toast('İnternet bağlantısı yok'); }
    pulling = false;
  }
  async function connect(code) {
    const n = SY.normCode(code);
    if (n.length !== 10) { toast('Kod 10 karakter olmalı'); return; }
    toast('Bağlanılıyor…');
    let st;
    try { st = await SY.getState(n); } catch (e) { toast('İnternet bağlantısı yok'); return; }
    if (!st) { toast(`Kod bulunamadı. ${ek(S.set.her, 'in')} ekranındaki kodu kontrol et.`); return; }
    S.pair = { code: n, topic: await SY.topic(n) };
    S.inbox = [];
    S.inboxSeen = 0;
    applyState(st);
    persist();
    SY.ack(n).catch(() => {});
    U.tab = 'home';
    render();
    toast(`${ek(S.set.her, 'e')} bağlandın ✓`);
    pullNow();
  }
  function ensurePair() {
    if (S.role === 'merve' && !S.pair) { S.pair = { code: SY.newCode(), linked: 0 }; persist(); pushNow(); }
  }

  const reqItem = id => { for (const g of C.REQUEST_GROUPS) { const it = g.items.find(x => x.id === id); if (it) return it; } return null; };
  async function sendRequest(items, when) {
    const r = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: Date.now(), items, when, sent: false };
    S.reqs.unshift(r);
    S.reqs = S.reqs.slice(0, 30);
    persist();
    render();
    clearTimeout(pushTimer);
    await pushNow();
    toast(r.sent ? `${ek(S.set.him, 'e')} gönderildi ✓` : 'İnternet yok; bağlanınca kendiliğinden gönderilecek');
  }

  // ---------------------------------------------------------------- dönem değişimi haberleri (ekranda + sabah 10:00 bildirim)
  function eventKeysOn(E, d, T) {
    const inf = dayInfo(E, d, T), prev = dayInfo(E, addDays(d, -1), T);
    if (!inf || !prev) return [];
    const keys = [];
    if (inf.phase !== prev.phase && inf.phase !== 'gecikme') keys.push(inf.phase === 'regl' && inf.pPred ? 'regl_tahmin' : inf.phase);
    if (inf.phase === 'gecikme' && inf.lateDays === 2) keys.push('gecikme'); // 1 gün gecikme normal, 2. günde haber ver
    if (inf.fertile && !prev.fertile && inf.phase !== 'yumurtlama') keys.push('dogurgan');
    return keys;
  }
  function eventText(key, who, E, d, T) {
    const ev = C.EVENTS[key], inf = dayInfo(E, d, T);
    const vars = {
      her: S.set.her, him: S.set.him,
      fs: fmtS(addDays(inf.start, inf.O - 6)), fe: fmtS(addDays(inf.start, inf.O)),
      ovu: fmtS(addDays(inf.start, inf.O - 1)), next: fmtS(addDays(inf.start, inf.len)),
    };
    const fill = s => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] || '');
    return { key, e: ev.e, title: fill(ev[who][0]), body: fill(ev[who][1]) };
  }
  function newsFor(who, E, d, T) {
    return eventKeysOn(E, d, T).map(k => eventText(k, who, E, d, T));
  }
  function todaysNews() {
    const T = today(), E = curE();
    return E && E.ps.length ? newsFor(S.role === 'merve' ? 'her' : 'him', E, T, T) : [];
  }
  // Merve'nin telefonu önümüzdeki 60 günün haberlerini hesaplar; sunucu her sabah bugününkini yollar
  function buildSchedule() {
    const T = today(), E = mE(), items = [];
    if (!E.ps.length) return { v: 1, items };
    const merge = arr => ({ t: arr.map((x, i) => (i ? x.title : `${x.e} ${x.title}`)).join(' · '), b: arr.map(x => x.body).join(' ') });
    for (let i = 0; i < 60; i++) {
      const d = addDays(T, i), her = newsFor('her', E, d, T);
      if (her.length) items.push({ d, her: merge(her), him: merge(newsFor('him', E, d, T)) });
    }
    const st = statusOf(E, T);
    if (st && st.next && !st.late) { // kayıt girilmezse 2. günde "gecikti" haberi
      const d = addDays(st.next, 2);
      items.push({ d, her: merge([eventText('gecikme', 'her', E, d, T)]), him: merge([eventText('gecikme', 'him', E, d, T)]) });
      items.sort((a, b) => (a.d < b.d ? -1 : 1));
    }
    return { v: 1, items };
  }
  function newsCard(items) {
    if (!items.length) return '';
    return `<section class="card tinted"><h2>📣 Bugün</h2><div class="list">${items.map(n => `<div class="li"><span class="ic">${n.e}</span><div class="grow"><div class="t">${esc(n.title)}</div><div class="s">${esc(n.body)}</div></div></div>`).join('')}</div></section>`;
  }
  // günün ilk açılışında bir kez sayfa olarak göster
  function maybeShowNews() {
    if (!S.role || U.sheet) return;
    const T = today();
    if (S.newsSeen === T || !todaysNews().length) return;
    S.newsSeen = T;
    persist();
    U.sheet = { type: 'news' };
    render();
  }

  // ---------------------------------------------------------------- iPhone web bildirimi (sabah 10:00)
  const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const pushState = () => (!pushSupported() ? 'none' : Notification.permission === 'denied' ? 'denied' : Notification.permission === 'granted' && S.set.push ? 'on' : 'off');
  function keyBytes(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
  async function saveSubscription(ask) {
    if (!S.pair) return false;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub && ask) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(window.DONGU_CONFIG.vapidPublic) });
    if (!sub) return false;
    if (sub.endpoint !== S.set.pushEndpoint) {
      await SY.putDoc(S.pair.code, S.role === 'merve' ? 'subher' : 'subhim', { sub: sub.toJSON(), t: Date.now() });
      S.set.pushEndpoint = sub.endpoint;
    }
    S.set.push = true;
    persist();
    return true;
  }
  async function enablePush() {
    if (!pushSupported()) { toast(standalone() ? 'Bu cihaz bildirim desteklemiyor' : 'Önce Paylaş → Ana Ekrana Ekle, sonra uygulamayı simgeden aç'); return; }
    if (!S.pair) { toast(S.role === 'murat' ? `Önce ${ek(S.set.her, 'e')} bağlan` : 'Bağlantı kodu hazırlanıyor, birazdan tekrar dene'); return; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('Bildirim izni verilmedi'); render(); return; }
    try { await saveSubscription(true); toast('Bildirimler açıldı ✓'); } catch (e) { toast('Bildirim açılamadı, internet bağlantısını kontrol et'); }
    render();
  }
  function pushCard(inSettings) {
    if (!NOTIFY) return '';
    const st = pushState();
    if (!inSettings && (st !== 'off' || S.set.pushHide)) return '';
    const other = S.role === 'merve' ? S.set.him : S.set.her;
    const what = `Kanama bitti, doğurgan pencere, yumurtlama, PMS gibi dönem değişimlerinde sabah 10:00’da hem sana hem ${ek(other, 'e')} bildirim gelir.`;
    let body;
    if (st === 'on') body = `<p class="small">✓ Açık. ${what}</p><button class="btn block" style="margin-top:12px" data-a="testPush">Test bildirimi</button>`;
    else if (st === 'denied') body = `<p class="small">Bildirim izni kapalı. iPhone <b>Ayarlar → Bildirimler → Döngümüz</b>’den izin ver.</p>`;
    else if (st === 'none') body = `<p class="small">${what}</p><p class="small muted" style="margin-top:8px">Bildirim için uygulamayı <b>Paylaş → Ana Ekrana Ekle</b> ile kurup simgeden açmalısın.</p>`;
    else body = `<p class="small">${what}</p><div class="btn-row" style="margin-top:12px"><button class="btn primary" data-a="enablePush">Bildirimleri aç</button>${inSettings ? '' : '<button class="btn" data-a="hidePush">Sonra</button>'}</div>`;
    return `<section class="card${inSettings ? '' : ' tinted'}"><h2>🔔 Sabah bildirimleri</h2>${body}</section>`;
  }

  // ---------------------------------------------------------------- simgeler (çizgi: içerik; dolu: sekme çubuğu, HIG "prefer filled")
  const ICON = {
    back: '<path d="M15 5l-7 7 7 7"/>',
    left: '<path d="M15 6l-6 6 6 6"/>',
    right: '<path d="M9 6l6 6-6 6"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
  };
  const FILL = {
    home: '<path d="M11.2 2.7a1.2 1.2 0 0 1 1.6 0l8.7 7.4c.5.4.2 1.3-.5 1.3H19v8.1A1.5 1.5 0 0 1 17.5 21H15v-5.6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1V21H6.5A1.5 1.5 0 0 1 5 19.5v-8.1H3c-.7 0-1-.9-.5-1.3z"/>',
    cal: '<path d="M7 2.4a1 1 0 0 1 1 1V5h8V3.4a1 1 0 1 1 2 0V5h.6A2.4 2.4 0 0 1 21 7.4V9H3V7.4A2.4 2.4 0 0 1 5.4 5H6V3.4a1 1 0 0 1 1-1zM3 10.6h18v8A2.4 2.4 0 0 1 18.6 21H5.4A2.4 2.4 0 0 1 3 18.6z"/>',
    heart: '<path d="M12 20.6c-.3 0-.6-.1-.8-.3C7.6 17.6 2.5 13.6 2.5 8.8 2.5 6 4.6 3.6 7.4 3.6c1.9 0 3.5 1 4.6 2.6 1.1-1.6 2.7-2.6 4.6-2.6 2.8 0 4.9 2.4 4.9 5.2 0 4.8-5.1 8.8-8.7 11.5-.2.2-.5.3-.8.3z"/>',
    chart: '<rect x="3.5" y="12" width="4.2" height="9" rx="1.4"/><rect x="9.9" y="3.5" width="4.2" height="17.5" rx="1.4"/><rect x="16.3" y="8" width="4.2" height="13" rx="1.4"/>',
    book: '<path d="M4 4.9A2.4 2.4 0 0 1 6.4 2.5H19a1 1 0 0 1 1 1V18H6.4a1.25 1.25 0 0 0 0 2.5H20v.5a1 1 0 0 1-1 1H6.4A2.4 2.4 0 0 1 4 19.6z"/>',
    chat: '<path d="M12 3c5.1 0 9.2 3.5 9.2 7.8S17.1 18.6 12 18.6c-1 0-2-.1-2.9-.4l-3.9 1.9c-.6.3-1.3-.3-1.1-.9l.9-3.1C3.6 14.7 2.8 12.8 2.8 10.8 2.8 6.5 6.9 3 12 3z"/>',
    gear: '<path fill-rule="evenodd" d="M10.6 2.3h2.8l.5 2.6c.7.2 1.3.5 1.9.9l2.3-1.4 2 2-1.4 2.3c.4.6.7 1.2.9 1.9l2.6.5v2.8l-2.6.5c-.2.7-.5 1.3-.9 1.9l1.4 2.3-2 2-2.3-1.4c-.6.4-1.2.7-1.9.9l-.5 2.6h-2.8l-.5-2.6c-.7-.2-1.3-.5-1.9-.9l-2.3 1.4-2-2 1.4-2.3c-.4-.6-.7-1.2-.9-1.9l-2.6-.5v-2.8l2.6-.5c.2-.7.5-1.3.9-1.9L4 6.4l2-2 2.3 1.4c.6-.4 1.2-.7 1.9-.9zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z"/>',
  };
  const svg = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;
  const svgF = n => `<svg viewBox="0 0 24 24" fill="currentColor">${FILL[n]}</svg>`;

  // ---------------------------------------------------------------- ortak parçalar
  // iOS gezinme çubuğu: solda/sağda cam daire düğmeler, kaydırınca ortada küçük başlık; altında büyük başlık
  function top(title, sub, right, left) {
    // Murat'ta Ayarlar zaten sekme; sağ üst dişli sadece Merve'de
    const r = right != null ? right : S.role === 'merve' ? `<button class="icon-btn glass" data-a="tab" data-v="settings" aria-label="Ayarlar">${svgF('gear')}</button>` : '';
    return `<div class="navbar"><div class="nav-l">${left || ''}</div><div class="nav-t">${title}</div><div class="nav-r">${r}</div></div>
      <header class="lt"><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</header>`;
  }
  const backBtn = () => `<button class="icon-btn glass" data-a="back" aria-label="Geri">${svg('back')}</button>`;
  function tabList() {
    return S.role === 'merve'
      ? [['home', 'Bugün', 'home'], ['cal', 'Takvim', 'cal'], ['ask', 'İstek', 'heart'], ['stats', 'Analiz', 'chart']]
      : [['home', 'Bugün', 'home'], ['inbox', S.set.her, 'chat'], ['cal', 'Takvim', 'cal'], ['guide', 'Rehber', 'book'], ['settings', 'Ayarlar', 'gear']];
  }
  function tabbar() {
    const tabs = tabList(), i = tabs.findIndex(t => t[0] === U.tab);
    const n = S.role === 'murat' ? unread() : 0;
    let h = `<div class="tabdock"><nav class="tabbar glass" style="--n:${tabs.length}">${i >= 0 ? `<i class="tab-lens" style="--i:${i}"></i>` : ''}`;
    h += tabs.map(([id, t, ic]) => `<button class="${U.tab === id ? 'on' : ''}" data-a="tab" data-v="${id}" aria-label="${esc(t)}">${svgF(ic)}<span>${esc(t)}</span>${id === 'inbox' && n ? `<i class="tab-badge">${n}</i>` : ''}</button>`).join('');
    h += '</nav>';
    // Kaydet: ayrı, renkli cam daire (HIG: birincil eylem renkli)
    if (S.role === 'merve') h += `<button class="fab glass prominent ${U.tab === 'log' ? 'on' : ''}" data-a="tab" data-v="log" aria-label="Kaydet">${svg('plus')}</button>`;
    return h + '</div>';
  }
  const li = arr => arr.map(x => `<li>${esc(x)}</li>`).join('');
  const PC = ph => `var(--c-${ph})`;

  function arc(cx, cy, r, a0, a1) {
    const p = a => { const t = (a - 90) * Math.PI / 180; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; };
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  function ring(st, E) {
    const len = st.len, total = st.late ? st.cd : len, R = 104, W = 16;
    const deg = d => (d / total) * 360;
    const gap = Math.min(5, deg(1) * 0.35), cap = (W / 2 / R) * 180 / Math.PI; // yuvarlak uç payı
    let segs = [[1, E.pLen, 'regl'], [E.pLen + 1, st.O - 3, 'folikuler'], [st.O - 2, st.O + 1, 'yumurtlama'], [st.O + 2, len - 5, 'luteal'], [len - 4, len, 'pms'], [len + 1, total, 'gecikme']];
    let prev = 0;
    segs = segs.map(([a, b, ph]) => { a = Math.max(a, prev + 1); b = Math.min(b, total); prev = Math.max(prev, b); return [a, b, ph]; }).filter(([a, b]) => b >= a);
    let out = '';
    for (const [a, b, ph] of segs) {
      const a0 = deg(a - 1) + gap / 2 + cap, end = x => Math.max(a0 + .1, deg(x) - gap / 2 - cap);
      out += `<path d="${arc(120, 120, R, a0, end(b))}" stroke="${PC(ph)}" stroke-opacity=".2" stroke-width="${W}" fill="none"/>`;
      if (a <= st.cd) out += `<path d="${arc(120, 120, R, a0, end(Math.min(b, st.cd)))}" stroke="${PC(ph)}" stroke-width="${W}" fill="none"/>`;
    }
    const t = ((deg(st.cd - 0.5) - 90) * Math.PI) / 180;
    out += `<circle cx="${(120 + R * Math.cos(t)).toFixed(2)}" cy="${(120 + R * Math.sin(t)).toFixed(2)}" r="13" fill="#fff" stroke="var(--card)" stroke-width="3" style="filter:drop-shadow(0 2px 4px rgb(0 0 0 / .25))"/>`;
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
    return `<div class="sendbar glass"><div class="grow"><b>Seçilenler</b><div class="e">${emojis}</div></div>
      <button class="btn sm" data-a="reqClear">Temizle</button><button class="btn primary sm" data-a="sendReq">Gönder</button></div>`;
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
    h += newsCard(todaysNews());
    h += pushCard(false);
    h += heroCard(st, E, 'merve');
    h += pairCard();
    h += alerts(st, E, S.days, T, 'merve');
    const quickPains = ['kramp', 'bel', 'bas', 'gogus'].map(id => painChip(C.PAINS.find(p => p.id === id), T, (L.pains || {})[id] || 0)).join('');
    const quickSym = ['siskinlik', 'yorgunluk'].map(id => togChip('sym', C.SYMPTOMS.find(s => s.id === id), T, (L.sym || []).includes(id))).join('');
    const quickMood = ['hassas', 'sinirli', 'mutlu'].map(id => togChip('mood', C.MOODS.find(s => s.id === id), T, (L.mood || []).includes(id))).join('');
    h += `<section class="card"><h2>Bugün nasılsın?<button class="right" data-a="logDate" data-d="${T}">Detaylı kayıt →</button></h2>
      <div class="chips">${quickPains}${quickSym}${quickMood}</div>
      <p class="tiny muted" style="margin-top:8px">Ağrıya her dokunuşta şiddet artar: hafif → orta → şiddetli → kapalı.</p></section>`;
    h += `<section class="card"><h2>💌 ${ek(him, 'den')} iste<button class="right" data-a="tab" data-v="ask">Tümü →</button></h2>
      ${quickTiles()}
      <p class="tiny muted" style="margin-top:8px">İstediğin kadarını seç, alttaki <b>Gönder</b>’e bas: hepsi tek mesajda ${ek(him, 'in')} uygulamasına gider.</p></section>`;
    h += riskCard(st, E, T);
    h += `<section class="card"><h2>${ph.emoji} ${ph.name} fazı: kendin için</h2><p class="small muted">${esc(ph.her)}</p><ul class="tips" style="margin-top:10px">${li(ph.self)}</ul></section>`;
    h += `<section class="card tinted"><h2>💙 ${ek(him, 'in')} bu fazdaki görevi</h2><p class="small">${esc(ph.murat.summary)}</p>
      <ul class="tips" style="margin-top:10px">${li(pick(ph.murat.do, 3, seed))}</ul>
      <button class="btn ghost block" data-a="tab" data-v="guide">${ek(him, 'in')} tüm rehberini gör →</button></section>`;
    h += upcomingCard(st, E, T);
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
    let h = top(`${ek(him, 'den')} iste`, `Seç ve gönder: ${ek(him, 'in')} uygulamasına düşer`, '') + '<main>';
    h += `<section class="card"><h2>⚡ Sık istenenler</h2>${quickTiles()}<p class="tiny muted" style="margin-top:8px">Birden fazla seçebilirsin; aşağıdan daha fazlasını da ekle.</p></section>`;
    h += `<section class="card"><h2>🧺 Daha fazla</h2>${C.REQUEST_GROUPS.map(g => `<h3>${g.t}</h3><div class="tiles small">${g.items.map(it => `<button class="tile ${R.items.includes(it.id) ? 'on' : ''}" data-a="reqToggle" data-id="${it.id}"><span class="e">${it.e}</span><span class="t">${it.t}</span></button>`).join('')}</div>`).join('')}
      <h3>Ne zaman?</h3><div class="chips">${C.WHEN.map(w => `<button class="chip ${R.when === w.id ? 'on' : ''}" data-a="reqWhen" data-v="${w.id}">${w.t}</button>`).join('')}</div></section>`;
    if (S.reqs.length) {
      h += `<section class="card"><h2>🕘 Son istekler</h2><div class="list">${S.reqs.slice(0, 8).map((r, i) => `<div class="li"><span class="ic">${(reqItem(r.items[0]) || { e: '💌' }).e}</span>
        <div class="grow"><div class="t">${r.items.map(id => (reqItem(id) || {}).t).filter(Boolean).join(', ')}</div><div class="s">${ago(r.t)} · ${r.sent ? '✓ gönderildi' : '⏳ internet bekleniyor'}</div></div>
        <button class="btn sm" data-a="resendReq" data-i="${i}">Tekrar</button></div>`).join('')}</div></section>`;
    }
    return h + '</main>';
  }
  function pairCard() {
    if (!S.pair || S.pair.linked) return '';
    const him = esc(S.set.him);
    return `<section class="card tinted"><h2>🔗 ${ek(S.set.him, 'i')} bağla</h2>
      <p class="small">${him} kendi telefonunda uygulamayı açıp <b>Ben ${him}</b> desin ve bu kodu girsin:</p>
      <div class="code">${SY.showCode(S.pair.code)}</div>
      <p class="tiny muted">Bağlanınca bu kart kaybolur. Kodu Ayarlar’da da bulabilirsin.</p></section>`;
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
  function connectCard() {
    const her = esc(S.set.her);
    return `<section class="card"><h2>🔗 ${ek(S.set.her, 'e')} bağlan</h2>
      <p class="small">Sen hiçbir tarih girmiyorsun; her şeyi ${her} kendi telefonunda girer. ${her} uygulamayı açınca ana sayfasında 10 karakterlik bir kod görecek. O kodu buraya yaz:</p>
      <input class="in code-in" style="margin-top:12px" data-in="ob.code" placeholder="XXXXX-XXXXX" autocapitalize="characters" autocomplete="off" spellcheck="false" value="${esc(U.obv.code || '')}">
      <button class="btn primary block" style="margin-top:12px" data-a="connect">Bağlan</button></section>`;
  }
  const hhmm = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const isoOf = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const unread = () => S.inbox.filter(m => m.st > S.inboxSeen).length;
  function msgBubble(m) {
    const w = m.when && C.WHEN.find(x => x.id === m.when);
    return `<div class="bubble"><div class="items">${m.items.map(id => { const it = reqItem(id); return it ? `<div>${it.e} ${esc(it.m)}</div>` : ''; }).join('')}</div>
      <div class="meta">${w ? `<span>${w.t}</span>` : ''}<span>${hhmm(m.t)}</span></div></div>`;
  }

  function vHisHome() {
    const T = today(), E = pE(), her = S.set.her;
    let h = top(`Merhaba ${esc(S.set.him)}`, fmtW(T)) + '<main>';
    if (!S.pair) return h + connectCard() + '</main>';
    if (!E || !E.ps.length) return h + `<section class="card"><p class="small">${esc(her)} henüz regl tarihlerini girmemiş. Girdiğinde burada görünecek.</p></section></main>`;
    const st = statusOf(E, T), ph = C.PHASES[st.phase], seed = dnum(T);
    const P = S.partner, n = unread();
    if (n) {
      const last = S.inbox[S.inbox.length - 1];
      h += `<section class="card tinted"><h2>💌 ${esc(her)} senden istiyor${n > 1 ? ` <span class="badge">${n}</span>` : ''}</h2>${msgBubble(last)}
        <button class="btn primary block" style="margin-top:12px" data-a="tab" data-v="inbox">Mesajları aç</button></section>`;
    }
    h += newsCard(todaysNews());
    h += pushCard(false);
    h += heroCard(st, E, 'murat');
    // Merve'nin bugünkü işaretleri: mesaj değil, hep burada durur
    const L = (P.days || {})[T];
    const has = L && (L.flow || Object.keys(L.pains || {}).length || (L.sym || []).length || (L.mood || []).length);
    let body;
    if (has) {
      const ids = [...Object.entries(L.pains || {}).sort((a, b) => b[1] - a[1]).map(([id]) => id), ...(L.sym || []), ...(L.mood || [])];
      const tips = [...new Set(ids.map(id => C.HIS_TIPS[id]).filter(Boolean))].slice(0, 5);
      if (L.flow === 'h') tips.unshift('Yoğun kanama: çok yorulabilir. Ped stoğunu kontrol et, demirli bir yemek hazırla.');
      body = logSummary(L, P.cs) + (tips.length ? `<h3>Buna göre</h3><ul class="tips">${li(tips)}</ul>` : '');
    } else body = `<p class="small muted">${esc(her)} bugün henüz bir şey işaretlemedi.</p>`;
    h += `<section class="card"><h2>🩺 ${esc(her)} bugün<span class="right muted tiny" style="font-weight:500">${P.t ? ago(P.t) : ''}</span></h2>${body}</section>`;
    h += alerts(st, E, P.days || {}, T, 'murat');
    h += `<section class="card"><h2>🎯 Bugün nasıl davranmalısın?</h2><p class="small">${esc(ph.murat.summary)}</p>
      <h3>Yap</h3><ul class="tips">${li(pick(ph.murat.do, 3, seed))}</ul>
      <h3>Yapma</h3><ul class="tips no">${li(pick(ph.murat.dont, 2, seed))}</ul>
      <h3>Söyleyebileceğin bir cümle</h3><ul class="tips say">${li(pick(ph.murat.say, 1, seed))}</ul>
      ${ph.murat.surprise.length ? `<h3>Sürpriz fikri</h3><ul class="tips say">${li(pick(ph.murat.surprise, 1, seed))}</ul>` : ''}
      <button class="btn ghost" style="margin-top:6px" data-a="tab" data-v="guide">Tüm rehber →</button></section>`;
    h += riskCard(st, E, T);
    h += upcomingCard(st, E, T);
    if (NOTIFY && !S.set.ntfyHide) h += `<section class="card"><h2>🔔 Bildirim al</h2><p class="small muted">${esc(her)} bir şey istediğinde telefonuna bildirim düşsün mü? Ücretsiz ntfy uygulamasıyla 1 dakikada kurulur.</p>
      <div class="btn-row" style="margin-top:10px"><button class="btn primary" data-a="tab" data-v="settings">Nasıl kurulur?</button><button class="btn" data-a="hideNtfy">Gizle</button></div></section>`;
    return h + '</main>';
  }

  function vInbox() {
    const her = S.set.her;
    let h = top(`${ek(her, 'den')}`, 'Sadece istekler · buradan yazılamaz', `<button class="icon-btn glass" data-a="refresh" aria-label="Yenile">${svg('refresh')}</button>`) + '<main>';
    if (!S.pair) return h + connectCard() + '</main>';
    if (!S.inbox.length) return h + `<section class="card center"><div style="font-size:40px">💌</div><p class="small muted" style="margin-top:8px">Henüz istek yok. ${esc(her)} “${ek(S.set.him, 'den')} iste” ekranından bir şey gönderince burada görünecek.</p></section></main>`;
    let day = '', out = '';
    const T = today();
    for (const m of S.inbox) {
      const d = isoOf(m.t);
      if (d !== day) { day = d; out += `<div class="day-sep">${d === T ? 'Bugün' : d === addDays(T, -1) ? 'Dün' : fmtW(d)}</div>`; }
      out += msgBubble(m);
    }
    return h + `<div class="chat">${out}</div></main>`;
  }

  function vGuide() {
    const T = today(), E = curE(), st = E && E.ps.length ? statusOf(E, T) : null;
    let h = top('Rehber', S.role === 'merve' ? `${ek(S.set.him, 'in')} gördüğü rehber` : `${ek(S.set.her, 'in')} döngüsü ve senin rolün`, '', S.role === 'merve' ? backBtn() : '') + '<main>';
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
      <div class="legend"><span><i style="background:var(--c-regl)"></i>Regl</span><span><i style="box-shadow:inset 0 0 0 2px var(--c-regl)"></i>Tahmini regl</span>
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
    let h = top('Ayarlar', '', '', merve ? backBtn() : '') + '<main>';
    h += `<section class="card"><h2>👥 Kişiler</h2>
      <div class="btn-row"><label class="f">Takip eden<input class="in" data-in="set.her" value="${esc(s.her)}"></label><label class="f">Partner<input class="in" data-in="set.him" value="${esc(s.him)}"></label></div></section>`;
    const g = s.glass == null ? 50 : s.glass;
    h += `<section class="card"><h2>✨ Görünüm</h2><p class="small muted">Liquid Glass şeffaflığı (iOS 27’deki gibi). Alttaki sekme çubuğuna bakarak ayarla.</p>
      <input class="slider" type="range" min="0" max="100" step="1" value="${g}" style="--val:${g}%" data-in="glass" aria-label="Cam şeffaflığı">
      <div class="slider-labels"><span>Şeffaf</span><span>Buzlu</span></div></section>`;
    h += pushCard(true);
    if (merve) {
      h += `<section class="card"><h2>🔗 ${ek(s.him, 'le')} bağlantı</h2>
        <p class="small">${S.pair && S.pair.linked ? `✓ ${esc(s.him)} bağlı.` : `${esc(s.him)} henüz bağlanmadı. Kendi uygulamasında <b>Ben ${esc(s.him)}</b> deyip bu kodu girsin:`}</p>
        ${S.pair ? `<div class="code">${SY.showCode(S.pair.code)}</div>` : ''}
        <p class="tiny muted">Kayıtların şifrelenip ${ek(s.him, 'in')} uygulamasına kendiliğinden gider.${NOTIFY ? ` İstek gönderdiğinde ${ek(s.him, 'in')} telefonuna bildirim düşer; senin ayrıca bir şey kurmana gerek yok.` : ''}</p>
        <button class="btn block" style="margin-top:10px" data-a="newCode">Yeni kod oluştur</button></section>`;
      h += `<section class="card"><h2>🔁 Döngü</h2><p class="small muted">Başlangıç değerleri. Kayıt ekledikçe uygulama senin gerçek ortalamanı öğrenir.</p><div class="stack" style="margin-top:12px">
        <label class="f">Döngü uzunluğu${stepper('set.cycle', s.cycle, 20, 45, 'gün')}</label>
        <label class="f">Regl süresi${stepper('set.period', s.period, 2, 10, 'gün')}</label>
        <label class="f">Luteal faz (yumurtlamadan regle)${stepper('set.luteal', s.luteal, 10, 16, 'gün')}</label></div></section>`;
    } else {
      const P = S.partner;
      h += S.pair
        ? `<section class="card"><h2>🔗 ${ek(s.her, 'le')} bağlantı</h2><p class="small">✓ Bağlı${P && P.t ? ` · son güncelleme ${ago(P.t)}` : ''}</p>
            <div class="btn-row" style="margin-top:10px"><button class="btn" data-a="refresh">Şimdi yenile</button><button class="btn" data-a="unpair">Bağlantıyı kaldır</button></div></section>`
        : connectCard();
      if (NOTIFY && S.pair && S.pair.topic) {
        h += `<section class="card"><h2>🔔 Bildirim (ntfy)</h2>
          <ol class="small" style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px">
            <li>App Store’dan ücretsiz <b>ntfy</b> uygulamasını indir.</li>
            <li>ntfy’da sağ üstteki <b>＋</b>’ya bas, “Topic name” kutusuna aşağıdaki adı yapıştır, <b>Subscribe</b> de.</li>
            <li>Bildirim izni sorarsa <b>İzin ver</b>.</li></ol>
          <div class="code small-code">${esc(S.pair.topic)}</div>
          <div class="btn-row"><button class="btn" data-a="copyTopic">Adı kopyala</button><button class="btn" data-a="testNotify">Test bildirimi</button></div>
          <p class="tiny muted" style="margin-top:8px">Bildirimde sadece “${esc(s.her)} senden bir şey istiyor 💌” yazar; ne istediği uygulamada görünür.</p></section>`;
      }
    }
    h += `<section class="card"><h2>💾 Yedek</h2><p class="small muted">Uygulamayı Ana Ekran’a eklediysen veriler kalıcıdır. Yine de arada bir yedek al.</p>
      <div class="btn-row" style="margin-top:12px"><button class="btn" data-a="export">Yedeği indir</button><label class="btn" style="position:relative">Yedeği yükle<input type="file" accept="application/json,.json" data-in="import" style="position:absolute;inset:0;opacity:0"></label></div></section>`;
    h += `<section class="card"><h2>🔒 Gizlilik</h2><p class="small">Hesap yok, reklam yok. ${ek(s.her, 'in')} kayıtları telefonunda şifrelenir ve sadece ${ek(s.him, 'in')} telefonu çözebilir; Google’ın sunucusu yalnızca şifreli veriyi taşır. Notlar hiç gönderilmez.</p></section>`;
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
        </div>
        <button class="btn primary block" data-a="obDone" data-v="merve">Başla</button><button class="btn ghost" data-a="obRole" data-v="role">← Geri</button></div>`;
    }
    return `<div class="ob"><div class="logo">🌸💙</div><h1>Döngümüz</h1>
      <p class="lead">${esc(her)} ve ${esc(him)} için regl takibi.<br>Kayıtlar şifreli, sadece ikinizin telefonunda.</p>
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
    } else if (sh.type === 'news') {
      const ph = st => C.PHASES[st.phase];
      const E = curE(), stt = E && E.ps.length ? statusOf(E, T) : null;
      const tips = stt ? (S.role === 'merve' ? ph(stt).self.slice(0, 2) : pick(ph(stt).murat.do, 2, dnum(T))) : [];
      b = `<h2>📣 Bugün</h2><div class="list" style="margin-top:6px">${todaysNews().map(n => `<div class="li"><span class="ic">${n.e}</span><div class="grow"><div class="t">${esc(n.title)}</div><div class="s">${esc(n.body)}</div></div></div>`).join('')}</div>
        ${tips.length ? `<h3 style="color:var(--label2);font-size:15px;margin:14px 0 8px">${S.role === 'merve' ? 'Kendin için' : 'Bugün senden beklenen'}</h3><ul class="tips">${li(tips)}</ul>` : ''}
        <button class="btn primary block" style="margin-top:16px" data-a="closeSheet">Tamam</button>`;
    } else if (sh.type === 'addPeriod') {
      b = `<h2>Geçmiş regl ekle</h2><div class="stack"><label class="f">Başlangıç<input class="in" type="date" max="${T}" data-in="sh.date" value="${v.date || ''}"></label>
        <label class="f">Kaç gün sürdü?${stepper('sh.len', v.len || S.set.period, 1, 12, 'gün')}</label>
        <button class="btn primary block" data-a="confirmAdd">Ekle</button></div>`;
    }
    return `<div class="backdrop" data-a="closeSheet"></div><div class="sheet" role="dialog"><div class="grab"></div>${b}</div>`;
  }

  // ---------------------------------------------------------------- render
  const VIEWS_HER = { home: vMerveHome, cal: vCal, log: vLog, ask: vAsk, stats: vStats, settings: vSettings, guide: vGuide };
  const VIEWS_HIM = { home: vHisHome, inbox: vInbox, cal: vCal, guide: vGuide, settings: vSettings };
  // iOS 27 cam şeffaflığı: 0 = en şeffaf, 100 = en buzlu
  function applyLook() {
    const g = S.set.glass == null ? 50 : S.set.glass;
    document.documentElement.style.setProperty('--ga', (0.24 + g / 100 * 0.6).toFixed(3));
  }
  let lensFrom = -1;
  function render() {
    const root = document.documentElement;
    root.dataset.role = S.role || 'merve';
    const E = S.role ? curE() : null, st = E && E.ps.length ? statusOf(E, today()) : null;
    if (st) root.dataset.phase = st.phase; else delete root.dataset.phase;
    applyLook();
    const app = document.getElementById('app');
    if (!S.role) app.innerHTML = vOnboard();
    else {
      const views = S.role === 'merve' ? VIEWS_HER : VIEWS_HIM;
      if (!views[U.tab]) U.tab = 'home';
      if (U.tab === 'inbox' && S.inbox.length && S.inbox[S.inbox.length - 1].st > S.inboxSeen) { S.inboxSeen = S.inbox[S.inbox.length - 1].st; persist(); }
      const bar = sendBar();
      app.innerHTML = views[U.tab]() + (bar ? '<div style="height:76px"></div>' + bar : '') + tabbar();
      // seçili sekme merceği bir öncekinden kayarak gelsin
      const lens = app.querySelector('.tab-lens'), to = tabList().findIndex(t => t[0] === U.tab);
      if (lens && lensFrom >= 0 && lensFrom !== to) {
        lens.style.transition = 'none'; lens.style.setProperty('--i', lensFrom); void lens.offsetWidth;
        lens.style.transition = ''; lens.style.setProperty('--i', to);
      }
      lensFrom = to;
    }
    onScroll();
    document.getElementById('sheet').innerHTML = sheetHtml();
  }
  function onScroll() { document.documentElement.classList.toggle('scrolled', window.scrollY > 38); }
  window.addEventListener('scroll', onScroll, { passive: true });
  function go(tab) {
    if (tab !== U.tab) { U.prevTab = U.tab; U.tab = tab; }
    U.sheet = null;
    render();
    window.scrollTo(0, tab === 'inbox' ? document.body.scrollHeight : 0);
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
  // ---------------------------------------------------------------- eylemler
  const A = {
    tab: el => go(el.dataset.v),
    back: () => go(U.prevTab && U.prevTab !== U.tab ? U.prevTab : 'home'),
    sheet: el => openSheet({ type: el.dataset.v }),
    closeSheet: () => { U.sheet = null; render(); },
    day: el => openSheet({ type: 'day', date: el.dataset.d }),

    startPeriod: el => { if (startPeriod(el.dataset.d)) { U.sheet = null; render(); toast('Regl başladı olarak kaydedildi'); } },
    confirmStart: () => { if (startPeriod(U.shv.date || today())) { U.sheet = null; render(); toast('Regl başladı olarak kaydedildi'); } },
    endPeriod: el => { if (endPeriod(el.dataset.d)) { U.sheet = null; render(); toast('Regl bitti olarak kaydedildi'); } },
    confirmEnd: () => { if (endPeriod(U.shv.date || today())) { U.sheet = null; render(); toast('Regl bitti olarak kaydedildi'); } },
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
    reqClear: () => { U.req = { items: [], when: '' }; render(); },
    reqToggle: el => { const R = U.req, id = el.dataset.id; R.items = R.items.includes(id) ? R.items.filter(x => x !== id) : [...R.items, id]; render(); },
    reqWhen: el => { U.req.when = U.req.when === el.dataset.v ? '' : el.dataset.v; render(); },
    sendReq: () => { const R = U.req; U.req = { items: [], when: '' }; sendRequest(R.items, R.when); },
    resendReq: el => { const r = S.reqs[Number(el.dataset.i)]; sendRequest(r.items, r.when); },
    connect: () => connect(U.obv.code),
    refresh: () => pullNow(true),
    unpair: () => {
      if (!confirm('Bağlantı kaldırılsın mı? Tekrar bağlanmak için kodu yeniden girmen gerekir.')) return;
      S.pair = null; S.partner = null; S.inbox = []; S.inboxSeen = 0; persist(); go('home');
    },
    newCode: () => {
      if (S.pair && S.pair.linked && !confirm(`Yeni kod oluşursa ${S.set.him} yeni kodu girene kadar güncellemeleri göremez. Devam?`)) return;
      S.pair = null; ensurePair(); render();
    },
    copyTopic: async () => { try { await navigator.clipboard.writeText(S.pair.topic); toast('Kopyalandı'); } catch (e) { toast('Kopyalanamadı, elle yaz'); } },
    testNotify: () => SY.notify(S.pair.code, 'Döngümüz', 'Test bildirimi ✓ Kurulum tamam.').then(() => toast('Gönderildi, telefonuna baktın mı?'), () => toast('İnternet bağlantısı yok')),
    enablePush: () => enablePush(),
    hidePush: () => { S.set.pushHide = true; persist(); render(); },
    testPush: async () => {
      try { const reg = await navigator.serviceWorker.ready; await reg.showNotification('Döngümüz', { body: 'Test bildirimi ✓ Sabah 10:00 bildirimleri böyle görünecek.', icon: 'icons/icon-192.png' }); } catch (e) { toast('Bildirim gösterilemedi'); }
    },
    hideNtfy: () => { S.set.ntfyHide = true; persist(); render(); },

    calNav: el => { const [y, m] = U.cal.split('-').map(Number); const d = new Date(y, m - 1 + Number(el.dataset.n), 1); U.cal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; render(); },
    calToday: () => { U.cal = null; render(); },

    step: el => {
      const { k, n, min, max } = el.dataset;
      const cur = Number(getPath(k)) || Number(k === 'ob.p' ? 5 : k === 'sh.len' ? S.set.period : 28);
      setPath(k, Math.min(Number(max), Math.max(Number(min), cur + Number(n))));
      if (k.startsWith('set.')) save();
      render();
    },
    obRole: el => {
      if (el.dataset.v === 'murat') { S.role = 'murat'; U.tab = 'home'; save(); render(); window.scrollTo(0, 0); return; } // Murat bir şey girmez
      U.ob = el.dataset.v; U.obv = {}; render(); window.scrollTo(0, 0);
    },
    obDone: () => {
      const v = U.obv, T = today();
      if (!v.last) return toast('Son regl tarihini seç');
      const P = v.p || 5;
      S.set.period = P; S.set.cycle = v.c || 28;
      S.periods = [...new Set([v.p1, v.p2].filter(d => d && d < v.last))].map(s => ({ s, e: addDays(s, P - 1) }));
      S.periods.push({ s: v.last, e: diff(v.last, T) >= P ? addDays(v.last, P - 1) : '' });
      sortPeriods();
      S.role = 'merve';
      ensurePair();
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
    } else if (k === 'glass') {
      S.set.glass = Number(el.value);
      el.style.setProperty('--val', el.value + '%');
      applyLook();
    } else if (k.startsWith('ob.') || k.startsWith('sh.')) setPath(k, el.value);
  });
  document.addEventListener('change', e => {
    const el = e.target, k = el.dataset.in;
    if (!k) return;
    if (k.startsWith('set.')) {
      const val = el.value.trim();
      if ((k === 'set.her' || k === 'set.him') && !val) { render(); return; }
      setPath(k, val); save(); render();
    } else if (k === 'glass') {
      persist();
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
  async function init() {
    housekeeping();
    ensurePair();
    if (S.role === 'murat' && S.pair && !S.pair.topic) { S.pair.topic = await SY.topic(S.pair.code); persist(); }
    render();
    const sync = () => { if (S.role === 'merve') pushNow(); else pullNow(); };
    sync();
    maybeShowNews();
    if (NOTIFY && pushSupported() && Notification.permission === 'granted' && S.set.push) saveSubscription(false).catch(() => {});
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { softRender(); sync(); } });
    setInterval(() => { if (document.visibilityState === 'visible' && S.role === 'murat') pullNow(); }, 30000);
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  init();
})();
