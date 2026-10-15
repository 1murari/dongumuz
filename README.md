# Döngümüz

Merve ve Murat için regl takip uygulaması. iPhone'da Safari'den **Ana Ekrana Ekle** ile normal bir uygulama gibi çalışır (internetsiz de açılır).

## iPhone'a kurulum (ikiniz için de aynı)

1. Safari'de uygulamanın linkini aç.
2. Alttaki **Paylaş** düğmesi → **Ana Ekrana Ekle** → **Ekle**.
3. Ana ekrandaki "Döngümüz" simgesinden aç.
   - Merve: **Ben Merve** → son regl tarihi ve süre. Ana sayfada 10 karakterlik bir bağlantı kodu çıkar.
   - Murat: **Ben Murat** → o kodu yazar → **Bağlan**. Murat hiçbir tarih girmez.
4. (İsteğe bağlı, sadece Murat) App Store'dan **ntfy**'ı kurar ve Ayarlar'daki konu adına abone olur: Merve istek gönderince bildirim düşer.

Uygulamayı mutlaka Ana Ekran'dan kullanın: Safari sekmesinde tutulan veriler iOS tarafından bir süre kullanılmayınca silinebilir, Ana Ekran uygulamasındakiler kalıcıdır.

## Nasıl çalışır

- **Merve → Murat bağlantısı:** Merve'nin döngü tarihleri ve son 7 günün ağrı/belirti/ruh hali kayıtları her değişiklikte **telefonda AES-256 ile şifrelenip** Firebase Firestore'a (proje `dongumuz`) yazılır; anahtar bağlantı kodundan türetilir, sunucu içeriği göremez. Notlar hiç gönderilmez. Murat'ın uygulaması açıkken her 30 saniyede bir çeker.
- **Murat'tan iste:** Merve istekleri seçip **Gönder**'e basar; Murat'ın uygulamasında **Merve'den** sekmesine sohbet balonu olarak düşer. İki taraf da serbest yazı yazamaz. ntfy bildirimi sadece "Merve senden bir şey istiyor 💌" der.
- **Merve bugün:** Merve'nin günlük işaretleri mesaj olarak gelmez; Murat'ın ana ekranındaki kartta hep güncel durur.
- **Kod dosyaları:** `sync.js` (şifreleme + Firestore REST + ntfy), `config.js` (Firebase web ayarı, gizli değil), `firestore.rules` (sadece bilinen 64 karakterlik eşleşme yolları, silme yok).
- **Tahmin:** son 6 döngünün ortalaması; yumurtlama = sonraki reglden 14 gün önce (ayarlanabilir); doğurgan pencere = yumurtlamadan 5 gün önce → 1 gün sonra; düzensiz döngüde Ogino-Knaus tamponu; pozitif ovülasyon testi ve "yumurta akı" akıntı kaydı tahmini günceller.
- **Doğum kontrol yöntemi değildir.**

## Araştırmadan gelen özellikler

| Kullanıcı isteği / şikâyeti | Uygulamadaki karşılığı |
|---|---|
| Gizlilik endişesi (1-3 yıldızlı yorumların %28'i) | Veri sadece telefonda, hesap yok |
| Tahminler kişiye göre öğrenmiyor (%19) | Her yeni döngüyle ortalama/aralık güncellenir, düzensizlik uyarısı |
| Paywall, reklam, bildirim spamı | Hiçbiri yok |
| Belirti kaydı çok dokunuş istiyor, özel belirti yok (%12) | Tek dokunuşla şiddet (hafif/orta/şiddetli), otomatik kayıt, "＋ Ekle" ile özel belirti |
| Ağrı şiddeti seviyeleri | 10 ağrı tipi × 3 şiddet |
| Partner paylaşımı (Flo for Partners, Stardust) | Murat modu: faz rehberi, Merve'nin son durumu, ağrıya göre ipuçları |
| Faza göre yaşam önerileri (Stardust, Flo) | Merve için antrenman/beslenme, Murat için yap/yapma/söyle/sürpriz |
| Veri kaybı, yedek/dışa aktarma | JSON yedek indir/yükle, doktor için özet paylaş |
| Doktora ne zaman gitmeli | Kayıtlardan otomatik uyarı (kısa/uzun döngü, uzun regl, sık şiddetli ağrı, ara kanama) |

Kaynaklar: Bearable 2026 karşılaştırması, unstar.app 2026 olumsuz yorum analizi, University of Washington CHI 2017 çalışması, Duke Üniversitesi 2024 gizlilik anketi, Flo for Partners, Wilcox ve ark. BMJ 2000 / NEJM 1995.

## Güncelleme yayınlarken

`sw.js` içindeki `CACHE` adını değiştir (`dongumuz-v2` gibi). Telefonlar yeni sürümü bir sonraki açılışta alır.
