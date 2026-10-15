// Merve <-> Murat bağlantısı: uçtan uca şifreli, Firestore REST + ntfy bildirimi.
// Sunucu (Google/ntfy) sadece şifreli veriyi görür; anahtar iki telefondaki eşleşme kodundan türetilir.
window.DonguSync = (() => {
  const CFG = window.DONGU_CONFIG;
  const BASE = `https://firestore.googleapis.com/v1/projects/${CFG.projectId}/databases/(default)/documents`;
  const te = new TextEncoder(), td = new TextDecoder();
  const hex = bytes => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  const b64 = bytes => { let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const sha = async s => new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(s)));

  // 10 karakterlik kod, karışan harfler (0/O, 1/I/L) yok
  const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  function newCode() {
    const r = crypto.getRandomValues(new Uint8Array(10));
    return [...r].map(b => ALPHA[b % ALPHA.length]).join('');
  }
  const showCode = c => { const n = normCode(c); return `${n.slice(0, 5)}-${n.slice(5)}`; };

  let cache = null;
  async function pairOf(code) {
    const n = normCode(code);
    if (cache && cache.code === n) return cache;
    const base = await crypto.subtle.importKey('raw', te.encode(n), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: te.encode('dongumuz-key'), iterations: 150000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    cache = { code: n, id: hex(await sha('dongumuz-id:' + n)), topic: 'dongumuz-' + hex(await sha('dongumuz-ntfy:' + n)).slice(0, 20), key };
    return cache;
  }

  async function seal(pair, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, pair.key, te.encode(JSON.stringify(obj))));
    return { c: { stringValue: b64(c) }, iv: { stringValue: b64(iv) }, t: { integerValue: String(Date.now()) } };
  }
  async function open(pair, fields) {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(fields.iv.stringValue) }, pair.key, unb64(fields.c.stringValue));
    return JSON.parse(td.decode(plain));
  }

  async function req(method, path, body) {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${BASE}/${path}${sep}key=${CFG.apiKey}`, {
      method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`firestore ${res.status}`);
    return res.json();
  }

  return {
    newCode, showCode, normCode,

    // Merve: güncel durumu yaz (üzerine yazar)
    async putState(code, state) {
      const p = await pairOf(code);
      await req('PATCH', `pairs/${p.id}/data/state`, { fields: await seal(p, state) });
    },
    // Murat: durumu oku (yoksa null)
    async getState(code) {
      const p = await pairOf(code);
      const doc = await req('GET', `pairs/${p.id}/data/state`);
      return doc ? open(p, doc.fields) : null;
    },
    // Murat bağlandığını bildirir, Merve kontrol eder
    async ack(code) {
      const p = await pairOf(code);
      await req('PATCH', `pairs/${p.id}/data/murat`, { fields: { t: { integerValue: String(Date.now()) } } });
    },
    async isLinked(code) {
      const p = await pairOf(code);
      return !!(await req('GET', `pairs/${p.id}/data/murat`));
    },
    // Merve: istek mesajı (aynı id ile tekrar göndermek güvenli)
    async putMsg(code, msg) {
      const p = await pairOf(code);
      await req('PATCH', `pairs/${p.id}/msgs/${msg.id}`, { fields: await seal(p, msg) });
    },
    // Murat: t'den yeni mesajlar
    async msgsAfter(code, after) {
      const p = await pairOf(code);
      const rows = await req('POST', `pairs/${p.id}:runQuery`, {
        structuredQuery: {
          from: [{ collectionId: 'msgs' }],
          where: { fieldFilter: { field: { fieldPath: 't' }, op: 'GREATER_THAN', value: { integerValue: String(after || 0) } } },
          orderBy: [{ field: { fieldPath: 't' }, direction: 'ASCENDING' }],
          limit: 100,
        },
      });
      const out = [];
      for (const r of rows || []) {
        if (!r.document) continue;
        try { out.push({ ...(await open(p, r.document.fields)), st: Number(r.document.fields.t.integerValue) }); } catch (e) { /* bozuk kayıt: atla */ }
      }
      return out;
    },
    // ntfy: Murat'ın telefonuna içeriksiz bildirim
    async topic(code) { return (await pairOf(code)).topic; },
    async notify(code, title, message) {
      const p = await pairOf(code);
      await fetch(CFG.ntfy, {
        method: 'POST',
        body: JSON.stringify({ topic: p.topic, title, message, tags: ['love_letter'], click: location.origin + location.pathname }),
      });
    },
  };
})();
