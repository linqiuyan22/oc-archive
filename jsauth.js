// 认证相关
const VALID_USERS = {
    'ADMIN-001': { pass: 'admin123', name: '系统管理员', isAdmin: true },
    'QYXH-GUEST': { pass: 'visitor', name: '临时访客', isAdmin: false },
    'L-09-01-S': { pass: 'fengyu', name: '苏晚眠', isAdmin: false }
};

let currentUser = null;
let userFavorites = JSON.parse(localStorage.getItem('xuju_favs') || '{}');
let userHistory = JSON.parse(localStorage.getItem('xuju_history') || '{}');
let userLoginCounts = JSON.parse(localStorage.getItem('xuju_logincounts') || '{}');

function attemptLogin() {
    const id = document.getElementById('staffIdInput').value.trim();
    const pass = document.getElementById('passwordInput').value.trim();
    const userInfo = VALID_USERS[id];
    if (!userInfo || userInfo.pass !== pass) {
        document.getElementById('loginError').textContent = '[!] 身份验证失败';
        return false;
    }

    currentUser = { id, name: userInfo.name, isAdmin: userInfo.isAdmin };
    userLoginCounts[id] = (userLoginCounts[id] || 0) + 1;
    localStorage.setItem('xuju_logincounts', JSON.stringify(userLoginCounts));
    if (!userFavorites[id]) userFavorites[id] = [];
    if (!userHistory[id]) userHistory[id] = [];

    // 隐藏论坛与登录弹窗，显示终端
    document.getElementById('forumContainer').style.display = 'none';
    document.getElementById('awakenModal').style.display = 'none';
    document.getElementById('terminalContainer').style.display = 'block';
    document.getElementById('rainCanvas').style.display = 'block';

    document.getElementById('topUsername').textContent = currentUser.name;
    if (currentUser.isAdmin) {
        document.getElementById('topAdminBadge').style.display = 'inline';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'inline-block');
    }
    return true;
}

function logoutTerminal() {
    currentUser = null;
    document.getElementById('terminalContainer').style.display = 'none';
    document.getElementById('rainCanvas').style.display = 'none';
    document.getElementById('forumContainer').style.display = 'block';
    // 重置登录表单
    document.getElementById('staffIdInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('loginError').textContent = '';
}

// 绑定登录事件
document.getElementById('loginBtn').addEventListener('click', () => {
    if (attemptLogin()) {
        // 启动终端初始化（在terminal.js中定义）
        initTerminal();
    }
});
document.getElementById('passwordInput').addEventListener('keypress', e => {
    if (e.key === 'Enter' && attemptLogin()) initTerminal();
});
document.getElementById('logoutTopBtn').addEventListener('click', logoutTerminal);

// 觉醒者入口（齿轮）
document.getElementById('awakenEntry').addEventListener('click', () => {
    document.getElementById('awakenModal').style.display = 'flex';
    document.getElementById('staffIdInput').focus();
});
document.getElementById('closeAwakenModalBtn').addEventListener('click', () => {
    document.getElementById('awakenModal').style.display = 'none';
});