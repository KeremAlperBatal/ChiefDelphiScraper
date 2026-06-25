/**
 * CD Thread Scraper — Chief Delphi to LLM Prompt Converter
 * 
 * Fetches all posts from a Chief Delphi (Discourse) thread via the JSON API,
 * converts HTML content to clean Markdown, and generates a ready-to-use LLM prompt.
 */

// ===== Constants =====
const POSTS_PER_PAGE = 20;

// ===== DOM References =====
const dom = {
    threadUrl: document.getElementById('thread-url'),
    maxPosts: document.getElementById('max-posts'),
    fetchBtn: document.getElementById('fetch-btn'),
    retryBtn: document.getElementById('retry-btn'),

    progressSection: document.getElementById('progress-section'),
    progressText: document.getElementById('progress-text'),
    progressBar: document.getElementById('progress-bar'),
    progressDetail: document.getElementById('progress-detail'),

    errorSection: document.getElementById('error-section'),
    errorText: document.getElementById('error-text'),

    resultsSection: document.getElementById('results-section'),

    statPosts: document.getElementById('stat-posts'),
    statAuthors: document.getElementById('stat-authors'),
    statChars: document.getElementById('stat-chars'),
    statTokens: document.getElementById('stat-tokens'),

    topicTitle: document.getElementById('topic-title'),
    topicCategory: document.getElementById('topic-category'),
    topicDate: document.getElementById('topic-date'),
    topicViews: document.getElementById('topic-views'),

    outputPrompt: document.getElementById('output-prompt'),
    outputMarkdown: document.getElementById('output-markdown'),
    outputPreview: document.getElementById('output-preview'),

    copyPromptBtn: document.getElementById('copy-prompt-btn'),
    downloadPromptBtn: document.getElementById('download-prompt-btn'),
    copyMdBtn: document.getElementById('copy-md-btn'),
    downloadMdBtn: document.getElementById('download-md-btn'),

    langTr: document.getElementById('lang-tr'),
    langEn: document.getElementById('lang-en'),
};

// ===== State =====
let state = {
    language: 'tr',
    topicData: null,
    allPosts: [],
    markdownOutput: '',
    promptOutput: '',
};

// ===== URL Parser =====
function parseChiefDelphiUrl(url) {
    // Match patterns like:
    // https://www.chiefdelphi.com/t/some-slug/123456
    // https://www.chiefdelphi.com/t/some-slug/123456/42
    const patterns = [
        /chiefdelphi\.com\/t\/([^\/]+)\/(\d+)(?:\/(\d+))?/,
        /chiefdelphi\.com\/t\/(\d+)(?:\/(\d+))?/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            if (pattern === patterns[0]) {
                return {
                    slug: match[1],
                    topicId: match[2],
                    postNumber: match[3] ? parseInt(match[3]) : null,
                };
            } else {
                return {
                    slug: null,
                    topicId: match[1],
                    postNumber: match[2] ? parseInt(match[2]) : null,
                };
            }
        }
    }
    return null;
}

// ===== Fetch via Local Proxy =====
async function fetchWithProxy(url) {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    
    try {
        const response = await fetch(proxyUrl, {
            signal: AbortSignal.timeout(20000)
        });
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (e) {
        if (e.name === 'TimeoutError' || e.name === 'AbortError') {
            throw new Error('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
        }
        throw new Error(`Bağlantı hatası: ${e.message}`);
    }
}

// ===== HTML to Markdown Converter =====
function htmlToMarkdown(html) {
    if (!html) return '';

    let md = html;

    // Remove Discourse-specific elements
    md = md.replace(/<template[^>]*>[\s\S]*?<\/template>/gi, '');
    md = md.replace(/<span class="abbreviation">(\w+)<template[^>]*>[\s\S]*?<\/template><\/span>/gi, '$1');
    
    // Handle blockquotes (Discourse quote format)
    md = md.replace(/<aside class="quote[^"]*"[^>]*data-username="([^"]*)"[^>]*>[\s\S]*?<div class="title">[\s\S]*?<\/div>\s*<blockquote>([\s\S]*?)<\/blockquote>\s*<\/aside>/gi, 
        (match, username, content) => {
            const cleanContent = htmlToMarkdown(content).trim();
            return `\n> **@${username} alıntısı:**\n> ${cleanContent.replace(/\n/g, '\n> ')}\n`;
        });

    // Handle remaining blockquotes
    md = md.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
        const cleanContent = htmlToMarkdown(content).trim();
        return `\n> ${cleanContent.replace(/\n/g, '\n> ')}\n`;
    });

    // Headers
    md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
    md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
    md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
    md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');

    // Bold / Italic / Code
    md = md.replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**');
    md = md.replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*');
    md = md.replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*');
    md = md.replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`');

    // Pre/code blocks
    md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n');

    // Links
    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (match, href, text) => {
        const cleanText = text.replace(/<[^>]+>/g, '').trim();
        if (href.startsWith('/u/') || href.startsWith('/t/')) {
            return cleanText;
        }
        if (cleanText === href || !cleanText) return href;
        return `[${cleanText}](${href})`;
    });

    // Images
    md = md.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, (match, alt, src) => {
        if (alt === '' && src.includes('emoji')) {
            const emojiMatch = src.match(/\/([^\/]+)\.png/);
            return emojiMatch ? `:${emojiMatch[1]}:` : '';
        }
        return alt ? `[Görsel: ${alt}]` : '[Görsel]';
    });
    md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, (match, src, alt) => {
        if (alt === '' && src.includes('emoji')) {
            const emojiMatch = src.match(/\/([^\/]+)\.png/);
            return emojiMatch ? `:${emojiMatch[1]}:` : '';
        }
        return alt ? `[Görsel: ${alt}]` : '[Görsel]';
    });

    // Lists
    md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
        return '\n' + content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n') + '\n';
    });
    md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
        let i = 0;
        return '\n' + content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, () => {
            i++;
            return `${i}. ` + arguments[1] + '\n';
        }) + '\n';
    });
    // Fix: handle ol items properly
    md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
        let i = 0;
        return '\n' + content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, text) => {
            i++;
            return `${i}. ${text.trim()}\n`;
        }) + '\n';
    });

    // Paragraphs & line breaks
    md = md.replace(/<br\s*\/?>/gi, '\n');
    md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');

    // Remove remaining HTML tags
    md = md.replace(/<div[^>]*class="lightbox-wrapper"[^>]*>[\s\S]*?<\/div>/gi, '[Görsel]');
    md = md.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    md = md.replace(/&amp;/g, '&');
    md = md.replace(/&lt;/g, '<');
    md = md.replace(/&gt;/g, '>');
    md = md.replace(/&quot;/g, '"');
    md = md.replace(/&#39;/g, "'");
    md = md.replace(/&nbsp;/g, ' ');

    // Clean up whitespace
    md = md.replace(/\n{3,}/g, '\n\n');
    md = md.trim();

    return md;
}

// ===== Fetch All Posts =====
async function fetchAllPosts(topicId, maxPosts) {
    showProgress();

    // Step 1: Fetch initial topic data
    updateProgress('Topic bilgileri alınıyor...', 5, '');
    const baseUrl = `https://www.chiefdelphi.com/t/${topicId}.json`;
    const topicData = await fetchWithProxy(baseUrl);

    state.topicData = topicData;
    
    const totalPosts = topicData.posts_count || topicData.post_stream?.posts?.length || 0;
    const targetPosts = maxPosts ? Math.min(maxPosts, totalPosts) : totalPosts;
    
    updateProgress(`Topic bilgileri alındı: ${totalPosts} mesaj bulundu`, 15, 
        `Hedef: ${targetPosts} mesaj çekilecek`);

    // Collect initial posts
    let allPosts = [...(topicData.post_stream?.posts || [])];

    // Step 2: Get remaining post IDs
    const postStream = topicData.post_stream?.stream || [];
    
    if (allPosts.length < targetPosts && postStream.length > allPosts.length) {
        const collectedIds = new Set(allPosts.map(p => p.id));
        const remainingIds = postStream.filter(id => !collectedIds.has(id));
        const neededIds = remainingIds.slice(0, targetPosts - allPosts.length);

        // Fetch in batches of 20
        const batchSize = 20;
        const batches = [];
        for (let i = 0; i < neededIds.length; i += batchSize) {
            batches.push(neededIds.slice(i, i + batchSize));
        }

        for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
            const batch = batches[batchIdx];
            const progress = 15 + ((batchIdx + 1) / batches.length) * 75;
            
            updateProgress(
                `Mesajlar çekiliyor... (${allPosts.length}/${targetPosts})`,
                progress,
                `Batch ${batchIdx + 1}/${batches.length}`
            );

            const postIds = batch.map(id => `post_ids[]=${id}`).join('&');
            const batchUrl = `https://www.chiefdelphi.com/t/${topicId}/posts.json?${postIds}`;
            
            try {
                const batchData = await fetchWithProxy(batchUrl);
                if (batchData.post_stream?.posts) {
                    allPosts.push(...batchData.post_stream.posts);
                }
            } catch (e) {
                console.warn(`Batch ${batchIdx + 1} başarısız:`, e);
                // Continue with what we have
            }

            // Small delay to be respectful to the API
            if (batchIdx < batches.length - 1) {
                await new Promise(r => setTimeout(r, 300));
            }
        }
    }

    // Sort by post_number and limit
    allPosts.sort((a, b) => a.post_number - b.post_number);
    allPosts = allPosts.slice(0, targetPosts);

    // Remove duplicates
    const seenIds = new Set();
    allPosts = allPosts.filter(post => {
        if (seenIds.has(post.id)) return false;
        seenIds.add(post.id);
        return true;
    });

    updateProgress('İşleniyor...', 95, `${allPosts.length} mesaj başarıyla çekildi`);

    state.allPosts = allPosts;
    return allPosts;
}

// ===== Generate Markdown =====
function generateMarkdown(topicData, posts) {
    const title = topicData.title || topicData.fancy_title || 'Başlıksız Thread';
    const topicUrl = `https://www.chiefdelphi.com/t/${topicData.slug || topicData.topic_slug || ''}/${topicData.id || topicData.topic_id || ''}`;
    
    let md = '';
    md += `# ${title}\n\n`;
    md += `**Kaynak:** ${topicUrl}\n`;
    md += `**Toplam Mesaj:** ${posts.length}\n`;
    
    if (topicData.created_at) {
        md += `**Oluşturulma:** ${new Date(topicData.created_at).toLocaleDateString('tr-TR')}\n`;
    }
    if (topicData.views) {
        md += `**Görüntülenme:** ${topicData.views.toLocaleString()}\n`;
    }
    
    md += `\n---\n\n`;

    for (const post of posts) {
        const authorName = post.name || post.display_username || post.username;
        const username = post.username;
        const postNumber = post.post_number;
        const createdAt = post.created_at ? new Date(post.created_at).toLocaleString('tr-TR') : '';
        const title = post.custom_user_title || '';
        const replyTo = post.reply_to_post_number;

        // Post header
        md += `## Mesaj #${postNumber} — ${authorName} (@${username})\n\n`;
        
        // Metadata line
        let metaParts = [];
        if (createdAt) metaParts.push(`📅 ${createdAt}`);
        if (title) metaParts.push(`🏷️ ${title}`);
        if (replyTo) metaParts.push(`↩️ #${replyTo}'e yanıt`);
        
        // Reactions
        if (post.reactions && post.reactions.length > 0) {
            const reactionStr = post.reactions
                .map(r => {
                    const emojiMap = {
                        'heart': '❤️', '+1': '👍', '-1': '👎', 'point_up': '☝️',
                        '100': '💯', 'thinking': '🤔', 'call_me_hand': '🤙',
                        'angry': '😠', 'laughing': '😂', 'tada': '🎉'
                    };
                    const emoji = emojiMap[r.id] || `[${r.id}]`;
                    return `${emoji}×${r.count}`;
                })
                .join(' ');
            metaParts.push(reactionStr);
        }

        if (metaParts.length > 0) {
            md += `*${metaParts.join(' | ')}*\n\n`;
        }

        // Post content
        const content = htmlToMarkdown(post.cooked || '');
        md += content + '\n\n';
        md += `---\n\n`;
    }

    return md;
}

// ===== Generate LLM Prompt =====
function generatePrompt(topicData, posts, markdown) {
    const title = topicData.title || topicData.fancy_title || 'Başlıksız Thread';
    const topicUrl = `https://www.chiefdelphi.com/t/${topicData.slug || topicData.topic_slug || ''}/${topicData.id || topicData.topic_id || ''}`;
    
    const uniqueAuthors = [...new Set(posts.map(p => p.username))];
    
    let prompt = '';
    
    if (state.language === 'tr') {
        prompt += `Aşağıda Chief Delphi forumundan (FIRST Robotics Competition topluluğunun en büyük forumu) bir tartışma thread'inin tüm mesajları yer almaktadır.\n\n`;
        prompt += `**Thread Başlığı:** ${title}\n`;
        prompt += `**URL:** ${topicUrl}\n`;
        prompt += `**Toplam Mesaj Sayısı:** ${posts.length}\n`;
        prompt += `**Katılımcı Sayısı:** ${uniqueAuthors.length}\n`;
        prompt += `**Katılımcılar:** ${uniqueAuthors.join(', ')}\n\n`;
        prompt += `Lütfen bu Chief Delphi thread'ini dikkatlice oku, analiz et ve kapsamlı bir şekilde özetle. Özellikle şunlara değin:\n`;
        prompt += `1. Thread'in ana konusu ve bağlamı\n`;
        prompt += `2. Öne çıkan görüşler ve argümanlar\n`;
        prompt += `3. Üzerinde uzlaşılan noktalar\n`;
        prompt += `4. Tartışmalı/karşıt görüşler\n`;
        prompt += `5. Önemli teknik detaylar veya öneriler\n`;
        prompt += `6. Genel sonuç ve topluluk eğilimi\n\n`;
        prompt += `---\n\n`;
        prompt += `# THREAD İÇERİĞİ BAŞLANGIÇ\n\n`;
    } else {
        prompt += `Below is the complete content of a discussion thread from Chief Delphi (the largest forum for the FIRST Robotics Competition community).\n\n`;
        prompt += `**Thread Title:** ${title}\n`;
        prompt += `**URL:** ${topicUrl}\n`;
        prompt += `**Total Posts:** ${posts.length}\n`;
        prompt += `**Number of Participants:** ${uniqueAuthors.length}\n`;
        prompt += `**Participants:** ${uniqueAuthors.join(', ')}\n\n`;
        prompt += `Please carefully read, analyze, and comprehensively summarize this Chief Delphi thread. Specifically address:\n`;
        prompt += `1. The main topic and context of the thread\n`;
        prompt += `2. Key opinions and arguments\n`;
        prompt += `3. Points of consensus\n`;
        prompt += `4. Controversial/opposing views\n`;
        prompt += `5. Important technical details or suggestions\n`;
        prompt += `6. Overall conclusion and community sentiment\n\n`;
        prompt += `---\n\n`;
        prompt += `# THREAD CONTENT START\n\n`;
    }

    prompt += markdown;

    if (state.language === 'tr') {
        prompt += `\n# THREAD İÇERİĞİ BİTİŞ\n`;
    } else {
        prompt += `\n# THREAD CONTENT END\n`;
    }

    return prompt;
}

// ===== Simple Markdown to HTML (for preview) =====
function simpleMarkdownToHtml(md) {
    let html = md;

    // Escape HTML
    html = html.replace(/&/g, '&amp;');
    html = html.replace(/</g, '&lt;');
    html = html.replace(/>/g, '&gt;');

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold & Italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');

    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>\s*(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<hr>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<blockquote>)/g, '$1');
    html = html.replace(/(<\/blockquote>)\s*<\/p>/g, '$1');

    return html;
}

// ===== UI Helpers =====
function showProgress() {
    dom.progressSection.classList.remove('hidden');
    dom.errorSection.classList.add('hidden');
    dom.resultsSection.classList.add('hidden');
}

function updateProgress(text, percent, detail) {
    dom.progressText.textContent = text;
    dom.progressBar.style.width = percent + '%';
    dom.progressDetail.textContent = detail;
}

function hideProgress() {
    dom.progressSection.classList.add('hidden');
}

function showError(message) {
    hideProgress();
    dom.errorSection.classList.remove('hidden');
    dom.errorText.textContent = message;
}

function hideError() {
    dom.errorSection.classList.add('hidden');
}

function showResults() {
    hideProgress();
    hideError();
    dom.resultsSection.classList.remove('hidden');
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab contents
    document.getElementById('tab-content-prompt').classList.toggle('hidden', tabName !== 'prompt');
    document.getElementById('tab-content-markdown').classList.toggle('hidden', tabName !== 'markdown');
    document.getElementById('tab-content-preview').classList.toggle('hidden', tabName !== 'preview');
}

async function copyToClipboard(text, btn) {
    try {
        await navigator.clipboard.writeText(text);
        const origHtml = btn.innerHTML;
        btn.classList.add('copied');
        btn.querySelector('span').textContent = 'Kopyalandı!';
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = origHtml;
        }, 2000);
    } catch (e) {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}

function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function estimateTokens(text) {
    // Rough estimate: ~4 characters per token for English
    return Math.round(text.length / 4);
}

// ===== Main Fetch Handler =====
async function handleFetch() {
    const url = dom.threadUrl.value.trim();
    if (!url) {
        showError('Lütfen bir Chief Delphi thread URL\'si girin.');
        return;
    }

    const parsed = parseChiefDelphiUrl(url);
    if (!parsed) {
        showError('Geçersiz URL. Lütfen geçerli bir Chief Delphi thread URL\'si girin.\nÖrnek: https://www.chiefdelphi.com/t/thread-name/123456');
        return;
    }

    const maxPosts = dom.maxPosts.value ? parseInt(dom.maxPosts.value) : null;

    dom.fetchBtn.disabled = true;
    hideError();

    try {
        // Fetch all posts
        const posts = await fetchAllPosts(parsed.topicId, maxPosts);

        if (posts.length === 0) {
            showError('Bu thread\'de mesaj bulunamadı.');
            dom.fetchBtn.disabled = false;
            return;
        }

        // Generate outputs
        const topicData = state.topicData;
        state.markdownOutput = generateMarkdown(topicData, posts);
        state.promptOutput = generatePrompt(topicData, posts, state.markdownOutput);

        // Update stats
        const uniqueAuthors = [...new Set(posts.map(p => p.username))];
        dom.statPosts.textContent = posts.length;
        dom.statAuthors.textContent = uniqueAuthors.length;
        dom.statChars.textContent = state.promptOutput.length.toLocaleString();
        dom.statTokens.textContent = '~' + estimateTokens(state.promptOutput).toLocaleString();

        // Update topic info
        const title = topicData.title || topicData.fancy_title || 'Başlıksız';
        dom.topicTitle.textContent = title;
        dom.topicCategory.textContent = topicData.category_id ? `Kategori: ${topicData.category_id}` : '';
        dom.topicDate.textContent = topicData.created_at ? `📅 ${new Date(topicData.created_at).toLocaleDateString('tr-TR')}` : '';
        dom.topicViews.textContent = topicData.views ? `👁️ ${topicData.views.toLocaleString()} görüntülenme` : '';

        // Populate outputs
        dom.outputPrompt.textContent = state.promptOutput;
        dom.outputMarkdown.textContent = state.markdownOutput;
        dom.outputPreview.innerHTML = simpleMarkdownToHtml(state.markdownOutput);

        showResults();

    } catch (error) {
        console.error('Hata:', error);
        showError(`Hata: ${error.message}`);
    } finally {
        dom.fetchBtn.disabled = false;
    }
}

// ===== Event Listeners =====
dom.fetchBtn.addEventListener('click', handleFetch);

dom.retryBtn.addEventListener('click', () => {
    hideError();
    handleFetch();
});

// Enter key on URL input
dom.threadUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleFetch();
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Language toggle
dom.langTr.addEventListener('click', () => {
    state.language = 'tr';
    dom.langTr.classList.add('active');
    dom.langEn.classList.remove('active');
    // Regenerate prompt if we have data
    if (state.allPosts.length > 0) {
        state.promptOutput = generatePrompt(state.topicData, state.allPosts, state.markdownOutput);
        dom.outputPrompt.textContent = state.promptOutput;
        dom.statChars.textContent = state.promptOutput.length.toLocaleString();
        dom.statTokens.textContent = '~' + estimateTokens(state.promptOutput).toLocaleString();
    }
});

dom.langEn.addEventListener('click', () => {
    state.language = 'en';
    dom.langEn.classList.add('active');
    dom.langTr.classList.remove('active');
    // Regenerate prompt if we have data
    if (state.allPosts.length > 0) {
        state.promptOutput = generatePrompt(state.topicData, state.allPosts, state.markdownOutput);
        dom.outputPrompt.textContent = state.promptOutput;
        dom.statChars.textContent = state.promptOutput.length.toLocaleString();
        dom.statTokens.textContent = '~' + estimateTokens(state.promptOutput).toLocaleString();
    }
});

// Copy buttons
dom.copyPromptBtn.addEventListener('click', () => {
    copyToClipboard(state.promptOutput, dom.copyPromptBtn);
});

dom.copyMdBtn.addEventListener('click', () => {
    copyToClipboard(state.markdownOutput, dom.copyMdBtn);
});

// Download buttons
dom.downloadPromptBtn.addEventListener('click', () => {
    const slug = state.topicData?.slug || state.topicData?.topic_slug || 'thread';
    downloadFile(state.promptOutput, `cd-prompt-${slug}.txt`);
});

dom.downloadMdBtn.addEventListener('click', () => {
    const slug = state.topicData?.slug || state.topicData?.topic_slug || 'thread';
    downloadFile(state.markdownOutput, `cd-thread-${slug}.md`);
});

// Input glow effect
dom.threadUrl.addEventListener('focus', () => {
    dom.threadUrl.closest('.input-wrapper').classList.add('focused');
});
dom.threadUrl.addEventListener('blur', () => {
    dom.threadUrl.closest('.input-wrapper').classList.remove('focused');
});

// Auto-fill example on double click placeholder
dom.threadUrl.addEventListener('dblclick', () => {
    if (!dom.threadUrl.value) {
        dom.threadUrl.value = 'https://www.chiefdelphi.com/t/lowering-the-barrier-to-code-ais-role-in-frc-robotics/503634';
    }
});
