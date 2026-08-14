# -*- coding: utf-8 -*-
"""临时脚本：提取三个 docx 的全部段落到文本文件，便于对比。"""
from zipfile import ZipFile
from xml.etree import ElementTree as ET
from pathlib import Path
import io

base = Path(r'D:\常用文件合集\墟界\oc-archive - 副本')
files = [
    base / '叛逃人员档案.docx',
    base / '墟界管理档案.docx',
    base / '正文内容.docx',
]
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

out_lines = []
for p in files:
    out_lines.append('\n===== FILE: %s =====' % p.name)
    with ZipFile(str(p), 'r') as z:
        xml = z.read('word/document.xml')
    root = ET.fromstring(xml)
    for para in root.findall('.//w:p', ns):
        text = ''.join((n.text or '') for n in para.findall('.//w:t', ns))
        if text.strip():
            out_lines.append(text.strip())

out = '\n'.join(out_lines)
outfile = base / 'tools' / '_docx_dump.txt'
with io.open(str(outfile), 'w', encoding='utf-8') as f:
    f.write(out)
print('wrote', outfile, 'lines=', len(out_lines))
