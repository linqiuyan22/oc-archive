// ====================== 全局配置 ======================
const ADMIN_ID = 'ADMIN-001';
const ADMIN_PASS = 'admin123';
// 在这里填入你的环境音效链接，留空则不自动播放
const DEFAULT_AUDIO_SRC = ''; // 例如: 'audio/rain_ambient.mp3'

// 默认档案数据（精简示例，你需要把完整数据补入）
const DEFAULT_ARCHIVE_DATA = [
    {
        id: "QYXH-2026-001", title: "墟化现象总纲·绝密节选", category: "世界观",
        tags: ["总纲", "墟化", "认知污染"],
        summary: "全域墟化现象管控总局核心纲领，界定墟化本质与防控原则。",
        content: `<p><span class="class-level">[绝密]</span> 档案编号：QYXH-2026-001</p>
        <p><strong>发布单位：</strong>全域墟化现象管控总局（墟管局）</p>
        <p><strong>总则：</strong>墟化是高维位面干涉现象，具备隐匿性、间歇性、随机性。</p>`
    },
    {
        id: "L-09-01-S", title: "苏晚眠·兔形锚点觉醒者", category: "人物",
        tags: ["苏晚眠", "兔形", "逢雨"],
        summary: "临川私立高中高二学生，兔形兽化锚点，收容物“逢雨”。",
        content: `<p><span class="class-level">[青级]</span> 档案编号：L-09-01-S</p>
        <p><strong>姓名：</strong>苏晚眠 | 17岁 | 女</p>
        <img src="https://via.placeholder.com/120x150/222/aaa?text=证件照" style="float:right; margin-left:15px;">
        <p><strong>锚点：</strong>兔形兽化 | 隐匿欺诈、近身穿刺爆发</p>
        <p><strong>收容物：</strong>LC-Q-037 “逢雨”（黑伞）</p>`
    }
    // 请在此处补充其余所有档案...
];

// ====================== 状态管理 ======================
let currentUser = null;
let currentPanel = 'home';
let archiveData = [];
let userFavorites = JSON.parse(localStorage.getItem('xuju_favs') || '{}');
let userHistory = JSON.parse(localStorage.getItem('xuju_history') || '{}');
let userLoginCounts = JSON.parse(localStorage.getItem('xuju_logincounts') || '{}');

function loadData() {
    const saved = localStorage.getItem('xuju_archive');
    archiveData = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_ARCHIVE_DATA));
    saveData();
}
function saveData() { localStorage.setItem('xuju_archive', JSON.stringify(archiveData)); }
function resetToDefault() {
    archiveData = JSON.parse(JSON.stringify(DEFAULT_ARCHIVE_DATA));
    saveData();
    renderAdminList();
    renderArchiveList();
}

// ====================== 用户登录 ======================
const loginContainer = document.getElementById('loginContainer');
const mainContainer = document.getElementById('mainContainer');
const loginError = document.getElementById('loginError');

function attemptLogin() {
    const id = document.getElementById('staffIdInput').value.trim();
    const pass = document.getElementById('passwordInput').value.trim();
    let user = null;
    if (id === ADMIN_ID && pass === ADMIN_PASS) user = { id, name: '系统管理员', isAdmin: true };
    else if (id === 'QYXH-GUEST' && pass === 'visitor') user = { id, name: '临时访客', isAdmin: false };
    else if (id === 'L-09-01-S' && pass === 'fengyu') user = { id, name: '苏晚眠（档案查阅）', isAdmin: false };
    else { loginError.textContent = '[!] 身份验证失败'; return; }

    currentUser = user;
    // 更新登录次数
    userLoginCounts[id] = (userLoginCounts[id] || 0) + 1;
    localStorage.setItem('xuju_logincounts', JSON.stringify(userLoginCounts));
    if (!userFavorites[id]) userFavorites[id] = [];
    if (!userHistory[id]) userHistory[id] = [];

    loginContainer.style.display = 'none';
    mainContainer.style.display = 'block';
    document.getElementById('topUsername').textContent = user.name;
    if (user.isAdmin) {
        document.getElementById('topAdminBadge').style.display = 'inline';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'inline-block');
    }
    switchPanel('home');
    updateProfilePanel();
    setupAudio();
    startTypewriter();
    startRain();
}

function logout() {
    currentUser = null;
    mainContainer.style.display = 'none';
    loginContainer.style.display = 'block';
    document.getElementById('staffIdInput').value = '';
    document.getElementById('passwordInput').value = '';
}

document.getElementById('loginBtn').addEventListener('click', attemptLogin);
document.getElementById('passwordInput').addEventListener('keypress', e => { if(e.key==='Enter') attemptLogin(); });
document.getElementById('logoutTopBtn').addEventListener('click', logout);

// ====================== 面板切换 ======================
const panels = {
    home: document.getElementById('homePanel'),
    archive: document.getElementById('archivePanel'),
    profile: document.getElementById('profilePanel'),
    admin: document.getElementById('adminPanel')
};
const navBtns = document.querySelectorAll('.nav-btn[data-panel]');

function switchPanel(name) {
    Object.values(panels).forEach(p => p.classList.remove('active'));
    panels[name].classList.add('active');
    navBtns.forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.nav-btn[data-panel="${name}"]`);
    if (btn) btn.classList.add('active');
    currentPanel = name;
    if (name === 'archive') renderArchiveList();
    if (name === 'admin') renderAdminList();
    if (name === 'profile') updateProfilePanel();
}

navBtns.forEach(btn => btn.addEventListener('click', () => switchPanel(btn.dataset.panel)));
document.querySelectorAll('.index-card').forEach(card => {
    card.addEventListener('click', () => {
        const cat = card.dataset.cat;
        const tab = document.querySelector(`.cat-tab[data-category="${cat}"]`);
        if (tab) tab.click();
        switchPanel('archive');
    });
});

// ====================== 环境音效 ======================
function setupAudio() {
    const audio = document.getElementById('bgAudio');
    const btn = document.getElementById('audioToggleBtn');
    const slider = document.getElementById('volumeSlider');
    const indicator = document.getElementById('audioIndicator');
    if (DEFAULT_AUDIO_SRC) {
        document.getElementById('audioSource').src = DEFAULT_AUDIO_SRC;
        audio.load();
        audio.volume = slider.value / 100;
        audio.play().catch(() => {});
        indicator.textContent = '🔊';
    }
    btn.addEventListener('click', () => {
        if (audio.paused) {
            audio.play();
            btn.textContent = '暂停';
            indicator.textContent = '🔊';
        } else {
            audio.pause();
            btn.textContent = '播放';
            indicator.textContent = '🔇';
        }
    });
    slider.addEventListener('input', () => {
        audio.volume = slider.value / 100;
    });
}

// ====================== 下雨效果 ======================
function startRain() {
    const canvas = document.getElementById('rainCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const drops = [];
    for (let i = 0; i < 300; i++) {
        drops.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speed: 6 + Math.random() * 10,
            len: 10 + Math.random() * 15
        });
    }
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(180, 190, 200, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let d of drops) {
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x - 1, d.y + d.len);
            d.y += d.speed;
            if (d.y > canvas.height) {
                d.y = -10;
                d.x = Math.random() * canvas.width;
            }
        }
        ctx.stroke();
        requestAnimationFrame(draw);
    }
    draw();
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// 打字机效果
function startTypewriter() {
    const el = document.getElementById('typewriterText');
    const msg = "欢迎回来，操作员。认知污染监测正常。";
    el.textContent = '';
    let i = 0;
    const timer = setInterval(() => {
        if (i < msg.length) { el.textContent += msg.charAt(i); i++; }
        else clearInterval(timer);
    }, 70);
}

// 随机故障效果
setInterval(() => {
    const flash = document.getElementById('glitchFlash');
    if (Math.random() < 0.04) {
        flash.style.background = 'rgba(255,0,0,0.06)';
        setTimeout(() => flash.style.background = 'transparent', 120);
    }
}, 2500);

// ====================== 档案检索 ======================
let activeCategory = 'all';
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
    if (!filtered.length) {
        list.innerHTML = '<div class="archive-card" style="text-align:center;color:#ff3333;">[!] 未检索到档案</div>';
        return;
    }
    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'archive-card';
        card.innerHTML = `
            <div class="card-header"><span class="card-id">${item.id}</span><span class="card-category">${item.category}</span></div>
            <div class="card-title">${item.title}</div>
            <div class="card-summary">${item.summary}</div>
            <div class="card-detail">${item.content}</div>
            <div class="card-actions">
                <button class="fav-btn" data-id="${item.id}">⭐ 收藏</button>
                <button class="view-btn">展开/收起</button>
            </div>
        `;
        card.querySelector('.view-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            card.querySelector('.card-detail').classList.toggle('active');
            addHistory(item.id);
        });
        card.querySelector('.fav-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(item.id);
            renderArchiveList(); // 刷新按钮状态
        });
        list.appendChild(card);
    });
}

function addHistory(archiveId) {
    if (!currentUser) return;
    const uid = currentUser.id;
    userHistory[uid] = [archiveId, ...userHistory[uid].filter(id => id !== archiveId)].slice(0, 20);
    localStorage.setItem('xuju_history', JSON.stringify(userHistory));
    if (currentPanel === 'profile') updateProfilePanel();
}

function toggleFavorite(archiveId) {
    if (!currentUser) return;
    const uid = currentUser.id;
    if (!userFavorites[uid]) userFavorites[uid] = [];
    const idx = userFavorites[uid].indexOf(archiveId);
    idx > -1 ? userFavorites[uid].splice(idx, 1) : userFavorites[uid].push(archiveId);
    localStorage.setItem('xuju_favs', JSON.stringify(userFavorites));
    if (currentPanel === 'profile') updateProfilePanel();
}

// ====================== 个人主页 ======================
function updateProfilePanel() {
    if (!currentUser) return;
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileId').textContent = currentUser.id;
    document.getElementById('loginCount').textContent = userLoginCounts[currentUser.id] || 0;
    document.getElementById('profileRole').textContent = currentUser.isAdmin ? '管理员' : '访客';
    document.getElementById('profileAvatar').textContent = currentUser.name.charAt(0);

    const uid = currentUser.id;
    const favList = document.getElementById('favList');
    const favs = userFavorites[uid] || [];
    favList.innerHTML = favs.length ? favs.map(id => {
        const item = archiveData.find(a => a.id === id);
        return item ? `<div class="fav-item" onclick="switchPanel('archive'); document.getElementById('archiveSearchInput').value='${id}'; renderArchiveList();">${item.id} ${item.title}</div>` : '';
    }).join('') : '暂无收藏';

    const histList = document.getElementById('historyList');
    const hist = (userHistory[uid] || []).slice(0, 10);
    histList.innerHTML = hist.length ? hist.map(id => {
        const item = archiveData.find(a => a.id === id);
        return item ? `<div class="history-item" onclick="switchPanel('archive'); document.getElementById('archiveSearchInput').value='${id}'; renderArchiveList();">${item.id} ${item.title}</div>` : '';
    }).join('') : '暂无记录';
}

// ====================== 管理面板 ======================
function renderAdminList() {
    const list = document.getElementById('adminList');
    list.innerHTML = archiveData.map((item, idx) => `
        <div class="admin-item">
            <span class="admin-item-id">${item.id}</span>
            <span class="admin-item-title">${item.title}</span>
            <small style="color:#666;">[${item.category}]</small>
            <div class="admin-item-actions">
                <button onclick="editArchive('${item.id}')">编辑</button>
            </div>
        </div>
    `).join('');
}

let editingId = null;
function editArchive(id) {
    const item = archiveData.find(a => a.id === id);
    if (!item) return;
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
        tags: document.getElementById('editTags').value.split(',').map(s => s.trim()).filter(s => s),
        summary: document.getElementById('editSummary').value.trim(),
        content: document.getElementById('editContent').value.trim()
    };
    if (!newData.id || !newData.title) return alert('编号和标题必填');
    if (editingId) {
        const idx = archiveData.findIndex(a => a.id === editingId);
        if (idx > -1) archiveData[idx] = newData;
    } else {
        archiveData.push(newData);
    }
    saveData();
    document.getElementById('editModal').style.display = 'none';
    renderAdminList();
    renderArchiveList();
    updateProfilePanel();
}

function deleteArchive() {
    if (!editingId || !confirm('永久删除此档案？')) return;
    archiveData = archiveData.filter(a => a.id !== editingId);
    saveData();
    document.getElementById('editModal').style.display = 'none';
    renderAdminList();
    renderArchiveList();
    updateProfilePanel();
}

document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
document.getElementById('deleteArchiveBtn').addEventListener('click', deleteArchive);
document.getElementById('closeModalBtn').addEventListener('click', () => document.getElementById('editModal').style.display = 'none');
document.getElementById('addNewArchiveBtn').addEventListener('click', () => {
    editingId = null;
    ['editId','editTitle','editTags','editSummary','editContent'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('editCategory').value = '世界观';
    document.getElementById('modalTitle').textContent = '新增档案';
    document.getElementById('editModal').style.display = 'flex';
});
document.getElementById('resetDefaultBtn').addEventListener('click', () => {
    if (confirm('重置为默认数据？所有修改将丢失。')) resetToDefault();
});
// 插入图片快捷按钮
document.getElementById('insertImageBtn').addEventListener('click', () => {
    const url = prompt('请输入图片链接（如 https://...）');
    if (url) {
        const contentArea = document.getElementById('editContent');
        const imgTag = `<img src="${url}" style="max-width:200px; margin:10px;">`;
        contentArea.value += imgTag;
    }
});

// ====================== 初始化 ======================
loadData();
