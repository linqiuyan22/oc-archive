// ============ 全局变量与用户系统 ============
const VALID_USERS = {
    'ADMIN-001': { pass:'admin123', name:'系统管理员', isAdmin:true },
    'QYXH-GUEST': { pass:'visitor', name:'临时访客', isAdmin:false },
    'L-09-01-S': { pass:'fengyu', name:'苏晚眠', isAdmin:false },
    'L-09-02-C': { pass:'lingxiu', name:'沈绛离', isAdmin:false },
    'L-09-03-X': { pass:'tianji', name:'谢逢虚', isAdmin:false },
    'L-09-04-W': { pass:'luoyu', name:'温泣语', isAdmin:false },
    'L-09-05-L': { pass:'kuanggu', name:'陆烬弦', isAdmin:false }
};

const ARCHIVE_DATA_VERSION = 'xuju-archive-v4-characters';

window.currentUser = null;
purgeLegacySiteStorage();
let archiveData = [];
let userFavorites = {};
let userHistory = {};
let userLoginCounts = {};
let currentPanel = 'home';
let activeCategory = 'all';
let activeSubCategory = 'all';
let currentBoard = 'all';
let currentPostPage = 1;
const POST_PAGE_SIZE = 8;
let activeContainmentType = 'all';
let currentChannel = 'main';
let terminalInited = false;
let editingId = null;
let currentInternalPostId = null; 

let forumNickname = localStorage.getItem('darkalley_nickname') || '匿名_' + Math.floor(Math.random()*0xffff).toString(16);
let forumFriends = safeGetJSON('darkalley_friends', []);
let forumMessages = safeGetJSON('darkalley_messages', []);
let lingshiMessages = safeGetJSON('xuju_lingshi', JSON.parse(JSON.stringify(DEFAULT_CHANNELS)));
let internalPosts = safeGetJSON('xuju_internal_posts', JSON.parse(JSON.stringify(DEFAULT_INTERNAL_POSTS)));
let missions = safeGetJSON('xuju_missions', JSON.parse(JSON.stringify(DEFAULT_MISSIONS)));
let checkinState = safeGetJSON('darkalley_checkin', { streak: 0, total: 0, points: 0, lastDate: null, dates: [] });

function safeGetJSON(key, fallback) {
    try { const raw = localStorage.getItem(key); if (raw === null || raw === 'null' || raw === undefined) return fallback; return JSON.parse(raw); } catch(e) { return fallback; }
}
function safeSet(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {} }
function purgeLegacySiteStorage() {
    const legacyKeys = [
        'darkalley_posts', 'darkalley_featured', 'xuju_archive', 'xuju_lingshi',
        'xuju_internal_posts', 'xuju_missions', 'xuju_logincounts', 'xuju_history',
        'darkalley_friends', 'darkalley_messages', 'site_local_data_bundle', 'xuju_daily_fortune',
        'xuju_archive_version', 'xuju_rule_flags'
    ];
    const archiveSaved = safeGetJSON('xuju_archive', []);
    const postsSaved = safeGetJSON('darkalley_posts', []);
    const archiveVersion = localStorage.getItem('xuju_archive_version');
    const validCategories = new Set(['墟界管理档案', '叛逃人员档案', '人物档案', '事件分支', '收容物分支']);
    const legacyTextPattern = /档案条例|总则条例|目录分支|正文内容|\.docx|整篇长文|利用文档|整理自|旧版档案/i;
    const archiveLooksLegacy = Array.isArray(archiveSaved) && (
        archiveSaved.length < 10 ||
        archiveSaved.some(item => {
            const text = `${item?.title || ''} ${item?.summary || ''} ${item?.content || ''}`;
            const category = String(item?.category || '');
            const isOldLabel = legacyTextPattern.test(`${category} ${text}`);
            const isUnknownCategory = !!category && !validCategories.has(category) && !/^(人物档案|叛逃人员档案|墟界管理档案|事件分支|收容物分支)$/.test(category);
            return isOldLabel || isUnknownCategory;
        }) ||
        archiveVersion !== ARCHIVE_DATA_VERSION
    );
    const postsLooksLegacy = Array.isArray(postsSaved) && postsSaved.some(post => {
        const text = `${post?.title || ''} ${post?.content || ''}`;
        return /正文内容|档案条例|总则条例|整篇长文|目录分支|旧版档案/i.test(text);
    });
    if (archiveLooksLegacy || postsLooksLegacy) {
        legacyKeys.forEach(key => localStorage.removeItem(key));
        localStorage.setItem('xuju_archive_version', ARCHIVE_DATA_VERSION);
        console.log('已清理旧版缓存，恢复为分支式档案结构。');
    } else if (!archiveVersion) {
        localStorage.setItem('xuju_archive_version', ARCHIVE_DATA_VERSION);
    }
}
function safePrompt(message) {
    try {
        if (typeof window.prompt === 'function') return window.prompt(message);
    } catch (e) {}
    return '';
}

function getDailyFortune() {
    const today = new Date().toDateString();
    const saved = safeGetJSON('xuju_daily_fortune', null);
    if (saved && saved.date === today) return saved.fortune;
    const fortune = DAILY_FORTUNES[Math.floor(Math.random() * DAILY_FORTUNES.length)];
    safeSet('xuju_daily_fortune', { date: today, fortune });
    return fortune;
}

// ============ 🔥【终极防呆修复】先强制清除本地坏缓存 ============
let forumPosts = safeGetJSON('darkalley_posts', null);
if (!forumPosts || !Array.isArray(forumPosts) || forumPosts.length === 0 || forumPosts.length < DEFAULT_POSTS.length) {
    localStorage.removeItem('darkalley_posts');
    forumPosts = JSON.parse(JSON.stringify(DEFAULT_POSTS));
    safeSet('darkalley_posts', forumPosts);
    console.log("检测到帖子数据异常，已强制重置为完整默认数据");
}

let featuredPosts = safeGetJSON('darkalley_featured', null);
if (!featuredPosts || !Array.isArray(featuredPosts) || featuredPosts.length === 0 || featuredPosts.length < FEATURED_POSTS.length) {
    featuredPosts = JSON.parse(JSON.stringify(FEATURED_POSTS));
    safeSet('darkalley_featured', featuredPosts);
} else {
    featuredPosts = featuredPosts.map(item => ({
        ...item,
        postId: item.postId || item.id || 'p1',
        image: item.image || 'images/feature1.jpg'
    }));
    safeSet('darkalley_featured', featuredPosts);
}
function savePosts() { safeSet('darkalley_posts', forumPosts); }
function triggerDataFileDownload(fileName, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
function saveLocalDataBundle() {
    const payload = {
        exportedAt: new Date().toISOString(),
        forumPosts,
        featuredPosts,
        archiveData,
        lingshiMessages,
        internalPosts,
        missions,
        userFavorites,
        userHistory,
        forumFriends,
        forumMessages
    };
    safeSet('darkalley_posts', forumPosts);
    safeSet('darkalley_featured', featuredPosts);
    safeSet('xuju_archive', archiveData);
    safeSet('xuju_lingshi', lingshiMessages);
    safeSet('xuju_internal_posts', internalPosts);
    safeSet('xuju_missions', missions);
    safeSet('xuju_logincounts', userLoginCounts);
    safeSet('xuju_history', userHistory);
    safeSet('darkalley_friends', forumFriends);
    safeSet('darkalley_messages', forumMessages);
    safeSet('site_local_data_bundle', payload);
    return payload;
}
function exportLocalDataBundle() {
    const payload = saveLocalDataBundle();
    triggerDataFileDownload('site-local-data.json', payload);
    return payload;
}
function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ============ 🌟 论坛星星/数据流粒子特效 ============
let starAnimId = null;
function startStars() {
    const canvas = document.getElementById('starCanvas');
    if (!canvas) return;
    if(starAnimId) { cancelAnimationFrame(starAnimId); }
    const ctx = canvas.getContext('2d');
    function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.removeEventListener('resize', resizeCanvas); window.addEventListener('resize', resizeCanvas); resizeCanvas();
    const stars = Array.from({length:80}, ()=>({
        x: Math.random()*canvas.width, y: Math.random()*canvas.height,
        radius: 0.5 + Math.random()*1.5, speed: 0.2 + Math.random()*0.4,
        opacity: 0.2 + Math.random()*0.3
    }));
    let t = 0;
    function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        stars.forEach(s => {
            s.y += s.speed;
            if(s.y > canvas.height + 10) { s.y = -10; s.x = Math.random()*canvas.width; }
            const alpha = s.opacity * (0.6 + 0.4 * Math.sin(t + s.x));
            ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI*2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.shadowBlur = 4; ctx.shadowColor = 'rgba(207, 42, 42, 0.2)';
            ctx.fill(); ctx.shadowBlur = 0;
        });
        t += 0.05;
        starAnimId = requestAnimationFrame(draw);
    }
    draw();
}

// ============ 双音乐播放器系统 ============
function setupForumMiniPlayer() {
    const audio = document.getElementById('forumAudio');
    const sourceEl = document.getElementById('forumAudioSource');
    if (!sourceEl || !audio) {
        console.warn("未找到论坛音频元素，跳过初始化。");
        return; 
    }
    
    const btn = document.getElementById('forumMiniPlayBtn');
    const actionText = document.getElementById('forumActionText');
    const playerContainer = document.getElementById('forumVinylPlayer');
    if (!FORUM_AUDIO_SRC) { if(playerContainer) playerContainer.style.opacity = '0.4'; return; }
    
    sourceEl.src = FORUM_AUDIO_SRC;
    audio.load(); audio.volume = 0.3;
    btn.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().then(() => {
                playerContainer.classList.add('playing'); actionText.textContent = '[ 播放中 ]'; btn.textContent = '⏸';
            }).catch(() => {});
        } else {
            audio.pause(); playerContainer.classList.remove('playing'); actionText.textContent = '[ 暂停 ]'; btn.textContent = '▶';
        }
    });
}

function setupMiniTerminalPlayer() {
    const audio = document.getElementById('bgAudio');
    const sourceEl = document.getElementById('audioSource');
    const btn = document.getElementById('miniPlayBtn');
    const actionText = document.getElementById('actionText');
    const playerContainer = document.getElementById('vinylPlayer');
    if (!audio || !sourceEl || !btn || !playerContainer) {
        console.warn('未找到终端音频元素，跳过初始化。');
        return;
    }
    if (!TERMINAL_AUDIO_SRC) { playerContainer.style.opacity = '0.4'; return; }
    sourceEl.src = TERMINAL_AUDIO_SRC;
    audio.load(); audio.volume = 0.3;
    btn.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().then(() => {
                playerContainer.classList.add('playing'); if (actionText) actionText.textContent = '[ 播放中 ]'; btn.textContent = '⏸';
            }).catch(() => {});
        } else {
            audio.pause(); playerContainer.classList.remove('playing'); if (actionText) actionText.textContent = '[ 暂停 ]'; btn.textContent = '▶';
        }
    });
}

// ============ 论坛渲染 ============
function renderFeaturedPosts() {
    const slider = document.getElementById('featuredSlider');
    if (!slider) return;

    const validFeatured = featuredPosts.filter(item => item && (item.postId || item.id));
    slider.innerHTML = validFeatured.map(item => {
        const targetId = item.postId || item.id;
        const match = forumPosts.find(post => post.id === targetId);
        const title = match ? match.title : (item.title || '专题');
        const imagePath = item.image || 'images/feature1.jpg';
        return `
            <div class="featured-post-card featured-link" data-id="${targetId}" style="background-color:#222; background-image:url('${imagePath}')">
                <span class="featured-post-badge">${item.badge || '专题'}</span>
                <div class="featured-post-title">${title}</div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.featured-link').forEach(el => {
        el.addEventListener('click', function() {
            const targetId = this.dataset.id;
            if (!targetId) return;
            const target = forumPosts.find(post => post.id === targetId);
            if (target) {
                showPostDetail(targetId);
            }
        });
    });
}

function renderPostList() {
    const list = document.getElementById('postList');
    if (!list) return;
    let filtered = forumPosts;
    if (currentBoard !== 'all') filtered = filtered.filter(p => p.board === currentBoard);
    const total = (filtered || []).length;
    const totalPages = Math.max(1, Math.ceil(total / POST_PAGE_SIZE));
    if (currentPostPage > totalPages) currentPostPage = totalPages;
    if (currentPostPage < 1) currentPostPage = 1;
    const reversed = (filtered || []).slice().reverse();
    const pageItems = reversed.slice((currentPostPage - 1) * POST_PAGE_SIZE, currentPostPage * POST_PAGE_SIZE);
    if (total === 0) {
        list.innerHTML = `<div class="post-item" style="text-align:center;color:var(--text-muted);pointer-events:none;border-color:transparent;">该板块还没有帖子，快来发布第一篇讨论吧。</div>`;
    } else {
        list.innerHTML = pageItems.map(p => {
            const cover = p.image && String(p.image).trim() ? String(p.image).trim() : 'images/feature1.jpg';
            return `
            <div class="post-item" data-id="${p.id}">
                ${p.image ? `<div class="post-cover" style="background-image:url('${cover}')"></div>` : ''}
                <div class="post-content">
                    <div class="post-header">
                        <div class="post-author">${p.author}</div>
                        <div class="post-meta">
                            <span class="post-board-tag">${p.board || '综合'}</span>
                            <span class="post-time">${p.timestamp}</span>
                        </div>
                    </div>
                    <div class="post-title">${p.title}</div>
                    <div class="post-content-preview">${p.content}</div>
                </div>
            </div>
        `}).join('');
    }
    document.querySelectorAll('.post-item[data-id]').forEach(el => {
        el.addEventListener('click', () => showPostDetail(el.dataset.id));
    });
    renderPagination(totalPages);
    document.getElementById('totalPosts').textContent = forumPosts.length;
    renderCheckin();
}

function renderPagination(totalPages) {
    const wrap = document.getElementById('postPagination');
    if (!wrap) return;
    if (totalPages <= 1) { wrap.innerHTML = ''; return; }
    const parts = [];
    parts.push(`<button class="page-btn" data-page="${currentPostPage - 1}" ${currentPostPage === 1 ? 'disabled' : ''}>‹ 上一页</button>`);
    const pages = [];
    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || Math.abs(p - currentPostPage) <= 1) {
            if (pages[pages.length - 1] !== p) pages.push(p);
        }
    }
    let last = 0;
    pages.forEach(p => {
        if (last && p - last > 1) parts.push('<span class="page-ellipsis">…</span>');
        parts.push(`<button class="page-btn${p === currentPostPage ? ' active' : ''}" data-page="${p}">${p}</button>`);
        last = p;
    });
    parts.push(`<button class="page-btn" data-page="${currentPostPage + 1}" ${currentPostPage === totalPages ? 'disabled' : ''}>下一页 ›</button>`);
    wrap.innerHTML = parts.join('');
    wrap.querySelectorAll('.page-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = parseInt(btn.dataset.page, 10);
            if (isNaN(p) || p < 1 || p > totalPages) return;
            currentPostPage = p;
            renderPostList();
        });
    });
}

// ============  论坛动态（模拟实时活跃度） ============
function updateForumStatus() {
    const online = Math.floor(Math.random() * 76) + 45; // 45-120 人
    const newPosts = Math.floor(Math.random() * 13) + 3; // 3-15 帖
    ['onlineCount', 'onlineCountDetail'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = online;
    });
    const npe = document.getElementById('todayNewPosts');
    if (npe) npe.textContent = newPosts;
    // 最热话题：当前回复数最多的帖子
    const hot = (forumPosts || []).slice().sort((a, b) => (b.comments || []).length - (a.comments || []).length)[0];
    const hte = document.getElementById('hotTopic');
    if (hte) {
        if (hot) {
            hte.innerHTML = `<a href="#" class="hot-link" data-id="${hot.id}" title="查看帖子">${hot.title}</a>`;
            const hl = hte.querySelector('.hot-link');
            if (hl) hl.addEventListener('click', (e) => { e.preventDefault(); if (forumPosts.find(p => p.id === hl.dataset.id)) showPostDetail(hl.dataset.id); });
        } else {
            hte.textContent = '暂无话题';
        }
    }
    // 在线用户列表（从已有帖子作者中随机选 5-8 个）
    const ue = document.getElementById('onlineUsers');
    if (ue) {
        const pool = [...new Set((forumPosts || []).map(p => p.author))].filter(a => a && a !== '系统管理员');
        if (!pool.length) { ue.innerHTML = '<li class="online-empty">—</li>'; }
        else {
            const count = Math.floor(Math.random() * 4) + 5; // 5-8 个
            const copy = pool.slice();
            const chosen = [];
            while (chosen.length < count && copy.length) chosen.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
            ue.innerHTML = chosen.map(u => `<li><span class="online-dot"></span>${u}</li>`).join('');
        }
    }
}

// ============ 每日签到 ============
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function yesterdayStr() {
    const d = new Date(); d.setDate(d.getDate()-1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function renderCheckin() {
    const btn = document.getElementById('checkinBtn');
    if (!btn) return;
    const today = todayStr();
    const checkedToday = checkinState.lastDate === today;
    btn.textContent = checkedToday ? '✅ 今日已签到' : '☾ 今日签到';
    btn.disabled = checkedToday;
    btn.classList.toggle('done', checkedToday);
    document.getElementById('checkinStreak').textContent = `连签 ${checkinState.streak} 天`;
    document.getElementById('checkinPoints').textContent = checkinState.points;
    const level = Math.min(10, Math.floor(checkinState.total / 5) + 1);
    document.getElementById('checkinLevel').textContent = `Lv.${level}`;
    document.getElementById('checkinTip').textContent = checkedToday
        ? '明天再来，连续签到奖励更多'
        : (checkinState.lastDate === yesterdayStr() ? '昨天已签，今天续上可保持连签' : '签到可得积分，连续签到奖励更多');
}
function doCheckin() {
    const today = todayStr();
    const yst = yesterdayStr();
    if (checkinState.lastDate === today) { renderCheckin(); return; }
    if (checkinState.lastDate === yst) {
        checkinState.streak += 1;
    } else {
        checkinState.streak = 1;
    }
    checkinState.total += 1;
    checkinState.points += 10 + Math.min(20, (checkinState.streak - 1) * 2);
    checkinState.lastDate = today;
    checkinState.dates = checkinState.dates || [];
    checkinState.dates.push(today);
    safeSet('darkalley_checkin', checkinState);
    renderCheckin();
    const gained = 10 + Math.min(20, (checkinState.streak - 1) * 2);
    addPoints(gained);
    alert(`☾ 签到成功！\n连签 ${checkinState.streak} 天\n积分 +${gained}（当前总积分 ${getPoints()}）`);
}
if (document.getElementById('checkinBtn')) {
    document.getElementById('checkinBtn').addEventListener('click', doCheckin);
}

window.showPostDetail = function(id) {
    const post = forumPosts.find(p => p.id === id);
    if (!post) {
        console.warn('未找到帖子：', id);
        return;
    }
    markRead('post|' + id);
    setForumView('postDetailView');
    const detail = document.getElementById('postDetailView');
    detail.dataset.currentId = id;

    const bodyHtml = post.content
        .split('\n\n')
        .map(paragraph => paragraph.trim())
        .filter(Boolean)
        .map(p => {
            const isList = p.startsWith('1.') || p.startsWith('2.') || p.startsWith('3.') || p.startsWith('4.') || p.startsWith('5.') || p.startsWith('·');
            if (isList) {
                const items = p
                    .split(/\n/)
                    .map(item => item.trim())
                    .filter(Boolean)
                    .map(item => `<li>${item.replace(/^\d+\.?\s*|^·\s*/, '')}</li>`)
                    .join('');
                return `<ul class="detail-list">${items}</ul>`;
            }
            return `<p>${p}</p>`;
        })
        .join('');

    const detailCover = post.image && String(post.image).trim() ? String(post.image).trim() : '';
    const commentCount = (post.comments||[]).length;
    document.getElementById('postDetailContent').innerHTML = `
        ${detailCover ? `<div class="post-detail-cover" style="background-image:url('${detailCover}')"></div>` : ''}
        <div class="post-detail-header">
            <div class="post-author-bar">
                <div class="thread-avatar op tone-a">${(post.author||'匿').slice(-2).slice(0,1)}</div>
                <div>
                    <div class="post-author-name">${post.author}<span class="op-badge">楼主</span></div>
                    <div class="post-detail-meta">
                        <span>${post.timestamp}</span>
                        <span class="post-board-tag">${post.board || '综合'}</span>
                        <span class="post-stat">👁 ${(post.views||0)} 浏览 · 💬 ${commentCount} 回复 · <button class="post-like-btn" type="button">♡ ${post.likes || 0}</button></span>
                    </div>
                </div>
            </div>
            <h2>${post.title}</h2>
        </div>
        <div class="post-detail-body">
            ${bodyHtml}
        </div>`;
    const likeBtn = document.querySelector('.post-like-btn');
    if (likeBtn) likeBtn.addEventListener('click', () => {
        post.likes = (post.likes || 0) + 1;
        savePosts();
        likeBtn.textContent = '❤ ' + post.likes;
        likeBtn.classList.add('liked');
    });
    renderComments(post);
}

function renderComments(post) {
    const opName = post.author;
    const listEl = document.getElementById('commentList');
    const comments = post.comments || [];
    const likedSet = safeGetJSON('darkalley_liked', {});
    if (!comments.length) { listEl.innerHTML = '<div style="color:var(--text-muted);padding:12px 0;">还没有回复，来抢个沙发？</div>'; return; }
    listEl.innerHTML = comments.map((c, idx) => {
        const floor = idx + 2;
        const isOP = !!c.isOP || c.user === opName;
        const opBadge = isOP ? '<span class="op-badge">楼主</span>' : '';
        const avatarTone = isOP ? 'op' : (idx % 3 === 0 ? 'tone-a' : idx % 3 === 1 ? 'tone-b' : 'tone-c');
        const quoteHtml = c.replyTo ? `<div class="quote-block"><span class="quote-arrow">↩</span>回复 <b>${c.replyTo.user}</b>：${c.replyTo.text}</div>` : '';
        const likeKey = post.id + '|' + idx;
        const liked = !!likedSet[likeKey];
        return `
        <div class="thread-card${isOP ? ' op-comment' : ''}">
            <div class="thread-avatar ${avatarTone}">${(c.user||'匿').slice(-2).slice(0,1)}</div>
            <div class="thread-main">
                <div class="thread-card-header">
                    <strong>${c.user}</strong>${opBadge}
                    <small>${c.time} · ${floor}楼</small>
                </div>
                ${quoteHtml}
                <p>${c.text}</p>
                <div class="thread-actions">
                    <button class="cmt-btn quote-btn" data-idx="${idx}" type="button">↩ 引用</button>
                    <button class="cmt-btn like-btn ${liked ? 'liked' : ''}" data-idx="${idx}" type="button">${liked ? '❤' : '♡'} ${c.likes || 0}</button>
                </div>
            </div>
        </div>`;
    }).join('');
    listEl.querySelectorAll('.quote-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const c = comments[+btn.dataset.idx]; if (!c) return;
            window.pendingReply = { user: c.user, text: c.text.slice(0, 50) + (c.text.length > 50 ? '…' : ''), floor: (+btn.dataset.idx) + 2 };
            const hint = document.getElementById('commentReplyHint');
            if (hint) { hint.style.display = 'flex'; document.getElementById('replyHintText').textContent = `@${c.user}（${(+btn.dataset.idx)+2}楼）`; }
            const input = document.getElementById('commentInput');
            input.placeholder = `回复 @${c.user}…`; input.value = ''; input.focus();
        });
    });
    listEl.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const c = comments[+btn.dataset.idx]; if (!c) return;
            const key = post.id + '|' + btn.dataset.idx;
            if (likedSet[key]) return;
            likedSet[key] = true;
            c.likes = (c.likes || 0) + 1;
            savePosts(); safeSet('darkalley_liked', likedSet);
            renderComments(post);
        });
    });
}

function backToList() {
    setForumView('postListView');
    renderPostList();
}

// ============ 论坛事件绑定 ============
document.querySelectorAll('.board-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        if (!tab.dataset.board) return;
        document.querySelectorAll('.board-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentBoard = tab.dataset.board;
        currentPostPage = 1;
        setForumView('postListView');
        renderPostList();
    });
});
document.getElementById('submitNewPostBtn').addEventListener('click', () => {
    const title = document.getElementById('newPostTitle').value.trim();
    const content = document.getElementById('newPostContent').value.trim();
    const board = document.getElementById('newPostBoard').value;
    if (!title || !content) return alert('请填写标题和内容');
    forumPosts.push({ id:'p'+Date.now(), title, content, board, author: forumNickname, timestamp:new Date().toLocaleString('zh-CN'), comments:[] });
    currentPostPage = 1;
    addPoints(10); savePosts(); backToList();
});
document.getElementById('submitCommentBtn').addEventListener('click', () => {
    const text = document.getElementById('commentInput').value.trim();
    if (!text) return;
    const postId = document.getElementById('postDetailView').dataset.currentId;
    const post = forumPosts.find(p => p.id === postId);
    if (!post) return;
    const replyTo = window.pendingReply || null;
    window.pendingReply = null;
    const hint = document.getElementById('commentReplyHint'); if (hint) hint.style.display = 'none';
    document.getElementById('commentInput').placeholder = '说点什么吧...';
    post.comments = post.comments || [];
    post.comments.push({ user: forumNickname, text, time:new Date().toLocaleString('zh-CN'), likes: 0, replyTo });
    addPoints(5); savePosts(); renderComments(post); document.getElementById('commentInput').value = '';
});
document.getElementById('cancelReplyBtn').addEventListener('click', () => {
    window.pendingReply = null;
    document.getElementById('commentReplyHint').style.display = 'none';
    document.getElementById('commentInput').placeholder = '说点什么吧...';
});
document.getElementById('backToListBottom').addEventListener('click', backToList);
['forumHomeLink','backToListBtn','cancelNewPostBtn','profileBackBtn'].forEach(id => {
    const el = document.getElementById(id); if(el) el.addEventListener('click', (e) => { if(e) e.preventDefault(); backToList(); });
});
document.getElementById('forumNewPostLink').addEventListener('click', e => { e.preventDefault();
    document.getElementById('postListView').style.display = 'none';
    document.getElementById('postDetailView').style.display = 'none';
    document.getElementById('forumProfileView').style.display = 'none';
    document.getElementById('newPostForm').style.display = 'block';
});

// ============ 论坛个人中心与登录系统 ============
document.getElementById('forumProfileLink').addEventListener('click', e => { e.preventDefault(); backToProfile(); });
function backToProfile() {
    document.getElementById('postListView').style.display = 'none';
    document.getElementById('postDetailView').style.display = 'none';
    document.getElementById('newPostForm').style.display = 'none';
    document.getElementById('forumProfileView').style.display = 'block';
    renderForumProfile();
}
function renderForumProfile() {
    document.getElementById('forumProfileName').textContent = forumNickname;
    const level = Math.min(10, Math.floor(checkinState.total / 5) + 1);
    document.getElementById('forumProfileSub').textContent = `已签到 ${checkinState.total} 天 · Lv.${level}`;
    // 概览
    const myPostCount = forumPosts.filter(p => p.author === forumNickname).length;
    document.getElementById('ovPosts').textContent = myPostCount;
    document.getElementById('ovCheckin').textContent = checkinState.total;
    document.getElementById('ovStreak').textContent = checkinState.streak;
    document.getElementById('ovPoints').textContent = checkinState.points;
    // 我的帖子
    const mine = forumPosts.filter(p => p.author === forumNickname);
    document.getElementById('mypostsList').innerHTML = mine.length ? mine.map(p => `
        <div class="my-post-item">
            <span class="my-post-board">${p.board || '综合'}</span>
            <span class="my-post-title" onclick="showPostDetail('${p.id}')">${p.title}</span>
            <small>${(p.comments||[]).length} 回复 · ${p.timestamp}</small>
        </div>`).join('') : '<div style="color:var(--text-muted);padding:10px 0;">你还没有发过帖子</div>';
    // 签到记录
    const history = (checkinState.dates || []).slice().reverse();
    document.getElementById('checkinHistory').innerHTML = history.length ? history.map(d => `<div class="checkin-day"><span>☾</span><span>${d}</span><span class="checkin-day-ok">已签到</span></div>`).join('') : '<div style="color:var(--text-muted);padding:10px 0;">还没有签到记录</div>';
    // 好友
    document.getElementById('friendsList').innerHTML = forumFriends.length ? forumFriends.map(f => `<div class="friend-item" style="border-bottom:1px solid var(--border-color);padding:8px 0;display:flex;justify-content:space-between;"><span>${f}</span><button onclick="removeFriend('${f}')" style="color:var(--accent-red);">删除</button></div>`).join('') : '暂无好友';
    // 私信
    document.getElementById('messagesList').innerHTML = forumMessages.length ? forumMessages.map(m => `<div style="padding:8px 0;border-bottom:1px solid var(--border-color);"><strong>${m.from}</strong> → ${m.to}: ${m.text} <small style="color:var(--text-muted);">${m.time}</small></div>`).join('') : '暂无消息';
}
window.removeFriend = function(name) { forumFriends = forumFriends.filter(f => f !== name); safeSet('darkalley_friends', forumFriends); renderForumProfile(); };
document.getElementById('addFriendBtn').addEventListener('click', () => { const name = safePrompt('输入好友昵称：'); if (name && name.trim() && !forumFriends.includes(name.trim())) { forumFriends.push(name.trim()); safeSet('darkalley_friends', forumFriends); renderForumProfile(); } });
document.getElementById('sendMessageBtn').addEventListener('click', () => { const to = document.getElementById('messageRecipient').value.trim(); const text = document.getElementById('messageContent').value.trim(); if (!to || !text) return alert('请填写收件人和内容'); forumMessages.push({ from: forumNickname, to, text, time:new Date().toLocaleString('zh-CN') }); safeSet('darkalley_messages', forumMessages); renderForumProfile(); });
document.querySelectorAll('.profile-tab').forEach(tab => { tab.addEventListener('click', () => { document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active')); tab.classList.add('active'); const t = tab.dataset.tab; ['overview','myposts','checkin','friends','messages'].forEach(k => { const el = document.getElementById(k + 'Panel'); if (el) el.style.display = k === t ? 'block' : 'none'; }); if (t === 'myposts' || t === 'checkin' || t === 'overview') renderForumProfile(); }); });
const quickCheckinBtn = document.getElementById('quickCheckinBtn');
if (quickCheckinBtn) quickCheckinBtn.addEventListener('click', () => { doCheckin(); renderForumProfile(); });
const quickNewPostBtn = document.getElementById('quickNewPostBtn');
if (quickNewPostBtn) quickNewPostBtn.addEventListener('click', () => { document.getElementById('forumProfileView').style.display = 'none'; document.getElementById('postListView').style.display = 'none'; document.getElementById('postDetailView').style.display = 'none'; document.getElementById('newPostForm').style.display = 'block'; });

// ============ 🚀【核心修复】管理员登录状态同步与管理按钮显示 ============
function updatePortalStatus() {
    if (window.currentUser) {
        document.getElementById('topUsername').textContent = window.currentUser.name;
        if (window.currentUser.isAdmin) {
            // 显示 [管理员] 标签
            document.getElementById('topAdminBadge').style.display = 'inline';
            // 🛠️ 修复：必须把 admin-only 按钮的 display 属性改掉，否则菜单里永远不会有【管理】
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'inline-block';
            });
        } else {
            document.getElementById('topAdminBadge').style.display = 'none';
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'none';
            });
        }
    } else {
        document.getElementById('topUsername').textContent = '---';
        document.getElementById('topAdminBadge').style.display = 'none';
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
        });
    }
}

function attemptLogin() {
    const id = document.getElementById('staffIdInput').value.trim(); const pass = document.getElementById('passwordInput').value.trim(); const info = VALID_USERS[id];
    if (!info || info.pass !== pass) { document.getElementById('loginError').textContent = '[!] 验证失败'; return; }
    window.currentUser = { id, name:info.name, isAdmin:info.isAdmin };
    userLoginCounts[id] = (userLoginCounts[id] || 0) + 1; safeSet('xuju_logincounts', userLoginCounts);
    if (!userFavorites[id]) userFavorites[id] = []; if (!userHistory[id]) userHistory[id] = [];
    document.getElementById('awakenModal').style.display = 'none';
    showTerminalLoading(() => {
        document.getElementById('forumContainer').style.display = 'none'; document.getElementById('terminalContainer').style.display = 'block';
        if(!terminalInited) { setTimeout(initTerminal, 300); }
        updatePortalStatus(); setupMiniTerminalPlayer();
    });
}
function logoutTerminal() { window.currentUser = null; document.getElementById('terminalContainer').style.display = 'none'; document.getElementById('forumContainer').style.display = 'block'; updatePortalStatus(); }
document.getElementById('loginBtn').addEventListener('click', attemptLogin);
document.getElementById('passwordInput').addEventListener('keypress', e => { if(e.key==='Enter') attemptLogin(); });
document.getElementById('logoutTopBtn').addEventListener('click', logoutTerminal);
function openAwakenModal() { document.getElementById('awakenModal').style.display = 'flex'; document.getElementById('staffIdInput').focus(); }
['awakenEntryBtn','awakenEntryFooter'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('click', e => { e.preventDefault(); openAwakenModal(); }); });
document.getElementById('closeAwakenModalBtn').addEventListener('click', () => document.getElementById('awakenModal').style.display = 'none');

function showTerminalLoading(callback) {
    const loader = document.getElementById('terminalLoading');
    if (!loader) { if (callback) callback(); return; }
    const ring = document.getElementById('ringBar');
    const percentText = document.getElementById('percentText');
    const loadingText = document.getElementById('loadingText');
    const CIRC = 2 * Math.PI * 72;
    if (ring) { ring.style.strokeDasharray = CIRC; ring.style.strokeDashoffset = CIRC; }
    loader.style.display = 'flex';
    let progress = 0;
    const stages = [[0,'正在建立灵枢链接…'],[28,'校准锚点频率…'],[52,'注入认知屏蔽层…'],[74,'同步收容物库…'],[90,'链路稳定…']];
    const timer = setInterval(() => {
        progress += Math.floor(Math.random() * 6) + 4;
        if (progress > 100) progress = 100;
        if (ring) ring.style.strokeDashoffset = CIRC - (CIRC * progress / 100);
        if (percentText) percentText.textContent = progress + '%';
        const stage = stages.filter(s => progress >= s[0]).pop();
        if (stage && loadingText) loadingText.textContent = stage[1];
        if (progress >= 100) {
            clearInterval(timer);
            if (loadingText) loadingText.textContent = '链接完成';
            loader.classList.add('done');
            setTimeout(() => { loader.classList.remove('done'); loader.style.display = 'none'; if (callback) callback(); }, 480);
        }
    }, 150);
}

// ============ 终端面板逻辑 ============
function initTerminal() {
    if (terminalInited) return;
    terminalInited = true; loadArchive(); saveLocalDataBundle(); bindTerminalNav(); startRain();
    startTypewriter(); renderLingshi(); renderInternalPosts(); renderMissions();
    setupEditorEvents(); switchPanel('home'); renderHomeEmbed('bureau'); updateProfilePanel();
    document.getElementById('terminalFortuneText').textContent = getDailyFortune();
}
window.switchPanel = function(name) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(name + 'Panel');
    if (panel) panel.classList.add('active');
    document.querySelectorAll('.nav-btn[data-panel]').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.nav-btn[data-panel="${name}"]`);
    if (btn) btn.classList.add('active');
    currentPanel = name;
    if (name === 'archive') {
        if (!Array.isArray(archiveData) || archiveData.length === 0) {
            loadArchive();
        }
        renderArchiveList();
    }
    if (name === 'admin') renderAdminList();
    if (name === 'profile') updateProfilePanel();
    if (name === 'lingshi') renderLingshi();
    if (name === 'internalForum') renderInternalPosts();
    if (name === 'missions') renderMissions();
    if (name === 'monitor') initMap();
    if (name === 'containment') renderContainmentList();
    if (name === 'commBoard') renderCommBoard();
    if (name === 'bureau') renderBureau();
    if (name === 'experiment') renderExperimentRecords();
    if (name === 'entities') renderEntities();
    if (name === 'action') renderActionRecords();
    if (name === 'collections') renderCollections();
    if (name === 'shop') renderShop();
}
function bindTerminalNav() {
    document.querySelectorAll('.nav-btn[data-panel]').forEach(btn => btn.addEventListener('click', () => switchPanel(btn.dataset.panel)));
    document.querySelectorAll('.index-card').forEach(card => card.addEventListener('click', () => {
        if (card.dataset.panel) { renderHomeEmbed(card.dataset.panel); return; }
        const cat = card.dataset.cat; const tab = document.querySelector(`.cat-tab[data-category="${cat}"]`); if (tab) { tab.click(); switchPanel('archive'); }
    }));
    document.querySelectorAll('.cat-tab').forEach(tab => tab.addEventListener('click', () => {
        document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeCategory = tab.dataset.category || 'all';
        activeSubCategory = 'all';
        renderArchiveList();
    }));
    document.getElementById('archiveSearchInput').addEventListener('input', renderArchiveList);
}

// ============ 档案检索、收容物、通讯等 ============
function loadArchive() {
    const saved = safeGetJSON('xuju_archive', null);
    const validCategories = new Set(['墟界管理档案', '叛逃人员档案', '人物档案', '事件分支', '收容物分支']);
    const normalizeArchiveItem = item => {
        if (!item || typeof item !== 'object') return null;
        const category = String(item.category || '');
        const keyCategory = category === '档案条例' || category === '墟界管理档案' ? '墟界管理档案'
            : category === '人物' || category === '人物档案' ? '人物档案'
            : category === '叛逃人员' || category === '叛逃人员档案' ? '叛逃人员档案'
            : category === '事件' || category === '事件分支' ? '事件分支'
            : category === '收容物' || category === '收容物分支' ? '收容物分支'
            : category;
        const normalized = { ...item, category: keyCategory };
        if (normalized.title && /^档案条例\s*·|^总则分支\s*·|^机制分支\s*·/.test(normalized.title)) {
            normalized.title = normalized.title.replace(/^档案条例\s*·/, '墟界管理档案 ·').replace(/^总则分支\s*·/, '墟界管理档案 · 总则分支 ·').replace(/^机制分支\s*·/, '墟界管理档案 · 机制分支 ·');
        }
        if (normalized.title && /^人物档案\s*·/.test(normalized.title) && normalized.category === '人物档案') {
            normalized.title = normalized.title.replace(/^人物档案\s*·/, '人物档案 ·');
        }
        if (normalized.title && /^(人物档案|档案条例|事件分支|收容物分支)/.test(normalized.title) && !validCategories.has(normalized.category)) {
            normalized.category = validCategories.has(normalized.category) ? normalized.category : '墟界管理档案';
        }
        return normalized;
    };
    const normalizedSaved = Array.isArray(saved) ? saved.map(normalizeArchiveItem).filter(Boolean) : [];
    const archiveIsClean = normalizedSaved.length > 0 && normalizedSaved.every(item => {
        if (!item || typeof item !== 'object') return false;
        if (!validCategories.has(item.category) || !item.title || !item.summary || !item.content) return false;
        const content = String(item.content || '');
        return !/(正文内容|整理自|\.docx)/i.test(content);
    });
    archiveData = archiveIsClean ? normalizedSaved : JSON.parse(JSON.stringify(DEFAULT_ARCHIVES));
    // 补全元数据：即使是从旧缓存读取的数据，也确保 image / subCategory / subtitle 与图片联动正确
    archiveData.forEach(item => {
        if (!item) return;
        const inferredImage = inferArchiveImage(item.title, item.category);
        const inferredSub = inferArchiveSubCategory(item.title, item.category);
        const inferredSubtitle = inferArchiveSubtitle(item.title, item.category, item.content || '');
        item.image = item.image || inferredImage;
        item.subCategory = item.subCategory || inferredSub;
        item.subtitle = item.subtitle || inferredSubtitle;
        if (item.category === '人物档案' && !item.image.includes('.')) {
            item.image = 'images/default-archive.jpg';
        }
    });
    safeSet('xuju_archive', archiveData);
    safeSet('site_local_data_bundle', { exportAt: new Date().toISOString(), archiveData, forumPosts, featuredPosts });
}
function buildArchiveTree(items) {
    const tree = {};

    items.forEach(item => {
        const title = String(item.title || '');
        const parts = title.split(/\s*·\s*/).map(part => part.trim()).filter(Boolean);
        const docName = item.category || parts[0] || '未知档案';
        const chapterName = parts.length > 1 ? parts[1] : '总目录';
        const subName = parts.length > 2 ? parts.slice(2).join(' · ') : null;

        if (!tree[docName]) tree[docName] = {};
        if (!tree[docName][chapterName]) {
            tree[docName][chapterName] = { title: chapterName, items: [], children: {} };
        }

        const chapterBucket = tree[docName][chapterName];
        if (subName) {
            if (!chapterBucket.children[subName]) {
                chapterBucket.children[subName] = { title: subName, items: [] };
            }
            chapterBucket.children[subName].items.push(item);
        } else {
            chapterBucket.items.push(item);
        }
    });

    return tree;
}

function renderArchiveNodeItems(items, container) {
    items.forEach(item => {
        const node = document.createElement('div');
        node.className = 'archive-node';
        node.innerHTML = `
            <div class="archive-node-index">${item.id}</div>
            <div class="archive-node-main">
                <div class="archive-node-title">${item.title}</div>
                <div class="archive-node-summary">${item.summary}</div>
            </div>
        `;
        node.addEventListener('click', () => openArchiveDetail(item));
        container.appendChild(node);
    });
}

function renderArchiveList() {
    if (!Array.isArray(archiveData) || archiveData.length === 0) {
        loadArchive();
    }
    const searchInput = document.getElementById('archiveSearchInput');
    const container = document.getElementById('archiveContainer');
    if (!searchInput || !container) return;

    const keyword = searchInput.value.trim().toLowerCase();
    let filtered = [...archiveData];

    if (activeCategory !== 'all') {
        filtered = filtered.filter(item => item.category === activeCategory);
    }

    if (activeSubCategory && activeSubCategory !== 'all') {
        filtered = filtered.filter(item => (item.subCategory || '概览') === activeSubCategory);
    }

    if (keyword) {
        filtered = filtered.filter(item => {
            const searchable = `${item.id} ${item.title} ${(item.tags || []).join(' ')} ${(item.summary || '')} ${(item.subtitle || '')} ${(item.content || '')}`.toLowerCase();
            return searchable.includes(keyword);
        });
    }

    let sidebar = document.getElementById('archiveSidebar');
    if (!sidebar) {
        sidebar = document.createElement('div');
        sidebar.id = 'archiveSidebar';
        sidebar.className = 'archive-sidebar';
        container.appendChild(sidebar);
    }

    let grid = document.getElementById('archiveGrid');
    if (!grid) {
        grid = document.createElement('div');
        grid.id = 'archiveGrid';
        grid.className = 'archive-grid';
        container.appendChild(grid);
    }

    container.innerHTML = '';
    container.appendChild(sidebar);
    container.appendChild(grid);

    sidebar.innerHTML = '';
    grid.innerHTML = '';

    const categories = Array.from(new Set((archiveData || []).map(item => item.category).filter(Boolean))).sort((a, b) => {
        const order = ['墟界管理档案', '叛逃人员档案', '人物档案', '事件分支', '收容物分支'];
        return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b));
    });

    categories.forEach(category => {
        // 数字用全量档案统计，不受当前搜索/分类过滤影响
        const totalCount = (archiveData || []).filter(item => item.category === category).length;
        const group = document.createElement('div');
        group.className = 'archive-nav-group';

        const categoryBtn = document.createElement('div');
        categoryBtn.className = 'archive-nav-item' + (activeCategory === category ? ' active' : '');
        categoryBtn.innerHTML = `<span class="archive-nav-cat">${category}</span><span class="archive-nav-count">${totalCount}</span>`;
        categoryBtn.addEventListener('click', () => {
            activeCategory = category;
            activeSubCategory = 'all';
            document.querySelectorAll('.cat-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.category === category));
            renderArchiveList();
        });

        const subList = document.createElement('div');
        subList.className = 'archive-nav-sublist';
        // 子分类基于该分类全部档案计算，避免被其他分类过滤影响
        const categoryAll = (archiveData || []).filter(item => item.category === category);
        const subOptions = Array.from(new Set(categoryAll.map(item => item.subCategory || '概览').filter(Boolean))).sort();

        if (subOptions.length) {
            subOptions.forEach(sub => {
                const subBtn = document.createElement('div');
                subBtn.className = 'archive-nav-subitem' + ((activeCategory === category && activeSubCategory === sub) ? ' active' : '');
                const subCount = categoryAll.filter(item => (item.subCategory || '概览') === sub).length;
                subBtn.innerHTML = `<span>${sub}</span><span class="archive-nav-count">${subCount}</span>`;
                subBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    activeCategory = category;
                    activeSubCategory = sub;
                    document.querySelectorAll('.cat-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.category === category));
                    renderArchiveList();
                });
                subList.appendChild(subBtn);
            });
        }

        group.appendChild(categoryBtn);
        if (activeCategory === category) {
            group.appendChild(subList);
        }

        sidebar.appendChild(group);
    });

    if (!filtered.length) {
        grid.innerHTML = '<div class="archive-card" style="text-align:center;color:var(--text-muted);padding:20px;">没有匹配的档案。</div>';
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'archive-card-item';
        card.addEventListener('click', () => openArchiveDetail(item));

        const image = item.image && String(item.image).trim() ? String(item.image).trim() : 'images/default-archive.jpg';
        const tags = Array.isArray(item.tags) ? item.tags.slice(0, 3) : [item.subCategory || '档案'];

        card.innerHTML = `
            <img class="archive-card-img" src="${image}" alt="${item.title}" onerror="this.src='images/default-archive.jpg'">
            <div class="archive-card-body">
                <div class="archive-card-title">${item.title}</div>
                <div class="archive-card-summary">${item.summary || ''}</div>
                <div class="archive-card-tags">
                    ${(tags || []).map(tag => `<span class="archive-tag">${tag}</span>`).join('')}
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

function openArchiveDetail(item) {
    addHistory(item.id);
    markRead('archive|' + item.id);
    const modal = document.getElementById('archiveDetailModal');
    const content = document.getElementById('archiveDetailContent');
    if (!modal || !content) return;

    const imagePath = item.image && String(item.image).trim() ? String(item.image).trim() : 'images/default-archive.jpg';
    const isPerson = item.category === '人物档案' || /人物档案/.test(item.title || '');
    const subtitle = item.subtitle || '';
    const header = isPerson ? `
        <div style="display:flex; gap:16px; align-items:flex-start; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid var(--border-color);">
            <img src="${imagePath}" alt="${item.title}" style="width:200px; height:200px; object-fit:cover; border-radius:12px; border:1px solid var(--border-color); background:#111;" onerror="this.src='images/default-archive.jpg'">
            <div style="flex:1; min-width:0;">
                <h2 style="color:#fff; margin:0 0 8px;">${item.title}</h2>
                <div style="color:var(--text-muted); margin-bottom:8px;">${item.category}</div>
                <div style="color:var(--accent-red); font-weight:700; margin-bottom:6px;">${subtitle || item.subCategory || '档案'}</div>
                <div style="color:var(--text-secondary); font-size:0.9rem;">编号：${item.id}</div>
            </div>
        </div>
    ` : `
        <div style="border-bottom:1px solid var(--border-color);padding-bottom:15px;margin-bottom:15px;">
            <div style="display:flex; align-items:flex-start; gap:16px;">
                ${item.image ? `<img src="${imagePath}" alt="${item.title}" style="width:200px; height:140px; object-fit:cover; border-radius:10px; border:1px solid var(--border-color); background:#111;" onerror="this.src='images/default-archive.jpg'">` : ''}
                <div style="flex:1; min-width:0;">
                    <h2 style="color:#fff; margin:0 0 8px;">${item.title}</h2>
                    <div style="color:var(--text-muted);">${item.category}</div>
                    ${item.subtitle ? `<div style="color:var(--accent-red); margin-top:6px; font-weight:700;">${item.subtitle}</div>` : ''}
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    content.innerHTML = `${header}<div style="line-height:1.7;color:var(--text-secondary);">${item.content}</div>`;
}
function closeArchiveDetail() {
    document.getElementById('archiveDetailModal').style.display = 'none';
    document.body.style.overflow = '';
}
document.getElementById('closeArchiveDetailBtn').addEventListener('click', closeArchiveDetail);
document.getElementById('archiveDetailModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeArchiveDetail(); });
function addHistory(id) { if (!window.currentUser) return; const uid = window.currentUser.id; userHistory[uid] = [id, ...userHistory[uid].filter(x => x !== id)].slice(0, 20); safeSet('xuju_history', userHistory); }

function formatLevel(level) { const s = String(level || ''); const map = [ { k:'壬', label:'壬阶', cls:'lv-ren' }, { k:'辛', label:'辛阶', cls:'lv-xin' }, { k:'庚', label:'庚阶', cls:'lv-geng' }, { k:'己', label:'己阶', cls:'lv-ji' }, { k:'戊', label:'戊阶', cls:'lv-wu' }, { k:'丁', label:'丁阶', cls:'lv-ding' } ]; for (const m of map) { if (s.indexOf(m.k) !== -1) return { label: m.label, cls: m.cls }; } return { label: s || '未知', cls: 'lv-xin' }; }
function containmentSummary(item) { const raw = item.desc || item.appearance || ''; const text = String(raw).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); return text.length > 50 ? text.slice(0, 50) + '…' : text; }
function renderContainmentDetail(item) {
    if (!item) return '';
    const rows = [];
    const add = (label, val) => { if (val) rows.push(`<div class="cd-row"><span class="cd-label">${label}</span><div class="cd-value">${val}</div></div>`); };
    add('登记编号', item.id); add('定名', item.name); add('危险等级', formatLevel(item.level).label); add('类型', item.type); add('持有者', item.holder); add('来源', item.origin); add('形态描述', item.appearance); add('作用机制', item.mechanism); add('使用限制与禁忌', item.restrictions); add('关联事件', item.events); add('当前状态', item.status);
    if (item.notes) rows.push(`<div class="cd-row"><span class="cd-label">研究备注</span><div class="cd-value">${item.notes}</div></div>`);
    let html = rows.join('');
    if (item.story) { const paras = String(item.story).split('\n\n').filter(Boolean).map(p => `<p>${p}</p>`).join(''); html += `<div class="containment-story"><div class="story-title">📖 相关记录</div>${paras}</div>`; }
    const exps = (EXPERIMENT_RECORDS || []).filter(e => e.item && item.name && e.item.indexOf(item.name.split('（')[0]) !== -1);
    if (exps.length) {
        html += `<div class="containment-exp"><div class="containment-exp-head">🧪 实验记录（${exps.length}）</div><div class="containment-exp-list">` + exps.map(e => `
            <details class="containment-exp-details"><summary>${e.expNo} · ${e.purpose}</summary>
                <p><b>实验人员</b>：${e.personnel}</p><p><b>日期</b>：${e.date}</p>
                <div class="record-steps">${(e.steps || []).map(s => `<div class="record-step">${s}</div>`).join('')}</div>
                <p><b>结果</b>：${e.result}</p><p><b>结论</b>：${e.conclusion}</p><p class="record-notes">${e.notes}</p>
            </details>`).join('') + `</div></div>`;
    }
    return html;
}
function renderContainmentNotice() { const wrap = document.getElementById('containmentNotice'); if (!wrap) return; const items = CONTAINMENT_ITEMS || []; const redacted = items.filter(i => i.redacted).length; const latest = items.filter(i => !i.redacted).slice(-2).reverse(); const latestText = latest.map(i => `${i.name}（${i.id}·${formatLevel(i.level).label}）`).join('；'); wrap.innerHTML = `<span class="cn-ico">📢</span><span class="cn-text"><b>近期录入</b>：${latestText || '—'}；另有 <b class="blink">${redacted}</b> 份档案已加密，暂不可调阅。</span>`; }
function renderContainmentTypeTabs() { const wrap = document.getElementById('containmentCatTabs'); if (!wrap) return; const items = CONTAINMENT_ITEMS || []; const typeNames = [...new Set(items.map(i => (i.type || '未分类').split('（')[0].trim()))]; const all = ['全部'].concat(typeNames); wrap.innerHTML = all.map(t => { const key = t === '全部' ? 'all' : t; const count = key === 'all' ? items.length : items.filter(i => (i.type || '').split('（')[0].trim() === key).length; return `<button class="containment-cat-tab${activeContainmentType === key ? ' active' : ''}" data-type="${key}">${t}<small>${count}</small></button>`; }).join(''); wrap.querySelectorAll('.containment-cat-tab').forEach(btn => { btn.addEventListener('click', () => { activeContainmentType = btn.dataset.type; renderContainmentList(); }); }); }
function renderContainmentList() { const list = document.getElementById('containmentList'); if (!list) return; renderContainmentNotice(); renderContainmentTypeTabs(); let items = CONTAINMENT_ITEMS || []; if (activeContainmentType !== 'all') items = items.filter(i => (i.type || '未分类').split('（')[0].trim() === activeContainmentType); if (!items.length) { list.innerHTML = '<div class="containment-empty">该分类暂无收容物登记。</div>'; return; } list.innerHTML = items.map(item => { const lv = formatLevel(item.level); if (item.redacted) { return `
        <div class="containment-card containment-redacted" data-id="${item.id}">
            <div class="containment-head">
                <span class="containment-id">${item.id}</span>
                <span class="containment-level ${lv.cls}">${lv.label}</span>
            </div>
            <div class="containment-name">${item.name}</div>
            <div class="containment-summary redacted-bar">████ 档案内容已加密 · 需二级以上权限调阅 ████</div>
            <div class="containment-meta"><span>持有者：<span class="redacted">[已涂黑]</span></span><span>状态：${item.status || '密'}</span></div>
            <div class="containment-lock">🔒 该档案不可调阅</div>
        </div>`; } const hasDetail = !!(item.appearance || item.mechanism || item.restrictions || item.events || item.status || item.notes || item.story); return `
        <div class="containment-card" data-id="${item.id}">
            <div class="containment-head">
                <span class="containment-id">${item.id}</span>
                <span class="containment-level ${lv.cls}">${lv.label}</span>
            </div>
            <div class="containment-name">${item.name}</div>
            <div class="containment-summary">${containmentSummary(item)}</div>
            <div class="containment-meta"><span>持有者：${item.holder || '无'}</span><span>类型：${item.type || '未分类'}</span></div>
            ${hasDetail ? `<button class="containment-expand-btn" type="button">展开详情 ▾</button>
            <div class="containment-detail">${renderContainmentDetail(item)}</div>` : ''}
        </div>`; }).join('');
    list.querySelectorAll('.containment-expand-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.containment-card'); if (!card) return;
            const detail = card.querySelector('.containment-detail'); if (!detail) return;
            const isOpen = detail.classList.contains('open');
            list.querySelectorAll('.containment-card .containment-detail.open').forEach(d => { if (d !== detail) { d.classList.remove('open'); const b = d.closest('.containment-card') && d.closest('.containment-card').querySelector('.containment-expand-btn'); if (b) b.textContent = '展开详情 ▾'; } });
            if (isOpen) { detail.classList.remove('open'); this.textContent = '展开详情 ▾'; }
            else { detail.classList.add('open'); this.textContent = '收起详情 ▴'; }
        });
    });
}
function renderCommBoard() {
    const list = document.getElementById('commPostList');
    if (!list) return;
    if (!INTERNAL_BOARDS || !INTERNAL_BOARDS.length) { list.innerHTML = '<div>暂无总局内部通讯。</div>'; return; }
    list.innerHTML = INTERNAL_BOARDS.map(item => `
        <div class="letter-card">
            <div class="letter-head">
                <span class="letter-secret${(item.secret || '内部') === '绝密' ? ' top' : ''}">【${item.secret || '内部'}】</span>
                <span class="letter-title">${item.title}</span>
                <span class="letter-dept">${item.dept || ''}</span>
            </div>
            <div class="letter-paper">
                <div class="letter-salute">呈：各司局 · 经办</div>
                <div class="letter-body">${item.content}</div>
                <div class="letter-footer">
                    <div class="letter-sign">${item.sender || item.dept}<br><span class="letter-date">${item.date || ''}</span></div>
                    <div class="letter-seal">${item.seal || item.dept}</div>
                </div>
            </div>
            <div class="letter-comment">✍ 【批注】${item.comment}</div>
        </div>`).join('');
}
function renderInternalPosts() { document.getElementById('internalPostList').innerHTML = internalPosts.slice().reverse().map(p => `<div class="admin-item" style="padding:10px;border-bottom:1px solid var(--border-color);"><span>${p.title}</span><small style="color:var(--text-muted);">${p.author}</small><button onclick="showInternalPostDetail('${p.id}')" style="color:var(--accent-red);float:right;border:1px solid var(--border-color);padding:2px 8px;">查看</button></div>`).join(''); }
window.showInternalPostDetail = function(id) { currentInternalPostId = id; const post = internalPosts.find(p => p.id === id); if (!post) return; document.getElementById('internalPostList').style.display = 'none'; document.getElementById('internalPostDetail').style.display = 'block'; document.getElementById('internalPostContent').innerHTML = `<h3>${post.title}</h3><div style="color:var(--text-muted);font-size:0.8rem;">${post.author} · ${post.timestamp}</div><p style="margin:15px 0;">${post.content}</p>${(post.comments||[]).map(c => `<div style="border-top:1px solid var(--border-color);padding:10px 0;"><strong>${c.user}</strong>: ${c.text}</div>`).join('')}`; };
document.getElementById('internalBackBtn').addEventListener('click', () => { document.getElementById('internalPostDetail').style.display = 'none'; document.getElementById('internalPostList').style.display = 'grid'; renderInternalPosts(); });
document.getElementById('internalNewPostBtn').addEventListener('click', () => { const title = safePrompt('标题：'); if (!title || !title.trim()) return; const content = safePrompt('内容：'); if (!content || !content.trim()) return; internalPosts.push({ id:'ip'+Date.now(), title: title.trim(), content: content.trim(), author: window.currentUser ? window.currentUser.name : '匿名', timestamp:new Date().toLocaleString('zh-CN'), comments:[] }); safeSet('xuju_internal_posts', internalPosts); renderInternalPosts(); });
document.getElementById('internalCommentBtn').addEventListener('click', () => { const text = document.getElementById('internalCommentInput').value.trim(); if (!text) return; const post = internalPosts.find(p => p.id === currentInternalPostId); if (!post) return; post.comments.push({ user: window.currentUser ? window.currentUser.name : '匿名', text, time:new Date().toLocaleString('zh-CN') }); safeSet('xuju_internal_posts', internalPosts); window.showInternalPostDetail(currentInternalPostId); });

function formatMissionLevel(risk) { const map = { red:'己阶', amber:'辛阶', blue:'壬阶', purple:'庚阶' }; const cls = { red:'lv-ji', amber:'lv-xin', blue:'lv-ren', purple:'lv-geng' }; return { label: map[risk] || '未定级', cls: cls[risk] || 'lv-xin' }; }
function renderMissions() {
    document.getElementById('missionsList').innerHTML = missions.map(m => {
        const ml = formatMissionLevel(m.risk);
        return `
        <div class="mission-item">
            <div class="mission-head">
                <div class="mission-title">${m.title}</div>
                <span class="mission-status">${m.status}</span>
            </div>
            <div class="mission-meta"><span class="mission-tag ${ml.cls}">${ml.label}</span>截止：${m.deadline}</div>
            ${m.dept ? `<div class="mission-dept">主管司局：<span class="dept-badge">${m.dept}</span></div>` : ''}
            <div class="mission-desc">${m.desc}</div>
        </div>
    `;
    }).join('');
}
function renderLingshi() {
    const channelMap = {
        main: '总局',
        club: '民俗社',
        operation: '外勤'
    };
    const msgs = lingshiMessages[currentChannel] || [];
    document.querySelector('.lingshi-header').textContent = `# ${channelMap[currentChannel] || '总局'}`;
    document.getElementById('lingshiMessages').innerHTML = msgs.length
        ? msgs.map(m => `
            <div class="lingshi-message-item">
                <div class="lingshi-message-head">
                    <strong>${m.user}</strong>
                    <span>${m.time}</span>
                </div>
                <p>${m.text}</p>
            </div>
        `).join('')
        : `<div class="lingshi-message-item"><div class="lingshi-message-head"><strong>系统</strong><span>--</span></div><p>该频道尚无消息，先发一条记录吧。</p></div>`;
    document.querySelectorAll('.channel-btn').forEach(b => b.classList.toggle('active', b.dataset.channel === currentChannel));
}
document.querySelectorAll('.channel-btn').forEach(btn => btn.addEventListener('click', () => { currentChannel = btn.dataset.channel; renderLingshi(); }));
document.getElementById('lingshiSendBtn').addEventListener('click', () => { const text = document.getElementById('lingshiInput').value.trim(); if (!text) return alert('请输入消息'); if (!window.currentUser) return alert('请先登录'); if (!lingshiMessages[currentChannel]) lingshiMessages[currentChannel] = []; lingshiMessages[currentChannel].push({ user: window.currentUser.name, text, time: new Date().toLocaleString('zh-CN') }); safeSet('xuju_lingshi', lingshiMessages); renderLingshi(); document.getElementById('lingshiInput').value = ''; });
function updateProfilePanel() {
    if (!window.currentUser) return;
    document.getElementById('profileName').textContent = window.currentUser.name;
    document.getElementById('profileId').textContent = window.currentUser.id;
    const uid = window.currentUser.id;
    const favorites = userFavorites[uid] || [];
    const history = userHistory[uid] || [];
    const completed = Math.min((missions || []).filter(m => m.status === '进行中' || m.status.includes('已')).length + 2, 9);
    document.getElementById('statMission').textContent = completed;
    document.getElementById('statFav').textContent = favorites.length;
    document.getElementById('statHistory').textContent = history.length;
    document.getElementById('favList').innerHTML = favorites.length
        ? favorites.map(id => `<div>◎ ${id}</div>`).join('')
        : '<div>暂无收藏记录</div>';
    document.getElementById('historyList').innerHTML = history.length
        ? history.slice(0, 5).map(id => `<div>⏱ ${id}</div>`).join('')
        : '<div>暂无查看记录</div>';
}
function renderAdminList() {
    const archiveHtml = archiveData.map(a => `<div class="admin-item"><span>${a.id} ${a.title}</span><button onclick="editArchive('${a.id}')" style="color:var(--accent-red);">编辑</button></div>`).join('');
    const postHtml = forumPosts.slice().reverse().map(post => `<div class="admin-item"><span>${post.id} ${post.title}</span><button onclick="editForumPost('${post.id}')" style="color:var(--accent-red);">编辑</button></div>`).join('');
    document.getElementById('adminList').innerHTML = `
        <div style="margin-bottom:18px;">
            <h3 style="margin-bottom:10px; color:var(--text-muted); font-size:0.8rem; letter-spacing:0.1em; text-transform:uppercase;">档案库</h3>
            ${archiveHtml || '<div class="admin-item">暂无档案</div>'}
        </div>
        <div>
            <h3 style="margin-bottom:10px; color:var(--text-muted); font-size:0.8rem; letter-spacing:0.1em; text-transform:uppercase;">论坛帖子</h3>
            ${postHtml || '<div class="admin-item">暂无帖子</div>'}
        </div>
    `;
}
window.editArchive = function(id) { const item = archiveData.find(a => a.id === id); if (!item) return; editingId = id; document.getElementById('editId').value = item.id; document.getElementById('editTitle').value = item.title; document.getElementById('editCategory').value = item.category; document.getElementById('editTags').value = item.tags.join(', '); document.getElementById('editSummary').value = item.summary; document.getElementById('editContent').value = item.content; document.getElementById('modalTitle').textContent = '编辑: ' + id; document.getElementById('editModal').style.display = 'flex'; };
window.editForumPost = function(id) {
    const post = forumPosts.find(p => p.id === id);
    if (!post) return;
    document.getElementById('postEditTitle').value = post.title;
    document.getElementById('postEditBoard').value = post.board || '灵异见闻';
    document.getElementById('postEditImage').value = post.image || '';
    document.getElementById('postEditContent').value = post.content || '';
    document.getElementById('postModalTitle').textContent = '编辑帖子: ' + post.id;
    document.getElementById('postEditModal').dataset.postId = post.id;
    document.getElementById('postEditModal').style.display = 'flex';
};
function saveEdit() { const newData = { id: document.getElementById('editId').value.trim(), title: document.getElementById('editTitle').value.trim(), category: document.getElementById('editCategory').value, tags: document.getElementById('editTags').value.split(',').map(s=>s.trim()).filter(s=>s), summary: document.getElementById('editSummary').value.trim(), content: document.getElementById('editContent').value.trim() }; if(!newData.id||!newData.title) return alert('必填'); if(editingId) { const idx = archiveData.findIndex(a=>a.id===editingId); if(idx>-1) archiveData[idx]=newData; } else archiveData.push(newData); safeSet('xuju_archive', archiveData); document.getElementById('editModal').style.display='none'; renderAdminList(); renderArchiveList(); }
function deleteArchive() { if(!editingId||!confirm('删除？')) return; archiveData = archiveData.filter(a=>a.id!==editingId); safeSet('xuju_archive', archiveData); document.getElementById('editModal').style.display='none'; renderAdminList(); renderArchiveList(); }
function saveForumPostEdit() {
    const postId = document.getElementById('postEditModal').dataset.postId;
    const title = document.getElementById('postEditTitle').value.trim();
    const board = document.getElementById('postEditBoard').value;
    const image = document.getElementById('postEditImage').value.trim();
    const content = document.getElementById('postEditContent').value.trim();
    if (!title || !content) return alert('请填写标题和正文');
    const idx = forumPosts.findIndex(p => p.id === postId);
    if (idx >= 0) {
        forumPosts[idx] = { ...forumPosts[idx], title, board, image: image || forumPosts[idx].image, content, timestamp: new Date().toLocaleString('zh-CN') };
    } else {
        forumPosts.unshift({ id: 'p' + Date.now(), title, board, image, content, author: forumNickname || '匿名', timestamp: new Date().toLocaleString('zh-CN'), comments: [] });
    }
    savePosts();
    renderFeaturedPosts();
    renderPostList();
    document.getElementById('postEditModal').style.display = 'none';
    renderAdminList();
}
function deleteForumPost() {
    const postId = document.getElementById('postEditModal').dataset.postId;
    if (!postId || !confirm('确认删除此帖子？')) return;
    forumPosts = forumPosts.filter(p => p.id !== postId);
    savePosts();
    renderFeaturedPosts();
    renderPostList();
    document.getElementById('postEditModal').style.display = 'none';
    renderAdminList();
}
function bulkInsertArchiveFromText() {
    const text = document.getElementById('bulkContentInput').value.trim();
    if (!text) return alert('没有内容可写入');
    const title = safePrompt('请输入新档案标题：') || '新档案';
    const category = safePrompt('请输入分类：世界观 / 人物 / 收容物 / 事件', '世界观') || '世界观';
    const summary = text.replace(/\s+/g, ' ').slice(0, 80) || '新导入文档';
    const paragraphs = text.split(/\n{2,}|\r\n\r\n+/).filter(Boolean).map(p => `<p>${escapeHtml(p.trim().replace(/\n/g, '<br>'))}</p>`).join('');
    archiveData.unshift({ id: `AUTO-${Date.now()}`, title, category, tags: [category], summary, content: paragraphs || `<p>${escapeHtml(text)}</p>` });
    safeSet('xuju_archive', archiveData);
    renderAdminList();
    renderArchiveList();
    document.getElementById('bulkContentInput').value = '';
}
async function importDocxToBulk() {
    const input = document.getElementById('docxImportInput');
    const file = input.files && input.files[0];
    if (!file) return;
    try {
        if (!window.mammoth || typeof window.mammoth.extractRawText !== 'function') {
            alert('文档解析库未加载成功，请刷新页面后重试。');
            return;
        }
        const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        const text = result.value.trim();
        if (!text) {
            alert('文档中没有可读取的正文内容。');
            return;
        }
        document.getElementById('bulkContentInput').value = text;
        alert('文档已导入，可直接写入档案或保存本地。');
    } catch (error) {
        console.error(error);
        alert('导入失败：' + error.message);
    } finally {
        input.value = '';
    }
}
function setupEditorEvents() {
    document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
    document.getElementById('deleteArchiveBtn').addEventListener('click', deleteArchive);
    document.getElementById('closeModalBtn').addEventListener('click', ()=>document.getElementById('editModal').style.display='none');
    document.getElementById('addNewArchiveBtn').addEventListener('click', ()=>{ editingId=null; ['editId','editTitle','editTags','editSummary','editContent'].forEach(f=>document.getElementById(f).value=''); document.getElementById('editCategory').value='世界观'; document.getElementById('modalTitle').textContent='新增档案'; document.getElementById('editModal').style.display='flex'; });
    document.getElementById('managePostsBtn').addEventListener('click', () => { renderAdminList(); document.getElementById('adminPanel').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    document.getElementById('importDocxBtn').addEventListener('click', () => document.getElementById('docxImportInput').click());
    document.getElementById('docxImportInput').addEventListener('change', importDocxToBulk);
    document.getElementById('createArchiveFromBulkBtn').addEventListener('click', bulkInsertArchiveFromText);
    document.getElementById('saveLocalDataBtn').addEventListener('click', () => { saveLocalDataBundle(); exportLocalDataBundle(); });
    document.getElementById('exportDataBtn').addEventListener('click', exportLocalDataBundle);
    document.getElementById('resetDefaultBtn').addEventListener('click', ()=>{ if(confirm('重置？')) { archiveData = JSON.parse(JSON.stringify(DEFAULT_ARCHIVES)); safeSet('xuju_archive', archiveData); renderAdminList(); renderArchiveList(); } });
    document.getElementById('insertImageBtn').addEventListener('click', ()=>{ const url = safePrompt('图片链接：'); if(url && url.trim()) document.getElementById('editContent').value += `<img src="${url.trim()}" style="max-width:200px;border:1px solid var(--border-color);margin:5px 0;">`; });
    document.getElementById('insertPostImageBtn').addEventListener('click', ()=>{ const url = safePrompt('图片链接：'); if(url && url.trim()) document.getElementById('postEditContent').value += `\n\n<img src="${url.trim()}" style="max-width:220px; border:1px solid var(--border-color); margin:10px 0;">`; });
    document.getElementById('savePostEditBtn').addEventListener('click', saveForumPostEdit);
    document.getElementById('deletePostEditBtn').addEventListener('click', deleteForumPost);
    document.getElementById('closePostEditBtn').addEventListener('click', ()=>document.getElementById('postEditModal').style.display='none');
    const dropZone = document.getElementById('imageDropZone'); const contentTA = document.getElementById('editContent'); ['dragenter','dragover'].forEach(ev=>dropZone.addEventListener(ev, e=>{ e.preventDefault(); dropZone.classList.add('dragover'); })); ['dragleave','drop'].forEach(ev=>dropZone.addEventListener(ev, e=>{ e.preventDefault(); dropZone.classList.remove('dragover'); })); dropZone.addEventListener('drop', e=>{ [...e.dataTransfer.files].forEach(file=>{ if(!file.type.startsWith('image/')) return; const reader = new FileReader(); reader.onload = ev => contentTA.value += `<img src="${ev.target.result}" style="max-width:200px;border:1px solid var(--border-color);margin:5px 0;">`; reader.readAsDataURL(file); }); });
}

// ============ 异常信号监测网（离线 SVG 网络图，替代 Leaflet 在线地图） ============
const SIGNAL_SITES = [
    { id:'a', name:'临江', level:'赤', status:'空间坍缩', time:'2024-11-22', desc:'旧城区边缘持续侦测到维度裂隙回响，规则型空域处于生成前兆，建议外勤小队保持待命。' },
    { id:'b', name:'沧溟', level:'青', status:'模因污染', time:'2025-03-15', desc:'沿海地段出现认知污染残留，与"沧溟-2018-S级风暴事件"能量波形高度吻合，需持续追踪。' },
    { id:'c', name:'旧纸厂', level:'待处理', status:'能量溢出', time:'2026-01-20', desc:'废弃厂区信号异常波动，疑似收容物级能量驻留，尚未完成现场核验，勿单独接近。' },
    { id:'d', name:'梧桐巷', level:'观测', status:'民俗社', time:'持续', desc:'临川民俗研究社团活动区域，锚点能量平稳，标记为长期观测点位。' }
];
function initMap() {
    const mapEl = document.getElementById('signalMap');
    if (!mapEl) return;
    const readout = document.getElementById('sigReadout');
    const selectSite = (site) => {
        if (!site) return;
        if (readout) {
            readout.innerHTML = `
                <div class="sig-readout-head">📍 ${site.name} · ${site.level}级异常</div>
                <div class="sig-readout-body">${site.desc}</div>
                <div class="sig-readout-meta">状态：${site.status} ｜ 记录：${site.time}</div>`;
        }
        mapEl.querySelectorAll('.sig-node').forEach(n => n.classList.remove('active'));
        const node = mapEl.querySelector(`.sig-node[data-site="${site.name}"]`);
        if (node) node.classList.add('active');
    };
    mapEl.querySelectorAll('.sig-node').forEach(node => {
        node.addEventListener('click', () => {
            const site = SIGNAL_SITES.find(s => s.name === node.dataset.site);
            selectSite(site);
        });
    });
    // 默认高亮第一个节点，展示一条摘要
    if (SIGNAL_SITES.length) selectSite(SIGNAL_SITES[0]);
}

let rainAnimId = null; let glitchTimer = null;
function startRain() { const canvas = document.getElementById('rainCanvas'); if (!canvas) return; if(rainAnimId) { cancelAnimationFrame(rainAnimId); } const ctx = canvas.getContext('2d'); function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; } window.removeEventListener('resize', resizeCanvas); window.addEventListener('resize', resizeCanvas); resizeCanvas(); const drops = Array.from({length:150}, ()=>({x: Math.random()*canvas.width, y: Math.random()*canvas.height, speed: 4 + Math.random()*6, len: 8 + Math.random()*12})); function draw() { ctx.clearRect(0,0,canvas.width,canvas.height); ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=1.5; ctx.beginPath(); drops.forEach(d=>{ ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-1,d.y+d.len); d.y+=d.speed; if(d.y>canvas.height+20){ d.y=-20; d.x=Math.random()*canvas.width; } }); ctx.stroke(); rainAnimId = requestAnimationFrame(draw); } draw(); if(glitchTimer) clearInterval(glitchTimer); glitchTimer = setInterval(() => { const flash = document.getElementById('glitchFlash'); if(!flash) return; if(Math.random() < 0.03){ flash.style.background = 'rgba(207, 42, 42, 0.2)'; flash.style.width = (20 + Math.random()*80) + '%'; setTimeout(() => { flash.style.background = 'transparent'; flash.style.width = '100%'; }, 120); } }, 2000); }

const WELCOME_MESSAGES = [
    "欢迎登入，终端已连通，请注意安全。",
    "欢迎登入，认知污染监测正常。",
    "欢迎登入，底层数据重构完成。",
    "欢迎登入，屏蔽层生效，外部无法侦测。",
    "欢迎登入，终端界面加载完毕，开始工作吧。"
];
function startTypewriter() { const el = document.getElementById('typewriterText'); const msg = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]; el.textContent = ''; let i=0; const t = setInterval(() => { if(i<msg.length) el.textContent += msg.charAt(i++); else clearInterval(t); }, 60); }

// ============ 🏛️ 总局六大司局 ============
function renderBureau() {
    const grid = document.getElementById('bureauDeptGrid');
    if (!grid) return;
    grid.innerHTML = (BUREAU_DEPARTMENTS || []).map(d => `
        <div class="bureau-dept-card">
            <div class="bureau-dept-head">
                <span class="bureau-dept-icon">${d.icon}</span>
                <div>
                    <div class="bureau-dept-name">${d.name}</div>
                    <div class="bureau-dept-id">${d.id}</div>
                </div>
            </div>
            <div class="bureau-dept-func">${d.func}</div>
            <div class="bureau-dept-status"><span class="status-dot"></span>${d.status}</div>
        </div>
    `).join('');
}

// ============ 🧪 实验记录（SCP 风格） ============
function experimentTag(rec) {
    const n = (rec.notes || '') + (rec.result || '');
    if (n.indexOf('事故') !== -1) return { label: '事故', cls: 'tag-accident' };
    if (n.indexOf('意外') !== -1) return { label: '意外', cls: 'tag-incident' };
    return { label: '正常', cls: 'tag-normal' };
}
function renderExperimentRecords() {
    const list = document.getElementById('experimentList');
    if (!list) return;
    const records = EXPERIMENT_RECORDS || [];
    list.innerHTML = records.map(rec => {
        const tag = experimentTag(rec);
        return `
        <div class="record-item">
            <div class="record-head">
                <span class="record-no">${rec.expNo}</span>
                <span class="record-item-name">${rec.item}</span>
                <span class="record-tag ${tag.cls}">${tag.label}</span>
            </div>
            <div class="record-meta"><span>实验人员：${rec.personnel}</span><span>日期：${rec.date}</span></div>
            <div class="record-purpose">目的：${rec.purpose}</div>
            <button class="record-expand-btn" type="button">展开实验详情 ▾</button>
            <div class="record-detail">
                <div class="record-block"><h4>实验过程</h4><div class="record-steps">${rec.steps.map(s => `<div class="record-step">${s}</div>`).join('')}</div></div>
                <div class="record-block"><h4>实验结果</h4><p>${rec.result}</p></div>
                <div class="record-block"><h4>结论</h4><p>${rec.conclusion}</p></div>
                <div class="record-block"><h4>备注</h4><p class="record-notes">${rec.notes}</p></div>
            </div>
        </div>`;
    }).join('');
    list.querySelectorAll('.record-expand-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const item = this.closest('.record-item'); if (!item) return;
            const detail = item.querySelector('.record-detail'); if (!detail) return;
            const isOpen = detail.classList.contains('open');
            list.querySelectorAll('.record-item .record-detail.open').forEach(d => {
                if (d !== detail) { d.classList.remove('open'); const b = d.closest('.record-item') && d.closest('.record-item').querySelector('.record-expand-btn'); if (b) b.textContent = '展开实验详情 ▾'; }
            });
            if (isOpen) { detail.classList.remove('open'); this.textContent = '展开实验详情 ▾'; }
            else { detail.classList.add('open'); this.textContent = '收起实验详情 ▴'; }
        });
    });
}

// ============ 👻 异化体图鉴 ============
function renderEntities() {
    const list = document.getElementById('entityList');
    if (!list) return;
    const entities = CONTAINMENT_ENTITIES || [];
    list.innerHTML = entities.map(ent => {
        const lv = formatLevel(ent.level);
        return `
        <div class="entity-card">
            <div class="entity-head">
                <span class="entity-id">${ent.id}</span>
                <span class="entity-level ${lv.cls}">${lv.label}</span>
            </div>
            <div class="entity-name">${ent.name}<span class="entity-cls">${ent.cls}</span></div>
            <button class="entity-expand-btn" type="button">展开形态详情 ▾</button>
            <div class="entity-detail">
                <div class="entity-block"><h4>形态描述</h4><p>${ent.appearance}</p></div>
                <div class="entity-block"><h4>行为模式</h4><p>${ent.behavior}</p></div>
                <div class="entity-block"><h4>弱点</h4><ul class="entity-weak">${ent.weaknesses.map(w => `<li>${w}</li>`).join('')}</ul></div>
                <div class="entity-block"><h4>首次发现</h4><p>${ent.firstFound}</p></div>
                <div class="entity-block"><h4>关联收容物</h4><p class="entity-related">${ent.related}</p></div>
            </div>
        </div>`;
    }).join('');
    list.querySelectorAll('.entity-expand-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.entity-card'); if (!card) return;
            const detail = card.querySelector('.entity-detail'); if (!detail) return;
            const isOpen = detail.classList.contains('open');
            list.querySelectorAll('.entity-card .entity-detail.open').forEach(d => {
                if (d !== detail) { d.classList.remove('open'); const b = d.closest('.entity-card') && d.closest('.entity-card').querySelector('.entity-expand-btn'); if (b) b.textContent = '展开形态详情 ▾'; }
            });
            if (isOpen) { detail.classList.remove('open'); this.textContent = '展开形态详情 ▾'; }
            else { detail.classList.add('open'); this.textContent = '收起形态详情 ▴'; }
        });
    });
}

// ============ ⚔️ 收容行动记录 ============
function renderActionRecords() {
    const list = document.getElementById('actionList');
    if (!list) return;
    const records = ACTION_RECORDS || [];
    list.innerHTML = records.map(rec => `
        <div class="action-item">
            <div class="action-head">
                <span class="action-id">${rec.id}</span>
                <span class="action-codename">行动代号「${rec.codename}」</span>
            </div>
            <div class="action-meta"><span>执行单位：${rec.unit}</span></div>
            <div class="action-meta"><span>行动日期：${rec.date}</span><span>地点：${rec.location}</span></div>
            <button class="action-expand-btn" type="button">展开行动详情 ▾</button>
            <div class="action-detail">
                <div class="action-block"><h4>参与人员</h4><div class="action-members">${rec.members.map(m => `<span class="action-member">${m}</span>`).join('')}</div></div>
                <div class="action-block"><h4>行动目标</h4><p>${rec.objective}</p></div>
                <div class="action-block"><h4>行动背景</h4><p>${rec.background}</p></div>
                <div class="action-block"><h4>行动过程</h4><div class="action-timeline">${rec.timeline.map(t => `<div class="action-tl-item">${t}</div>`).join('')}</div></div>
                <div class="action-block"><h4>战斗损伤</h4><p>${rec.damage}</p></div>
                <div class="action-block"><h4>结论</h4><p>${rec.conclusion}</p></div>
                <div class="action-block"><h4>备注</h4><p class="action-notes">${rec.notes}</p></div>
            </div>
        </div>
    `).join('');
    list.querySelectorAll('.action-expand-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const item = this.closest('.action-item'); if (!item) return;
            const detail = item.querySelector('.action-detail'); if (!detail) return;
            const isOpen = detail.classList.contains('open');
            list.querySelectorAll('.action-item .action-detail.open').forEach(d => {
                if (d !== detail) { d.classList.remove('open'); const b = d.closest('.action-item') && d.closest('.action-item').querySelector('.action-expand-btn'); if (b) b.textContent = '展开行动详情 ▾'; }
            });
            if (isOpen) { detail.classList.remove('open'); this.textContent = '展开行动详情 ▾'; }
            else { detail.classList.add('open'); this.textContent = '收起行动详情 ▴'; }
        });
    });
}

// ============ ⌨️ 面板快捷键 + 主页内嵌切换 ============
const NAV_KEYMAP = { '1':'home','2':'monitor','3':'containment','4':'archive','5':'experiment','6':'entities','7':'action','8':'lingshi','9':'profile' };
function bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (!NAV_KEYMAP[e.key]) return;
        const term = document.getElementById('terminalContainer');
        if (!term || term.style.display !== 'block') return;
        const tag = (e.target && e.target.tagName) || '';
        if (['INPUT','TEXTAREA','SELECT'].indexOf(tag) !== -1 || (e.target && e.target.isContentEditable)) return;
        switchPanel(NAV_KEYMAP[e.key]);
    });
}
function renderHomeEmbed(panel) {
    const embed = document.getElementById('homeEmbed');
    if (!embed) return;
    document.querySelectorAll('#homeIndexGrid .index-card').forEach(c => c.classList.toggle('active', c.dataset.panel === panel));
    const openBtn = (p, label) => `<button class="embed-open" data-panel="${p}">进入完整 ${label} →</button>`;
    let html = '';
    if (panel === 'bureau') {
        html = `<div class="embed-head"><span class="embed-title">🏛 总局架构 · 六大司局</span>${openBtn('bureau', '面板')}</div>
            <div class="bureau-dept-grid">${(BUREAU_DEPARTMENTS || []).map(d => `
                <div class="bureau-dept-card">
                    <div class="bureau-dept-head"><span class="bureau-dept-icon">${d.icon}</span><div><div class="bureau-dept-name">${d.name}</div><div class="bureau-dept-id">${d.id}</div></div></div>
                    <div class="bureau-dept-func">${d.func}</div>
                    <div class="bureau-dept-status"><span class="status-dot"></span>${d.status}</div>
                </div>`).join('')}</div>`;
    } else if (panel === 'commBoard') {
        html = `<div class="embed-head"><span class="embed-title">✉ 总局通讯</span>${openBtn('commBoard', '面板')}</div>
            <div class="embed-list">${(INTERNAL_BOARDS || []).map(item => `
                <div class="embed-item"><div class="embed-item-title">📌 ${item.title}${item.dept ? `<span class="dept-badge">${item.dept}</span>` : ''}</div>
                <div class="embed-item-body">${item.content}</div>
                <div class="embed-item-comment">✍ 【批注】${item.comment}</div></div>`).join('') || '<div class="embed-item">暂无通讯记录。</div>'}</div>`;
    } else if (panel === 'internalForum') {
        html = `<div class="embed-head"><span class="embed-title">▣ 司内议室</span>${openBtn('internalForum', '面板')}</div>
            <div class="embed-list">${(internalPosts || []).slice().reverse().map(p => `
                <div class="embed-item"><div class="embed-item-title">📌 ${p.title}</div>
                <div class="embed-item-meta">${p.author} · ${p.timestamp} · ${(p.comments || []).length} 条回复</div></div>`).join('') || '<div class="embed-item">暂无内部帖子。</div>'}</div>`;
    } else if (panel === 'missions') {
        html = `<div class="embed-head"><span class="embed-title">☒ 悬赏榜</span>${openBtn('missions', '面板')}</div>
            <div class="embed-list">${(missions || []).map(m => { const ml = formatMissionLevel(m.risk); return `
                <div class="embed-item"><div class="embed-item-title">📌 ${m.title}<span class="mission-tag ${ml.cls}">${ml.label}</span></div>
                <div class="embed-item-meta">截止：${m.deadline} · ${m.status}${m.dept ? ` · <span class="dept-badge">${m.dept}</span>` : ''}</div>
                <div class="embed-item-body">${m.desc}</div></div>`; }).join('') || '<div class="embed-item">暂无悬赏委托。</div>'}</div>`;
    }
    embed.innerHTML = html;
    embed.querySelectorAll('.embed-open').forEach(b => b.addEventListener('click', () => switchPanel(b.dataset.panel)));
}

// ============ 🎮 规则怪谈互动游戏（文游） ============
let gameSanity = 100;
function startGame() {
    gameSanity = 100;
    const s = document.getElementById('gameSanity'); if (s) s.textContent = '100';
    renderGameScene('start');
}
function closeGame() { setForumView('postListView'); renderPostList(); }
function renderGameScene(id) {
    const body = document.getElementById('gameBody');
    const scene = (GAME_SCENES || []).find(s => s.id === id);
    if (!body || !scene) return;
    const s = document.getElementById('gameSanity');
    if (s) s.textContent = Math.max(0, gameSanity);
    if (scene.isEnd) {
        if (scene.reward > 0) addPoints(scene.reward);
        body.innerHTML = `
            <div class="game-end game-end-${scene.endType || 'bad'}">
                <h2>${scene.title}</h2>
                <p class="game-end-desc">${scene.desc}</p>
                <p class="game-end-reward">${scene.reward > 0 ? '✦ 获得 ' + scene.reward + ' 积分' : '—— 黑夜将你吞没 ——'}</p>
                <div class="game-end-actions">
                    <button class="game-btn" id="gameRestartBtn" type="button">↺ 再玩一次</button>
                    <button class="game-btn ghost" id="gameEndCloseBtn" type="button">✕ 离开校园</button>
                </div>
            </div>`;
        const rb = document.getElementById('gameRestartBtn'); if (rb) rb.addEventListener('click', startGame);
        const eb = document.getElementById('gameEndCloseBtn'); if (eb) eb.addEventListener('click', closeGame);
        return;
    }
    body.innerHTML = `
        <div class="game-scene-head"><span class="game-scene-tag">${scene.isStart ? '序章' : '续'}</span><h2>${scene.title}</h2></div>
        <p class="game-desc">${scene.desc}</p>
        <div class="game-options">${scene.options.map((o, i) => `<button class="game-option" data-i="${i}" type="button"><span class="opt-num">${i + 1}</span><span class="opt-text">${o.text}</span></button>`).join('')}</div>`;
    body.querySelectorAll('.game-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const o = scene.options[+btn.dataset.i];
            gameSanity = Math.max(0, gameSanity + ((o.effect && o.effect.sanity) || 0));
            if (s) s.textContent = gameSanity;
            btn.classList.add('chosen');
            btn.disabled = true;
            const note = document.createElement('div');
            note.className = 'game-note';
            note.textContent = '◆ ' + (o.note || '');
            body.appendChild(note);
            setTimeout(() => {
                if (gameSanity <= 0) { renderGameScene('end_lost'); return; }
                renderGameScene(o.effect.goto);
            }, 1500);
        });
    });
}
function bindGameView() {
    const back = document.getElementById('gameBackBtn');
    if (back) back.addEventListener('click', closeGame);
    const rulesBtn = document.getElementById('gameRulesBtn');
    const rulesPanel = document.getElementById('gameRulesPanel');
    if (rulesBtn && rulesPanel) rulesBtn.addEventListener('click', () => {
        const open = rulesPanel.style.display !== 'none';
        rulesPanel.style.display = open ? 'none' : 'block';
        if (!open && !rulesPanel.dataset.filled) {
            rulesPanel.dataset.filled = '1';
            rulesPanel.innerHTML = `<div class="game-rules-head">📜 学生生存守则 · 全文</div>` + (GAME_RULES || []).map(r => `<div class="rule-line">${r}</div>`).join('');
        }
    });
}

// ============ 📚 合集系统（仅整合论坛帖子，论坛/终端共用渲染） ============
function markRead(key) { const set = safeGetJSON('darkalley_readset', {}); set[key] = true; safeSet('darkalley_readset', set); }
function isRead(key) { return !!safeGetJSON('darkalley_readset', {})[key]; }
function renderCollectionList(list) {
    if (!list) return;
    list.innerHTML = (STORY_COLLECTIONS || []).map(col => {
        const done = col.items.filter(it => isRead(it.type + '|' + it.id)).length;
        const total = col.items.length;
        const pct = Math.round(done / total * 100);
        return `
        <div class="collection-card">
            <div class="collection-head">
                <span class="collection-ico">${col.icon}</span>
                <div>
                    <div class="collection-title">${col.title}</div>
                    <div class="collection-desc">${col.desc}</div>
                </div>
            </div>
            <div class="collection-progress"><div class="collection-bar" style="width:${pct}%"></div></div>
            <div class="collection-meta">阅读进度 <b>${done}/${total}</b> · ${pct}%</div>
            <ul class="collection-items">${col.items.map(it => {
                const read = isRead(it.type + '|' + it.id);
                return `<li class="collection-item${read ? ' read' : ''}" data-type="${it.type}" data-id="${it.id}">
                    <span class="ci-state">${read ? '✔' : '○'}</span><span class="ci-title">${it.title}</span><span class="ci-tag">${it.type === 'post' ? '帖子' : '档案'}</span>
                </li>`;
            }).join('')}</ul>
        </div>`;
    }).join('');
    list.querySelectorAll('.collection-item').forEach(li => {
        li.addEventListener('click', () => {
            const type = li.dataset.type, id = li.dataset.id;
            if (type === 'post') { const p = forumPosts.find(x => x.id === id); if (p) showPostDetail(id); }
            else { const a = archiveData.find(x => x.id === id); if (a) openArchiveDetail(a); }
        });
    });
}
function renderCollections() { renderCollectionList(document.getElementById('collectionList')); }
function renderFolkCollections() { renderCollectionList(document.getElementById('folkCollectionList')); }

// ============ 🛒 积分商城（论坛商城 + 终端商城分离） ============
// 积分/拥有状态按账号存储：论坛游客 → guest，终端员工 → 各自编号（如 ADMIN-001）
function getPoints() {
    let m = safeGetJSON('darkalley_points_map', null);
    if (!m) { const legacy = parseInt(safeGetJSON('darkalley_points', 0), 10) || 0; m = { guest: legacy }; safeSet('darkalley_points_map', m); }
    const uid = window.currentUser ? window.currentUser.id : 'guest';
    return m[uid] || 0;
}
function addPoints(n) {
    const m = safeGetJSON('darkalley_points_map', {}) || {};
    const uid = window.currentUser ? window.currentUser.id : 'guest';
    m[uid] = (m[uid] || 0) + (n || 0);
    safeSet('darkalley_points_map', m);
    return m[uid];
}
function addPointsFor(uid, n) {
    const m = safeGetJSON('darkalley_points_map', {}) || {};
    m[uid] = (m[uid] || 0) + (n || 0);
    safeSet('darkalley_points_map', m);
}
function getOwned() {
    let o = safeGetJSON('darkalley_owned_map', null);
    if (!o) { const legacy = safeGetJSON('darkalley_owned', []); o = { guest: Array.isArray(legacy) ? legacy : [] }; safeSet('darkalley_owned_map', o); }
    const uid = window.currentUser ? window.currentUser.id : 'guest';
    return o[uid] || [];
}
function ownItem(id) {
    const o = safeGetJSON('darkalley_owned_map', {}) || {};
    const uid = window.currentUser ? window.currentUser.id : 'guest';
    if (!o[uid]) o[uid] = [];
    if (o[uid].indexOf(id) === -1) { o[uid].push(id); safeSet('darkalley_owned_map', o); }
}
function getListings() { const l = safeGetJSON('darkalley_listings', []); return Array.isArray(l) ? l : []; }
function saveListings(list) { safeSet('darkalley_listings', list || []); }
let activeShopCat = '全部';
let activeForumShopCat = '全部';

function shopCardHtml(it, opts) {
    opts = opts || {};
    const owned = getOwned();
    const has = !opts.listing && owned.indexOf(it.id) !== -1;
    const affordable = getPoints() >= it.price;
    const mine = opts.listing && it.seller === (window.currentUser ? window.currentUser.id : '');
    const meta = opts.listing ? `<span class="shop-qty">×${it.qty}</span><span class="shop-seller">${it.sellerName || '匿名'}</span>` : `<span class="shop-cat">${it.cat}</span>`;
    let btn;
    if (mine) btn = `<button class="shop-btn mine" data-delist="${it.id}" type="button">下架</button>`;
    else if (has) btn = `<button class="shop-btn owned" disabled>已拥有</button>`;
    else if (!affordable) btn = `<button class="shop-btn cant" disabled>✦ ${it.price} 积分</button>`;
    else btn = `<button class="shop-btn" data-buy="${it.id}" data-listing="${opts.listing ? 1 : 0}" type="button">✦ ${it.price} 积分</button>`;
    return `
    <div class="shop-item${mine ? ' mine-item' : ''}">
        <span class="shop-ico">${it.ico || '📦'}</span>
        <div class="shop-main">
            <div class="shop-name">${it.name}${meta}</div>
            <div class="shop-desc">${it.desc || ''}</div>
        </div>
        ${btn}
    </div>`;
}

// —— 终端商城（总局物资部 · 内部向：官方物资 + 个人挂卖） ——
function renderShop() {
    const top = document.getElementById('shopPointsTop');
    if (top) top.textContent = getPoints();
    const tabs = document.getElementById('shopCatTabs');
    const list = document.getElementById('shopList');
    if (!tabs || !list) return;
    const cats = ['全部', '工具', '装备', '权限', '外观', '个人挂卖'];
    tabs.innerHTML = cats.map(c => `<button class="shop-cat-tab${activeShopCat === c ? ' active' : ''}" data-cat="${c}">${c}</button>`).join('');
    tabs.querySelectorAll('.shop-cat-tab').forEach(b => b.addEventListener('click', () => { activeShopCat = b.dataset.cat; renderShop(); }));
    const listings = getListings();
    const official = activeShopCat === '个人挂卖' ? [] : (TERMINAL_SHOP_ITEMS || []).filter(i => activeShopCat === '全部' || i.cat === activeShopCat);
    const userItems = (activeShopCat === '全部' || activeShopCat === '个人挂卖') ? listings : [];
    const html = [...official.map(i => shopCardHtml(i, {})), ...userItems.map(l => shopCardHtml(l, { listing: true }))];
    list.innerHTML = html.join('') || '<div class="shop-empty">该分类暂无商品</div>';
    list.querySelectorAll('.shop-btn[data-buy]').forEach(b => b.addEventListener('click', () => buyItem(b.dataset.buy, b.dataset.listing === '1')));
    list.querySelectorAll('.shop-btn[data-delist]').forEach(b => b.addEventListener('click', () => delistItem(b.dataset.delist)));
    renderMyListings();
}
function buyItem(id, isListing) {
    if (!window.currentUser) { alert('请先登录终端'); return; }
    if (isListing) {
        const listings = getListings();
        const li = listings.find(x => x.id === id);
        if (!li) return;
        if (li.seller === window.currentUser.id) { alert('不能购买自己上架的商品'); return; }
        if (getPoints() < li.price) { alert('积分不足'); return; }
        addPoints(-li.price);
        addPointsFor(li.seller, li.price);
        li.qty -= 1;
        saveListings(li.qty <= 0 ? listings.filter(x => x.id !== id) : listings);
        renderShop();
        alert('已购买「' + li.name + '」');
        return;
    }
    const it = (TERMINAL_SHOP_ITEMS || []).find(x => x.id === id);
    if (!it) return;
    if (getPoints() < it.price) { alert('积分不足'); return; }
    addPoints(-it.price); ownItem(it.id);
    renderShop();
    alert('已兑换「' + it.name + '」');
}
function delistItem(id) {
    const listings = getListings();
    const li = listings.find(x => x.id === id);
    if (!li) return;
    if (li.seller !== (window.currentUser ? window.currentUser.id : '')) return;
    saveListings(listings.filter(x => x.id !== id));
    renderShop();
    alert('已下架「' + li.name + '」');
}
function renderMyListings() {
    const wrap = document.getElementById('myListings');
    const hint = document.getElementById('myListingsHint');
    if (!wrap) return;
    const uid = window.currentUser ? window.currentUser.id : '';
    const mine = getListings().filter(l => l.seller === uid);
    if (hint) hint.textContent = mine.length + ' 件在售';
    wrap.innerHTML = mine.length ? mine.map(l => shopCardHtml(l, { listing: true })).join('') : '<div class="shop-empty">你还没有上架任何商品</div>';
    wrap.querySelectorAll('.shop-btn[data-delist]').forEach(b => b.addEventListener('click', () => delistItem(b.dataset.delist)));
    wrap.querySelectorAll('.shop-btn[data-buy]').forEach(b => b.addEventListener('click', () => buyItem(b.dataset.buy, true)));
}
function bindListingForm() {
    const btn = document.getElementById('listSubmitBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        if (!window.currentUser) { alert('请先登录终端'); return; }
        const name = (document.getElementById('listName').value || '').trim();
        const ico = (document.getElementById('listIco').value || '').trim();
        const price = parseInt(document.getElementById('listPrice').value, 10);
        const qty = parseInt(document.getElementById('listQty').value, 10) || 1;
        const desc = (document.getElementById('listDesc').value || '').trim();
        if (!name) { alert('请填写物品名称'); return; }
        if (!price || price < 1) { alert('请填写有效价格'); return; }
        const listings = getListings();
        listings.push({ id: 'L' + Date.now(), name, ico: ico || '📦', price, qty: Math.max(1, Math.min(99, qty)), desc, seller: window.currentUser.id, sellerName: window.currentUser.name, ts: Date.now() });
        saveListings(listings);
        ['listName', 'listIco', 'listPrice', 'listQty', 'listDesc'].forEach(k => { const el = document.getElementById(k); if (el) el.value = k === 'listQty' ? '1' : ''; });
        renderShop();
        alert('已上架「' + name + '」');
    });
}

// —— 论坛商城（巷口杂货铺 · 民众向：护身/头像框/皮肤等） ——
function renderForumShop() {
    const top = document.getElementById('forumShopPoints');
    if (top) top.textContent = getPoints();
    const tabs = document.getElementById('forumShopCatTabs');
    const list = document.getElementById('forumShopList');
    if (!tabs || !list) return;
    const cats = ['全部', '护身', '消耗品', '头像框', '皮肤', '收集品'];
    tabs.innerHTML = cats.map(c => `<button class="shop-cat-tab${activeForumShopCat === c ? ' active' : ''}" data-cat="${c}">${c}</button>`).join('');
    tabs.querySelectorAll('.shop-cat-tab').forEach(b => b.addEventListener('click', () => { activeForumShopCat = b.dataset.cat; renderForumShop(); }));
    const items = (FORUM_SHOP_ITEMS || []).filter(i => activeForumShopCat === '全部' || i.cat === activeForumShopCat);
    const owned = getOwned();
    list.innerHTML = items.map(it => {
        const has = owned.indexOf(it.id) !== -1;
        const affordable = getPoints() >= it.price;
        return `
        <div class="shop-item">
            <span class="shop-ico">${it.ico}</span>
            <div class="shop-main">
                <div class="shop-name">${it.name}<span class="shop-cat">${it.cat}</span></div>
                <div class="shop-desc">${it.desc}</div>
            </div>
            <button class="shop-btn${has ? ' owned' : ''}${!has && !affordable ? ' cant' : ''}" data-id="${it.id}" ${has ? 'disabled' : ''}>${has ? '已拥有' : '✦ ' + it.price + ' 积分'}</button>
        </div>`;
    }).join('');
    list.querySelectorAll('.shop-btn:not([disabled])').forEach(b => b.addEventListener('click', () => {
        const it = FORUM_SHOP_ITEMS.find(x => x.id === b.dataset.id);
        if (!it) return;
        if (getPoints() < it.price) { alert('积分不足'); return; }
        addPoints(-it.price); ownItem(it.id);
        renderForumShop();
        alert('已兑换「' + it.name + '」');
    }));
}

// —— 民俗专区（论坛内嵌面板：文游 / 故事合集 / 巷口杂货） ——
function setForumView(showId) {
    ['postListView', 'postDetailView', 'newPostForm', 'forumProfileView', 'forumGameSection', 'forumCollectionSection', 'forumShopSection'].forEach(k => {
        const el = document.getElementById(k);
        if (el) el.style.display = (k === showId) ? (k === 'postListView' ? 'flex' : 'block') : 'none';
    });
    document.body.style.overflow = (showId === 'postDetailView') ? 'hidden' : '';
}
function showForumView(id) {
    setForumView(id);
    if (id === 'forumGameSection') startGame();
    if (id === 'forumCollectionSection') renderFolkCollections();
    if (id === 'forumShopSection') renderForumShop();
}
function bindFolkEntries() {
    document.querySelectorAll('.folk-entry[data-open]').forEach(b => b.addEventListener('click', () => {
        const o = b.dataset.open;
        document.querySelectorAll('.board-tab').forEach(t => t.classList.remove('active'));
        if (o === 'game') showForumView('forumGameSection');
        else if (o === 'shop') showForumView('forumShopSection');
        else if (o === 'collections') showForumView('forumCollectionSection');
    }));
    ['gameBackBtn', 'collectionBackBtn', 'shopBackBtn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', () => { setForumView('postListView'); renderPostList(); });
    });
}

// ============ 🌫️ 动态迷雾背景（鼠标视差） ============
function initFog() {
    const fogs = document.querySelectorAll('.fog');
    if (!fogs.length) return;
    window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        if (fogs[0]) fogs[0].style.transform = `translate(${x * 14}px, ${y * 8}px)`;
        if (fogs[1]) fogs[1].style.transform = `translate(${x * -22}px, ${y * -12}px)`;
        if (fogs[2]) fogs[2].style.transform = `translate(${x * 30}px, ${y * 16}px)`;
    });
}

// ============ 初始化 ============
try {
    initFog();
    bindGameView();
    bindFolkEntries();
    bindListingForm();
    startStars();
    setupForumMiniPlayer();
    renderFeaturedPosts();
    renderPostList();
    document.getElementById('dailyFortune').textContent = getDailyFortune();
    updateForumStatus();
    setInterval(updateForumStatus, 30000);
    bindKeyboardShortcuts();
    const moreBtn = document.getElementById('sidebarMoreBtn');
    if (moreBtn) moreBtn.addEventListener('click', () => {
        const more = document.getElementById('sidebarMore');
        more.classList.toggle('open');
        moreBtn.textContent = more.classList.contains('open') ? '△ 收起版块' : '☰ 更多版块';
    });
    updatePortalStatus();
} catch(e) { console.error('初始化失败:', e); }