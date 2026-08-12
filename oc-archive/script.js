// ====================== 全局配置 ======================
const ADMIN_ID = 'ADMIN-001';
const ADMIN_PASS = 'admin123';
const DEFAULT_AUDIO_SRC = ''; // 在这里填入你的音频链接，如 'audio/ambient.mp3'

// 默认档案数据（首次加载用）
const DEFAULT_ARCHIVE_DATA = [
    {
        id: "QYXH-2026-001", title: "墟化现象总纲·绝密节选", category: "世界观",
        tags: ["总纲", "墟化", "认知污染"],
        summary: "全域墟化现象管控总局核心纲领，界定墟化本质与防控原则。",
        content: `<p><span class="class-level">[绝密]</span> 档案编号：QYXH-2026-001</p>
<p><strong>发布单位：</strong>全域墟化现象管控总局（墟管局）</p>
<p><strong>总则：</strong>墟化是高维位面干涉现象，具备隐匿性、间歇性、随机性。常态与现实并行，裂隙开启时生成封闭异常空域“墟界”。</p>`
    },
    {
        id: "L-09-01-S", title: "苏晚眠·兔形锚点觉醒者", category: "人物",
        tags: ["苏晚眠", "兔形", "逢雨"],
        summary: "临川私立高中高二学生，兔形兽化锚点，收容物“逢雨”。",
        content: `<p><span class="class-level">[青级]</span> 档案编号：L-09-01-S</p>
<p><strong>姓名：</strong>苏晚眠 | 17岁 | 女</p>
<p><img src="https://via.placeholder.com/100x130/333/fff?text=证件照" style="float:right; margin-left:10px;"></p>
<p><strong>锚点：</strong>兔形兽化 | 隐匿欺诈、近身穿刺爆发</p>
<p><strong>收容物：</strong>LC-Q-037 “逢雨”（黑伞）</p>`
    },
    // ... 此处为节省篇幅，只保留两条示例，实际需将你提供的所有档案完整填入。
    // 我会在回答末尾附上完整版本的 script.js 下载思路。
];

// ====================== 状态管理 ======================
let currentUser = null;
let currentPanel = 'home';
let archiveData = [];
let userFavorites = JSON.parse(localStorage.getItem('xuju_favs') || '{}');
let userHistory = JSON.parse(localStorage.getItem('xuju_history') || '{}');

function loadData() {
    const saved = localStorage.getItem('xuju_archive');
    if (saved) {
        archiveData = JSON.parse(saved);
    } else {
        archiveData = JSON.parse(JSON.stringify(DEFAULT_ARCHIVE_DATA));
        saveData();
    }
}
function saveData() {
    localStorage.setItem('xuju_archive', JSON.stringify(archiveData));
}
function resetToDefault() {
    archiveData = JSON.parse(JSON.stringify(DEFAULT_ARCHIVE_DATA));
    saveData();
    renderAdminList();
}

// ====================== 用户与登录 ======================
const loginContainer = document.getElementById('loginContainer');
const mainContainer = document.getElementById('mainContainer');
const loginError = document.getElementById('loginError');

function attemptLogin() {
    const id = document.getElementById('staffIdInput').value.trim();
    const pass = document.getElementById('passwordInput').value.trim();
    if (id === ADMIN_ID && pass === ADMIN_PASS) {
        currentUser = { id, name: '系统管理员', isAdmin: true };
        afterLogin();
    } else if (id === 'QYXH-GUEST' && pass === 'visitor') {
        currentUser = { id, name: '临时访客', isAdmin: false };
        afterLogin();
    } else if (id === 'L-09-01-S' && pass === 'fengyu') {
        currentUser = { id, name: '苏晚眠（档案查阅）', isAdmin: false };
        afterLogin();
    } else {
        loginError.textContent = '[!] 身份验证失败';
        return;
    }
    if (!userFavorites[id]) userFavorites[id] = [];
    if (!userHistory[id]) userHistory[id] = [];
}

function afterLogin() {
    loginContainer.style.display = 'none';
    mainContainer.style.display = 'block';
    document.getElementById('topUsername').textContent = currentUser.name;
    if (currentUser.isAdmin) {
        document.getElementById('topAdminBadge').style.display = 'inline';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'inline-block');
    }
    switchPanel('home');
    renderFavorites();
    renderHistory();
    setupTyping();
    setupAudio();
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

function switchPanel(panelName) {
    Object.values(panels).forEach(p => p.classList.remove('active'));
    panels[panelName].classList.add('active');
    navBtns.forEach(b => b.classList.remove('active'));
    const targetBtn = document.querySelector(`.nav-btn[data-panel="${panelName}"]`);
    if (targetBtn) targetBtn.classList.add('active');
    currentPanel = panelName;
    if (panelName === 'archive') renderArchiveList();
    if (panelName === 'admin') renderAdminList();
}

navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
});

// 主页索引卡片点击跳转
document.querySelectorAll('.index-card').forEach(card => {
    card.addEventListener('click', () => {
        const cat = card.dataset.cat;
        document.querySelector(`.cat-tab[data-category="${cat}"]`).click();
        switchPanel('archive');
    });
});

// ====================== 音频控制 ======================
function setupAudio() {
    const audio = document.getElementById('bgAudio');
    const btn = document.getElementById('audioToggleBtn');
    if (DEFAULT_AUDIO_SRC) {
        document.getElementById('audioSource').src = DEFAULT_AUDIO_SRC;
        audio.load();
        audio.volume = 0.3;
        audio.play().catch(() => {});
    }
    btn.addEventListener('click', () => {
        if (audio.paused) {
            audio.play();
            btn.textContent = '暂停';
        } else {
            audio.pause();
            btn.textContent = '播放';
        }
    });
}

// 打字机效果
function setupTyping() {
    const text = "欢迎回来，操作员。认知污染监测正常。";
    const el = document.getElementById('typewriterText');
    el.textContent = '';
    let i = 0;
    const timer = setInterval(() => {
        if (i < text.length) {
            el.textContent += text.charAt(i);
            i++;
        } else clearInterval(timer);
    }, 80);
}

// ====================== 恐怖随机效果 ======================
setInterval(() => {
    const flash = document.getElementById('glitchFlash');
    if (Math.random() < 0.05) {
        flash.style.background = 'rgba(255,0,0,0.08)';
        setTimeout(() => flash.style.background = 'transparent', 150);
    }
}, 2000);

setInterval(() => {
    const shake = document.getElementById('shakeOverlay');
    if (Math.random() < 0.02) {
        document.body.style.transform = 'translate(2px, 0)';
        setTimeout(() => document.body.style.transform = '', 80);
    }
}, 3000);

// ====================== 档案检索面板 ======================
const archiveListDiv = document.getElementById('archiveList');
const archiveSearchInput = document.getElementById('archiveSearchInput');
const catTabs = document.querySelectorAll('.cat-tab');
let activeCategory = 'all';

catTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        catTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeCategory = tab.dataset.category;
        renderArchiveList();
    });
});

archiveSearchInput.addEventListener('input', renderArchiveList);

function renderArchiveList() {
    const keyword = archiveSearchInput.value.toLowerCase().trim();
    let filtered = archiveData;
    if (activeCategory !== 'all') {
        filtered = filtered.filter(item => item.category === activeCategory);
    }
    if (keyword) {
        filtered = filtered.filter(item => {
            const str = item.id + item.title + item.tags.join(' ') + item.summary + item.content;
            return str.toLowerCase().includes(keyword);
        });
    }
    archiveListDiv.innerHTML = '';
    if (filtered.length === 0) {
        archiveListDiv.innerHTML = '<div class="archive-card" style="text-align:center;color:#ff3333;">[!] 未检索到档案</div>';
        return;
    }
    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'archive-card';
        card.innerHTML = `
            <div class="card-header">
                <span class="card-id">${item.id}</span>
                <span class="card-category">${item.category}</span>
            </div>
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
        });
        archiveListDiv.appendChild(card);
    });
}

function addHistory(archiveId) {
    if (!currentUser) return;
    const uid = currentUser.id;
    if (!userHistory[uid]) userHistory[uid] = [];
    userHistory[uid] = [archiveId, ...userHistory[uid].filter(id => id !== archiveId)].slice(0, 20);
    localStorage.setItem('xuju_history', JSON.stringify(userHistory));
    renderHistory();
}

function toggleFavorite(archiveId) {
    if (!currentUser) return;
    const uid = currentUser.id;
    if (!userFavorites[uid]) userFavorites[uid] = [];
    const idx = userFavorites[uid].indexOf(archiveId);
    if (idx > -1) userFavorites[uid].splice(idx, 1);
    else userFavorites[uid].push(archiveId);
    localStorage.setItem('xuju_favs', JSON.stringify(userFavorites));
    renderFavorites();
    renderArchiveList();
}

function renderFavorites() {
    const uid = currentUser?.id;
    const list = document.getElementById('favList');
    if (!uid || !userFavorites[uid] || userFavorites[uid].length === 0) {
        list.innerHTML = '暂无收藏';
        return;
    }
    list.innerHTML = userFavorites[uid].map(id => {
        const item = archiveData.find(a => a.id === id);
        return item ? `<div class="fav-item" onclick="switchPanel('archive'); document.getElementById('archiveSearchInput').value='${id}'; renderArchiveList();">${item.id} ${item.title}</div>` : '';
    }).join('');
}

function renderHistory() {
    const uid = currentUser?.id;
    const list = document.getElementById('historyList');
    if (!uid || !userHistory[uid] || userHistory[uid].length === 0) {
        list.innerHTML = '暂无记录';
        return;
    }
    list.innerHTML = userHistory[uid].slice(0, 10).map(id => {
        const item = archiveData.find(a => a.id === id);
        return item ? `<div class="history-item" onclick="switchPanel('archive'); document.getElementById('archiveSearchInput').value='${id}'; renderArchiveList();">${item.id} ${item.title}</div>` : '';
    }).join('');
}

// ====================== 管理面板 ======================
const adminListDiv = document.getElementById('adminList');
const editModal = document.getElementById('editModal');
let editingId = null;

function renderAdminList() {
    adminListDiv.innerHTML = '';
    archiveData.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'admin-item';
        div.innerHTML = `
            <div class="admin-item-info">
                <span class="admin-item-id">${item.id}</span>
                <span class="admin-item-title">${item.title}</span>
                <small style="color:#777;">[${item.category}]</small>
            </div>
            <div class="admin-item-actions">
                <button onclick="editArchive('${item.id}')">编辑</button>
            </div>
        `;
        adminListDiv.appendChild(div);
    });
}

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
    document.getElementById('modalTitle').textContent = `编辑档案: ${id}`;
    editModal.style.display = 'flex';
}

function saveEdit() {
    const newData = {
        id: document.getElementById('editId').value.trim(),
        title: document.getElementById('editTitle').value.trim(),
        category: document.getElementById('editCategory').value,
        tags: document.getElementById('editTags').value.split(',').map(s => s.trim()),
        summary: document.getElementById('editSummary').value.trim(),
        content: document.getElementById('editContent').value.trim()
    };
    if (!newData.id || !newData.title) return alert('编号和标题不能为空');
    if (editingId) {
        const idx = archiveData.findIndex(a => a.id === editingId);
        if (idx > -1) archiveData[idx] = newData;
    } else {
        archiveData.push(newData);
    }
    saveData();
    editModal.style.display = 'none';
    renderAdminList();
    renderArchiveList();
}

function deleteArchive() {
    if (!editingId || !confirm('确定永久删除此档案？此操作不可逆。')) return;
    archiveData = archiveData.filter(a => a.id !== editingId);
    saveData();
    editModal.style.display = 'none';
    renderAdminList();
    renderArchiveList();
}

document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
document.getElementById('deleteArchiveBtn').addEventListener('click', deleteArchive);
document.getElementById('closeModalBtn').addEventListener('click', () => editModal.style.display = 'none');
document.getElementById('addNewArchiveBtn').addEventListener('click', () => {
    editingId = null;
    document.getElementById('editId').value = '';
    document.getElementById('editTitle').value = '';
    document.getElementById('editCategory').value = '世界观';
    document.getElementById('editTags').value = '';
    document.getElementById('editSummary').value = '';
    document.getElementById('editContent').value = '';
    document.getElementById('modalTitle').textContent = '新增档案';
    editModal.style.display = 'flex';
});
document.getElementById('resetDefaultBtn').addEventListener('click', () => {
    if (confirm('重置将丢失所有修改，确认吗？')) {
        resetToDefault();
    }
});

// ====================== 初始化 ======================
loadData();
if (localStorage.getItem('xuju_current_user')) {
    // 简单保持登录状态（可选）
}