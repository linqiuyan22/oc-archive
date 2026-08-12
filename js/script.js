// ============ 状态管理 ============
let currentUser = null;
let archiveData = [];
let userFavorites = {};
let userHistory = {};
let userLoginCounts = {};
let currentPanel = 'home', activeCategory = 'all';
let currentChannel = 'main';
let lingshiMessages = {};
let internalPosts = [];
let missions = [];

// 安全地从 localStorage 读取，出错时返回空对象/数组
function safeGetJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null || raw === 'null' || raw === undefined) return fallback;
        return JSON.parse(raw);
    } catch(e) {
        return fallback;
    }
}
function safeSet(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch(e) {
        console.warn('localStorage 写入失败:', e);
    }
}

// ============ 加载过场动画（修复版） ============
window.addEventListener('load', () => {
    setTimeout(() => {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 500);
        }
    }, 1500); // 1.5秒后自动消失，确保不会卡住
});

// 备用：如果 load 事件已过，立即移除加载动画
setTimeout(() => {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 500);
    }
}, 3000); // 3秒兜底

// ============ 论坛数据 ============
let forumPosts = safeGetJSON('darkalley_posts', null);
if (!forumPosts || !Array.isArray(forumPosts) || forumPosts.length === 0) {
    forumPosts = JSON.parse(JSON.stringify(DEFAULT_POSTS));
    safeSet('darkalley_posts', forumPosts);
}
function savePosts() { safeSet('darkalley_posts', forumPosts); }

// ============ 内部数据初始化 ============
lingshiMessages = safeGetJSON('xuju_lingshi', null);
if (!lingshiMessages || typeof lingshiMessages !== 'object' || Object.keys(lingshiMessages).length === 0) {
    lingshiMessages = JSON.parse(JSON.stringify(DEFAULT_CHANNELS));
    safeSet('xuju_lingshi', lingshiMessages);
}

internalPosts = safeGetJSON('xuju_internal_posts', null);
if (!internalPosts || !Array.isArray(internalPosts) || internalPosts.length === 0) {
    internalPosts = JSON.parse(JSON.stringify(DEFAULT_INTERNAL_POSTS));
    safeSet('xuju_internal_posts', internalPosts);
}

missions = safeGetJSON('xuju_missions', null);
if (!missions || !Array.isArray(missions) || missions.length === 0) {
    missions = JSON.parse(JSON.stringify(DEFAULT_MISSIONS));
    safeSet('xuju_missions', missions);
}

userFavorites = safeGetJSON('xuju_favs', {});
userHistory = safeGetJSON('xuju_history', {});
userLoginCounts = safeGetJSON('xuju_logincounts', {});

// ============ 论坛渲染 ============
function renderPostList() {
    const list = document.getElementById('postList');
    if (!list) return;
    list.innerHTML = forumPosts.slice().reverse().map(p => `
        <div class="post-item" data-id="${p.id}">
            <div class="post-title">${p.title}</div>
            <div class="post-meta"><span>${p.author}</span><span>${p.comments ? p.comments.length : 0} 回复</span><span>${p.timestamp}</span></div>
        </div>`).join('');
    document.querySelectorAll('.post-item').forEach(el => el.addEventListener('click', () => showPostDetail(el.dataset.id)));
    const total = document.getElementById('totalPosts');
    if (total) total.textContent = forumPosts.length;
}

function showPostDetail(id) {
    const post = forumPosts.find(p => p.id === id);
    if (!post) return;
    document.getElementById('postListView').style.display = 'none';
    document.getElementById('newPostForm').style.display = 'none';
    const detail = document.getElementById('postDetailView');
    detail.style.display = 'block';
    detail.dataset.currentId = id;
    document.getElementById('postDetailContent').innerHTML = `
        <h1 class="post-detail-title">${post.title}</h1>
        <div class="post-detail-meta">${post.author} · ${post.timestamp}</div>
        <div class="post-detail-body">${post.content}</div>`;
    renderComments(post);
}
function renderComments(post) {
    const comments = post.comments || [];
    document.getElementById('commentList').innerHTML = comments.map(c => `
        <div class="comment-item"><div class="comment-meta">${c.user} · ${c.time}</div><div>${c.text}</div></div>`).join('');
}
function backToList() {
    document.getElementById('postDetailView').style.display = 'none';
    document.getElementById('newPostForm').style.display = 'none';
    document.getElementById('postListView').style.display = 'block';
}

// 论坛按钮事件
document.getElementById('submitNewPostBtn').addEventListener('click', () => {
    const title = document.getElementById('newPostTitle').value.trim();
    const content = document.getElementById('newPostContent').value.trim();
    if (!title || !content) return alert('请填写标题和内容');
    forumPosts.push({ id:'p'+Date.now(), title, content, author:'匿名_'+Math.floor(Math.random()*0xffff).toString(16), timestamp:new Date().toLocaleString('zh-CN'), comments:[] });
    savePosts();
    document.getElementById('newPostTitle').value = '';
    document.getElementById('newPostContent').value = '';
    backToList();
    renderPostList();
});
document.getElementById('submitCommentBtn').addEventListener('click', () => {
    const text = document.getElementById('commentInput').value.trim();
    if (!text) return;
    const postId = document.getElementById('postDetailView').dataset.currentId;
    const post = forumPosts.find(p => p.id === postId);
    if (!post) return;
    post.comments = post.comments || [];
    post.comments.push({ user:'匿名_'+Math.floor(Math.random()*0xffff).toString(16), text, time:new Date().toLocaleString('zh-CN') });
    savePosts();
    renderComments(post);
    document.getElementById('commentInput').value = '';
});
document.getElementById('forumHomeLink').addEventListener('click', e => { e.preventDefault(); backToList(); });
document.getElementById('forumNewPostLink').addEventListener('click', e => { e.preventDefault();
    document.getElementById('postListView').style.display = 'none';
    document.getElementById('postDetailView').style.display = 'none';
    document.getElementById('newPostForm').style.display = 'block';
});
document.getElementById('backToListBtn').addEventListener('click', backToList);
document.getElementById('cancelNewPostBtn').addEventListener('click', backToList);

// ============ 登录系统 ============
const VALID_USERS = {
    'ADMIN-001': { pass:'admin123', name:'系统管理员', isAdmin:true },
    'QYXH-GUEST': { pass:'visitor', name:'临时访客', isAdmin:false },
    'L-09-01-S': { pass:'fengyu', name:'苏晚眠', isAdmin:false },
    'L-09-02-C': { pass:'lingxiu', name:'沈绛离', isAdmin:false },
    'L-09-03-X': { pass:'tianji', name:'谢逢虚', isAdmin:false },
    'L-09-04-W': { pass:'luoyu', name:'温泣语', isAdmin:false },
    'L-09-05-L': { pass:'kuanggu', name:'陆烬弦', isAdmin:false }
};

function attemptLogin() {
    const id = document.getElementById('staffIdInput').value.trim();
    const pass = document.getElementById('passwordInput').value.trim();
    const info = VALID_USERS[id];
    if (!info || info.pass !== pass) {
        document.getElementById('loginError').textContent = '[!] 身份验证失败';
        return false;
    }
    currentUser = { id, name:info.name, isAdmin:info.isAdmin };
    userLoginCounts[id] = (userLoginCounts[id] || 0) + 1;
    safeSet('xuju_logincounts', userLoginCounts);
    if (!userFavorites[id]) userFavorites[id] = [];
    if (!userHistory[id]) userHistory[id] = [];
    document.getElementById('forumContainer').style.display = 'none';
    document.getElementById('awakenModal').style.display = 'none';
    document.getElementById('terminalContainer').style.display = 'block';
    document.getElementById('rainCanvas').style.display = 'block';
    document.getElementById('topUsername').textContent = currentUser.name;
    if (currentUser.isAdmin) {
        document.getElementById('topAdminBadge').style.display = 'inline';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'inline-block');
    }
    initTerminal();
    return true;
}

function logoutTerminal() {
    currentUser = null;
    document.getElementById('terminalContainer').style.display = 'none';
    document.getElementById('rainCanvas').style.display = 'none';
    document.getElementById('forumContainer').style.display = 'block';
}

document.getElementById('loginBtn').addEventListener('click', attemptLogin);
document.getElementById('passwordInput').addEventListener('keypress', e => { if(e.key==='Enter') attemptLogin(); });
document.getElementById('logoutTopBtn').addEventListener('click', logoutTerminal);
function openAwakenModal() {
    document.getElementById('awakenModal').style.display = 'flex';
    document.getElementById('staffIdInput').focus();
}
['awakenEntryBtn','awakenEntryFooter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', e => { e.preventDefault(); openAwakenModal(); });
});
document.getElementById('closeAwakenModalBtn').addEventListener('click', () => {
    document.getElementById('awakenModal').style.display = 'none';
});

// ============ 终端 ============
let terminalInited = false;
function initTerminal() {
    if (terminalInited) return;
    terminalInited = true;
    loadArchive();
    bindTerminalNav();
    setupAudio();
    startRain();
    startTypewriter();
    renderLingshi();
    renderInternalPosts();
    renderMissions();
    setupEditorEvents();
    switchPanel('home');
    updateProfilePanel();
}

function switchPanel(name) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(name + 'Panel');
    if (panel) panel.classList.add('active');
    document.querySelectorAll('.nav-btn[data-panel]').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.nav-btn[data-panel="${name}"]`);
    if (btn) btn.classList.add('active');
    currentPanel = name;
    if (name === 'archive') renderArchiveList();
    if (name === 'admin') renderAdminList();
    if (name === 'profile') updateProfilePanel();
    if (name === 'lingshi') renderLingshi();
    if (name === 'internalForum') renderInternalPosts();
    if (name === 'missions') renderMissions();
}

function bindTerminalNav() {
    document.querySelectorAll('.nav-btn[data-panel]').forEach(btn => {
        btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
    });
    document.querySelectorAll('.index-card').forEach(card => {
        card.addEventListener('click', () => {
            const cat = card.dataset.cat;
            const tab = document.querySelector(`.cat-tab[data-category="${cat}"]`);
            if (tab) { tab.click(); switchPanel('archive'); }
        });
    });
    document.querySelectorAll('.cat-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeCategory = tab.dataset.category;
            renderArchiveList();
        });
    });
    document.getElementById('archiveSearchInput').addEventListener('input', renderArchiveList);
}

// 档案
function loadArchive() {
    const saved = safeGetJSON('xuju_archive', null);
    archiveData = (saved && Array.isArray(saved) && saved.length > 0) ? saved : JSON.parse(JSON.stringify(DEFAULT_ARCHIVES));
    safeSet('xuju_archive', archiveData);
}
function renderArchiveList() {
    const keyword = document.getElementById('archiveSearchInput').value.trim().toLowerCase();
    let filtered = archiveData;
    if (activeCategory !== 'all') filtered = filtered.filter(i => i.category === activeCategory);
    if (keyword) filtered = filtered.filter(i => (i.id+i.title+i.tags.join(' ')+i.summary+i.content).toLowerCase().includes(keyword));
    const list = document.getElementById('archiveList');
    list.innerHTML = '';
    if (!filtered.length) {
        list.innerHTML = '<div class="archive-card" style="text-align:center;color:#ff3333;">[!] 无结果</div>';
        return;
    }
    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'archive-card';
        card.innerHTML = `
            <div class="card-header"><span class="card-id">${item.id}</span><span class="card-category">${item.category}</span></div>
            <div class="card-title">${item.title}</div>
            <div class="card-summary">${item.summary}</div>
            <div class="card-actions"><button class="fav-btn" data-id="${item.id}">⭐ 收藏</button><button class="view-detail-btn">📄 查看详情</button></div>`;
        card.querySelector('.view-detail-btn').addEventListener('click', e => { e.stopPropagation(); openArchiveDetail(item); });
        card.addEventListener('click', () => openArchiveDetail(item));
        card.querySelector('.fav-btn').addEventListener('click', e => { e.stopPropagation(); toggleFavorite(item.id); renderArchiveList(); });
        list.appendChild(card);
    });
}
function openArchiveDetail(item) {
    addHistory(item.id);
    const modal = document.getElementById('archiveDetailModal');
    const content = document.getElementById('archiveDetailContent');
    content.innerHTML = `
        <div class="archive-detail-header"><h2>${item.title}</h2><span class="archive-detail-category">${item.category}</span></div>
        <div class="archive-detail-body">${item.content}</div>`;
    modal.style.display = 'flex';
}
document.getElementById('closeArchiveDetailBtn').addEventListener('click', () => {
    document.getElementById('archiveDetailModal').style.display = 'none';
});
document.getElementById('archiveDetailModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
});
function addHistory(id) {
    if (!currentUser) return;
    const uid = currentUser.id;
    userHistory[uid] = [id, ...userHistory[uid].filter(x => x !== id)].slice(0, 20);
    safeSet('xuju_history', userHistory);
}
function toggleFavorite(id) {
    if (!currentUser) return;
    const uid = currentUser.id;
    if (!userFavorites[uid]) userFavorites[uid] = [];
    const idx = userFavorites[uid].indexOf(id);
    idx > -1 ? userFavorites[uid].splice(idx, 1) : userFavorites[uid].push(id);
    safeSet('xuju_favs', userFavorites);
}

// 灵犀通讯
function renderLingshi() {
    const msgs = lingshiMessages[currentChannel] || [];
    const container = document.getElementById('lingshiMessages');
    if (container) container.innerHTML = msgs.map(m => `<div class="lingshi-msg"><div class="lingshi-msg-user">${m.user} · ${m.time}</div><div class="lingshi-msg-text">${m.text}</div></div>`).join('');
    const nameEl = document.getElementById('currentChannelName');
    if (nameEl) nameEl.textContent = '#' + (currentChannel === 'main' ? '总局频道' : currentChannel === 'club' ? '民俗社五人' : currentChannel === 'operation' ? '外勤行动' : '档案室');
    document.querySelectorAll('.channel-btn').forEach(b => b.classList.toggle('active', b.dataset.channel === currentChannel));
}
document.querySelectorAll('.channel-btn').forEach(btn => btn.addEventListener('click', () => { currentChannel = btn.dataset.channel; renderLingshi(); }));
document.getElementById('lingshiSendBtn').addEventListener('click', () => {
    const input = document.getElementById('lingshiInput');
    const text = input.value.trim();
    if (!text || !currentUser) return;
    if (!lingshiMessages[currentChannel]) lingshiMessages[currentChannel] = [];
    lingshiMessages[currentChannel].push({ user: currentUser.name, text, time: new Date().toLocaleString('zh-CN') });
    safeSet('xuju_lingshi', lingshiMessages);
    renderLingshi();
    input.value = '';
});
document.getElementById('lingshiInput').addEventListener('keypress', e => { if(e.key==='Enter') document.getElementById('lingshiSendBtn').click(); });

// 司内议室
function renderInternalPosts() {
    const list = document.getElementById('internalPostList');
    list.innerHTML = internalPosts.slice().reverse().map(p => `
        <div class="internal-post-item" data-id="${p.id}">
            <div class="internal-post-title">${p.title}</div>
            <div class="internal-post-meta">${p.author} · ${p.timestamp} · ${(p.comments||[]).length}回复</div>
        </div>`).join('');
    document.querySelectorAll('.internal-post-item').forEach(el => el.addEventListener('click', () => showInternalPostDetail(el.dataset.id)));
}
function showInternalPostDetail(id) {
    const post = internalPosts.find(p => p.id === id);
    if (!post) return;
    document.getElementById('internalPostList').style.display = 'none';
    const detail = document.getElementById('internalPostDetail');
    detail.style.display = 'block';
    detail.dataset.currentId = id;
    document.getElementById('internalPostContent').innerHTML = `
        <h3 style="color:#ddd;">${post.title}</h3>
        <div style="color:#777;font-size:0.8rem;margin:10px 0;">${post.author} · ${post.timestamp}</div>
        <div style="color:#ccc;line-height:1.7;white-space:pre-wrap;">${post.content}</div>
        <hr style="border-color:#333;margin:20px 0;">
        <h4 style="color:#aaa;">回复</h4>
        ${(post.comments||[]).map(c => `<div style="margin:8px 0;"><span style="color:var(--gold);font-size:0.8rem;">${c.user} · ${c.time}</span><br><span style="color:#ccc;">${c.text}</span></div>`).join('')}`;
}
document.getElementById('internalBackBtn').addEventListener('click', () => {
    document.getElementById('internalPostDetail').style.display = 'none';
    document.getElementById('internalPostList').style.display = 'grid';
    renderInternalPosts();
});
document.getElementById('internalNewPostBtn').addEventListener('click', () => {
    const title = prompt('帖子标题：');
    if (!title) return;
    const content = prompt('帖子内容：');
    if (!content) return;
    internalPosts.push({ id:'ip'+Date.now(), title, content, author: currentUser ? currentUser.name : '匿名', timestamp:new Date().toLocaleString('zh-CN'), comments:[] });
    safeSet('xuju_internal_posts', internalPosts);
    renderInternalPosts();
});
document.getElementById('internalCommentBtn').addEventListener('click', () => {
    const text = document.getElementById('internalCommentInput').value.trim();
    if (!text) return;
    const postId = document.getElementById('internalPostDetail').dataset.currentId;
    const post = internalPosts.find(p => p.id === postId);
    if (!post) return;
    post.comments = post.comments || [];
    post.comments.push({ user: currentUser ? currentUser.name : '匿名', text, time:new Date().toLocaleString('zh-CN') });
    safeSet('xuju_internal_posts', internalPosts);
    showInternalPostDetail(postId);
    document.getElementById('internalCommentInput').value = '';
});

// 悬赏榜
function renderMissions() {
    document.getElementById('missionsList').innerHTML = missions.map(m => `
        <div class="mission-item risk-${m.risk}">
            <div class="mission-title">${m.title}</div>
            <div class="mission-meta"><span>风险: ${m.risk}</span><span>状态: ${m.status}</span><span>截止: ${m.deadline}</span></div>
            <div class="mission-desc">${m.desc}</div>
        </div>`).join('');
}

// 个人主页
function updateProfilePanel() {
    if (!currentUser) return;
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileId').textContent = currentUser.id;
    document.getElementById('loginCount').textContent = userLoginCounts[currentUser.id] || 0;
    document.getElementById('profileRole').textContent = currentUser.isAdmin ? '管理员' : '访客';
    document.getElementById('profileAvatar').textContent = currentUser.name.charAt(0);
    const uid = currentUser.id;
    document.getElementById('favList').innerHTML = (userFavorites[uid]||[]).map(id => {
        const a = archiveData.find(x => x.id === id);
        return a ? `<div onclick="switchPanel('archive'); document.getElementById('archiveSearchInput').value='${id}'; renderArchiveList();">${a.id} ${a.title}</div>` : '';
    }).join('') || '暂无收藏';
    document.getElementById('historyList').innerHTML = (userHistory[uid]||[]).slice(0,10).map(id => {
        const a = archiveData.find(x => x.id === id);
        return a ? `<div onclick="switchPanel('archive'); document.getElementById('archiveSearchInput').value='${id}'; renderArchiveList();">${a.id} ${a.title}</div>` : '';
    }).join('') || '暂无记录';
}

// 管理面板
function renderAdminList() {
    document.getElementById('adminList').innerHTML = archiveData.map(a => `
        <div class="admin-item">
            <span class="admin-item-id">${a.id}</span>
            <span class="admin-item-title">${a.title}</span>
            <small style="color:#666;">[${a.category}]</small>
            <button onclick="editArchive('${a.id}')" style="background:transparent;border:1px solid #555;color:#aaa;cursor:pointer;">编辑</button>
        </div>`).join('');
}
let editingId = null;
window.editArchive = function(id) {
    const item = archiveData.find(a => a.id === id);
    if (!item) return;
    editingId = id;
    document.getElementById('editId').value = item.id;
    document.getElementById('editTitle').value = item.title;
    document.getElementById('editCategory').value = item.category;
    document.getElementById('editTags').value = item.tags.join(', ');
    document.getElementById('editSummary').value = item.summary;
    document.getElementById('editContent').value = item.content;
    document.getElementById('modalTitle').textContent = '编辑: ' + id;
    document.getElementById('editModal').style.display = 'flex';
};
function saveEdit() {
    const newData = {
        id: document.getElementById('editId').value.trim(),
        title: document.getElementById('editTitle').value.trim(),
        category: document.getElementById('editCategory').value,
        tags: document.getElementById('editTags').value.split(',').map(s=>s.trim()).filter(s=>s),
        summary: document.getElementById('editSummary').value.trim(),
        content: document.getElementById('editContent').value.trim()
    };
    if(!newData.id||!newData.title) return alert('编号和标题必填');
    if(editingId) { const idx = archiveData.findIndex(a=>a.id===editingId); if(idx>-1) archiveData[idx]=newData; }
    else archiveData.push(newData);
    safeSet('xuju_archive', archiveData);
    document.getElementById('editModal').style.display='none';
    renderAdminList(); renderArchiveList(); updateProfilePanel();
}
function deleteArchive() {
    if(!editingId||!confirm('永久删除？')) return;
    archiveData = archiveData.filter(a=>a.id!==editingId);
    safeSet('xuju_archive', archiveData);
    document.getElementById('editModal').style.display='none';
    renderAdminList(); renderArchiveList();
}
function setupEditorEvents() {
    document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
    document.getElementById('deleteArchiveBtn').addEventListener('click', deleteArchive);
    document.getElementById('closeModalBtn').addEventListener('click', ()=>document.getElementById('editModal').style.display='none');
    document.getElementById('addNewArchiveBtn').addEventListener('click', ()=>{
        editingId=null;
        ['editId','editTitle','editTags','editSummary','editContent'].forEach(f=>document.getElementById(f).value='');
        document.getElementById('editCategory').value='世界观';
        document.getElementById('modalTitle').textContent='新增档案';
        document.getElementById('editModal').style.display='flex';
    });
    document.getElementById('resetDefaultBtn').addEventListener('click', ()=>{
        if(confirm('重置所有档案？')) { archiveData = JSON.parse(JSON.stringify(DEFAULT_ARCHIVES)); safeSet('xuju_archive', archiveData); renderAdminList(); renderArchiveList(); }
    });
    document.getElementById('insertImageBtn').addEventListener('click', ()=>{
        const url = prompt('图片链接：'); if(url) document.getElementById('editContent').value += `<img src="${url}" style="max-width:200px;">`;
    });
    const dropZone = document.getElementById('imageDropZone');
    const contentTA = document.getElementById('editContent');
    ['dragenter','dragover'].forEach(ev=>dropZone.addEventListener(ev, e=>{ e.preventDefault(); dropZone.classList.add('dragover'); }));
    ['dragleave','drop'].forEach(ev=>dropZone.addEventListener(ev, e=>{ e.preventDefault(); dropZone.classList.remove('dragover'); }));
    dropZone.addEventListener('drop', e=>{
        [...e.dataTransfer.files].forEach(file=>{
            if(!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = ev => contentTA.value += `<img src="${ev.target.result}" style="max-width:200px;">`;
            reader.readAsDataURL(file);
        });
    });
}

// 环境效果
function setupAudio() {
    const audio = document.getElementById('bgAudio');
    if (DEFAULT_AUDIO_SRC) {
        document.getElementById('audioSource').src = DEFAULT_AUDIO_SRC;
        audio.load();
        audio.volume = 0.3;
        // 尝试自动播放（如果被拦截，用户点击按钮时也能播）
        audio.muted = true; // 先静音
        audio.play().then(() => {
            audio.muted = false; // 播放成功后再取消静音
            document.getElementById('audioIndicator').textContent = '🔊';
        }).catch(() => {
            audio.muted = false;
        });
    }
    document.getElementById('audioToggleBtn').addEventListener('click', ()=>{
        if(audio.paused){
            audio.muted = false;
            audio.play().then(() => {
                document.getElementById('audioToggleBtn').textContent='暂停';
                document.getElementById('audioIndicator').textContent='🔊';
            }).catch(err => console.log('播放失败', err));
        } else {
            audio.pause();
            document.getElementById('audioToggleBtn').textContent='播放';
            document.getElementById('audioIndicator').textContent='🔇';
        }
    });
    document.getElementById('volumeSlider').addEventListener('input', e => {
        audio.volume = e.target.value/100;
        audio.muted = false;
    });
}
function startRain() {
    const canvas = document.getElementById('rainCanvas');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const drops = Array.from({length:300}, ()=>({x:Math.random()*canvas.width, y:Math.random()*canvas.height, speed:6+Math.random()*10, len:10+Math.random()*15}));
    function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.strokeStyle='rgba(180,190,200,0.6)'; ctx.lineWidth=1;
        ctx.beginPath();
        drops.forEach(d=>{ ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-1,d.y+d.len); d.y+=d.speed; if(d.y>canvas.height){ d.y=-10; d.x=Math.random()*canvas.width; } });
        ctx.stroke();
        requestAnimationFrame(draw);
    }
    draw();
}
function startTypewriter() {
    const el = document.getElementById('typewriterText');
    const msg = "欢迎回来，操作员。认知污染监测正常。";
    el.textContent = ''; let i=0;
    const t = setInterval(() => { if(i<msg.length) el.textContent += msg.charAt(i++); else clearInterval(t); }, 70);
}
setInterval(()=>{
    const flash = document.getElementById('glitchFlash');
    if(Math.random()<0.04){ flash.style.background='rgba(255,0,0,0.06)'; setTimeout(()=>flash.style.background='transparent',120); }
},2500);

// ============ 初始渲染 ============
try {
    renderPostList();
} catch(e) {
    console.error('论坛渲染失败:', e);
}m => {
        const card = document.createElement('div');
        card.className = 'archive-card';
        card.innerHTML = `
            <div class="card-header"><span class="card-id">${item.id}</span><span class="card-category">${item.category}</span></div>
            <div class="card-title">${item.title}</div>
            <div class="card-summary">${item.summary}</div>
            <div class="card-actions"><button class="fav-btn" data-id="${item.id}">⭐ 收藏</button><button class="view-detail-btn">📄 查看详情</button></div>`;
        card.querySelector('.view-detail-btn').addEventListener('click', e => { e.stopPropagation(); openArchiveDetail(item); });
        card.addEventListener('click', () => openArchiveDetail(item));
        card.querySelector('.fav-btn').addEventListener('click', e => { e.stopPropagation(); toggleFavorite(item.id); renderArchiveList(); });
        list.appendChild(card);
    });
}
function openArchiveDetail(item) {
    addHistory(item.id);
    const modal = document.getElementById('archiveDetailModal');
    const content = document.getElementById('archiveDetailContent');
    content.innerHTML = `
        <div class="archive-detail-header"><h2>${item.title}</h2><span class="archive-detail-category">${item.category}</span></div>
        <div class="archive-detail-body">${item.content}</div>`;
    modal.style.display = 'flex';
}
document.getElementById('closeArchiveDetailBtn').addEventListener('click', () => {
    document.getElementById('archiveDetailModal').style.display = 'none';
});
document.getElementById('archiveDetailModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
});
function addHistory(id) {
    if (!currentUser) return;
    const uid = currentUser.id;
    userHistory[uid] = [id, ...userHistory[uid].filter(x => x !== id)].slice(0, 20);
    safeSet('xuju_history', userHistory);
}
function toggleFavorite(id) {
    if (!currentUser) return;
    const uid = currentUser.id;
    if (!userFavorites[uid]) userFavorites[uid] = [];
    const idx = userFavorites[uid].indexOf(id);
    idx > -1 ? userFavorites[uid].splice(idx, 1) : userFavorites[uid].push(id);
    safeSet('xuju_favs', userFavorites);
}

// 灵犀通讯
function renderLingshi() {
    const msgs = lingshiMessages[currentChannel] || [];
    const container = document.getElementById('lingshiMessages');
    if (container) container.innerHTML = msgs.map(m => `<div class="lingshi-msg"><div class="lingshi-msg-user">${m.user} · ${m.time}</div><div class="lingshi-msg-text">${m.text}</div></div>`).join('');
    const nameEl = document.getElementById('currentChannelName');
    if (nameEl) nameEl.textContent = '#' + (currentChannel === 'main' ? '总局频道' : currentChannel === 'club' ? '民俗社五人' : currentChannel === 'operation' ? '外勤行动' : '档案室');
    document.querySelectorAll('.channel-btn').forEach(b => b.classList.toggle('active', b.dataset.channel === currentChannel));
}
document.querySelectorAll('.channel-btn').forEach(btn => btn.addEventListener('click', () => { currentChannel = btn.dataset.channel; renderLingshi(); }));
document.getElementById('lingshiSendBtn').addEventListener('click', () => {
    const input = document.getElementById('lingshiInput');
    const text = input.value.trim();
    if (!text || !currentUser) return;
    if (!lingshiMessages[currentChannel]) lingshiMessages[currentChannel] = [];
    lingshiMessages[currentChannel].push({ user: currentUser.name, text, time: new Date().toLocaleString('zh-CN') });
    safeSet('xuju_lingshi', lingshiMessages);
    renderLingshi();
    input.value = '';
});
document.getElementById('lingshiInput').addEventListener('keypress', e => { if(e.key==='Enter') document.getElementById('lingshiSendBtn').click(); });

// 司内议室
function renderInternalPosts() {
    const list = document.getElementById('internalPostList');
    list.innerHTML = internalPosts.slice().reverse().map(p => `
        <div class="internal-post-item" data-id="${p.id}">
            <div class="internal-post-title">${p.title}</div>
            <div class="internal-post-meta">${p.author} · ${p.timestamp} · ${(p.comments||[]).length}回复</div>
        </div>`).join('');
    document.querySelectorAll('.internal-post-item').forEach(el => el.addEventListener('click', () => showInternalPostDetail(el.dataset.id)));
}
function showInternalPostDetail(id) {
    const post = internalPosts.find(p => p.id === id);
    if (!post) return;
    document.getElementById('internalPostList').style.display = 'none';
    const detail = document.getElementById('internalPostDetail');
    detail.style.display = 'block';
    detail.dataset.currentId = id;
    document.getElementById('internalPostContent').innerHTML = `
        <h3 style="color:#ddd;">${post.title}</h3>
        <div style="color:#777;font-size:0.8rem;margin:10px 0;">${post.author} · ${post.timestamp}</div>
        <div style="color:#ccc;line-height:1.7;white-space:pre-wrap;">${post.content}</div>
        <hr style="border-color:#333;margin:20px 0;">
        <h4 style="color:#aaa;">回复</h4>
        ${(post.comments||[]).map(c => `<div style="margin:8px 0;"><span style="color:var(--gold);font-size:0.8rem;">${c.user} · ${c.time}</span><br><span style="color:#ccc;">${c.text}</span></div>`).join('')}`;
}
document.getElementById('internalBackBtn').addEventListener('click', () => {
    document.getElementById('internalPostDetail').style.display = 'none';
    document.getElementById('internalPostList').style.display = 'grid';
    renderInternalPosts();
});
document.getElementById('internalNewPostBtn').addEventListener('click', () => {
    const title = prompt('帖子标题：');
    if (!title) return;
    const content = prompt('帖子内容：');
    if (!content) return;
    internalPosts.push({ id:'ip'+Date.now(), title, content, author: currentUser ? currentUser.name : '匿名', timestamp:new Date().toLocaleString('zh-CN'), comments:[] });
    safeSet('xuju_internal_posts', internalPosts);
    renderInternalPosts();
});
document.getElementById('internalCommentBtn').addEventListener('click', () => {
    const text = document.getElementById('internalCommentInput').value.trim();
    if (!text) return;
    const postId = document.getElementById('internalPostDetail').dataset.currentId;
    const post = internalPosts.find(p => p.id === postId);
    if (!post) return;
    post.comments = post.comments || [];
    post.comments.push({ user: currentUser ? currentUser.name : '匿名', text, time:new Date().toLocaleString('zh-CN') });
    safeSet('xuju_internal_posts', internalPosts);
    showInternalPostDetail(postId);
    document.getElementById('internalCommentInput').value = '';
});

// 悬赏榜
function renderMissions() {
    document.getElementById('missionsList').innerHTML = missions.map(m => `
        <div class="mission-item risk-${m.risk}">
            <div class="mission-title">${m.title}</div>
            <div class="mission-meta"><span>风险: ${m.risk}</span><span>状态: ${m.status}</span><span>截止: ${m.deadline}</span></div>
            <div class="mission-desc">${m.desc}</div>
        </div>`).join('');
}

// 个人主页
function updateProfilePanel() {
    if (!currentUser) return;
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileId').textContent = currentUser.id;
    document.getElementById('loginCount').textContent = userLoginCounts[currentUser.id] || 0;
    document.getElementById('profileRole').textContent = currentUser.isAdmin ? '管理员' : '访客';
    document.getElementById('profileAvatar').textContent = currentUser.name.charAt(0);
    const uid = currentUser.id;
    document.getElementById('favList').innerHTML = (userFavorites[uid]||[]).map(id => {
        const a = archiveData.find(x => x.id === id);
        return a ? `<div onclick="switchPanel('archive'); document.getElementById('archiveSearchInput').value='${id}'; renderArchiveList();">${a.id} ${a.title}</div>` : '';
    }).join('') || '暂无收藏';
    document.getElementById('historyList').innerHTML = (userHistory[uid]||[]).slice(0,10).map(id => {
        const a = archiveData.find(x => x.id === id);
        return a ? `<div onclick="switchPanel('archive'); document.getElementById('archiveSearchInput').value='${id}'; renderArchiveList();">${a.id} ${a.title}</div>` : '';
    }).join('') || '暂无记录';
}

// 管理面板
function renderAdminList() {
    document.getElementById('adminList').innerHTML = archiveData.map(a => `
        <div class="admin-item">
            <span class="admin-item-id">${a.id}</span>
            <span class="admin-item-title">${a.title}</span>
            <small style="color:#666;">[${a.category}]</small>
            <button onclick="editArchive('${a.id}')" style="background:transparent;border:1px solid #555;color:#aaa;cursor:pointer;">编辑</button>
        </div>`).join('');
}
let editingId = null;
window.editArchive = function(id) {
    const item = archiveData.find(a => a.id === id);
    if (!item) return;
    editingId = id;
    document.getElementById('editId').value = item.id;
    document.getElementById('editTitle').value = item.title;
    document.getElementById('editCategory').value = item.category;
    document.getElementById('editTags').value = item.tags.join(', ');
    document.getElementById('editSummary').value = item.summary;
    document.getElementById('editContent').value = item.content;
    document.getElementById('modalTitle').textContent = '编辑: ' + id;
    document.getElementById('editModal').style.display = 'flex';
};
function saveEdit() {
    const newData = {
        id: document.getElementById('editId').value.trim(),
        title: document.getElementById('editTitle').value.trim(),
        category: document.getElementById('editCategory').value,
        tags: document.getElementById('editTags').value.split(',').map(s=>s.trim()).filter(s=>s),
        summary: document.getElementById('editSummary').value.trim(),
        content: document.getElementById('editContent').value.trim()
    };
    if(!newData.id||!newData.title) return alert('编号和标题必填');
    if(editingId) { const idx = archiveData.findIndex(a=>a.id===editingId); if(idx>-1) archiveData[idx]=newData; }
    else archiveData.push(newData);
    safeSet('xuju_archive', archiveData);
    document.getElementById('editModal').style.display='none';
    renderAdminList(); renderArchiveList(); updateProfilePanel();
}
function deleteArchive() {
    if(!editingId||!confirm('永久删除？')) return;
    archiveData = archiveData.filter(a=>a.id!==editingId);
    safeSet('xuju_archive', archiveData);
    document.getElementById('editModal').style.display='none';
    renderAdminList(); renderArchiveList();
}
function setupEditorEvents() {
    document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
    document.getElementById('deleteArchiveBtn').addEventListener('click', deleteArchive);
    document.getElementById('closeModalBtn').addEventListener('click', ()=>document.getElementById('editModal').style.display='none');
    document.getElementById('addNewArchiveBtn').addEventListener('click', ()=>{
        editingId=null;
        ['editId','editTitle','editTags','editSummary','editContent'].forEach(f=>document.getElementById(f).value='');
        document.getElementById('editCategory').value='世界观';
        document.getElementById('modalTitle').textContent='新增档案';
        document.getElementById('editModal').style.display='flex';
    });
    document.getElementById('resetDefaultBtn').addEventListener('click', ()=>{
        if(confirm('重置所有档案？')) { archiveData = JSON.parse(JSON.stringify(DEFAULT_ARCHIVES)); safeSet('xuju_archive', archiveData); renderAdminList(); renderArchiveList(); }
    });
    document.getElementById('insertImageBtn').addEventListener('click', ()=>{
        const url = prompt('图片链接：'); if(url) document.getElementById('editContent').value += `<img src="${url}" style="max-width:200px;">`;
    });
    const dropZone = document.getElementById('imageDropZone');
    const contentTA = document.getElementById('editContent');
    ['dragenter','dragover'].forEach(ev=>dropZone.addEventListener(ev, e=>{ e.preventDefault(); dropZone.classList.add('dragover'); }));
    ['dragleave','drop'].forEach(ev=>dropZone.addEventListener(ev, e=>{ e.preventDefault(); dropZone.classList.remove('dragover'); }));
    dropZone.addEventListener('drop', e=>{
        [...e.dataTransfer.files].forEach(file=>{
            if(!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = ev => contentTA.value += `<img src="${ev.target.result}" style="max-width:200px;">`;
            reader.readAsDataURL(file);
        });
    });
}

// 环境效果
function setupAudio() {
    const audio = document.getElementById('bgAudio');
    if (DEFAULT_AUDIO_SRC) {
        document.getElementById('audioSource').src = DEFAULT_AUDIO_SRC;
        audio.load();
        audio.volume = 0.3;
        // 尝试自动播放（如果被拦截，用户点击按钮时也能播）
        audio.muted = true; // 先静音
        audio.play().then(() => {
            audio.muted = false; // 播放成功后再取消静音
            document.getElementById('audioIndicator').textContent = '🔊';
        }).catch(() => {
            audio.muted = false;
        });
    }
    document.getElementById('audioToggleBtn').addEventListener('click', ()=>{
        if(audio.paused){
            audio.muted = false;
            audio.play().then(() => {
                document.getElementById('audioToggleBtn').textContent='暂停';
                document.getElementById('audioIndicator').textContent='🔊';
            }).catch(err => console.log('播放失败', err));
        } else {
            audio.pause();
            document.getElementById('audioToggleBtn').textContent='播放';
            document.getElementById('audioIndicator').textContent='🔇';
        }
    });
    document.getElementById('volumeSlider').addEventListener('input', e => {
        audio.volume = e.target.value/100;
        audio.muted = false;
    });
}
function startRain() {
    const canvas = document.getElementById('rainCanvas');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const drops = Array.from({length:300}, ()=>({x:Math.random()*canvas.width, y:Math.random()*canvas.height, speed:6+Math.random()*10, len:10+Math.random()*15}));
    function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.strokeStyle='rgba(180,190,200,0.6)'; ctx.lineWidth=1;
        ctx.beginPath();
        drops.forEach(d=>{ ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-1,d.y+d.len); d.y+=d.speed; if(d.y>canvas.height){ d.y=-10; d.x=Math.random()*canvas.width; } });
        ctx.stroke();
        requestAnimationFrame(draw);
    }
    draw();
}
function startTypewriter() {
    const el = document.getElementById('typewriterText');
    const msg = "欢迎回来，操作员。认知污染监测正常。";
    el.textContent = ''; let i=0;
    const t = setInterval(() => { if(i<msg.length) el.textContent += msg.charAt(i++); else clearInterval(t); }, 70);
}
setInterval(()=>{
    const flash = document.getElementById('glitchFlash');
    if(Math.random()<0.04){ flash.style.background='rgba(255,0,0,0.06)'; setTimeout(()=>flash.style.background='transparent',120); }
},2500);

// ============ 初始渲染 ============
try {
    renderPostList();
} catch(e) {
    console.error('论坛渲染失败:', e);
}
