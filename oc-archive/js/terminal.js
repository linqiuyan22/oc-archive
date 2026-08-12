let archiveData = [];
let currentPanel = 'home', activeCategory = 'all';

function loadArchive() {
    const saved = localStorage.getItem('xuju_archive');
    archiveData = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_ARCHIVES));
    saveArchive();
}
function saveArchive() { localStorage.setItem('xuju_archive', JSON.stringify(archiveData)); }

function switchPanel(name) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(name+'Panel').classList.add('active');
    document.querySelectorAll('.nav-btn[data-panel]').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.nav-btn[data-panel="${name}"]`);
    if (btn) btn.classList.add('active');
    currentPanel = name;
    if (name === 'archive') renderArchiveList();
    if (name === 'admin') renderAdminList();
    if (name === 'profile') updateProfilePanel();
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
    userHistory[uid] = [id, ...userHistory[uid].filter(x => x !== id)].slice(0,20);
    localStorage.setItem('xuju_history', JSON.stringify(userHistory));
}
function toggleFavorite(id) {
    if (!currentUser) return;
    const uid = currentUser.id;
    if (!userFavorites[uid]) userFavorites[uid] = [];
    const idx = userFavorites[uid].indexOf(id);
    idx > -1 ? userFavorites[uid].splice(idx, 1) : userFavorites[uid].push(id);
    localStorage.setItem('xuju_favs', JSON.stringify(userFavorites));
}

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
};

function saveEdit() {
    const newData = {
        id: document.getElementById('editId').value.trim(),
        title: document.getElementById('editTitle').value.trim(),
        category: document.getElementById('editCategory').value,
        tags: document.getElementById('editTags').value.split(',').map(s => s.trim()).filter(s=>s),
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

function setupAudio() {
    const audio = document.getElementById('bgAudio');
    if(DEFAULT_AUDIO_SRC){
        document.getElementById('audioSource').src = DEFAULT_AUDIO_SRC;
        audio.load(); audio.volume=0.3; audio.play().catch(()=>{});
        document.getElementById('audioIndicator').textContent = '🔊';
    }
    document.getElementById('audioToggleBtn').addEventListener('click', ()=>{
        if(audio.paused){ audio.play(); document.getElementById('audioToggleBtn').textContent='暂停'; }
        else { audio.pause(); document.getElementById('audioToggleBtn').textContent='播放'; }
    });
    document.getElementById('volumeSlider').addEventListener('input', e=> audio.volume = e.target.value/100);
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

function setupImageDrop() {
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

function initTerminal() {
    loadArchive();
    bindTerminalNav();
    setupAudio();
    startRain();
    startTypewriter();
    setupImageDrop();

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
    switchPanel('home');
    updateProfilePanel();
}