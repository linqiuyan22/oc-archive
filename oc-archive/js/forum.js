let forumPosts = JSON.parse(localStorage.getItem('darkalley_posts')) || DEFAULT_POSTS;
function savePosts() { localStorage.setItem('darkalley_posts', JSON.stringify(forumPosts)); }

function renderPostList() {
    const list = document.getElementById('postList');
    list.innerHTML = forumPosts.slice().reverse().map(p => `
        <div class="post-item" data-id="${p.id}">
            <div class="post-title">${p.title}</div>
            <div class="post-meta">
                <span>${p.author}</span>
                <span>${p.comments.length} 回复</span>
                <span>${p.timestamp}</span>
            </div>
        </div>
    `).join('');
    document.querySelectorAll('.post-item').forEach(el => {
        el.addEventListener('click', () => showPostDetail(el.dataset.id));
    });
    // 更新统计
    document.getElementById('totalPosts').textContent = forumPosts.length;
    document.getElementById('todayPosts').textContent = forumPosts.filter(p => p.timestamp.includes('2026-01-15')).length;
}

function showPostDetail(id) {
    const post = forumPosts.find(p => p.id === id);
    if (!post) return;
    document.getElementById('postListView').style.display = 'none';
    document.getElementById('newPostForm').style.display = 'none';
    const detail = document.getElementById('postDetailView');
    detail.style.display = 'block';
    detail.dataset.currentId = id;
    document.getElementById('postDetailContent').innerHTML = `
        <h1 class="post-detail-title">${post.title}</h1>
        <div class="post-detail-meta">${post.author} · ${post.timestamp}</div>
        <div class="post-detail-body">${post.content}</div>
    `;
    renderComments(post);
}
function renderComments(post) {
    document.getElementById('commentList').innerHTML = post.comments.map(c => `
        <div class="comment-item">
            <div class="comment-meta">${c.user} · ${c.time}</div>
            <div>${c.text}</div>
        </div>
    `).join('');
}
function backToList() {
    document.getElementById('postDetailView').style.display = 'none';
    document.getElementById('newPostForm').style.display = 'none';
    document.getElementById('postListView').style.display = 'block';
}

document.getElementById('submitNewPostBtn').addEventListener('click', () => {
    const title = document.getElementById('newPostTitle').value.trim();
    const content = document.getElementById('newPostContent').value.trim();
    if (!title || !content) return alert('请填写标题和内容');
    forumPosts.push({
        id: 'p' + Date.now(),
        title, content,
        author: '匿名_' + Math.floor(Math.random()*0xffff).toString(16),
        timestamp: new Date().toLocaleString('zh-CN'),
        comments: []
    });
    savePosts();
    document.getElementById('newPostTitle').value = '';
    document.getElementById('newPostContent').value = '';
    backToList();
    renderPostList();
});

document.getElementById('submitCommentBtn').addEventListener('click', () => {
    const text = document.getElementById('commentInput').value.trim();
    if (!text) return;
    const postId = document.getElementById('postDetailView').dataset.currentId;
    const post = forumPosts.find(p => p.id === postId);
    if (!post) return;
    post.comments.push({
        user: '匿名_' + Math.floor(Math.random()*0xffff).toString(16),
        text,
        time: new Date().toLocaleString('zh-CN')
    });
    savePosts();
    renderComments(post);
    document.getElementById('commentInput').value = '';
});

document.getElementById('forumHomeLink').addEventListener('click', e => { e.preventDefault(); backToList(); });
document.getElementById('forumNewPostLink').addEventListener('click', e => { e.preventDefault();
    document.getElementById('postListView').style.display = 'none';
    document.getElementById('postDetailView').style.display = 'none';
    document.getElementById('newPostForm').style.display = 'block';
});
document.getElementById('backToListBtn').addEventListener('click', backToList);
document.getElementById('cancelNewPostBtn').addEventListener('click', backToList);
renderPostList();