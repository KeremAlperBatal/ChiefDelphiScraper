# 🔍 CD Thread Scraper

**Automatically scrape Chief Delphi forum threads and convert them into LLM-ready prompts.**

> Paste a Chief Delphi link → Fetch all posts → Get a ready-to-use LLM prompt. That's it.

[![Live Demo](https://img.shields.io/badge/Live_Demo-chiefdelphiscraper.netlify.app-00C7B7?style=flat-square&logo=netlify&logoColor=white)](https://chiefdelphiscraper.netlify.app)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=flat-square&logo=netlify&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## ✨ Features

- 🔗 **Auto-Fetch from URL** — Paste any Chief Delphi thread link, all posts are fetched automatically
- 📄 **Markdown Conversion** — HTML content is converted to clean Markdown (author names, dates, quotes, reactions included)
- 🤖 **LLM Prompt Generation** — Ready-to-paste prompt with context + analysis instructions + full thread content
- 🌍 **Bilingual Prompts** — Turkish and English prompt support
- 📊 **Statistics** — Post count, author count, character count, and estimated token count
- 📋 **Copy & Download** — One-click clipboard copy or download as `.txt` / `.md`
- 🔄 **Full Pagination** — Fetches all posts in batches of 20 via the Discourse API
- 🎨 **Modern UI** — Dark theme, glassmorphism, gradient animations, responsive design

## 🚀 Live Demo

**👉 [chiefdelphiscraper.netlify.app](https://chiefdelphiscraper.netlify.app)**

## 📖 Usage

1. Paste a Chief Delphi thread URL
   ```
   https://www.chiefdelphi.com/t/thread-slug/123456
   ```
2. (Optional) Set a maximum post count
3. Choose prompt language (Türkçe / English)
4. Click **"Thread'i Çek ve Dönüştür"**
5. Copy the output or download it, then paste it directly into your favorite LLM

## 🛠️ Local Development

```bash
# Clone the repo
git clone https://github.com/KeremAlperBatal/ChiefDelphiScraper.git
cd ChiefDelphiScraper

# Start the local server (includes CORS proxy)
node server.js
```

Open **http://localhost:3000** in your browser.

## 📂 Project Structure

```
ChiefDelphiScraper/
├── public/                  # Static files (served by Netlify)
│   ├── index.html           # Main page
│   ├── style.css            # Styles
│   └── app.js               # Frontend logic
├── netlify/
│   └── functions/
│       └── proxy.js         # Serverless CORS proxy (Netlify Functions)
├── server.js                # Local dev server (with built-in proxy)
├── netlify.toml             # Netlify configuration
└── README.md
```

## ⚙️ Technical Details

### Why is a Proxy Needed?
The Chief Delphi (Discourse) API blocks cross-origin browser requests via CORS. To work around this:
- **Local:** `server.js` runs a simple Node.js HTTP proxy
- **Production:** A Netlify Function acts as a serverless proxy

### Discourse API
Chief Delphi is built on [Discourse](https://www.discourse.org/). The app uses these endpoints:
- `GET /t/{topic_id}.json` — Topic info + first batch of posts
- `GET /t/{topic_id}/posts.json?post_ids[]=...` — Additional posts by ID

### HTML → Markdown Conversion
Discourse's `cooked` HTML content is processed as follows:
- Discourse quote blocks → Markdown blockquotes with author attribution
- HTML headings, lists, links → Markdown equivalents
- Emoji images → `:emoji:` text format
- Unnecessary HTML tags are stripped

## 🌐 Deploy to Netlify

1. Fork this repo or push it to your own GitHub account
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
3. Connect GitHub → select the repo
4. Build settings are auto-configured via `netlify.toml` — just click **Deploy**
5. Your site will be live at `https://YOUR-SITE.netlify.app` within ~30 seconds

## 📄 Output Format

### Example LLM Prompt Output
```
Below is the complete content of a discussion thread from Chief Delphi
(the largest forum for the FIRST Robotics Competition community).

**Thread Title:** Lowering the Barrier to Code: AI's Role in FRC Robotics
**URL:** https://www.chiefdelphi.com/t/.../503634
**Total Posts:** 47
**Number of Participants:** 35

Please carefully read, analyze, and comprehensively summarize this
Chief Delphi thread...

---

# THREAD CONTENT START

## Post #1 — Sebastian Hondl (@SethHondl)
*📅 6/25/2025, 10:45 PM | 🏷️ 2017 | ❤️×4 👎×7*

I'm a mechanical engineering student at the University of Minnesota...

---

## Post #2 — Josh P (@BigJ)
...

# THREAD CONTENT END
```

## 🤝 Contributing

Pull requests are welcome! Contributions are especially appreciated in:
- Improved HTML → Markdown conversion
- Additional language support
- UI/UX improvements
- Support for other Discourse-based forums

## 📝 License

MIT License — use it however you like.

---

<div align="center">

Made with ❤️ for the **[FIRST Robotics Competition](https://www.firstinspires.org/robotics/frc)** community.

*Not officially affiliated with Chief Delphi.*

</div>
