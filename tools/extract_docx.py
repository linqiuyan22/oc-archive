from zipfile import ZipFile
from xml.etree import ElementTree as ET
from pathlib import Path

files = [
    Path(r'D:\常用文件合集\墟界\oc-archive - 副本\叛逃人员档案.docx'),
    Path(r'D:\常用文件合集\墟界\oc-archive - 副本\墟界管理档案.docx'),
]
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
for p in files:
    print(f'\n===== FILE: {p.name} =====')
    with ZipFile(p, 'r') as z:
        xml = z.read('word/document.xml')
    root = ET.fromstring(xml)
    paras = []
    for para in root.findall('.//w:p', ns):
        text = ''.join((n.text or '') for n in para.findall('.//w:t', ns))
        if text.strip():
            paras.append(text.strip())
    print('\n'.join(paras[:250]))
