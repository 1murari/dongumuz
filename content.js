// Uygulamadaki tüm metinler ve listeler. Kod (app.js) buradaki id'lere göre çalışır.
window.CONTENT = {

  PAINS: [
    { id: 'kramp', e: '🌀', t: 'Kramp / karın' },
    { id: 'bel', e: '🔻', t: 'Bel ağrısı' },
    { id: 'bas', e: '🤕', t: 'Baş ağrısı' },
    { id: 'migren', e: '⚡', t: 'Migren' },
    { id: 'gogus', e: '💗', t: 'Göğüs hassasiyeti' },
    { id: 'kasik', e: '📍', t: 'Kasık ağrısı' },
    { id: 'yumurtlama', e: '🥚', t: 'Yumurtlama ağrısı' },
    { id: 'bacak', e: '🦵', t: 'Bacak ağrısı' },
    { id: 'kas', e: '💪', t: 'Kas / eklem' },
    { id: 'iliski', e: '💔', t: 'İlişkide ağrı' },
  ],
  PAIN_LEVELS: ['', 'hafif', 'orta', 'şiddetli'],

  SYMPTOMS: [
    { id: 'siskinlik', e: '🎈', t: 'Şişkinlik' },
    { id: 'yorgunluk', e: '🥱', t: 'Yorgunluk' },
    { id: 'bulanti', e: '🤢', t: 'Bulantı' },
    { id: 'sivilce', e: '🔴', t: 'Sivilce' },
    { id: 'tatli', e: '🍫', t: 'Tatlı krizi' },
    { id: 'istah', e: '🍽️', t: 'İştah artışı' },
    { id: 'ishal', e: '🚽', t: 'İshal' },
    { id: 'kabizlik', e: '🧱', t: 'Kabızlık' },
    { id: 'gaz', e: '💨', t: 'Gaz' },
    { id: 'uykusuzluk', e: '🌙', t: 'Uykusuzluk' },
    { id: 'basdonmesi', e: '💫', t: 'Baş dönmesi' },
    { id: 'sicak', e: '🔥', t: 'Ateş basması' },
  ],

  MOODS: [
    { id: 'mutlu', e: '😊', t: 'Mutlu' },
    { id: 'sakin', e: '😌', t: 'Sakin' },
    { id: 'enerjik', e: '⚡', t: 'Enerjik' },
    { id: 'halsiz', e: '😴', t: 'Halsiz' },
    { id: 'sinirli', e: '😤', t: 'Sinirli' },
    { id: 'hassas', e: '🥺', t: 'Hassas / ağlamaklı' },
    { id: 'kaygili', e: '😰', t: 'Kaygılı' },
    { id: 'mutsuz', e: '😔', t: 'Mutsuz' },
    { id: 'dalgali', e: '🎢', t: 'Dalgalı' },
    { id: 'istekli', e: '🔥', t: 'İstekli' },
    { id: 'isteksiz', e: '🧊', t: 'İsteksiz' },
  ],

  FLOW: [
    { id: '', t: 'Yok' },
    { id: 's', t: 'Lekelenme' },
    { id: 'l', t: 'Hafif' },
    { id: 'm', t: 'Orta' },
    { id: 'h', t: 'Yoğun' },
  ],
  SEX: [
    { id: '', t: 'Yok' },
    { id: 'p', t: '🛡️ Korunmalı' },
    { id: 'u', t: '⚠️ Korunmasız' },
  ],
  MUCUS: [
    { id: '', t: 'Kayıt yok' },
    { id: 'kuru', t: 'Kuru' },
    { id: 'yapiskan', t: 'Yapışkan' },
    { id: 'kremsi', t: 'Kremsi' },
    { id: 'sulu', t: 'Sulu' },
    { id: 'yumurta', t: 'Yumurta akı gibi' },
    { id: 'farkli', t: 'Alışılmadık renk/koku' },
  ],
  OVTEST: [
    { id: '', t: 'Yapılmadı' },
    { id: 'neg', t: 'Negatif' },
    { id: 'pos', t: 'Pozitif' },
  ],
  PREGTEST: [
    { id: '', t: 'Yapılmadı' },
    { id: 'neg', t: 'Negatif' },
    { id: 'pos', t: 'Pozitif' },
  ],
  MEDS: [
    { id: 'agri', e: '💊', t: 'Ağrı kesici' },
    { id: 'hap', e: '💊', t: 'Doğum kontrol hapı' },
    { id: 'takviye', e: '🍊', t: 'Vitamin / takviye' },
  ],
  TRAIN: [
    { id: '', t: 'Yok' },
    { id: 'h', t: 'Hafif' },
    { id: 'o', t: 'Orta' },
    { id: 'y', t: 'Yoğun' },
  ],

  RISK: [
    { t: 'Düşük', d: 'Takvime göre doğurgan pencerenin dışında. Ama risk sıfır değildir; döngü kayabilir.' },
    { t: 'Orta', d: 'Doğurgan pencerenin kenarı. Döngü kaymaları yüzünden risk var; korunmak iyi olur.' },
    { t: 'Yüksek', d: 'Doğurgan pencere. Sperm vücutta 5 güne kadar canlı kalabilir.' },
    { t: 'Çok yüksek', d: 'Yumurtlamaya en yakın günler. Tek bir korunmasız ilişkide gebelik ihtimali %25-33\'e kadar çıkabilir.' },
  ],

  // Murat'tan istekler
  REQUEST_GROUPS: [
    { t: 'Rahatlat', items: [
      { id: 'sicak', e: '🔥', t: 'Sıcak su torbası', m: 'Sıcak su torbası hazırlar mısın?' },
      { id: 'masaj', e: '💆‍♀️', t: 'Bel/sırt masajı', m: 'Belime, sırtıma masaj yapar mısın?' },
      { id: 'ayak', e: '🦶', t: 'Ayak masajı', m: 'Ayak masajı yapar mısın?' },
      { id: 'saril', e: '🤗', t: 'Sarıl bana', m: 'Sadece sarıl bana.' },
      { id: 'dinle', e: '👂', t: 'Sadece dinle', m: 'Çözüm önermeden sadece dinler misin?' },
      { id: 'sabir', e: '🙏', t: 'Sabırlı ol', m: 'Bugün bana biraz sabırlı ol, olur mu?' },
      { id: 'yalniz', e: '🫶', t: 'Biraz yalnız kalayım', m: 'Biraz kendi başıma kalmak istiyorum. Sana kızgın değilim 💛' },
      { id: 'iltifat', e: '💬', t: 'Güzel bir şey söyle', m: 'Bana güzel bir şey söyler misin?' },
    ]},
    { t: 'Yiyecek', items: [
      { id: 'cikolata', e: '🍫', t: 'Çikolata', m: 'Çikolata getirir misin?' },
      { id: 'dondurma', e: '🍦', t: 'Dondurma', m: 'Dondurma canım çekti.' },
      { id: 'tuzlu', e: '🍟', t: 'Cips / tuzlu', m: 'Tuzlu bir şeyler (cips vs.) canım çekti.' },
      { id: 'cay', e: '🍵', t: 'Bitki çayı', m: 'Bitki çayı (papatya/zencefil) yapar mısın?' },
      { id: 'corba', e: '🍲', t: 'Sıcak çorba', m: 'Sıcak bir çorba içmek istiyorum.' },
      { id: 'yemek', e: '🍕', t: 'Yemek söyleyelim', m: 'Bu akşam yemek söyleyelim mi?' },
      { id: 'meyve', e: '🍓', t: 'Meyve', m: 'Meyve getirir misin?' },
      { id: 'su', e: '💧', t: 'Su', m: 'Bir bardak su getirir misin?' },
    ]},
    { t: 'Alışveriş', items: [
      { id: 'agrikesici', e: '💊', t: 'Ağrı kesici', m: 'Ağrı kesici lazım.' },
      { id: 'ped', e: '🩸', t: 'Ped / tampon', m: 'Ped/tampon alır mısın?' },
      { id: 'market', e: '🛒', t: 'Market', m: 'Market alışverişi yapabilir misin?' },
      { id: 'cicek', e: '🌷', t: 'Çiçek :)', m: 'Bir çiçek fena olmazdı 🌷' },
    ]},
    { t: 'Birlikte', items: [
      { id: 'film', e: '🎬', t: 'Film / dizi gecesi', m: 'Battaniye + film gecesi yapalım mı?' },
      { id: 'ev', e: '🧹', t: 'Ev işlerini sen hallet', m: 'Bugün ev işlerini sen halleder misin?' },
      { id: 'uyu', e: '😴', t: 'Erken uyuyalım', m: 'Bu akşam erken uyuyalım.' },
      { id: 'yuruyus', e: '🚶‍♀️', t: 'Yürüyüş', m: 'Biraz yürüyüşe çıkalım mı?' },
      { id: 'disari', e: '🍽️', t: 'Dışarıda yemek', m: 'Dışarıda yemek yiyelim mi?' },
    ]},
  ],
  QUICK_REQUESTS: [
    { e: '🔥', t: 'Sıcak su torbası + sarıl', items: ['sicak', 'saril'] },
    { e: '🍫', t: 'Çikolata getir', items: ['cikolata'] },
    { e: '💊', t: 'Ağrı kesici + su', items: ['agrikesici', 'su'] },
    { e: '🩸', t: 'Ped / tampon al', items: ['ped'] },
    { e: '🎬', t: 'Film gecesi', items: ['film', 'saril'] },
    { e: '🙏', t: 'Bugün sabırlı ol', items: ['sabir'] },
  ],
  WHEN: [
    { id: 'simdi', t: '⏰ Şimdi' },
    { id: 'eve', t: '🏠 Eve gelirken' },
    { id: 'aksam', t: '🌙 Akşam' },
    { id: '', t: 'Fark etmez' },
  ],

  // Dönem değişimi haberleri: günün ilk açılışında ekranda + sabah 10:00 bildirim.
  // {her} {him} {fs} {fe} {ovu} {next} uygulamada doldurulur.
  EVENTS: {
    regl: {
      e: '🩸',
      her: ['Regl başladı', 'Kendine iyi bak; sıcak uygulama ve dinlenme iyi gelir. Bir sonraki tahmin {next}.'],
      him: ['{her} regl oldu', 'Bu birkaç gün ilgi ve rahatlık günleri: sıcak su torbası, çay, ev işleri sende.'],
    },
    regl_tahmin: {
      e: '🩸',
      her: ['Regl bugün bekleniyor', 'Başladığında uygulamadan “Regl bugün başladı”ya dokun.'],
      him: ['{her} için regl bugün bekleniyor', 'Ped, ağrı kesici ve sıcak su torbası hazır olsun.'],
    },
    folikuler: {
      e: '🌱',
      her: ['Kanama bitti, foliküler dönem', 'Enerjin yükseliyor; güç antrenmanı ve yeni planlar için iyi günler.'],
      him: ['{her} için regl bitti', 'Enerjisi yükseliyor; birlikte bir plan yapmak için güzel günler.'],
    },
    dogurgan: {
      e: '🌿',
      her: ['Doğurgan pencere başladı', '{fs} – {fe} arası gebelik riski yüksek. Tahmini yumurtlama {ovu}.'],
      him: ['Doğurgan pencere başladı', '{fs} – {fe} arası gebelik riski yüksek; korunmaya dikkat.'],
    },
    yumurtlama: {
      e: '✨',
      her: ['Yumurtlama dönemi', 'Gebelik riski en yüksek günler. Tahmini yumurtlama {ovu}.'],
      him: ['{her} yumurtlama döneminde', 'En riskli günler, korunmaya çok dikkat. Enerjisi ve özgüveni yüksek olabilir.'],
    },
    luteal: {
      e: '🌙',
      her: ['Luteal dönem başladı', 'Doğurgan pencere bitti. Enerji biraz düşebilir, iştah artabilir.'],
      him: ['{her} luteal dönemde', 'Doğurgan pencere bitti. Daha sakin günler; evde huzurlu akşamlar planla.'],
    },
    pms: {
      e: '🌧️',
      her: ['PMS dönemi başladı', 'Regl {next} civarında. Tuzu ve kafeini azaltmak iyi gelir; kendine nazik ol.'],
      him: ['{her} PMS döneminde', 'Ekstra sabır, şefkat ve çikolata zamanı. Regl {next} civarında.'],
    },
    gecikme: {
      e: '⏳',
      her: ['Regl gecikti', 'Başladıysa uygulamadan işaretle. Korunmasız ilişki olduysa test yapmak iyi olur.'],
      him: ['{her} için regl gecikti', 'Panik yok, yanında ol. Başladıysa {her} uygulamadan işaretleyecek.'],
    },
  },

  PHASES: {
    regl: {
      name: 'Regl', emoji: '🩸',
      her: 'Östrojen ve progesteron en düşük seviyede. Enerji düşebilir; kramp ve yorgunluk normal.',
      self: [
        'Antrenman: hafif hareket (yürüyüş, yoga, mobilite). Ağır seansı kendini iyi hissettiğin güne sakla.',
        'Demir ve magnezyum: kırmızı et, mercimek, ıspanak, bitter çikolata, muz.',
        'Karnına ya da beline 15-20 dk sıcak uygulama krampları gevşetir.',
        'Bol su ve zencefil/papatya çayı şişkinliğe iyi gelir.',
        'Uykuya öncelik ver; bu günlerde dinlenmek de antrenmanın parçası.',
      ],
      murat: {
        summary: 'Regl dönemi. Hormonları en düşükte; ağrı ve yorgunluk olabilir. Bu günler ilgi ve rahatlık günleri.',
        do: [
          'Sıcak su torbasını sen doldur, sorulmadan getir.',
          'Bulaşık, yemek, ev işleri: bu birkaç gün sende.',
          'Ped/tampon, ağrı kesici ve çikolata stoğunu kontrol et, bitmeden al.',
          'Plan yapmadan önce sor: “Dışarı mı çıkalım, evde mi kalalım?” Evde kalmak isterse sorun yapma.',
          'Papatya ya da zencefil çayı demle, battaniyeyle film aç.',
          'Bel ve sırt masajı teklif et. Israr etme, teklif et.',
          'Halsizliği tembellik sanma; gerçekten fiziksel bir yorgunluk.',
        ],
        dont: [
          '“Abartıyorsun”, “bu kadar da ağrımaz” deme.',
          'Her duygusunu “regl olduğun için” diye açıklama.',
          'Ağır tartışmaları ve büyük kararları bu günlere sıkıştırma.',
          'Yakınlık için ısrar etme; istek ondan gelsin.',
          '“Bir ağrı kesici iç, geçer” deyip konuyu kapatma; yanında ol.',
        ],
        say: [
          '“Bugün hiçbir şey yapma, ben hallederim.”',
          '“Ağrın nasıl? Sıcak su torbası getireyim mi?”',
          '“Ne canın çekiyorsa söyle, getiriyorum.”',
        ],
        surprise: [
          'Eve gelirken sevdiği çikolatayla gel.',
          'Yumuşak çorap, battaniye ve favori dizisi.',
          'Sıcak bir çorba ya da sevdiği yemeği söyle.',
        ],
        intimacy: 'İstek kişiden kişiye değişir; artabilir de, düşebilir de. İlk adımı ona bırak.',
      },
    },
    folikuler: {
      name: 'Foliküler', emoji: '🌱',
      her: 'Östrojen yükseliyor. Enerji, motivasyon ve ruh hali genelde toparlanıyor.',
      self: [
        'Antrenman: güç çalışması ve yeni hedefler için iyi dönem; ağırlık artırmayı dene.',
        'Çekimler, yeni projeler ve sosyal planlar için enerjin yüksek.',
        'Protein ve kompleks karbonhidratla toparlanmayı destekle.',
      ],
      murat: {
        summary: 'Enerjisi yükseliyor, keyfi yerine geliyor. Birlikte bir şeyler yapmak için en güzel günler.',
        do: [
          'Yeni bir şey planla: yürüyüş, kısa gezi, yeni bir restoran.',
          'Birlikte spor yapmayı teklif et; enerjisi yüksek.',
          'Ertelenen konuları şimdi konuş; daha yapıcı geçer.',
          'Projelerini, hedeflerini dinle ve destekle.',
          'Romantik bir akşam planla.',
        ],
        dont: [
          'Regl bitti diye ilgiyi kesme; ilgi her fazda lazım.',
          'Spontane planlarına hep “yorgunum” deme.',
        ],
        say: [
          '“Bu hafta sonu bir yere kaçalım mı?”',
          '“Bugün çok enerjiksin, hadi bir plan yapalım.”',
        ],
        surprise: [
          'Sürpriz bir gün: kahvaltı + yürüyüş.',
          'Birlikte yeni bir şey denemek: dans, tırmanış, kurs.',
        ],
        intimacy: 'Östrojen yükseldikçe istek de artabilir. Yumurtlamaya yaklaştıkça gebelik riski artar, korunmayı unutma.',
      },
    },
    yumurtlama: {
      name: 'Yumurtlama', emoji: '✨',
      her: 'Östrojen zirvede, LH yükseliyor. Enerji, özgüven ve sosyallik genelde en yüksek; gebelik ihtimali de.',
      self: [
        'Antrenman: en güçlü hissettiğin günler, yoğun seanslar için uygun. Isınmayı atlama.',
        'Çekim, sunum ve sosyal etkinlikler için harika zaman.',
        'Tek taraflı hafif kasık ağrısı (yumurtlama ağrısı) normal olabilir.',
      ],
      murat: {
        summary: 'Gebelik riski en yüksek günler! Enerjisi, özgüveni ve isteği zirvede olabilir.',
        do: [
          '⚠️ Korunma konusunda çok dikkatli ol; en riskli günler bunlar.',
          'İltifat et; kendini en iyi hissettiği günlerden.',
          'Dışarı çıkın, sosyalleşin, randevu gecesi yapın.',
          'Telefonu bırak, ona gerçekten zaman ayır.',
        ],
        dont: [
          '“Bir şey olmaz” diyerek korunmasız ilişkiye girme.',
          'Davetlerini ve planlarını geçiştirme.',
        ],
        say: [
          '“Bugün çok güzel görünüyorsun.”',
          '“Akşam sadece ikimiz, dışarı çıkalım mı?”',
        ],
        surprise: [
          'Güzel bir akşam yemeği rezervasyonu.',
          'Sebepsiz bir çiçek.',
        ],
        intimacy: 'İstek genelde en yüksek seviyede. Gebelik istemiyorsanız mutlaka korunun; takvim yöntemi tek başına güvenilir değildir.',
      },
    },
    luteal: {
      name: 'Luteal', emoji: '🌙',
      her: 'Progesteron yükseliyor. Daha sakin ve içe dönük hissedebilir; iştah artabilir.',
      self: [
        'Antrenman: orta yoğunluk; dayanıklılık ve teknik çalışmaya odaklan.',
        'İştah artışı normal: kompleks karbonhidrat ve magnezyum (kabak çekirdeği, bitter çikolata).',
        'Kafeini ve tuzu azaltmak yaklaşan PMS belirtilerini hafifletebilir.',
        'Uyku düzenine dikkat et; vücut ısın biraz yükselir.',
      ],
      murat: {
        summary: 'Daha sakin, içine dönük ve yorgun olabilir. Ev, huzur ve rutin günleri.',
        do: [
          'Evde sakin akşamlar planla: birlikte yemek yapın, film izleyin.',
          'Atıştırmalık stoğu yap; iştahı artabilir.',
          'Ev işlerinde daha fazla sorumluluk al.',
          'Küçük jestler: kahvesini/çayını yap, gün içinde mesaj at.',
        ],
        dont: [
          'Ne yediğine yorum yapma.',
          'Sosyal programları üst üste dizme.',
          '“Neyin var?” diye sorguya çekme; anlatmak isterse anlatır.',
        ],
        say: [
          '“Bu akşam evde kalalım, yemeği ben yaparım.”',
          '“Yorgunsan dinlen, ben hallederim.”',
        ],
        surprise: [
          'Sevdiği atıştırmalıklarla bir “film gecesi kutusu”.',
          'Sıcak bir banyo hazırla.',
        ],
        intimacy: 'İstek azalabilir. Yakınlık her zaman cinsellik değil; sarılmak çok değerli.',
      },
    },
    pms: {
      name: 'PMS', emoji: '🌧️',
      her: 'Regl yaklaşıyor ve hormonlar hızla düşüyor. Şişkinlik, göğüs hassasiyeti, sinirlilik ve hassasiyet olabilir.',
      self: [
        'Antrenman: hafif-orta hareket (yürüyüş, pilates) PMS belirtilerini azaltabilir.',
        'Tuz, şeker ve kafeini azaltmak şişkinliği hafifletir.',
        'Magnezyum ve B6 içeren besinler: muz, ceviz, yeşil yapraklılar.',
        'Duyguların geçici. Kendine nazik ol, plan yükünü azalt.',
      ],
      murat: {
        summary: 'PMS dönemi: sabır, şefkat ve çikolata. Duyguları yoğun olabilir; bu sana karşı değil.',
        do: [
          'Ekstra sabırlı ol, ses tonunu yumuşat.',
          'Çikolata, ped ve ağrı kesici stoğunu şimdi kontrol et; regl yakında.',
          'Dinle, çözüm üretmeye çalışma. “Seni anlıyorum” yeter.',
          'Planları esnek tut; iptal ederse sorun yapma.',
          'Fiziksel yakınlık: sarılmak, saçını okşamak, ayak masajı.',
          'Gerginlik çıkarsa ortamı sakinleştir, konuyu sonraya bırak.',
        ],
        dont: [
          '“PMS\'sin herhalde” deme. Asla.',
          'Tartışmayı büyütme; bugün haklı çıkmak önemli değil.',
          'Kilosuna, şişkinliğine, sivilcesine yorum yapma.',
          'Sessiz kalmasını kişisel algılama.',
        ],
        say: [
          '“Bugün zor bir gün gibi, ne yapsam iyi gelir?”',
          '“Haklısın, seni anlıyorum.”',
          '“Sana çikolata aldım 🍫”',
        ],
        surprise: [
          'Habersiz çikolata ya da dondurma.',
          'Sıcak su torbası + pijama + favori dizi.',
          'O fark etmeden evi topla.',
        ],
        intimacy: 'Göğüs hassasiyeti ve şişkinlik olabilir; nazik ol, ilk adımı ona bırak.',
      },
    },
    gecikme: {
      name: 'Gecikme', emoji: '⏳',
      her: 'Regl beklenen tarihten geç kaldı. Stres, yoğun antrenman, uyku düzeni, kilo değişimi ya da gebelik nedeni olabilir.',
      self: [
        'Korunmasız ilişki olduysa gebelik testi yap (en iyisi sabah ilk idrarla).',
        '7 günden uzun gecikme ya da sık düzensizlikte jinekoloğa danış.',
      ],
      murat: {
        summary: 'Regl gecikti. Panik yapma, onu da paniğe sokma; yanında ol.',
        do: [
          'Sakin ol ve destek ol; gerekirse eczaneden test al.',
          'Stresini azaltmaya yardım et.',
        ],
        dont: [
          'Suçlayıcı ya da panik cümleler kurma.',
          'Konuyu geçiştirme; birlikte karar verin.',
        ],
        say: [
          '“Ne olursa olsun yanındayım.”',
          '“İstersen birlikte test alalım.”',
        ],
        surprise: [],
        intimacy: '',
      },
    },
  },

  // Merve'nin kaydettiği ağrı/belirti/ruh haline göre Murat'a özel ipucu
  HIS_TIPS: {
    kramp: 'Kramp: sıcak su torbası + battaniye + bitki çayı. Belini ovmayı teklif et.',
    bel: 'Bel ağrısı: bel masajı ve sıcak uygulama; ağır bir şey kaldırtma.',
    bas: 'Baş ağrısı: ortamı sessiz ve loş tut, su getir, ekran ışığını kıs.',
    migren: 'Migren: ışığı ve sesi azalt, dinlenmesine izin ver; ilacını hatırlat.',
    gogus: 'Göğüs hassasiyeti: sarılırken nazik ol, sıkı sarılma.',
    kasik: 'Kasık ağrısı: sıcak uygulama ve dinlenme. Çok şiddetliyse doktora gitmeyi öner.',
    yumurtlama: 'Yumurtlama ağrısı: genelde 1-2 gün sürer; sıcak uygulama iyi gelir.',
    bacak: 'Bacak ağrısı: bacak/ayak masajı; bacaklarını yüksekte tutmasına yardım et.',
    kas: 'Kas/eklem ağrısı: sıcak duş ya da banyo hazırla, masaj teklif et.',
    iliski: 'İlişkide ağrı: ısrar etme, konuşun. Tekrarlıyorsa doktora birlikte gidin.',
    siskinlik: 'Şişkinlik: “kilo mu aldın?” tarzı yorumlardan uzak dur; tuzlu yemekleri azaltın.',
    yorgunluk: 'Yorgunluk: işleri sen üstlen, erken uyumasına alan aç.',
    bulanti: 'Bulantı: zencefil çayı ve kraker; ağır yemek yapma.',
    sivilce: 'Sivilce: hiç yorum yapma.',
    tatli: 'Tatlı krizi: çikolata zamanı 🍫 Yargılama, getir.',
    istah: 'İştah artışı: sevdiği atıştırmalıkları hazır tut, yorum yapma.',
    ishal: 'Sindirim: hafif yemekler ve bol su.',
    kabizlik: 'Sindirim: lifli yiyecekler ve bol su; kısa bir yürüyüş iyi gelebilir.',
    gaz: 'Şişkinlik/gaz: rahat kıyafet, sıcak bitki çayı.',
    uykusuzluk: 'Uykusuzluk: akşam ekranları erken kapatın, sakin bir rutin kurun.',
    basdonmesi: 'Baş dönmesi: oturmasını sağla, su ve bir şeyler yemesini öner.',
    sicak: 'Ateş basması: odayı serin tut, soğuk su getir.',
    sinirli: 'Sinirli: tartışmaya girme, ses tonunu yumuşat, konuyu sonraya bırak.',
    hassas: 'Hassas: çözüm üretme; sarıl ve dinle.',
    kaygili: 'Kaygılı: “yanındayım” de, sakinleştirici ol.',
    mutsuz: 'Mutsuz: küçük bir sürpriz ve baş başa kaliteli zaman.',
    halsiz: 'Halsiz: dinlenmesine izin ver, beklenti yükleme.',
    dalgali: 'Ruh hali dalgalı: sabırlı ol, iniş çıkışları kişisel algılama.',
    istekli: 'İsteği yüksek 😉 Bugünkü gebelik riskine bak, korunmayı unutma.',
    isteksiz: 'İsteği düşük: anlayışla karşıla; yakınlığı sarılarak göster.',
    mutlu: 'Keyfi yerinde: birlikte bir şeyler yapın!',
    enerjik: 'Enerjisi yüksek: yürüyüş ya da birlikte spor için güzel gün.',
  },

  DOCTOR: [
    'Döngün sürekli 21 günden kısa ya da 35 günden uzunsa',
    'Regl 7 günden uzun sürüyorsa ya da 1-2 saatte bir ped değiştirecek kadar yoğunsa',
    'Ağrı kesiciyle geçmeyen, günlük hayatı durduran ağrılar (endometriozis belirtisi olabilir)',
    'İki regl arasında ya da ilişki sonrası kanama',
    'Gebelik yokken 3 aydan uzun süre regl olmama',
    'Regl öncesi depresif duygular hayatını ciddi etkiliyorsa (PMDD)',
    'Akıntıda alışılmadık renk, koku, kaşıntı ya da yanma',
  ],
};
