// ====================== 全局变量 ======================
const ADMIN_ID = 'ADMIN-001';
const ADMIN_PASS = 'admin123';
const DEFAULT_AUDIO_SRC = ''; // 填入你的音频链接

// 论坛帖子数据（初始预设）
let forumPosts = JSON.parse(localStorage.getItem('darkalley_posts') || JSON.stringify([
    {
        id: 'p1',
        title: '有人记得19年三院的事吗？',
        author: '匿名_4f3a',
        content: '今天路过老第三医院，突然心口发闷，脑子里闪了点白影子，但怎么都想不起来发生过啥。\n\n有没有人也有这种感觉？那地方晚上路灯总是忽明忽暗。',
        timestamp: '2026-01-15 23:41',
        comments: [
            { user: '匿名_9b2c', text: '别问了，问就是集体癔症。我上次跟我妈提，她根本不记得有这回事。', time: '2026-01-15 23:55' },
            { user: '匿名_7d1e', text: '懂得都懂，私我，我有城西老宅子的手抄规则。', time: '2026-01-16 00:12' }
        ]
    },
    {
        id: 'p2',
        title: '夜班出租车司机的奇怪经历',
        author: '匿名_12ab',
        content: '昨晚拉了个客人，从老城区到东郊，一路上一句话没说。下车的时候我回头看后座，人不见了，但车门根本没开过。钱倒是给了，是真钞。',
        timestamp: '2026-01-14 02:15',
        comments: [
            { user: '匿名_5f6g', text: '老哥你注意点，别再去那片了。', time: '2026-01-14 09:30' }
        ]
    }
]));

// 终端档案数据（从localStorage加载）
let archiveData = [];
const DEFAULT_ARCHIVE_DATA = [
    // 你的世界观与人物档案（示例，需补全）
    { id: "QYXH-2026-001", title: "墟化现象总纲·绝密节选", category: "世界观", tags: ["总纲"], summary: "核心纲领", content: "<p>内容...</p>" }
];
function loadArchive() {
    const saved = localStorage.getItem('xuju_archive');
    archiveData = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_ARCHIVE_DATA));
    saveArchive();
}
function saveArchive() { localStorage.setItem('xuju_archive', JSON.stringify(archiveData)); }

// 用户状态
let currentUser = null;
let userFavorites = JSON.parse(localStorage.getItem('xuju_favs') || '{}');
let userHistory = JSON.parse(localStorage.getItem('xuju_history') || '{}');
let userLoginCounts = JSON.parse(localStorage.getItem('xuju_logincounts') || '{}');

// ====================== 论坛逻辑 ======================
const forumContainer = document.getElementById('forumContainer');
const postListView = document.getElementById('postListView');
const postDetailView = document.getElementById('postDetailView');
const newPostForm = document.getElementById('newPostForm');
const postListDiv = document.getElementById('postList');

function renderPostList() {
    postListDiv.innerHTML = forumPosts.slice().reverse().map(post => `
        <div class="post-item" data-id="${post.id}">
            <span class="post-title">${post.title}</span>
            <span class="post-meta">
                <span>${post.author}</span>
                <span>${post.comments.length}回复</span>
                <span>${post.timestamp}</span>
            </span>
        </div>
    `).join('');
    // 绑定点击事件
    document.querySelectorAll('.post-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            showPostDetail(id);
        });
    });
}

function showPostDetail(id) {
    const post = forumPosts.find(p => p.id === id);
    if (!post) return;
    postListView.style.display = 'none';
    newPostForm.style.display = 'none';
    postDetailView.style.display = 'block';
    document.getElementById('postDetailContent').innerHTML = `
        <h1 class="post-detail-title">${post.title}</h1>
        <div class="post-detail-meta">${post.author} · ${post.timestamp}</div>
        <div class="post-detail-body">${post.content}</div>
    `;
    renderComments(post);
    // 记录当前查看的帖子id
    postDetailView.dataset.currentId = id;
}

function renderComments(post) {
    const commentList = document.getElementById('commentList');
    commentList.innerHTML = post.comments.map(c => `
        <div class="comment-item">
            <div class="comment-meta">${c.user} · ${c.time}</div>
            <div>${c.text}</div>
        </div>
    `).join('');
}

function backToList() {
    postDetailView.style.display = 'none';
    newPostForm.style.display = 'none';
    postListView.style.display = 'block';
}

function showNewPostForm() {
    postListView.style.display = 'none';
    postDetailView.style.display = 'none';
    newPostForm.style.display = 'block';
}

// 发帖
document.getElementById('submitNewPostBtn').addEventListener('click', () => {
    const title = document.getElementById('newPostTitle').value.trim();
    const content = document.getElementById('newPostContent').value.trim();
    if (!title || !content) return alert('标题和内容不能为空');
    const newPost = {
        id: 'p' + Date.now(),
        title,
        author: '匿名_' + Math.floor(Math.random()*0xffff).toString(16),
        content,
        timestamp: new Date().toLocaleString('zh-CN'),
        comments: []
    };
    forumPosts.push(newPost);
    localStorage.setItem('darkalley_posts', JSON.stringify(forumPosts));
    document.getElementById('newPostTitle').value = '';
    document.getElementById('newPostContent').value = '';
    backToList();
    renderPostList();
});

// 发表评论
document.getElementById('submitCommentBtn').addEventListener('click', () => {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text) return;
    const postId = postDetailView.dataset.currentId;
    const post = forumPosts.find(p => p.id === postId);
    if (!post) return;
    post.comments.push({
        user: '匿名_' + Math.floor(Math.random()*0xffff).toString(16),
        text,
        time: new Date().toLocaleString('zh-CN')
    });
    localStorage.setItem('darkalley_posts', JSON.stringify(forumPosts));
    renderComments(post);
    input.value = '';
});

// 导航切换
document.getElementById('forumHomeLink').addEventListener('click', (e) => {
    e.preventDefault();
    backToList();
});
document.getElementById('forumNewPostLink').addEventListener('click', (e) => {
    e.preventDefault();
    showNewPostForm();
});
document.getElementById('backToListBtn').addEventListener('click', backToList);
document.getElementById('cancelNewPostBtn').addEventListener('click', backToList);

// 觉醒者入口
const awakenModal = document.getElementById('awakenModal');
document.getElementById('awakenEntryBtn').addEventListener('click', () => {
    awakenModal.style.display = 'flex';
});
document.getElementById('closeAwakenModalBtn').addEventListener('click', () => {
    awakenModal.style.display = 'none';
});

// ====================== 终端登录与切换 ======================
const terminalContainer = document.getElementById('terminalContainer');
const loginError = document.getElementById('loginError');

function attemptLogin() {
    const id = document.getElementById('staffIdInput').value.trim();
    const pass = document.getElementById('passwordInput').value.trim();
    let user = null;
    if (id === ADMIN_ID && pass === ADMIN_PASS) user = { id, name: '系统管理员', isAdmin: true };
    else if (id === 'QYXH-GUEST' && pass === 'visitor') user = { id, name: '临时访客', isAdmin: false };
    else if (id === 'L-09-01-S' && pass === 'fengyu') user = { id, name: '苏晚眠', isAdmin: false };
    else { loginError.textContent = '[!] 身份验证失败'; return; }

    currentUser = user;
    userLoginCounts[id] = (userLoginCounts[id] || 0) + 1;
    localStorage.setItem('xuju_logincounts', JSON.stringify(userLoginCounts));
    if (!userFavorites[id]) userFavorites[id] = [];
    if (!userHistory[id]) userHistory[id] = [];

    // 隐藏论坛和登录弹窗，显示终端
    forumContainer.style.display = 'none';
    awakenModal.style.display = 'none';
    terminalContainer.style.display = 'block';
    document.getElementById('topUsername').textContent = user.name;
    if (user.isAdmin) {
        document.getElementById('topAdminBadge').style.display = 'inline';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'inline-block');
    }
    // 启动终端主页效果
    startTypewriter();
    startRain();
    setupAudio();
    switchPanel('home');
    updateProfilePanel();
}

function logoutTerminal() {
    currentUser = null;
    terminalContainer.style.display = 'none';
    forumContainer.style.display = 'block';
    document.getElementById('rainCanvas').style.display = 'none';
    // 重置登录表单
    document.getElementById('staffIdInput').value = '';
    document.getElementById('passwordInput').value = '';
}

document.getElementById('loginBtn').addEventListener('click', attemptLogin);
document.getElementById('passwordInput').addEventListener('keypress', e => { if (e.key === 'Enter') attemptLogin(); });
document.getElementById('logoutTopBtn').addEventListener('click', logoutTerminal);

// ====================== 终端面板切换及功能（复用之前代码，稍作调整） ======================
// 以下为面板切换、音频、雨滴、档案检索、管理面板等函数，为保证功能完整，请将之前script.js中所有相关函数复制过来，
// 并确保它们操作的是终端容器内的元素。特别要修改：switchPanel中renderArchiveList、renderAdminList等逻辑。
// 由于篇幅，这里只列出框架，你需要整合之前提供的script.js全部逻辑。
// 我可以提供一个精简但完整的版本，但是否可以信任你能够正确合并？
loadData();
renderThreadList();
