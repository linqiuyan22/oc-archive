// ============ 暗巷论坛帖子（外部论坛） ============
const DEFAULT_POSTS = [
    { id:'p1', title:'有人记得19年三院的事吗？', author:'匿名_4f3a', content:'今天路过老第三医院，突然心口发闷，脑子里闪了点白影子，但怎么都想不起来发生过啥。\n\n有没有人也有这种感觉？那地方晚上路灯总是忽明忽暗。', timestamp:'2026-01-15 23:41', comments:[ { user:'匿名_9b2c', text:'别问了，问就是集体癔症。', time:'2026-01-15 23:55' } ] },
    { id:'p2', title:'夜班出租车司机的奇怪经历', author:'匿名_12ab', content:'昨晚拉了个客人，从老城区到东郊，一路上一句话没说。下车的时候我回头看后座，人不见了，但车门根本没开过。钱倒是给了，是真钞。', timestamp:'2026-01-14 02:15', comments:[ { user:'匿名_5f6g', text:'老哥你注意点，别再去那片了。', time:'2026-01-14 09:30' } ] },
    { id:'p3', title:'谁在我床底下放了一面镜子？', author:'匿名_9e7c', content:'前天晚上关灯后，听到床底下有东西在挠木板。拿手电一照，发现床板内侧贴着一面巴掌大的圆镜，镜面上蒙了一层黄符。\n\n我发誓那不是我的东西。', timestamp:'2026-01-12 01:04', comments:[ { user:'匿名_3a1b', text:'快扔了！别直接用手碰，用红布包着埋土里。', time:'2026-01-12 02:20' } ] },
    { id:'p4', title:'小时候村里的“过阴”仪式', author:'匿名_7b2a', content:'奶奶说她年轻时村里有个神婆能“过阴”，整个人躺在地上，头前面点一盏油灯。灯不灭，人就还在；灯一灭，就回不来了。\n\n有一次神婆下去之后，灯突然自己灭了，然后她又自己爬起来了，但再也不说话，只是哭。', timestamp:'2026-01-10 17:33', comments:[] },
    { id:'p5', title:'找到一本奇怪的手抄规则', author:'匿名_1f3e', content:'回老家整理旧屋，在奶奶的陪嫁箱子底层找到一本黄皮线装本，上面写的全是“规矩”：\n1. 晚上听见有人喊你全名，不要应，不要回头。\n2. 在巷子里遇到穿红鞋的人，闭眼往后退七步。\n3. 如果醒来发现自己在镜子前，记得先遮住镜面再开灯。', timestamp:'2026-01-08 22:47', comments:[ { user:'匿名_a9b8', text:'这是民间的“避煞”口诀。', time:'2026-01-09 09:10' } ] },
    { id:'p6', title:'关于城市里那些“不会亮灯”的楼', author:'匿名_3g5h', content:'我发现每个城市都有那么几栋楼，永远不亮灯，白天看很正常，但一到晚上就跟黑洞一样。\n\n我们单位对面就有一栋，我问同事那是什么，他愣了一下说“那栋楼一直没有人啊”。', timestamp:'2026-01-05 19:21', comments:[] }
];

// ============ 墟管局档案库 ============
// 添加新档案：在下面数组中复制一个对象块，修改字段即可。
const DEFAULT_ARCHIVES = [
    {
        id: "QYXH-2026-001",
        title: "墟化现象总纲·绝密节选",
        category: "世界观",
        tags: ["总纲","墟化","认知污染"],
        summary: "全域墟化现象管控总局核心纲领，界定墟化本质与防控原则。",
        content: `
        <div class="section-title">总则</div>
        <p>墟化是高维位面干涉现象，具备隐匿性、间歇性、随机性。常态下与现实维度并行不悖，裂隙开启时生成封闭异常空域“墟界”。</p>
        <div class="section-title">防控原则</div>
        <p>隐秘管控、分级处置、科学与玄学并行。</p>`
    },
    {
        id: "L-09-01-S",
        title: "苏晚眠·兔形锚点觉醒者",
        category: "人物",
        tags: ["苏晚眠","兔形","逢雨"],
        summary: "临川私立高中高二学生，兔形兽化锚点，收容物“逢雨”。",
        content: `
        <div class="section-title">基础信息</div>
        <p><strong>姓名：</strong>苏晚眠 | 17岁 | 女 | 6月3日生</p>
        <p><strong>身份：</strong>临川市私立高中高二文科班 / 民俗研究社团成员</p>
        <p><strong>锚点：</strong>兔形兽化锚点</p>
        <img src="images/苏晚眠.png" onerror="this.style.display='none'">
        <div class="section-title">能力评级</div>
        <p>隐匿欺诈 A- | 腿部近战爆发 A+ | 近身穿刺 A | 精神抗性 B+</p>
        <div class="section-title">收容物</div>
        <p><strong>LC-Q-037 “逢雨”</strong>（黑伞），青级近身攻防型。</p>
        <div class="section-title">调查笔记</div>
        <p>表面乖巧温和，内里锐利。压力情境下逻辑优先，情绪剥离能力极强。与沈绛离存在无需言语的默契。</p>`
    },
    {
        id: "L-09-02-C",
        title: "沈绛离·猫形锚点觉醒者",
        category: "人物",
        tags: ["沈绛离","猫形","灵枢"],
        summary: "苏晚眠的邻居与挚友，天生失声，猫形兽化锚点，收容物“灵枢”。",
        content: `
        <div class="section-title">基础信息</div>
        <p><strong>姓名：</strong>沈绛离 | 17岁 | 女 | 9月5日生</p>
        <p><strong>身份：</strong>临川市私立高中高二理科班 / 民俗研究社团成员</p>
        <p><strong>锚点：</strong>猫形兽化锚点</p>
        <img src="images/沈绛离.png" onerror="this.style.display='none'">
        <div class="section-title">能力评级</div>
        <p>精准打击 S | 近身缠斗 A | 治疗修复 A- | 隐匿刺杀 A+</p>
        <div class="section-title">收容物</div>
        <p><strong>LC-Q-038 “灵枢”</strong>（急救包），辅助攻防型。</p>`
    },
    {
        id: "L-09-03-X",
        title: "谢逢虚·狐形锚点觉醒者",
        category: "人物",
        tags: ["谢逢虚","狐形","天极"],
        summary: "民俗研究社团社长，狐形兽化锚点，规则解析S级。",
        content: `
        <div class="section-title">基础信息</div>
        <p><strong>姓名：</strong>谢逢虚 | 18岁 | 男 | 2月5日生</p>
        <p><strong>身份：</strong>临川市私立高中高三理科班 / 民俗研究社团社长</p>
        <p><strong>锚点：</strong>狐形兽化锚点</p>
        <img src="images/谢逢虚.png" onerror="this.style.display='none'">
        <div class="section-title">能力评级</div>
        <p>规则解析 S | 玄术应用 A | 地形适配 A+ | 精神抗性 A-</p>
        <div class="section-title">收容物</div>
        <p><strong>LC-Q-039 “天极”</strong>（折扇），青级综合型。</p>`
    },
    {
        id: "L-09-04-W",
        title: "温泣语·鸟形锚点觉醒者",
        category: "人物",
        tags: ["温泣语","鸟形","落羽"],
        summary: "学生会会长兼社团副社长，鸟形兽化锚点，精神抗性S级。",
        content: `
        <div class="section-title">基础信息</div>
        <p><strong>姓名：</strong>温泣语 | 18岁 | 女 | 1月10日生</p>
        <p><strong>身份：</strong>临川市私立高中高三文科班 / 学生会会长 / 社团副社长</p>
        <p><strong>锚点：</strong>鸟形兽化锚点</p>
        <img src="images/温泣语.png" onerror="this.style.display='none'">
        <div class="section-title">能力评级</div>
        <p>精神抗性 S | 远程精准 A | 风险预判 A+ | 环境感知 A-</p>
        <div class="section-title">收容物</div>
        <p><strong>LC-Q-040 “落羽”</strong>（复合弓），青级远程输出型。</p>`
    },
    {
        id: "L-09-05-L",
        title: "陆烬弦·犬形锚点觉醒者",
        category: "人物",
        tags: ["陆烬弦","犬形","狂骨"],
        summary: "民俗社团成员，犬形兽化锚点，仇恨牵引S级。",
        content: `
        <div class="section-title">基础信息</div>
        <p><strong>姓名：</strong>陆烬弦 | 17岁 | 男 | 4月2日生</p>
        <p><strong>身份：</strong>临川市私立高中高二艺术班 / 民俗研究社团成员</p>
        <p><strong>锚点：</strong>犬形兽化锚点</p>
        <img src="images/陆烬弦.png" onerror="this.style.display='none'">
        <div class="section-title">能力评级</div>
        <p>仇恨牵引 S | 肉身防御 A+ | 近战重击 A | 音波干扰 A-</p>
        <div class="section-title">收容物</div>
        <p><strong>LC-Q-041 “狂骨”</strong>（电吉他），青级重装控场型。</p>`
    }
];

// ============ 环境音频 ============
const DEFAULT_AUDIO_SRC = ''; // 填入音频链接，如 'ambient.mp3'

// ============ 内部频道消息 ============
const DEFAULT_CHANNELS = {
    main: [
        { user:'系统', text:'欢迎进入灵犀通讯。所有消息均受认知污染监测。', time:'2026-01-20 09:00' },
        { user:'谢逢虚', text:'临川那边最近有新的裂隙波动，大家注意。', time:'2026-01-20 09:12' }
    ],
    club: [
        { user:'苏晚眠', text:'这周末社团活动室还开吗？', time:'2026-01-19 18:02' },
        { user:'谢逢虚', text:'开，我下午去把阵盘校准一下。', time:'2026-01-19 18:05' }
    ],
    operation: [
        { user:'总局调度', text:'外勤三队，城南旧纸厂有异常能量读数，请派员核查。', time:'2026-01-20 08:30' }
    ],
    archive: [
        { user:'档案室', text:'提醒：本月新入库收容物编号已更新，请相关人员核对。', time:'2026-01-18 16:00' }
    ]
};

// ============ 悬赏任务 ============
const DEFAULT_MISSIONS = [
    { id:'m1', title:'城南旧纸厂异常能量核查', risk:'red', status:'执行中', desc:'外勤三队已前往，需确认是否为墟域开启前兆。', deadline:'2026-01-21' },
    { id:'m2', title:'失踪旧书商名下仓库排查', risk:'blue', status:'待接取', desc:'书商于1月13日失联，最后出现在城西旧物市场。', deadline:'2026-01-25' }
];

// ============ 司内议室帖子 ============
const DEFAULT_INTERNAL_POSTS = [
    { id:'ip1', title:'关于临川高中事件后心理疏导的补充建议', author:'温泣语', content:'建议对未觉醒但卷入事件的学生进行长期随访。有人表面恢复，但梦境残留仍在。', timestamp:'2026-01-18 14:22', comments:[ { user:'外勤三处', text:'已纳入计划，感谢建议。', time:'2026-01-18 15:00' } ] }
];