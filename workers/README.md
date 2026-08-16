# 暗巷 · 云端账号服务（Cloudflare Workers + D1 SQLite）

前端（Cloudflare Pages / 本地）发请求到本 Worker，用户注册 / 登录 / 会话全部存在 Cloudflare D1 数据库里，
不再只靠浏览器 localStorage —— 账号可以跨设备、跨浏览器共用。

> 已从 KV 方案改为 D1：建表逻辑写死在 `worker.js` 里，首次请求自动建表，无需手动跑 SQL。

## 一、部署 Worker（Cloudflare Dashboard 在线编辑器）

1. 打开 Cloudflare 控制台 → **Workers & Pages** → 左侧 **D1 SQLite Database** → **创建数据库** → 名字填 `huaxu-db` → 创建。
2. **Workers & Pages** → **创建应用程序** → **创建 Worker** → 给个名字（如 `huaxu-account`）。
3. 把 **`worker.js` 的全部代码** 粘贴进在线编辑器，替换默认模板。
4. 在 Worker 的「**设置 → 变量 → D1 database bindings**」里 **添加绑定**：
   - 变量名：`HUAXU_DB`（⚠️ 必须叫这个名字，代码里用的就是它）
   - 数据库：选刚创建的 `huaxu-db`
5. 点 **部署**。部署完成后记下你的 Worker 域名，形如：
   `https://huaxu-account.你的子域.workers.dev`
6. 可在 `worker.js` 顶部常量里改邀请码 / 管理员账号 / 密码，改完重新部署即可。

> 无需安装任何命令行工具，全程在网页里操作。

## 二、把前端接到云端

1. 打开 `js/script.js`，文件顶部找到：
   ```js
   const CLOUD_API_BASE_DEFAULT = '';   // 留空 = 纯本地模式
   ```
2. 把 Worker 域名填进去：
   ```js
   const CLOUD_API_BASE_DEFAULT = 'https://huaxu-account.你的子域.workers.dev';
   ```
3. 重新部署你的 Cloudflare Pages（或本地刷新）。

> 也可以不改代码：前端运行后在浏览器控制台执行
> `localStorage.setItem('darkalley_cloud_api', 'https://huaxu-account.你的子域.workers.dev')` 再刷新，
> 效果一样（此值优先级高于代码里的常量，方便以后换域名不用改代码）。

## 三、工作原理

| 端点 | 说明 |
|---|---|
| `POST /api/register` | 邀请码 + 用户名 + 密码 + 身份 → 建账号并自动登录，返回 token |
| `POST /api/login` | 用户名 + 密码 → 返回 token（管理员首次登录自动创建） |
| `GET /api/me` | 带 token 验证会话，返回当前用户信息 |
| `POST /api/logout` | 作废 token |
| `GET /api/health` | 健康检查 |

- **密码安全**：服务端用 PBKDF2-SHA256（10 万次迭代 + 随机盐）哈希，D1 里永不存明文。
- **会话**：登录返回随机 token（32 字节），存 D1 `sessions` 表并 7 天过期；前端保存在 `localStorage.darkalley_cloud_token`。
- **建表**：`users` / `sessions` 两张表由 Worker 首次请求自动创建（CREATE TABLE IF NOT EXISTS）。
- **邀请码 / 员工名单**：在 Worker 服务端校验，前端改代码绕过不了。
- **CORS**：已配置 `Access-Control-Allow-Origin: *`，前端在 Cloudflare Pages / GitHub Pages / 本地 `file://` 都能调。

## 四、前端行为（云端优先 / 本地兜底）

- 部署了 Worker（`CLOUD_API_BASE_DEFAULT` 非空）时：注册 / 登录 / 会话验证走云端。
- 若云端连不上（断网 / Worker 挂了）：自动回退到原来的 localStorage 本地账号，不影响浏览。
- 未部署（常量留空）：跟现在完全一样，纯本地。

## 五、验证是否部署成功

浏览器地址栏直接访问：
```
https://huaxu-account.你的子域.workers.dev/api/health
```
返回 `{"ok":true,"serverTime":...}` 即成功。
