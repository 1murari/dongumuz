// Her sabah 10:00 (Türkiye) GitHub Actions çalıştırır: Merve'nin telefonunun hesapladığı haber takviminden
// bugünün dönem değişimlerini bulur, Murat'ın telefonuna web bildirimi yollar (Merve'ye gitmez).
// Depo herkese açık olduğu için hiçbir içerik loga yazılmaz; sadece sayılar.
import fs from 'node:fs';
import webpush from 'web-push';

const cfg = fs.readFileSync(new URL('../config.js', import.meta.url), 'utf8');
const val = k => (cfg.match(new RegExp(`${k}:\\s*'([^']+)'`)) || [])[1];
const projectId = val('projectId'), apiKey = val('apiKey'), vapidPublic = val('vapidPublic');
if (!/notify:\s*true/.test(cfg)) {
  console.log('Bildirimler config.js içinde kapalı; atlanıyor.');
  process.exit(0);
}
const code = String(process.env.PAIR_CODE || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
if (code.length !== 10 || !vapidPrivate) {
  console.log('PAIR_CODE ya da VAPID_PRIVATE_KEY tanımlı değil; bildirim atlanıyor.');
  process.exit(0);
}

// sync.js ile aynı anahtar türetme ve şifre çözme
const { subtle } = globalThis.crypto;
const te = new TextEncoder(), td = new TextDecoder();
const hex = b => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
const sha = async s => new Uint8Array(await subtle.digest('SHA-256', te.encode(s)));
const id = hex(await sha('dongumuz-id:' + code));
const base = await subtle.importKey('raw', te.encode(code), 'PBKDF2', false, ['deriveKey']);
const key = await subtle.deriveKey({ name: 'PBKDF2', salt: te.encode('dongumuz-key'), iterations: 150000, hash: 'SHA-256' },
  base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
const unb64 = s => Uint8Array.from(Buffer.from(s, 'base64'));

async function getDoc(name) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/pairs/${id}/data/${name}?key=${apiKey}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`firestore ${res.status}`);
  const f = (await res.json()).fields;
  const plain = await subtle.decrypt({ name: 'AES-GCM', iv: unb64(f.iv.stringValue) }, key, unb64(f.c.stringValue));
  return JSON.parse(td.decode(plain));
}

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
const sched = await getDoc('sched');
const items = ((sched && sched.items) || []).filter(it => it.d === today);
if (!items.length) {
  console.log('Bugün dönem değişimi yok.');
  process.exit(0);
}

webpush.setVapidDetails('https://1murari.github.io/dongumuz/', vapidPublic, vapidPrivate);
let sent = 0, failed = 0;
const sub = await getDoc('subhim');
if (sub && sub.sub) {
  for (const it of items) {
    try {
      await webpush.sendNotification(sub.sub, JSON.stringify({ title: it.him.t, body: it.him.b, tag: `dongumuz-${today}` }), { TTL: 6 * 3600 });
      sent++;
    } catch (e) {
      failed++;
      console.log(`Bir bildirim gönderilemedi (durum ${e.statusCode || '?'}).`);
    }
  }
}
console.log(`${sent} bildirim gönderildi${failed ? `, ${failed} başarısız` : ''}.`);
