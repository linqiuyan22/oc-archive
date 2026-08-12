// 默认论坛帖子
const DEFAULT_POSTS = [
    { id:'p1', title:'有人记得19年三院的事吗？', author:'匿名_4f3a',
      content:'今天路过老第三医院，突然心口发闷，脑子里闪了点白影子，但怎么都想不起来发生过啥。\n\n有没有人也有这种感觉？那地方晚上路灯总是忽明忽暗。',
      timestamp:'2026-01-15 23:41',
      comments:[
        { user:'匿名_9b2c', text:'别问了，问就是集体癔症。我上次跟我妈提，她根本不记得有这回事。', time:'2026-01-15 23:55' },
        { user:'匿名_7d1e', text:'懂的都懂，私我，我有城西老宅子的手抄规则。', time:'2026-01-16 00:12' }
      ]
    },
    { id:'p2', title:'夜班出租车司机的奇怪经历', author:'匿名_12ab',
      content:'昨晚拉了个客人，从老城区到东郊，一路上一句话没说。下车的时候我回头看后座，人不见了，但车门根本没开过。钱倒是给了，是真钞。',
      timestamp:'2026-01-14 02:15',
      comments:[
        { user:'匿名_5f6g', text:'老哥你注意点，别再去那片了。', time:'2026-01-14 09:30' }
      ]
    }
];

// 默认终端档案（请根据你的内容扩充）
const DEFAULT_ARCHIVES = [
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
    // 更多档案...
];

// 音频源
const DEFAULT_AUDIO_SRC = ''; // 填入你的音频链接