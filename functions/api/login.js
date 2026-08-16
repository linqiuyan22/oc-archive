// functions/api/login.js
export async function onRequestPost(context) {
    try {
        // 1. 从请求中获取用户提交的数据
        const { username, password } = await context.request.json();

        // 2. 验证：用户名和密码不能为空
        if (!username || !password) {
            return new Response(JSON.stringify({
                success: false,
                error: '用户名和密码不能为空'
            }), { status: 400 });
        }

        // 3. 连接到KV存储
        const kv = context.env.USER_DB;

        // 4. 从KV中读取该用户存储的密码
        const storedPassword = await kv.get(username);

        // 5. 检查用户是否存在，以及密码是否正确
        if (!storedPassword || storedPassword !== password) {
            return new Response(JSON.stringify({
                success: false,
                error: '用户名或密码错误'
            }), { status: 401 });
        }

        // 6. 登录成功！这里可以生成一个会话（session）或token（令牌）
        //    为了简化，我们先只返回成功信息。
        return new Response(JSON.stringify({
            success: true,
            message: '登录成功！',
            username: username
        }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: '服务器错误，请稍后重试'
        }), { status: 500 });
    }
}