// 配置
const ADMIN_ID = 'ADMIN-001', ADMIN_PASS = 'admin123';
const DEFAULT_AUDIO_SRC = ''; // 你的环境音链接

// 默认论坛帖子
const DEFAULT_POSTS = [
    { id:'p1', title:'有人记得19年三院的事吗？', author:'匿名_4f3a', content:'今天路过老第三医院，突然心口发闷，脑子闪白影子。有没有人也有这种感觉？', timestamp:'2026-01-15 23:41', comments:[
        { user:'匿名_9b2c', text:'别问了，集体癔症。我妈根本不记得。', time:'2026-01-15 23:55' },
        { user:'匿名_7d1e', text:'我有城西老宅子的手抄规则，私我。', time:'2026-01-16 00:12' }
    ]},
    { id:'p2', title:'夜班出租司机的怪事', author:'匿名_12ab', content:'拉了个人，下车时人不见了，车门没开，钱是真钞。', timestamp:'2026-01-14 02:15', comments:[
        { user:'匿名_5f6g', text:'老哥别再跑那片了。', time:'2026-01-14 09:30' }
    ]}
];
// 默认档案（请补全你的数据）
const DEFAULT_ARCHIVES = [
    { id:"QYXH-2026-001", title:"墟化现象总纲·绝密节选", category:"世界观", tags:["总纲"], summary:"总局核心纲领", content:"<p><strong>总则：</strong>墟化是高维位面干涉现象。</p>" },
    { id:"L-09-01-S", title:"苏晚眠·兔形锚点觉醒者", category:"人物", tags:["苏晚眠"], summary:"兔形锚点，收容物逢雨。", content:"<p>姓名：苏晚眠 | 17岁 | 女</p><img src='https://via.placeholder.com/100x130/222/aaa?text=证件照' style='float:right;'>" }
];

// ========== 状态 ==========
let forumPosts = JSON.parse(localStorage.getItem('darkalley_posts')) || DEFAULT_POSTS;
let archiveData = [];
let currentUser = null;
let userFavorites = JSON.parse(localStorage.getItem('xuju_favs') || '{}');
let userHistory = JSON.parse(localStorage.getItem('xuju_history') || '{}');
let userLoginCounts = JSON.parse(localStorage.getItem('xuju_logincounts') || '{}');
let currentPanel = 'home', activeCategory = 'all';

// 初始化
function loadArchive() {
    const saved = localStorage.getItem('xuju_archive');
    archiveData = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_ARCHIVES));
    saveArchive();
}
function saveArchive() { localStorage.setItem('xuju_archive', JSON.stringify(archiveData)); }
function savePosts() { localStorage.setItem('darkalley_posts', JSON.stringify(forumPosts)); }
loadArchive();

// ========== 论坛逻辑 ==========
const forumContainer = document.getElementById('forumContainer');
const terminalContainer = document.getElementById('terminalContainer');
const awakenModal = document.getElementById('awakenModal');

function renderPostList() {
    const list = document.getElementById('postList');
    list.innerHTML = forumPosts.slice().reverse().map(p => `
        <div class="post-item" data-id="${p.id}">
            <span class="post-title">${p.title}</span>
            <span class="post-meta"><span>${p.author}</span><span>${p.comments.length}回复</span><span>${p.timestamp}</span></span>
        </div>
    `).join('');
    document.querySelectorAll('.post-item').forEach(el => {
        el.addEventListener('click', () => showPostDetail(el.dataset.id));
    });
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
        <div class="post-detail-body">${post.content}</div>
    `;
    renderComments(post);
}
function renderComments(post) {
    document.getElementById('commentList').innerHTML = post.comments.map(c => `
        <div class="comment-item"><div class="comment-meta">${c.user} · ${c.time}</div><div>${c.text}</div></div>
    `).join('');
}
function backToList() {
    document.getElementById('postDetailView').style.display = 'none';
    document.getElementById('newPostForm').style.display = 'none';
    document.getElementById('postListView').style.display = 'block';
}
document.getElementById('backToListBtn').addEventListener('click', backToList);
document.getElementById('cancelNewPostBtn').addEventListener('click', backToList);
document.getElementById('forumHomeLink').addEventListener('click', e => { e.preventDefault(); backToList(); });
document.getElementById('forumNewPostLink').addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('postListView').style.display = 'none';
    document.getElementById('postDetailView').style.display = 'none';
    document.getElementById('newPostForm').style.display = 'block';
});
document.getElementById('submitNewPostBtn').addEventListener('click', () => {
    const title = document.getElementById('newPostTitle').value.trim();
    const content = document.getElementById('newPostContent').value.trim();
    if (!title || !content) return alert('请填写标题和内容');
    forumPosts.push({
        id: 'p' + Date.now(),
        title, content,
        author: '匿名_' + Math.floor(Math.random()*0xffff).toString(16),
        timestamp: new Date().toLocaleString('zh-CN'),
        comments: []
    });
    savePosts();
    document.getElementById('newPostTitle').value = '';
    document.getElementById('newPostContent').value = '';
    backToList();
    renderPostList();
});
document.getElementById('submitCommentBtn').addEventListener('click', () => {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text) return;
    const postId = document.getElementById('postDetailView').dataset.currentId;
    const post = forumPosts.find(p => p.id === postId);
    if (!post) return;
    post.comments.push({
        user: '匿名_' + Math.floor(Math.random()*0xffff).toString(16),
        text,
        time: new Date().toLocaleString('zh-CN')
    });
    savePosts();
    renderComments(post);
    input.value = '';
});

// 觉醒者入口
document.getElementById('awakenEntryBtn').addEventListener('click', () => awakenModal.style.display = 'flex');
document.getElementById('closeAwakenModalBtn').addEventListener('click', () => awakenModal.style.display = 'none');

// ========== 登录与终端切换 ==========
function attemptLogin() {
    const id = document.getElementById('staffIdInput').value.trim();
    const pass = document.getElementById('passwordInput').value.trim();
    let user = null;
    if (id === ADMIN_ID && pass === ADMIN_PASS) user = { id, name:'系统管理员', isAdmin:true };
    else if (id === 'QYXH-GUEST' && pass === 'visitor') user = { id, name:'临时访客', isAdmin:false };
    else if (id === 'L-09-01-S' && pass === 'fengyu') user = { id, name:'苏晚眠', isAdmin:false };
    else { document.getElementById('loginError').textContent = '[!] 验证失败'; return; }

    currentUser = user;
    userLoginCounts[id] = (userLoginCounts[id]||0)+1;
    localStorage.setItem('xuju_logincounts', JSON.stringify(userLoginCounts));
    if (!userFavorites[id]) userFavorites[id] = [];
    if (!userHistory[id]) userHistory[id] = [];

    forumContainer.style.display = 'none';
    awakenModal.style.display = 'none';
    terminalContainer.style.display = 'block';
    document.getElementById('rainCanvas').style.display = 'block';
    document.getElementById('topUsername').textContent = user.name;
    if (user.isAdmin) {
        document.getElementById('topAdminBadge').style.display = 'inline';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'inline-block');
    }
    startRain();
    startTypewriter();
    setupAudio();
    switchPanel('home');
    updateProfilePanel();
}
function logoutTerminal() {
    currentUser = null;
    terminalContainer.style.display = 'none';
    document.getElementById('rainCanvas').style.display = 'none';
    forumContainer.style.display = 'block';
}
document.getElementById('loginBtn').addEventListener('click', attemptLogin);
document.getElementById('passwordInput').addEventListener('keypress', e => { if(e.key==='Enter') attemptLogin(); });
document.getElementById('logoutTopBtn').addEventListener('click', logoutTerminal);

// ========== 终端功能 ==========
function switchPanel(name) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(name+'Panel').classList.add('active');
    document.querySelectorAll('.nav-btn[data-panel]').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.nav-btn[data-panel="${name}"]`);
    if (btn) btn.classList.add('active');
    if (name === 'archive') renderArchiveList();
    if (name === 'admin') renderAdminList();
    if (name === 'profile') updateProfilePanel();
}
document.querySelectorAll('.nav-btn[data-panel]').forEach(b => b.addEventListener('click', () => switchPanel(b.dataset.panel)));
document.querySelectorAll('.index-card').forEach(card => {
    card.addEventListener('click', () => {
        const cat = card.dataset.cat;
        const tab = document.querySelector(`.cat-tab[data-category="${cat}"]`);
        if (tab) { tab.click(); switchPanel('archive'); }
    });
});

// 音频
function setupAudio() {
    const audio = document.getElementById('bgAudio');
    const btn = document.getElementById('audioToggleBtn');
    const slider = document.getElementById('volumeSlider');
    const ind = document.getElementById('audioIndicator');
    if (DEFAULT_AUDIO_SRC) {
        document.getElementById('audioSource').src = DEFAULT_AUDIO_SRC;
        audio.load(); audio.volume = 0.3; audio.play().catch(()=>{});
        ind.textContent = '🔊';
    }
    btn.addEventListener('click', () => {
        if (audio.paused) { audio.play(); btn.textContent='暂停'; ind.textContent='🔊'; }
        else { audio.pause(); btn.textContent='播放'; ind.textContent='🔇'; }
    });
    slider.addEventListener('input', () => audio.volume = slider.value/100);
}

// 雨滴
function startRain() {
    const canvas = document.getElementById('rainCanvas');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const drops = Array.from({length:300}, () => ({ x:Math.random()*canvas.width, y:Math.random()*canvas.height, speed:6+Math.random()*10, len:10+Math.random()*15 }));
    function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.strokeStyle = 'rgba(180,190,200,0.6)'; ctx.lineWidth = 1;
        ctx.beginPath();
        drops.forEach(d => { ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-1,d.y+d.len); d.y+=d.speed; if(d.y>canvas.height){ d.y=-10; d.x=Math.random()*canvas.width; } });
        ctx.stroke();
        requestAnimationFrame(draw);
    }
    draw();
}

// 打字机
function startTypewriter() {
    const el = document.getElementById('typewriterText');
    const msg = "欢迎回来，操作员。认知污染监测正常。";
    el.textContent = ''; let i=0;
    const t = setInterval(() => { if(i<msg.length) el.textContent += msg.charAt(i++); else clearInterval(t); },70);
}

// 故障闪烁
setInterval(() => {
    const flash = document.getElementById('glitchFlash');
    if (Math.random()<0.04) { flash.style.background='rgba(255,0,0,0.06)'; setTimeout(()=>flash.style.background='transparent',120); }
},2500);

// 档案检索
document.querySelectorAll('.cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeCategory = tab.dataset.category;
        renderArchiveList();
    });
});
document.getElementById('archiveSearchInput').addEventListener('input', renderArchiveList);
function renderArchiveList() {
    const keyword = document.getElementById('archiveSearchInput').value.trim().toLowerCase();
    let filtered = archiveData;
    if (activeCategory !== 'all') filtered = filtered.filter(i => i.category === activeCategory);
    if (keyword) filtered = filtered.filter(i => (i.id+i.title+i.tags.join(' ')+i.summary+i.content).toLowerCase().includes(keyword));
    const list = document.getElementById('archiveList');
    list.innerHTML = '';
    if (!filtered.length) { list.innerHTML = '<div class="archive-card" style="text-align:center;color:#ff3333;">[!] 无结果</div>'; return; }
    filtered.forEach(item => {
        const card = document.createElement('div'); card.className = 'archive-card';
        card.innerHTML = `<div class="card-header"><span class="card-id">${item.id}</span><span class="card-category">${item.category}</span></div>
            <div class="card-title">${item.title}</div><div class="card-summary">${item.summary}</div>
            <div class="card-detail">${item.content}</div>
            <div class="card-actions"><button class="fav-btn" data-id="${item.id}">⭐ 收藏</button><button class="view-btn">展开/收起</button></div>`;
        card.querySelector('.view-btn').addEventListener('click', (e) => { e.stopPropagation(); card.querySelector('.card-detail').classList.toggle('active'); addHistory(item.id); });
        card.querySelector('.fav-btn').addEventListener('click', (e) => { e.stopPropagation(); toggleFavorite(item.id); renderArchiveList(); });
        list.appendChild(card);
    });
}
function addHistory(id) {
    if (!currentUser) return;
    const uid = currentUser.id;
    userHistory[uid] = [id, ...userHistory[uid].filter(x=>x!==id)].slice(0,20);
    localStorage.setItem('xuju_history', JSON.stringify(userHistory));
}
function toggleFavorite(id) {
    if (!currentUser) return;
    const uid = currentUser.id;
    if (!userFavorites[uid]) userFavorites[uid] = [];
    const idx = userFavorites[uid].indexOf(id);
    idx>-1 ? userFavorites[uid].splice(idx,1) : userFavorites[uid].push(id);
    localStorage.setItem('xuju_favs', JSON.stringify(userFavorites));
}

// 个人主页
function updateProfilePanel() {
    if (!currentUser) return;
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileId').textContent = currentUser.id;
    document.getElementById('loginCount').textContent = userLoginCounts[currentUser.id]||0;
    document.getElementById('profileRole').textContent = currentUser.isAdmin?'管理员':'访客';
    document.getElementById('profileAvatar').textContent = currentUser.name.charAt(0);
    const uid = currentUser.id;
    document.getElementById('favList').innerHTML = (userFavorites[uid]||[]).map(id => { const a = archiveData.find(x=>x.id===id); return a?`<div onclick="switchPanel('archive'); document.getElementById('archiveSearchInput').value='${id}'; renderArchiveList();">${a.id} ${a.title}</div>`:''; }).join('')||'暂无';
    document.getElementById('historyList').innerHTML = (userHistory[uid]||[]).slice(0,10).map(id => { const a = archiveData.find(x=>x.id===id); return a?`<div onclick="switchPanel('archive'); document.getElementById('archiveSearchInput').value='${id}'; renderArchiveList();">${a.id} ${a.title}</div>`:''; }).join('')||'暂无';
}

// 管理面板
function renderAdminList() {
    document.getElementById('adminList').innerHTML = archiveData.map(a => `
        <div class="admin-item"><span class="admin-item-id">${a.id}</span><span class="admin-item-title">${a.title}</span><small style="color:#666;">[${a.category}]</small>
        <button onclick="editArchive('${a.id}')" style="background:transparent;border:1px solid #555;color:#aaa;cursor:pointer;">编辑</button></div>
    `).join('');
}
let editingId = null;
function editArchive(id) {
    const item = archiveData.find(a => a.id === id); if(!item) return;
    editingId = id;
    document.getElementById('editId').value = item.id;
    document.getElementById('editTitle').value = item.title;
    document.getElementById('editCategory').value = item.category;
    document.getElementById('editTags').value = item.tags.join(', ');
    document.getElementById('editSummary').value = item.summary;
    document.getElementById('editContent').value = item.content;
    document.getElementById('modalTitle').textContent = `编辑: ${id}`;
    document.getElementById('editModal').style.display = 'flex';
}
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
    saveArchive();
    document.getElementById('editModal').style.display='none';
    renderAdminList(); renderArchiveList(); updateProfilePanel();
}
function deleteArchive() {
    if(!editingId||!confirm('永久删除？')) return;
    archiveData = archiveData.filter(a=>a.id!==editingId);
    saveArchive();
    document.getElementById('editModal').style.display='none';
    renderAdminList(); renderArchiveList();
}
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
    if(confirm('重置所有档案？')) { archiveData = JSON.parse(JSON.stringify(DEFAULT_ARCHIVES)); saveArchive(); renderAdminList(); renderArchiveList(); }
});
document.getElementById('insertImageBtn').addEventListener('click', ()=>{
    const url = prompt('图片链接：'); if(url) document.getElementById('editContent').value += `<img src="${url}" style="max-width:200px;">`;
});
// 拖拽上传图片
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

// 初始渲染论坛
renderPostList();
