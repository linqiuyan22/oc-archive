# -*- coding: utf-8 -*-
"""批量压缩 images/ 下的大图。
第二轮：阈值 120KB，jpg/webp quality 72 + 最长边 1200（帖子封面/档案图显示不超过 1200px）
png 保持第一轮结果不动（透明图收益小）。
仅当压缩后明显更小才覆盖原文件。
用法：py tools/compress_images.py
"""
import os
from PIL import Image

IMG_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'images'))


def compress(path):
    ext = os.path.splitext(path)[1].lower()
    size = os.path.getsize(path)
    if size < 120 * 1024:
        return None
    img = Image.open(path)
    img.load()
    has_alpha = img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info)
    max_dim = 1000 if has_alpha else 1200
    w, h = img.size
    if max(w, h) > max_dim:
        ratio = max_dim / float(max(w, h))
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    tmp = path + '.tmp' + ext
    if ext in ('.jpg', '.jpeg'):
        if has_alpha:
            img = img.convert('RGB')
        img.save(tmp, 'JPEG', quality=72, optimize=True, progressive=True)
    elif ext == '.png':
        img.save(tmp, 'PNG', optimize=True)
    elif ext == '.webp':
        img.save(tmp, 'WEBP', quality=72)
    else:
        return None
    new_size = os.path.getsize(tmp)
    if new_size < size:
        os.replace(tmp, path)
        return (size, new_size)
    os.remove(tmp)
    return (size, size)


total_before = total_after = 0
changed = 0
for root, _, files in os.walk(IMG_DIR):
    for f in sorted(files):
        if os.path.splitext(f)[1].lower() not in ('.jpg', '.jpeg', '.png', '.webp'):
            continue
        r = compress(os.path.join(root, f))
        if r:
            b, a = r
            total_before += b
            total_after += a
            if a < b:
                changed += 1
                print("%s: %.0fKB -> %.0fKB" % (f, b / 1024.0, a / 1024.0))
print("----")
print("changed: %d  TOTAL: %.1fMB -> %.1fMB" % (changed, total_before / 1048576.0, total_after / 1048576.0))
