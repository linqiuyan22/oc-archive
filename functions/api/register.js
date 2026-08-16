// functions/api/register.js
export async function onRequestPost(context) {
    try {
        // 1. 从请求中获取用户提交的数据
        const { username, password } = await context.request.json();

        // 2. 简单验证：用户名和密码不能为空
        if (!username || !password) {
            return new Response(JSON.stringify({
                success: false,
                error: '用户名和密码不能为空'
            }), { status: 400 });
        }

        // 3. 连接到你的KV存储 (这就是你之前创建的USER_DB)
        const kv = context.env.USER_DB;

        // 4. 检查用户名是否已被注册
        const existingUser = await kv.get(username);
        if (existingUser) {
            return new Response(JSON.stringify({
                success: false,
                error: '用户名已被占用'
            }), { status: 400 });
        }

        // 5. 【重要】存储用户数据。
        //    注意：这里为了演示直接存了明文密码。
        //    实际项目必须用bcrypt等库加密！
        await kv.put(username, password);

        // 6. 返回注册成功的信息
        return new Response(JSON.stringify({
            success: true,
            message: '注册成功！'
        }), { status: 200 });

    } catch (error) {
        // 如果发生错误，返回错误信息
        return new Response(JSON.stringify({
            success: false,
            error: '服务器错误，请稍后重试'
        }), { status: 500 });
    }
}