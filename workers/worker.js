// ============================================================
//  暗巷 · 账号服务 Worker（Cloudflare Workers + KV）
//  部署：Cloudflare Dashboard → Workers → 创建 Worker →
//        粘贴本文件全部代码 → 绑定 KV namespace（变量名 HUAXU_KV）→ 部署
//  绑定名必须是 HUAXU_KV（对应你创建的 KV namespace 5b2abdd4...）
// ============================================================

// ---------- 配置（部署后可自行修改） ----------
const INVITE_CODE = 'HX-2026';          // 注册邀请码（服务端校验，无法被前端绕过）
const ADMIN_USERNAME = 'HUAXU';         // 管理员账号（首次登录自动播种）
const ADMIN_PASSWORD = 'hx1234';        // 管理员密码
const TOKEN_TTL_MS = 7 * 24 * 3600 * 1000; // 会话有效期：7 天

// 员工扮演可选名单（与服务端注册页 STAFF_OPTIONS 一致）
const STAFF_OPTIONS = {
  'L-09-01-S': '苏晚眠',
  'L-09-02-C': '沈绛离',
  'L-09-03-X': '谢逢虚',
  'L-09-04-W': '温泣语',
  'L-09-05-L': '陆烬弦'
};

const USER_PREFIX = 'user:';
const SESSION_PREFIX = 'token:';

// ---------- CORS（前端在 Cloudflare Pages / GitHub Pages / 本地 file 都允许） ----------
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/register' && request.method === 'POST') return await handleRegister(request, env);
      if (path === '/api/login' && request.method === 'POST') return await handleLogin(request, env);
      if (path === '/api/logout' && request.method === 'POST') return await handleLogout(request, env);
      if (path === '/api/me' && request.method === 'GET') return await handleMe(request, env);
      if (path === '/api/health') return json({ ok: true, serverTime: Date.now() });
      return json({ error: 'Not found' }, 404);
    } catch (e) {
      return json({ error: '服务器错误: ' + (e && e.message ? e.message : e) }, 500);
    }
  }
};

// ---------- 工具 ----------
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

function bytesToHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
function randomHex(bytes) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return bytesToHex(a);
}

// 密码哈希：PBKDF2-SHA256，10 万次迭代 + 随机盐（服务端从不存明文）
async function hashPassword(pass, saltHex) {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return bytesToHex(bits);
}

// 创建会话 token（存 KV，带过期）
async function createSession(env, username) {
  const token = randomHex(32);
  await env.HUAXU_KV.put(SESSION_PREFIX + token, JSON.stringify({
    username,
    expires: Date.now() + TOKEN_TTL_MS
  }), { expirationTtl: Math.ceil(TOKEN_TTL_MS / 1000) });
  return token;
}

// 去掉敏感字段，返回给前端的用户对象
function publicUser(u) {
  return {
    username: u.username,
    type: u.type,
    staffId: u.staffId,
    roleName: u.roleName,
    avatar: u.avatar,
    isAdmin: !!u.isAdmin,
    createdAt: u.createdAt
  };
}

// 从请求里取 token（Authorization: Bearer 或 ?token=）
function getToken(request, url) {
  const auth = request.headers.get('Authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return (url && url.searchParams.get('token')) || '';
}

async function readSession(request, env, url) {
  const token = getToken(request, url);
  if (!token) return null;
  const raw = await env.HUAXU_KV.get(SESSION_PREFIX + token);
  if (!raw) return null;
  const sess = JSON.parse(raw);
  if (Date.now() > sess.expires) {
    await env.HUAXU_KV.delete(SESSION_PREFIX + token);
    return null;
  }
  return { token, sess };
}

// ---------- 注册 ----------
async function handleRegister(request, env) {
  const body = await request.json().catch(() => ({}));
  const uname = (body.username || '').trim();
  const pwd = (body.pass || '').trim();

  if (body.invite !== INVITE_CODE) return json({ error: '[!] 邀请码无效' }, 400);
  if (!uname || uname.length < 2) return json({ error: '[!] 用户名至少 2 个字符' }, 400);
  if (!pwd || pwd.length < 4) return json({ error: '[!] 密码至少 4 位' }, 400);
  if (uname === ADMIN_USERNAME) return json({ error: '[!] 用户名已被占用' }, 409);

  const existing = await env.HUAXU_KV.get(USER_PREFIX + uname);
  if (existing) return json({ error: '[!] 用户名已被占用' }, 409);

  const roleType = body.roleType === 'staff' ? 'staff' : 'custom';
  let staffId = null, roleName = uname, avatar = null;
  if (roleType === 'staff') {
    if (!STAFF_OPTIONS[body.staffId]) return json({ error: '[!] 员工编号无效' }, 400);
    staffId = body.staffId;
    roleName = STAFF_OPTIONS[staffId];
  } else {
    roleName = (body.roleName || '').trim() || uname;
    avatar = (body.avatar || '').trim() || '🙂';
  }

  const salt = randomHex(16);
  const passHash = await hashPassword(pwd, salt);
  const user = {
    username: uname, passHash, salt,
    type: roleType, staffId, roleName, avatar,
    isAdmin: false, createdAt: Date.now()
  };
  await env.HUAXU_KV.put(USER_PREFIX + uname, JSON.stringify(user));

  // 注册即登录：发 token
  const token = await createSession(env, uname);
  return json({ ok: true, user: publicUser(user), token });
}

// ---------- 登录 ----------
async function handleLogin(request, env) {
  const body = await request.json().catch(() => ({}));
  const uname = (body.username || '').trim();
  const pwd = (body.pass || '').trim();
  if (!uname || !pwd) return json({ error: '[!] 用户名或密码错误' }, 401);

  let user = null;

  // 管理员首次登录自动播种（KV 里没有 HUAXU 时）
  if (uname === ADMIN_USERNAME) {
    const existing = await env.HUAXU_KV.get(USER_PREFIX + uname);
    if (!existing) {
      if (pwd !== ADMIN_PASSWORD) return json({ error: '[!] 用户名或密码错误' }, 401);
      const salt = randomHex(16);
      const passHash = await hashPassword(pwd, salt);
      user = {
        username: uname, passHash, salt,
        type: 'staff', staffId: uname, roleName: '系统管理员', avatar: null,
        isAdmin: true, createdAt: Date.now()
      };
      await env.HUAXU_KV.put(USER_PREFIX + uname, JSON.stringify(user));
    }
  }

  if (!user) {
    const raw = await env.HUAXU_KV.get(USER_PREFIX + uname);
    if (!raw) return json({ error: '[!] 用户名或密码错误' }, 401);
    const u = JSON.parse(raw);
    const hash = await hashPassword(pwd, u.salt);
    if (hash !== u.passHash) return json({ error: '[!] 用户名或密码错误' }, 401);
    user = u;
  }

  const token = await createSession(env, uname);
  return json({ ok: true, user: publicUser(user), token });
}

// ---------- 当前用户 ----------
async function handleMe(request, env) {
  const url = new URL(request.url);
  const sess = await readSession(request, env, url);
  if (!sess) return json({ error: '未登录或会话已过期' }, 401);
  const raw = await env.HUAXU_KV.get(USER_PREFIX + sess.sess.username);
  if (!raw) return json({ error: '用户不存在' }, 401);
  return json({ ok: true, user: publicUser(JSON.parse(raw)) });
}

// ---------- 退出 ----------
async function handleLogout(request, env) {
  const url = new URL(request.url);
  const sess = await readSession(request, env, url);
  if (sess) await env.HUAXU_KV.delete(SESSION_PREFIX + sess.token);
  return json({ ok: true });
}
