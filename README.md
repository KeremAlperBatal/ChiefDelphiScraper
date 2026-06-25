# 🔍 CD Thread Scraper

**Chief Delphi forum thread'lerini otomatik olarak çekip, LLM'ler için hazır prompt formatına dönüştüren web uygulaması.**

> Chief Delphi linkini yapıştır → Tüm mesajları çek → LLM-ready prompt al. Bu kadar.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=flat-square&logo=netlify&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## ✨ Özellikler

- 🔗 **URL'den Otomatik Çekme** — Herhangi bir Chief Delphi thread linkini yapıştırın, tüm mesajlar otomatik çekilir
- 📄 **Markdown Dönüşümü** — HTML içerik temiz Markdown'a dönüştürülür (yazar isimleri, tarihler, alıntılar, reaksiyonlar dahil)
- 🤖 **LLM Prompt Üretimi** — Hazır kopyala-yapıştır prompt: bağlam + analiz talimatları + tüm thread içeriği
- 🌍 **Çift Dil** — Türkçe ve İngilizce prompt desteği
- 📊 **İstatistikler** — Mesaj sayısı, yazar sayısı, karakter ve tahmini token bilgisi
- 📋 **Kopyala & İndir** — Tek tıkla panoya kopyalama veya `.txt` / `.md` olarak indirme
- 🔄 **Tam Pagination** — Discourse API üzerinden 20'şerli batch'lerle tüm mesajları çeker
- 🎨 **Modern UI** — Dark tema, glassmorphism, gradient animasyonlar, responsive tasarım

## 🚀 Kullanım

### Online
Netlify'da deploy edildiyse, doğrudan site URL'sini açın.

### Lokal Geliştirme

```bash
# Repoyu klonlayın
git clone https://github.com/KeremAlperBatal/ChiefDelphiScraper.git
cd ChiefDelphiScraper

# Local sunucuyu başlatın (proxy dahil)
node server.js
```

Tarayıcıda **http://localhost:3000** adresini açın.

### Nasıl Çalışır?

1. Chief Delphi thread URL'sini yapıştırın
   ```
   https://www.chiefdelphi.com/t/thread-slug/123456
   ```
2. (Opsiyonel) Maksimum mesaj sayısı girin
3. Prompt dilini seçin (Türkçe / English)
4. **"Thread'i Çek ve Dönüştür"** butonuna basın
5. Çıktıyı kopyalayın veya indirin, direkt LLM'e yapıştırın

## 📂 Proje Yapısı

```
ChiefDelphiScraper/
├── public/                  # Statik dosyalar (Netlify tarafından sunulur)
│   ├── index.html           # Ana sayfa
│   ├── style.css            # Stiller
│   └── app.js               # Frontend mantığı
├── netlify/
│   └── functions/
│       └── proxy.js         # Serverless CORS proxy (Netlify Functions)
├── server.js                # Local geliştirme sunucusu (proxy dahil)
├── netlify.toml             # Netlify yapılandırması
└── README.md
```

## 🛠️ Teknik Detaylar

### Neden Proxy Gerekli?
Chief Delphi (Discourse) API'si tarayıcıdan gelen cross-origin istekleri CORS ile engelliyor. Bu yüzden:
- **Lokal:** `server.js` basit bir Node.js HTTP proxy olarak çalışır
- **Production:** Netlify Functions serverless proxy olarak görev yapar

### Discourse API
Chief Delphi, [Discourse](https://www.discourse.org/) tabanlı bir forum. Uygulama şu endpoint'leri kullanır:
- `GET /t/{topic_id}.json` — Topic bilgileri + ilk batch mesajlar
- `GET /t/{topic_id}/posts.json?post_ids[]=...` — Belirli post ID'leri ile ek mesajlar

### HTML → Markdown Dönüşümü
Discourse'un `cooked` (HTML) içeriği şu şekilde işlenir:
- Discourse alıntı blokları → Markdown blockquote
- HTML başlıklar, listeler, linkler → Markdown karşılıkları
- Emoji görselleri → `:emoji:` formatı
- Gereksiz HTML etiketleri temizlenir

## 🌐 Netlify'a Deploy

1. Bu repoyu fork'layın veya kendi GitHub hesabınıza push'layın
2. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
3. GitHub'ı bağlayın → repoyu seçin
4. Build ayarları `netlify.toml` ile otomatik gelir — **Deploy** butonuna basın
5. ~30 saniye içinde siteniz `https://ISIM.netlify.app` adresinde canlı olur

## 📄 Çıktı Formatı

### LLM Prompt Çıktısı (örnek)
```
Aşağıda Chief Delphi forumundan bir tartışma thread'inin tüm mesajları
yer almaktadır.

**Thread Başlığı:** Lowering the Barrier to Code: AI's Role in FRC Robotics
**URL:** https://www.chiefdelphi.com/t/.../503634
**Toplam Mesaj Sayısı:** 47
**Katılımcı Sayısı:** 35

Lütfen bu Chief Delphi thread'ini dikkatlice oku, analiz et ve özetle...

---

# THREAD İÇERİĞİ BAŞLANGIÇ

## Mesaj #1 — Sebastian Hondl (@SethHondl)
*📅 25.06.2025, 22:45 | 🏷️ 2017 | ❤️×4 👎×7*

I'm a mechanical engineering student at the University of Minnesota...

---

## Mesaj #2 — Josh P (@BigJ)
...
```

## 🤝 Katkıda Bulunma

Pull request'ler açıktır! Özellikle şu alanlarda katkıya açığız:
- Daha iyi HTML → Markdown dönüşümü
- Ek dil desteği
- UI/UX iyileştirmeleri
- Farklı Discourse forumları için destek

## 📝 Lisans

MIT License — dilediğiniz gibi kullanabilirsiniz.

---

<div align="center">

**[FIRST Robotics Competition](https://www.firstinspires.org/robotics/frc)** topluluğu için ❤️ ile yapılmıştır.

*Chief Delphi ile resmi bir bağlantısı yoktur.*

</div>
