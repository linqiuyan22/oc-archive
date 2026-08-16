// ============ 全局变量与用户系统 ============
const VALID_USERS = {
    'HUAXU': { pass:'hx1234', name:'系统管理员', isAdmin:true },
    'QYXH-GUEST': { pass:'visitor', name:'临时访客', isAdmin:false },
    'L-09-01-S': { pass:'fengyu', name:'苏晚眠', isAdmin:false },
    'L-09-02-C': { pass:'lingxiu', name:'沈绛离', isAdmin:false },
    'L-09-03-X': { pass:'tianji', name:'谢逢虚', isAdmin:false },
    'L-09-04-W': { pass:'luoyu', name:'温泣语', isAdmin:false },
    'L-09-05-L': { pass:'kuanggu', name:'陆烬弦', isAdmin:false }
};

const ARCHIVE_DATA_VERSION = 'xuju-archive-v6-history';

window.currentUser = null;
purgeLegacySiteStorage();
let archiveData = [];
let userFavorites = safeGetJSON('xuju_favorites', {});
// 迁移旧 bundle 里的 userFavorites（旧数组格式在 favGroups() 中自动转分组）
try { const _b = JSON.parse(localStorage.getItem('site_local_data_bundle') || 'null'); if (_b && _b.userFavorites) { for (const k in _b.userFavorites) { if (!userFavorites[k]) userFavorites[k] = _b.userFavorites[k]; } } } catch (e) {}
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
// 论坛发言身份：已登录用账号绑定的身份名，游客用匿名
function currentIdentityName() { return window.currentUser ? window.currentUser.name : forumNickname; }
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
    const validCategories = new Set(['华墟管理档案', '华墟地理', '威胁评估档案', '人物档案', '事件分支', '收容物分支']);
    const legacyTextPattern = /档案条例|总则条例|目录分支|正文内容|\.docx|整篇长文|利用文档|整理自|旧版档案/i;
    const archiveLooksLegacy = Array.isArray(archiveSaved) && (
        archiveSaved.length < 10 ||
        archiveSaved.some(item => {
            const text = `${item?.title || ''} ${item?.summary || ''} ${item?.content || ''}`;
            const category = String(item?.category || '');
            const isOldLabel = legacyTextPattern.test(`${category} ${text}`);
            const isUnknownCategory = !!category && !validCategories.has(category) && !/^(人物档案|威胁评估档案|华墟管理档案|华墟地理|事件分支|收容物分支)$/.test(category);
            return isOldLabel || isUnknownCategory;
        }) ||
        archiveVersion !== ARCHIVE_DATA_VERSION
    );
    const postsLooksLegacy = Array.isArray(postsSaved) && postsSaved.some(post => {
        const text = `${post?.title || ''} ${post?.content || ''}`;
        return /正文内容|档案条例|总则条例|整篇长文|目录分支|旧版档案/i.test(text);
    });
    if (archiveLooksLegacy || postsLooksLegacy || archiveVersion !== ARCHIVE_DATA_VERSION) {
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
    const stars = Array.from({length:56}, ()=>({
        x: Math.random()*canvas.width, y: Math.random()*canvas.height,
        radius: 0.5 + Math.random()*1.3, speed: 0.2 + Math.random()*0.4,
        opacity: 0.25 + Math.random()*0.35
    }));
    let t = 0;
    let meteor = null, meteorTick = 0;
    function spawnMeteor() {
        meteor = { x: Math.random() * canvas.width * 0.5 + 20, y: Math.random() * canvas.height * 0.3 + 10, vx: 5 + Math.random() * 5, vy: 2 + Math.random() * 2.5, life: 50 };
    }
    function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        stars.forEach(s => {
            s.y += s.speed;
            if(s.y > canvas.height + 10) { s.y = -10; s.x = Math.random()*canvas.width; }
            const alpha = s.opacity * (0.6 + 0.4 * Math.sin(t + s.x));
            ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI*2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
        });
        // 流星（偶尔划过）
        if (!meteor) { if (++meteorTick > 700 + Math.random() * 700) { spawnMeteor(); meteorTick = 0; } }
        if (meteor) {
            ctx.beginPath(); ctx.moveTo(meteor.x, meteor.y); ctx.lineTo(meteor.x - meteor.vx * 10, meteor.y - meteor.vy * 10);
            ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.3; ctx.stroke();
            meteor.x += meteor.vx; meteor.y += meteor.vy; meteor.life--;
            if (meteor.life <= 0 || meteor.x > canvas.width + 40 || meteor.y > canvas.height + 40) meteor = null;
        }
        t += 0.05;
        starAnimId = requestAnimationFrame(draw);
    }
    draw();
}

// ============ 双音乐播放器系统 ============
let forumTrackIdx = 0;
function setupForumMiniPlayer() {
    const audio = document.getElementById('forumAudio');
    const sourceEl = document.getElementById('forumAudioSource');
    const btn = document.getElementById('forumMiniPlayBtn');
    const prevBtn = document.getElementById('forumPrevBtn');
    const nextBtn = document.getElementById('forumNextBtn');
    const statusText = document.getElementById('forumStatusText');
    const actionText = document.getElementById('forumActionText');
    const disc = document.getElementById('forumVinylDisc');
    const playerContainer = document.getElementById('forumVinylPlayer');
    if (!audio || !sourceEl || !btn) return;
    if (!LOCAL_TRACKS || !LOCAL_TRACKS.length) { if (playerContainer) playerContainer.style.opacity = '0.4'; return; }
    const setTrack = (i) => {
        if (!LOCAL_TRACKS.length) return;
        forumTrackIdx = ((i % LOCAL_TRACKS.length) + LOCAL_TRACKS.length) % LOCAL_TRACKS.length;
        const t = LOCAL_TRACKS[forumTrackIdx];
        sourceEl.src = t.file;
        if (disc) disc.src = t.cover || disc.src;
        if (statusText) { statusText.textContent = t.title; statusText.title = t.title + (t.artist ? ' · ' + t.artist : '') + (t.album ? ' · 《' + t.album + '》' : ''); }
        audio.load();
        if (!audio.paused) audio.play().catch(() => {});
    };
    setTrack(0);
    audio.volume = 0.3;
    bindPlayerVolume(audio, document.getElementById('forumVolSlider'), document.getElementById('forumVolToggle'), 'darkalley_volume_forum');
    btn.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().then(() => { playerContainer.classList.add('playing'); if (actionText) actionText.textContent = '[ 播放中 ]'; btn.textContent = '⏸'; }).catch(() => {});
        } else {
            audio.pause(); playerContainer.classList.remove('playing'); if (actionText) actionText.textContent = '[ 暂停 ]'; btn.textContent = '▶';
        }
    });
    if (prevBtn) prevBtn.addEventListener('click', () => setTrack(forumTrackIdx - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => setTrack(forumTrackIdx + 1));
    bindNcmPlayer('forum');
    setupPlayerMinimizeAndDrag();
}

let terminalTrackIdx = 0;
function setupMiniTerminalPlayer() {
    const audio = document.getElementById('bgAudio');
    const sourceEl = document.getElementById('audioSource');
    const btn = document.getElementById('miniPlayBtn');
    const prevBtn = document.getElementById('miniPrevBtn');
    const nextBtn = document.getElementById('miniNextBtn');
    const statusText = document.getElementById('statusText');
    const actionText = document.getElementById('actionText');
    const disc = document.getElementById('vinylDisc');
    const playerContainer = document.getElementById('vinylPlayer');
    if (!audio || !sourceEl || !btn) return;
    if (!LOCAL_TRACKS || !LOCAL_TRACKS.length) { if (playerContainer) playerContainer.style.opacity = '0.4'; return; }
    const setTrack = (i) => {
        if (!LOCAL_TRACKS.length) return;
        terminalTrackIdx = ((i % LOCAL_TRACKS.length) + LOCAL_TRACKS.length) % LOCAL_TRACKS.length;
        const t = LOCAL_TRACKS[terminalTrackIdx];
        sourceEl.src = t.file;
        if (disc) disc.src = t.cover || disc.src;
        if (statusText) { statusText.textContent = t.title; statusText.title = t.title + (t.artist ? ' · ' + t.artist : '') + (t.album ? ' · 《' + t.album + '》' : ''); }
        audio.load();
        if (!audio.paused) audio.play().catch(() => {});
    };
    setTrack(0);
    audio.volume = 0.3;
    bindPlayerVolume(audio, document.getElementById('miniVolSlider'), document.getElementById('miniVolToggle'), 'darkalley_volume_terminal');
    btn.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().then(() => { playerContainer.classList.add('playing'); if (actionText) actionText.textContent = '[ 播放中 ]'; btn.textContent = '⏸'; }).catch(() => {});
        } else {
            audio.pause(); playerContainer.classList.remove('playing'); if (actionText) actionText.textContent = '[ 暂停 ]'; btn.textContent = '▶';
        }
    });
    if (prevBtn) prevBtn.addEventListener('click', () => setTrack(terminalTrackIdx - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => setTrack(terminalTrackIdx + 1));
    bindNcmPlayer('mini', 'terminal');
    setupPlayerMinimizeAndDrag();
}

// ============ 🎛 播放器：收起 / 展开 / 拖拽移动 ============
// 手机端、桌面通用：点「—」收起成小圆片（再点圆片展开），按住播放器可拖到任意位置（记忆位置）
function setupPlayerMinimizeAndDrag() {
    if (window.__playerUIInited) return;
    window.__playerUIInited = true;
    const cfg = [
        { el: document.getElementById('forumVinylPlayer'), minBtn: document.getElementById('forumPlayerMin'), key: 'darkalley_player_pos_forum', z: 9999, id: 'forum' },
        { el: document.getElementById('vinylPlayer'), minBtn: document.getElementById('miniPlayerMin'), key: 'darkalley_player_pos_terminal', z: 120, id: 'terminal' }
    ];
    let minState = {};
    try { minState = JSON.parse(localStorage.getItem('darkalley_player_min') || '{}') || {}; } catch (e) { minState = {}; }
    const saveMin = () => {
        try {
            localStorage.setItem('darkalley_player_min', JSON.stringify({
                forum: cfg[0].el.classList.contains('minimized'),
                terminal: cfg[1].el.classList.contains('minimized')
            }));
        } catch (e) {}
    };
    cfg.forEach((c) => {
        const { el, minBtn, key, z, id } = c;
        if (!el || !minBtn) return;
        // 恢复收起状态与拖拽位置
        if (minState[id]) el.classList.add('minimized');
        try {
            const p = JSON.parse(localStorage.getItem(key) || 'null');
            if (p && typeof p.left === 'number' && typeof p.top === 'number') {
                el.style.left = p.left + 'px';
                el.style.top = p.top + 'px';
                el.style.right = 'auto';
                el.style.transform = 'none';
            }
        } catch (e) {}
        // 收起 / 展开
        minBtn.addEventListener('click', (e) => { e.stopPropagation(); el.classList.toggle('minimized'); saveMin(); });
        el.addEventListener('click', (e) => {
            if (el.classList.contains('minimized')) { el.classList.remove('minimized'); saveMin(); }
        });
        // 拖拽
        let dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
        el.addEventListener('pointerdown', (e) => {
            if (e.target.closest('button, .ncm-pop, a, select, input, iframe')) return;
            if (el.classList.contains('minimized')) return;
            dragging = true;
            const r = el.getBoundingClientRect();
            startX = e.clientX; startY = e.clientY;
            origLeft = r.left; origTop = r.top;
            el.style.left = r.left + 'px'; el.style.top = r.top + 'px';
            el.style.right = 'auto'; el.style.transform = 'none'; el.style.transition = 'none';
            el.style.zIndex = '10000'; el.classList.add('dragging');
            if (el.setPointerCapture) { try { el.setPointerCapture(e.pointerId); } catch (err) {} }
            e.preventDefault();
        });
        const onMove = (e) => {
            if (!dragging) return;
            let nx = origLeft + (e.clientX - startX);
            let ny = origTop + (e.clientY - startY);
            const r = el.getBoundingClientRect();
            nx = Math.max(4, Math.min(window.innerWidth - r.width - 4, nx));
            ny = Math.max(4, Math.min(window.innerHeight - r.height - 4, ny));
            el.style.left = nx + 'px'; el.style.top = ny + 'px';
        };
        const onUp = () => {
            if (!dragging) return;
            dragging = false;
            el.style.transition = ''; el.classList.remove('dragging'); el.style.zIndex = z;
            const r = el.getBoundingClientRect();
            try { localStorage.setItem(key, JSON.stringify({ left: r.left, top: r.top })); } catch (err) {}
        };
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerup', onUp);
        el.addEventListener('pointercancel', onUp);
    });
}

// ============ ☁ 网易云外链播放器 ============
function ncmFrame(type, id) {
    const t = type === 'playlist' ? 0 : 2;
    const h = type === 'playlist' ? 340 : 66;
    return 'https://music.163.com/outchain/player?type=' + t + '&id=' + encodeURIComponent(id) + '&auto=0&height=' + h;
}
function bindNcmPlayer(prefix, presetKey) {
    const pop = document.getElementById(prefix + 'NcmPop');
    const btn = document.getElementById(prefix + 'NcmBtn');
    const closeBtn = document.getElementById(prefix + 'NcmClose');
    const input = document.getElementById(prefix + 'NcmId');
    const typeSel = document.getElementById(prefix + 'NcmType');
    const goBtn = document.getElementById(prefix + 'NcmGo');
    const frame = document.getElementById(prefix + 'NcmFrame');
    const list = document.getElementById(prefix + 'NcmList');
    const nowTitle = document.getElementById(prefix + 'NcmNowTitle');
    const nowLink = document.getElementById(prefix + 'NcmNowLink');
    if (!pop || !btn) return;
    // 播放单曲 / 歌单
    const playSong = (id, name) => {
        if (frame) { frame.removeAttribute('loading'); frame.src = ncmFrame('song', id); frame.style.display = 'block'; }
        if (nowTitle) nowTitle.textContent = '正在播放：' + (name || '网易云单曲');
        if (nowLink) { nowLink.href = 'https://music.163.com/#/song?id=' + id; nowLink.style.display = 'inline'; }
        const m = safeGetJSON('darkalley_ncm', {}); m[prefix] = id; m[prefix + '_type'] = 'song'; safeSet('darkalley_ncm', m);
        if (input) input.value = id;
        if (typeSel) typeSel.value = 'song';
    };
    const playPlaylist = (id) => {
        if (frame) { frame.removeAttribute('loading'); frame.src = ncmFrame('playlist', id); frame.style.display = 'block'; }
        if (nowTitle) nowTitle.textContent = '正在播放歌单 #' + id;
        if (nowLink) { nowLink.href = 'https://music.163.com/#/playlist?id=' + id; nowLink.style.display = 'inline'; }
        const m = safeGetJSON('darkalley_ncm', {}); m[prefix] = id; m[prefix + '_type'] = 'playlist'; safeSet('darkalley_ncm', m);
        if (input) input.value = id;
        if (typeSel) typeSel.value = 'playlist';
    };
    // 预置鹰角歌曲列表（可点击播放）
    if (list && NCM_PRESET_TRACKS && NCM_PRESET_TRACKS.length) {
        list.innerHTML = NCM_PRESET_TRACKS.map((t, i) => `<button class="ncm-track" data-id="${t.id}" data-name="${t.name}" type="button">${i + 1}. ${t.name}</button>`).join('');
        list.querySelectorAll('.ncm-track').forEach(b => b.addEventListener('click', () => playSong(b.dataset.id, b.dataset.name)));
    }
    // 打开浮层时才恢复上次/预置播放（避免页面加载即请求网易云，且不依赖 lazy）
    const pre = (NCM_PRESETS && NCM_PRESETS[presetKey || prefix]) || { type: 'song', id: '' };
    const ncmMem = safeGetJSON('darkalley_ncm', {});
    const saved = ncmMem[prefix] || pre.id;
    const savedType = ncmMem[prefix + '_type'] || pre.type;
    if (input) input.value = saved;
    if (typeSel) typeSel.value = savedType;
    let restored = false;
    const restore = () => {
        if (restored || !saved) return;
        restored = true;
        if (savedType === 'playlist') playPlaylist(saved); else playSong(saved);
    };
    btn.addEventListener('click', (e) => { e.stopPropagation(); pop.classList.toggle('open'); if (pop.classList.contains('open')) restore(); });
    if (closeBtn) closeBtn.addEventListener('click', () => pop.classList.remove('open'));
    const go = () => {
        const id = (input ? input.value : '').trim();
        const type = typeSel ? typeSel.value : 'song';
        if (!id) return;
        restored = true;
        if (type === 'playlist') playPlaylist(id); else playSong(id);
    };
    if (goBtn) goBtn.addEventListener('click', go);
    if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
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

let forumSearchKw = '';
function renderPostList() {
    const list = document.getElementById('postList');
    if (!list) return;
    let filtered = forumPosts;
    if (forumSearchKw) {
        const kw = forumSearchKw.toLowerCase();
        filtered = filtered.filter(p => (p.title + ' ' + p.content + ' ' + (p.author || '') + ' ' + (p.board || '')).toLowerCase().includes(kw));
    } else if (currentBoard !== 'all') {
        filtered = filtered.filter(p => p.board === currentBoard);
    }
    const total = (filtered || []).length;
    const totalPages = Math.max(1, Math.ceil(total / POST_PAGE_SIZE));
    if (currentPostPage > totalPages) currentPostPage = totalPages;
    if (currentPostPage < 1) currentPostPage = 1;
    // 置顶帖（标题含【置顶】）始终排在列表最前，不被新增帖子顶下去；其余按时间倒序（新增在前）
    const sorted = (filtered || []).slice().sort((a, b) => {
        const pa = /【置顶】|\[置顶\]/.test(a.title || '') ? 1 : 0;
        const pb = /【置顶】|\[置顶\]/.test(b.title || '') ? 1 : 0;
        if (pa !== pb) return pb - pa;
        return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
    });
    const pageItems = sorted.slice((currentPostPage - 1) * POST_PAGE_SIZE, currentPostPage * POST_PAGE_SIZE);
    if (total === 0) {
        list.innerHTML = `<div class="post-item" style="text-align:center;color:var(--text-muted);pointer-events:none;border-color:transparent;">该板块还没有帖子，快来发布第一篇讨论吧。</div>`;
    } else {
        list.innerHTML = pageItems.map(p => {
            const cover = p.image && String(p.image).trim() ? String(p.image).trim() : 'images/feature1.jpg';
            return `
            <div class="post-item" data-id="${p.id}">
                ${p.image ? `<img class="post-cover" src="${cover}" alt="" loading="lazy" decoding="async">` : ''}
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
            <div class="post-detail-actions">${favBtnHtml(post.id, post.title)}</div>
        </div>
        <div class="post-detail-body">
            ${bodyHtml}
        </div>`;
    bindFavBtn(document.getElementById('postDetailContent'));
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
            let chain = c.text.slice(0, 50) + (c.text.length > 50 ? '…' : '');
            // 楼中楼：若被引用的评论本身也是引用，把引用链一并带上，更真实
            if (c.replyTo) chain = '↩ ' + c.replyTo.user + '：' + (String(c.replyTo.text || '').slice(0, 30) || '…') + ' ｜ ' + chain;
            window.pendingReply = { user: c.user, text: chain, floor: (+btn.dataset.idx) + 2 };
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
const forumSearchInput = document.getElementById('forumSearchInput');
if (forumSearchInput) forumSearchInput.addEventListener('input', () => {
    forumSearchKw = forumSearchInput.value.trim();
    currentPostPage = 1;
    renderPostList();
});
document.getElementById('submitNewPostBtn').addEventListener('click', () => {
    if (!window.currentUser) { alert('请先登录再发帖'); openAwakenModal(); return; }
    const title = document.getElementById('newPostTitle').value.trim();
    const content = document.getElementById('newPostContent').value.trim();
    const board = document.getElementById('newPostBoard').value;
    if (!title || !content) return alert('请填写标题和内容');
    forumPosts.push({ id:'p'+Date.now(), title, content, board, author: currentIdentityName(), timestamp:new Date().toLocaleString('zh-CN'), comments:[] });
    currentPostPage = 1;
    addPoints(10); savePosts(); backToList();
});
document.getElementById('submitCommentBtn').addEventListener('click', () => {
    if (!window.currentUser) { alert('请先登录再回复'); openAwakenModal(); return; }
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
    post.comments.push({ user: currentIdentityName(), text, time:new Date().toLocaleString('zh-CN'), likes: 0, replyTo });
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
    document.getElementById('forumProfileName').textContent = currentIdentityName();
    const level = Math.min(10, Math.floor(checkinState.total / 5) + 1);
    document.getElementById('forumProfileSub').textContent = `已签到 ${checkinState.total} 天 · Lv.${level}`;
    // 概览
    const myPostCount = forumPosts.filter(p => p.author === currentIdentityName()).length;
    document.getElementById('ovPosts').textContent = myPostCount;
    document.getElementById('ovCheckin').textContent = checkinState.total;
    document.getElementById('ovStreak').textContent = checkinState.streak;
    document.getElementById('ovPoints').textContent = checkinState.points;
    // 我的帖子
    const mine = forumPosts.filter(p => p.author === currentIdentityName());
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
document.getElementById('sendMessageBtn').addEventListener('click', () => { if (!window.currentUser) { alert('请先登录'); openAwakenModal(); return; } const to = document.getElementById('messageRecipient').value.trim(); const text = document.getElementById('messageContent').value.trim(); if (!to || !text) return alert('请填写收件人和内容'); forumMessages.push({ from: currentIdentityName(), to, text, time:new Date().toLocaleString('zh-CN') }); safeSet('darkalley_messages', forumMessages); renderForumProfile(); });
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

// ============ 👤 统一账号系统（邀请码注册 / 身份绑定） ============
const INVITE_CODE = 'HX-2026';
const STAFF_OPTIONS = {
    'L-09-01-S': '苏晚眠', 'L-09-02-C': '沈绛离', 'L-09-03-X': '谢逢虚', 'L-09-04-W': '温泣语', 'L-09-05-L': '陆烬弦'
};
function getUsers() { return safeGetJSON('darkalley_users', {}); }
function saveUsers(u) { safeSet('darkalley_users', u); }
function getSessionUser() { return localStorage.getItem('darkalley_session'); }
function setSessionUser(u) { if (u) localStorage.setItem('darkalley_session', u); else localStorage.removeItem('darkalley_session'); }

// 登录：用户名 + 密码（兼容预设账号）
function attemptLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    const err = document.getElementById('loginError');
    let info = null;
    if (VALID_USERS[username] && VALID_USERS[username].pass === pass) {
        info = { username, name: VALID_USERS[username].name, isAdmin: !!VALID_USERS[username].isAdmin, type: 'staff', staffId: username, avatar: null };
    }
    if (!info) {
        const users = getUsers();
        const u = users[username];
        if (u && u.pass === pass) {
            info = { username, name: u.roleName || STAFF_OPTIONS[u.staffId] || username, isAdmin: false, type: u.type, staffId: u.staffId, avatar: u.avatar };
        }
    }
    if (!info) { err.textContent = '[!] 用户名或密码错误'; return; }
    doLogin(info);
}
function doLogin(info) {
    info.id = info.username; // 兼容旧代码里的 currentUser.id（= 账号名）
    window.currentUser = info;
    setSessionUser(info.username);
    userLoginCounts[info.username] = (userLoginCounts[info.username] || 0) + 1; safeSet('xuju_logincounts', userLoginCounts);
    if (!userFavorites[info.username]) userFavorites[info.username] = {};
    if (!userHistory[info.username]) userHistory[info.username] = [];
    document.getElementById('awakenModal').style.display = 'none';
    document.getElementById('forumContainer').style.display = 'block';
    document.getElementById('terminalContainer').style.display = 'none';
    updateForumIdentityUI();
    if (typeof renderForumProfile === 'function') renderForumProfile();
    renderPostList();
}
// 注册：邀请码 + 用户名 + 密码 + 身份类型（自创角色 / 扮演员工）
function registerAccount() {
    const invite = document.getElementById('regInvite').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const pass = document.getElementById('regPassword').value.trim();
    const roleType = (document.querySelector('input[name="regRoleType"]:checked') || {}).value || 'custom';
    const users = getUsers();
    const err = document.getElementById('registerError');
    if (invite !== INVITE_CODE) { err.textContent = '[!] 邀请码无效'; return; }
    if (!username || username.length < 2) { err.textContent = '[!] 用户名至少 2 个字符'; return; }
    if (!pass || pass.length < 4) { err.textContent = '[!] 密码至少 4 位'; return; }
    if (users[username] || VALID_USERS[username]) { err.textContent = '[!] 用户名已被占用'; return; }
    let roleName = username, staffId = null, avatar = null;
    if (roleType === 'staff') {
        staffId = document.getElementById('regStaffSelect').value;
        roleName = STAFF_OPTIONS[staffId];
    } else {
        roleName = document.getElementById('regCustomName').value.trim() || username;
        avatar = document.getElementById('regCustomAvatar').value.trim() || '🙂';
    }
    users[username] = { pass, type: roleType, staffId, roleName, avatar, createdAt: Date.now() };
    saveUsers(users);
    err.textContent = '';
    doLogin({ username, name: roleName, isAdmin: false, type: roleType, staffId, avatar });
}
// 退出登录（回游客）
function logoutForum() {
    window.currentUser = null;
    setSessionUser(null);
    document.getElementById('terminalContainer').style.display = 'none';
    document.getElementById('forumContainer').style.display = 'block';
    updateForumIdentityUI();
    if (typeof renderForumProfile === 'function') renderForumProfile();
    renderPostList();
}
// 进入终端（员工视角，保留）
function enterTerminal() {
    if (!window.currentUser) { openAwakenModal(); return; }
    document.getElementById('forumContainer').style.display = 'none';
    document.getElementById('terminalContainer').style.display = 'block';
    if (!terminalInited) setTimeout(initTerminal, 300);
    updatePortalStatus(); setupMiniTerminalPlayer();
}
function logoutTerminal() { document.getElementById('terminalContainer').style.display = 'none'; document.getElementById('forumContainer').style.display = 'block'; updatePortalStatus(); }
// 论坛身份 UI 刷新
function updateForumIdentityUI() {
    const elName = document.getElementById('forumUserName');
    const elSub = document.getElementById('forumUserSub');
    const elAvatar = document.getElementById('forumUserAvatar');
    const loginBtn = document.getElementById('forumLoginBtn');
    const logoutBtn = document.getElementById('forumLogoutBtn');
    const accLink = document.getElementById('forumAccountLink');
    if (window.currentUser) {
        if (elName) elName.textContent = window.currentUser.name;
        if (elSub) elSub.textContent = window.currentUser.type === 'staff' ? '扮演员工 · ' + (window.currentUser.staffId || '') : '自创角色';
        if (elAvatar) elAvatar.textContent = window.currentUser.avatar || (window.currentUser.type === 'staff' ? '☽' : '🙂');
        if (loginBtn) loginBtn.textContent = '◈ 进入终端';
        if (logoutBtn) logoutBtn.style.display = '';
        if (accLink) accLink.textContent = window.currentUser.name;
    } else {
        if (elName) elName.textContent = '匿名访客';
        if (elSub) elSub.textContent = '未登录 · 可浏览，不可发言';
        if (elAvatar) elAvatar.textContent = '☽';
        if (loginBtn) loginBtn.textContent = '☽ 登录 / 注册';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (accLink) accLink.textContent = '登录';
    }
}
// 会话恢复
function restoreSession() {
    const username = getSessionUser();
    if (!username) return;
    const users = getUsers();
    const u = users[username];
    if (u) {
        doLogin({ username, name: u.roleName || STAFF_OPTIONS[u.staffId] || username, isAdmin: false, type: u.type, staffId: u.staffId, avatar: u.avatar });
    } else if (VALID_USERS[username]) {
        doLogin({ username, name: VALID_USERS[username].name, isAdmin: !!VALID_USERS[username].isAdmin, type: 'staff', staffId: username, avatar: null });
    }
}

// 绑定事件
document.getElementById('loginBtn').addEventListener('click', attemptLogin);
document.getElementById('loginPassword').addEventListener('keypress', e => { if (e.key === 'Enter') attemptLogin(); });
document.getElementById('registerBtn').addEventListener('click', registerAccount);
document.getElementById('logoutTopBtn').addEventListener('click', logoutTerminal);
document.querySelectorAll('.login-tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.toggle('active', t === tab));
    document.getElementById('loginForm').style.display = tab.dataset.tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab.dataset.tab === 'register' ? 'block' : 'none';
}));
document.querySelectorAll('input[name="regRoleType"]').forEach(r => r.addEventListener('change', () => {
    const staff = (document.querySelector('input[name="regRoleType"]:checked') || {}).value === 'staff';
    const sw = document.getElementById('regStaffWrap'), cw = document.getElementById('regCustomWrap');
    if (sw) sw.style.display = staff ? 'block' : 'none';
    if (cw) cw.style.display = staff ? 'none' : 'block';
}));
function openAwakenModal() {
    document.getElementById('awakenModal').style.display = 'flex';
    const lu = document.getElementById('loginUsername'); if (lu) lu.focus();
}
// 「那扇门」：未登录 → 登录框；已登录 → 进终端
['awakenEntryBtn', 'awakenEntryFooter'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('click', e => { e.preventDefault(); if (window.currentUser) enterTerminal(); else openAwakenModal(); }); });
const forumAccountLink = document.getElementById('forumAccountLink');
if (forumAccountLink) forumAccountLink.addEventListener('click', e => { e.preventDefault(); if (window.currentUser) enterTerminal(); else openAwakenModal(); });
const forumLoginBtnEl = document.getElementById('forumLoginBtn');
if (forumLoginBtnEl) forumLoginBtnEl.addEventListener('click', () => { if (window.currentUser) enterTerminal(); else openAwakenModal(); });
const forumLogoutBtnEl = document.getElementById('forumLogoutBtn');
if (forumLogoutBtnEl) forumLogoutBtnEl.addEventListener('click', logoutForum);
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

// ============ � 播放器音量控制（含静音记忆） ============
function bindPlayerVolume(audio, slider, toggle, storageKey) {
    if (!audio || !slider) return;
    const load = () => {
        let v = 0.3;
        try { const s = parseFloat(localStorage.getItem(storageKey)); if (!isNaN(s)) v = Math.max(0, Math.min(1, s)); } catch (e) {}
        audio.volume = v; slider.value = Math.round(v * 100);
        if (toggle) toggle.textContent = v <= 0 ? '🔇' : '🔊';
    };
    load();
    slider.addEventListener('input', () => {
        const v = slider.value / 100;
        audio.volume = v;
        try { localStorage.setItem(storageKey, String(v)); } catch (e) {}
        if (toggle) toggle.textContent = v <= 0 ? '🔇' : '🔊';
    });
    if (toggle) toggle.addEventListener('click', () => {
        if (audio.volume > 0) { audio.dataset.prevVol = audio.volume; audio.volume = 0; slider.value = 0; toggle.textContent = '🔇'; }
        else { const v = parseFloat(audio.dataset.prevVol || '0.3') || 0.3; audio.volume = v; slider.value = Math.round(v * 100); toggle.textContent = '🔊'; }
    });
}

// ============ 🕯 论坛鼠标烛火拖尾（仅桌面） ============
function initCursorCandle() {
    if (!window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;
    const forum = document.getElementById('forumContainer');
    if (!forum) return;
    let lastT = 0;
    forum.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - lastT < 40) return;
        lastT = now;
        const p = document.createElement('span');
        p.className = 'cursor-candle';
        const s = (3 + Math.random() * 6);
        p.style.left = (e.clientX - s / 2) + 'px';
        p.style.top = (e.clientY - s / 2) + 'px';
        p.style.width = p.style.height = s + 'px';
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1400);
    });
}

// ============ �🛰 扫描数据角标时钟（主页地图卡 / 监测面板） ============
function startScanMeta() {
    const els = [document.getElementById('homeMapMeta'), document.getElementById('signalMapMeta')].filter(Boolean);
    if (!els.length) return;
    const fmt = (n) => String(n).padStart(2, '0');
    const tick = () => {
        const d = new Date();
        const t = fmt(d.getHours()) + ':' + fmt(d.getMinutes()) + ':' + fmt(d.getSeconds());
        const txt = 'LINK · ' + t + ' · STABLE';
        els.forEach(el => { el.textContent = txt; });
    };
    tick();
    if (window.__scanMetaTimer) clearInterval(window.__scanMetaTimer);
    window.__scanMetaTimer = setInterval(tick, 1000);
}
// ============ 🕒 论坛页脚实时时钟 ============
function startForumClock() {
    const el = document.getElementById('forumClock');
    if (!el) return;
    const fmt = (n) => String(n).padStart(2, '0');
    const tick = () => {
        const d = new Date();
        el.textContent = '· ' + fmt(d.getHours()) + ':' + fmt(d.getMinutes()) + ':' + fmt(d.getSeconds());
    };
    tick();
    if (window.__forumClockTimer) clearInterval(window.__forumClockTimer);
    window.__forumClockTimer = setInterval(tick, 1000);
}

// ============ 终端面板逻辑 ============
function initTerminal() {
    if (terminalInited) return;
    terminalInited = true; loadArchive(); saveLocalDataBundle(); bindTerminalNav(); startRain();
    startTypewriter(); renderLingshi(); renderInternalPosts(); renderMissions();
    applyTerminalTheme(safeGetJSON('darkalley_theme', 'default'));
    setupEditorEvents(); switchPanel('home'); renderHomeEmbed('bureau'); updateProfilePanel();
    document.getElementById('terminalFortuneText').textContent = getDailyFortune();
    startScanMeta();
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
        if (activeCategory === '行动记录') { showArchiveActions(); } else { renderArchiveList(); }
    }
    if (name === 'admin') renderAdminList();
    if (name === 'profile') { updateProfilePanel(); renderThemeOptions(); }
    if (name === 'lingshi') renderLingshi();
    if (name === 'internalForum') renderInternalPosts();
    if (name === 'missions') renderMissions();
    if (name === 'monitor') initMap();
    if (name === 'containment') renderContainmentList();
    if (name === 'commBoard') renderCommBoard();
    if (name === 'bureau') renderBureau();
    if (name === 'experiment') renderExperimentRecords();
    if (name === 'entities') renderEntities();
    if (name === 'collections') renderCollections();
    if (name === 'shop') renderShop();
}
function bindTerminalNav() {
    // 手机端导航收缩展开
    const navEl = document.querySelector('.main-nav');
    const collapseBtn = document.getElementById('navCollapseBtn');
    if (navEl && collapseBtn) {
        collapseBtn.addEventListener('click', () => {
            navEl.classList.toggle('nav-open');
            collapseBtn.classList.toggle('open');
            const label = collapseBtn.querySelector('.nav-collapse-label');
            if (label) label.textContent = navEl.classList.contains('nav-open') ? '收起' : '菜单';
        });
    }
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
        if (activeCategory === '行动记录') { showArchiveActions(); return; }
        renderArchiveList();
    }));
    document.getElementById('archiveSearchInput').addEventListener('input', renderArchiveList);
}

// ============ 档案检索、收容物、通讯等 ============
function loadArchive() {
    const saved = safeGetJSON('xuju_archive', null);
    const validCategories = new Set(['华墟管理档案', '华墟地理', '威胁评估档案', '人物档案', '事件分支', '收容物分支']);
    const normalizeArchiveItem = item => {
        if (!item || typeof item !== 'object') return null;
        const category = String(item.category || '');
        const keyCategory = category === '档案条例' || category === '华墟管理档案' ? '华墟管理档案'
            : category === '人物' || category === '人物档案' ? '人物档案'
            : category === '高危势力' || category === '威胁评估档案' ? '威胁评估档案'
            : category === '事件' || category === '事件分支' ? '事件分支'
            : category === '收容物' || category === '收容物分支' ? '收容物分支'
            : category;
        const normalized = { ...item, category: keyCategory };
        if (normalized.title && /^档案条例\s*·|^总则分支\s*·|^机制分支\s*·/.test(normalized.title)) {
            normalized.title = normalized.title.replace(/^档案条例\s*·/, '华墟管理档案 ·').replace(/^总则分支\s*·/, '华墟管理档案 · 总则分支 ·').replace(/^机制分支\s*·/, '华墟管理档案 · 机制分支 ·');
        }
        if (normalized.title && /^人物档案\s*·/.test(normalized.title) && normalized.category === '人物档案') {
            normalized.title = normalized.title.replace(/^人物档案\s*·/, '人物档案 ·');
        }
        if (normalized.title && /^(人物档案|档案条例|事件分支|收容物分支)/.test(normalized.title) && !validCategories.has(normalized.category)) {
            normalized.category = validCategories.has(normalized.category) ? normalized.category : '华墟管理档案';
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
    if (activeCategory === '行动记录') { showArchiveActions(); return; }
    const searchInput = document.getElementById('archiveSearchInput');
    const container = document.getElementById('archiveContainer');
    if (!searchInput || !container) return;
    const actionView = document.getElementById('archiveActionView');
    if (container) container.style.display = '';
    if (actionView) actionView.style.display = 'none';

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
        const order = ['华墟管理档案', '华墟地理', '威胁评估档案', '人物档案', '事件分支', '收容物分支'];
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
            <img class="archive-card-img" src="${image}" alt="${item.title}" loading="lazy" decoding="async" onerror="this.src='images/default-archive.jpg'">
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

// ============ ⭐ 收藏分组系统 ============
let activeFavGroup = '默认';
function favGroups(uid) {
    if (!uid) return {};
    let fav = userFavorites[uid];
    if (!fav) fav = userFavorites[uid] = {};
    if (Array.isArray(fav)) { const arr = fav.slice(); fav = userFavorites[uid] = { '默认': arr }; }
    if (!fav['默认']) fav['默认'] = [];
    return fav;
}
function saveFav() { safeSet('xuju_favorites', userFavorites); }
function isFavorited(uid, id) {
    if (!uid || !id) return false;
    const fav = userFavorites[uid];
    if (!fav) return false;
    if (Array.isArray(fav)) return fav.includes(id);
    return Object.values(fav).some(a => Array.isArray(a) && a.includes(id));
}
function toggleFavorite(uid, id) {
    const fav = favGroups(uid);
    for (const g in fav) { const i = fav[g].indexOf(id); if (i > -1) { fav[g].splice(i, 1); saveFav(); return false; } }
    fav['默认'].push(id); saveFav(); return true;
}
function moveFav(uid, id, group) {
    const fav = favGroups(uid);
    for (const g in fav) { const i = fav[g].indexOf(id); if (i > -1) fav[g].splice(i, 1); }
    if (!fav[group]) fav[group] = [];
    if (fav[group].indexOf(id) === -1) fav[group].push(id);
    saveFav();
}
function favTitle(id) { const a = archiveData.find(x => x.id === id); if (a) return a.title; const p = forumPosts.find(x => x.id === id); if (p) return p.title; return id; }
function favType(id) { if (archiveData.find(x => x.id === id)) return '档'; if (forumPosts.find(x => x.id === id)) return '帖'; return '·'; }
function favBtnHtml(id, title) {
    const uid = window.currentUser ? window.currentUser.id : '';
    const on = isFavorited(uid, id);
    return `<button class="fav-btn${on ? ' fav-on' : ''}" data-fav-id="${id}" data-fav-title="${String(title || '').replace(/"/g, '&quot;')}" type="button">${on ? '★ 已收藏' : '☆ 收藏'}</button>`;
}
function bindFavBtn(scope) {
    if (!scope) return;
    scope.querySelectorAll('.fav-btn').forEach(b => {
        b.addEventListener('click', () => {
            const uid = window.currentUser ? window.currentUser.id : '';
            if (!uid) { alert('请先登录终端再收藏'); return; }
            const on = toggleFavorite(uid, b.dataset.favId);
            b.textContent = on ? '★ 已收藏' : '☆ 收藏';
            b.classList.toggle('fav-on', on);
            if (typeof updateProfilePanel === 'function') updateProfilePanel();
        });
    });
}
function renderFavGroupsPanel() {
    const uid = window.currentUser ? window.currentUser.id : '';
    const wrap = document.getElementById('favGroups');
    const listEl = document.getElementById('favList');
    if (!wrap || !listEl) return;
    const fav = favGroups(uid);
    const groups = Object.keys(fav);
    if (groups.indexOf(activeFavGroup) === -1) activeFavGroup = groups.length ? groups[0] : '默认';
    wrap.innerHTML = groups.map(function(g) { return '<button class="fav-group-tab' + (g === activeFavGroup ? ' active' : '') + '" data-g="' + escapeHtml(g) + '" type="button">' + escapeHtml(g) + '<small>' + (fav[g] || []).length + '</small></button>'; }).join('');
    const items = fav[activeFavGroup] || [];
    listEl.innerHTML = items.length ? items.map(id => '<div class="fav-item"><span class="fav-type">' + favType(id) + '</span><span class="fav-name">' + favTitle(id) + '</span><button class="fav-cmd" data-act="move" data-id="' + id + '" type="button">⇄</button><button class="fav-cmd" data-act="del" data-id="' + id + '" type="button">✕</button></div>').join('') : '<div class="fav-empty">该分组暂无收藏</div>';
    wrap.querySelectorAll('.fav-group-tab').forEach(b => b.addEventListener('click', function() { activeFavGroup = b.dataset.g; renderFavGroupsPanel(); }));
    listEl.querySelectorAll('.fav-cmd').forEach(b => b.addEventListener('click', () => {
        const id = b.dataset.id;
        if (b.dataset.act === 'del') {
            const fav = favGroups(uid); const i = fav[activeFavGroup].indexOf(id);
            if (i > -1) { fav[activeFavGroup].splice(i, 1); saveFav(); renderFavGroupsPanel(); }
        } else {
            const g = prompt('移动到分组：', activeFavGroup);
            if (g && g.trim()) { moveFav(uid, id, g.trim()); renderFavGroupsPanel(); }
        }
    }));
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
            <img src="${imagePath}" alt="${item.title}" loading="lazy" decoding="async" style="width:200px; height:200px; object-fit:cover; border-radius:12px; border:1px solid var(--border-color); background:#111;" onerror="this.src='images/default-archive.jpg'">
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
                ${item.image ? `<img src="${imagePath}" alt="${item.title}" loading="lazy" decoding="async" style="width:200px; height:140px; object-fit:cover; border-radius:10px; border:1px solid var(--border-color); background:#111;" onerror="this.src='images/default-archive.jpg'">` : ''}
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
    // 终端实际滚动容器是 #terminalContainer（body 不滚动），必须同时锁定，否则滚轮会穿透到外部容器
    const tc = document.getElementById('terminalContainer');
    if (tc) tc.style.overflow = 'hidden';
    content.innerHTML = `${header}<div class="archive-fav-zone">${favBtnHtml(item.id, item.title)}</div><div style="line-height:1.7;color:var(--text-secondary);">${item.content}</div>`;
    bindFavBtn(content);
    // 断点续读：恢复上次阅读位置
    lastArchiveScrollId = item.id;
    const savedScroll = safeGetJSON('darkalley_archive_scroll', {});
    if (savedScroll[item.id]) { requestAnimationFrame(() => { content.scrollTop = savedScroll[item.id]; }); }
}
let lastArchiveScrollId = null;
function closeArchiveDetail() {
    const content = document.getElementById('archiveDetailContent');
    if (lastArchiveScrollId && content) {
        const saved = safeGetJSON('darkalley_archive_scroll', {});
        saved[lastArchiveScrollId] = content.scrollTop;
        safeSet('darkalley_archive_scroll', saved);
    }
    lastArchiveScrollId = null;
    document.getElementById('archiveDetailModal').style.display = 'none';
    document.body.style.overflow = '';
    const tc = document.getElementById('terminalContainer');
    if (tc) tc.style.overflow = '';
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
            else { detail.classList.add('open'); this.textContent = '收起详情 ▴'; try { detail.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} }
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
    const fav = favGroups(uid);
    const favorites = Object.values(fav).reduce((a, arr) => a.concat(arr), []);
    const history = userHistory[uid] || [];
    const completed = Math.min((missions || []).filter(m => m.status === '进行中' || m.status.includes('已')).length + 2, 9);
    document.getElementById('statMission').textContent = completed;
    document.getElementById('statFav').textContent = favorites.length;
    document.getElementById('statHistory').textContent = history.length;
    renderFavGroupsPanel();
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
    { id:'a', name:'京兆府', level:'总局', status:'HQSCA 核心', time:'持续', desc:'华墟共和国首都，全域墟化现象管控总局总部驻地，全国监测中枢，六大司局常驻，能量基准恒定。' },
    { id:'b', name:'临川府', level:'观测', status:'民俗社', time:'持续', desc:'云江府省会，临川民俗研究社团活动区域，锚点能量平稳，标记为长期观测点位。' },
    { id:'c', name:'沧溟府', level:'辛', status:'模因污染', time:'2025-03-15', desc:'沿海港口城市，认知污染残留与"沧溟风暴"能量波形高度吻合，与沧溟-S级风暴事件同源，需持续追踪。' },
    { id:'d', name:'宁州府', level:'观测', status:'学术重镇', time:'持续', desc:'华墟学术重镇，玄理科研院分院驻地，收容物研究核心区，多处试验场能量读数稳定。' },
    { id:'e', name:'玄水府', level:'庚', status:'古墓遗址', time:'2024-08-11', desc:'玄水省省会，多处古墓遗址频发规则型墟域，外勤小队重点巡防区，夜间信号间歇波动。' },
    { id:'f', name:'赤岭府', level:'辛', status:'民俗禁忌', time:'2026-01-05', desc:'赤岭省省会，西南山区民俗保留完整，山野墟域事件频发，局地锚点能量偏高。' },
    { id:'g', name:'南荒岭', level:'绝危', status:'无人区警戒', time:'持续', desc:'西南无人区，己阶以上高危墟域多发区，禁止未授权进入，全局最高响应，探测阵列全天候运转。' },
    { id:'h', name:'沙洲府', level:'待核', status:'荒漠异常', time:'2026-02-01', desc:'戈壁省首府，西北荒漠深处多次侦测到异常能量残留，初步判定为收容物级，待现场核验。' }
];
function initMap() {
    const mapEl = document.getElementById('signalMap');
    if (!mapEl) return;
    const readout = document.getElementById('sigReadout');
    const siteList = document.getElementById('monitorSiteList');
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
        if (siteList) {
            siteList.querySelectorAll('.monitor-site-item').forEach(item =>
                item.classList.toggle('active', item.dataset.site === site.name));
        }
    };
    mapEl.querySelectorAll('.sig-node').forEach(node => {
        node.addEventListener('click', () => {
            const site = SIGNAL_SITES.find(s => s.name === node.dataset.site);
            selectSite(site);
        });
    });
    // 生成华墟各分区监测站点清单
    if (siteList) {
        siteList.innerHTML = SIGNAL_SITES.map(site => `
            <button class="monitor-site-item" data-site="${site.name}">
                <span class="ms-dot"></span>
                <span class="ms-name">${site.name}</span>
                <span class="ms-tag">${site.level}</span>
            </button>`).join('');
        siteList.querySelectorAll('.monitor-site-item').forEach(item => {
            item.addEventListener('click', () => {
                const site = SIGNAL_SITES.find(s => s.name === item.dataset.site);
                selectSite(site);
            });
        });
    }
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
function startTypewriter() { const el = document.getElementById('typewriterText'); const msg = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]; el.textContent = ''; let i=0; const t = setInterval(() => { if(i<msg.length) { el.textContent += msg.charAt(i++); playTypeKey(); } else clearInterval(t); }, 60); }

// ============ ⌨️ 打字机音效 + 口令显隐 ============
let typeCtx = null;
function playTypeKey() {
    try {
        if (!typeCtx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; typeCtx = new AC(); }
        if (typeCtx.state === 'suspended') typeCtx.resume();
        const now = typeCtx.currentTime;
        const osc = typeCtx.createOscillator();
        const gain = typeCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(900 + Math.random() * 500, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain); gain.connect(typeCtx.destination);
        osc.start(now); osc.stop(now + 0.03);
    } catch (e) {}
}
function bindPasswordToggle() {
    const input = document.getElementById('passwordInput');
    const btn = document.getElementById('pwdToggleBtn');
    if (!input || !btn) return;
    btn.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.textContent = show ? '🙈' : '👁';
    });
    input.addEventListener('keydown', playTypeKey);
}
function bindTypeKeyInputs() {
    ['lingshiInput', 'internalCommentInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', playTypeKey);
    });
}
// 全局点击提示音（极轻）
function playClick() {
    try {
        if (!typeCtx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; typeCtx = new AC(); }
        if (typeCtx.state === 'suspended') typeCtx.resume();
        const now = typeCtx.currentTime;
        const osc = typeCtx.createOscillator();
        const gain = typeCtx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(560 + Math.random() * 240, now);
        gain.gain.setValueAtTime(0.028, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain); gain.connect(typeCtx.destination);
        osc.start(now); osc.stop(now + 0.05);
    } catch (e) {}
}
function bindClickSfx() {
    document.addEventListener('click', (e) => {
        const el = e.target && e.target.closest ? e.target.closest('button, a, .post-item, .collection-item, .archive-card-item, .nav-btn, .board-tab, .folk-entry, .index-card, .ncm-track, .game-option') : null;
        if (el) playClick();
    }, true);
}
// 时辰显示
function shiChenLabel() {
    const h = new Date().getHours();
    const arr = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    return '☾ ' + arr[Math.floor(((h + 1) % 24) / 2)] + '时';
}

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
function renderActionList(list) {
    if (!list) return;
    const records = ACTION_RECORDS || [];
    list.innerHTML = records.map(rec => {
        const relArchives = (rec.links || []).map(id => (archiveData || []).find(a => a.id === id)).filter(Boolean);
        const relHtml = relArchives.length ? `<div class="action-links">📎 关联档案：${relArchives.map(a => `<button class="action-link" data-id="${a.id}" type="button">${(a.title || a.id).replace(/^.+·\s*/, '')}</button>`).join('')}</div>` : '';
        return `
        <div class="action-item">
            <div class="action-head">
                <span class="action-id">${rec.id}</span>
                <span class="action-codename">行动代号「${rec.codename}」</span>
            </div>
            <div class="action-meta"><span>执行单位：${rec.unit}</span></div>
            <div class="action-meta"><span>行动日期：${rec.date}</span><span>地点：${rec.location}</span></div>
            ${relHtml}
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
        </div>`;
    }).join('');
    list.querySelectorAll('.action-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const a = (archiveData || []).find(x => x.id === btn.dataset.id);
            if (a) openArchiveDetail(a);
        });
    });
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
function showArchiveActions() {
    const container = document.getElementById('archiveContainer');
    const view = document.getElementById('archiveActionView');
    if (container) container.style.display = 'none';
    if (view) { view.style.display = 'block'; renderActionList(document.getElementById('archiveActionList')); }
}

// ============ ⌨️ 面板快捷键 + 主页内嵌切换 ============
const NAV_KEYMAP = { '1':'home','2':'monitor','3':'containment','4':'archive','5':'experiment','6':'entities','7':'lingshi','8':'profile' };
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
// 🎨 终端主题皮肤
function applyTerminalTheme(name) {
    const term = document.getElementById('terminalContainer');
    if (!term) return;
    term.classList.remove('theme-night', 'theme-blood');
    if (name && name !== 'default') term.classList.add('theme-' + name);
    safeSet('darkalley_theme', name || 'default');
    document.querySelectorAll('#themeOptions .theme-opt').forEach(o => o.classList.toggle('active', o.dataset.theme === (name || 'default')));
}
function renderThemeOptions() {
    const wrap = document.getElementById('themeOptions');
    if (!wrap) return;
    const owned = getOwned();
    const cur = safeGetJSON('darkalley_theme', 'default') || 'default';
    const opts = [
        { theme: 'default', label: '◐ 默认 · 猩红', locked: false },
        { theme: 'night', label: '🌑 暗夜 · 玄青', locked: owned.indexOf('t10') === -1 },
        { theme: 'blood', label: '🌕 血月 · 赤金', locked: owned.indexOf('t11') === -1 }
    ];
    wrap.innerHTML = opts.map(o => `<button class="theme-opt${o.locked ? ' locked' : ''}${cur === o.theme ? ' active' : ''}" data-theme="${o.theme}" ${o.locked ? 'title="需在终端商城兑换（暗夜皮肤）"' : ''} type="button">${o.label}${o.locked ? ' 🔒' : ''}</button>`).join('');
    wrap.querySelectorAll('.theme-opt:not(.locked)').forEach(b => b.addEventListener('click', () => applyTerminalTheme(b.dataset.theme)));
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
    // 帖子详情弹层：同时锁定 body 与 html（视口），避免滚到底时页脚「那扇门」透出重叠
    const lockScroll = (showId === 'postDetailView') ? 'hidden' : '';
    document.body.style.overflow = lockScroll;
    document.documentElement.style.overflow = lockScroll;
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
    restoreSession();
    updateForumIdentityUI();
    initFog();
    bindGameView();
    bindFolkEntries();
    bindListingForm();
    bindPasswordToggle();
    bindTypeKeyInputs();
    bindClickSfx();
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
    initCursorCandle();
    // 收藏：新建分组
    const favNewBtn = document.getElementById('favNewGroupBtn');
    if (favNewBtn) favNewBtn.addEventListener('click', () => {
        const uid = window.currentUser ? window.currentUser.id : '';
        const inp = document.getElementById('favNewGroupInput');
        const name = (inp && inp.value || '').trim();
        if (!uid) { alert('请先登录'); return; }
        if (!name) { alert('请输入分组名'); return; }
        const fav = favGroups(uid);
        if (!fav[name]) fav[name] = [];
        saveFav(); activeFavGroup = name;
        if (inp) inp.value = '';
        renderFavGroupsPanel();
    });
    // 🛠️ 修复：.modal-overlay 是 fixed，但 .main-container 的 backdrop-filter 会劫持其包含块，导致弹窗随外层滚动上移/消失。移到 body 顶层（body 无 transform/filter），fixed 相对视口正确。
    document.querySelectorAll('.modal-overlay').forEach(m => { if (m.parentElement && m.parentElement !== document.body) document.body.appendChild(m); });
    // ESC 关闭弹窗
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        const m = document.getElementById('archiveDetailModal');
        if (m && m.style.display !== 'none') { closeArchiveDetail(); return; }
        ['editModal', 'postEditModal'].forEach(id => { const el = document.getElementById(id); if (el && el.style.display !== 'none') el.style.display = 'none'; });
        document.body.style.overflow = '';
        const tc = document.getElementById('terminalContainer'); if (tc) tc.style.overflow = '';
    });
    const shiChenEl = document.getElementById('shiChen');
    if (shiChenEl) { const updShi = () => shiChenEl.textContent = shiChenLabel(); updShi(); setInterval(updShi, 60000); }
    startForumClock();
} catch(e) { console.error('初始化失败:', e); }