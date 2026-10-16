"""Junta todos os arquivos do jogo num único HTML (usado para a versão de pré-visualização).
Uso: python3 tools/bundle.py saida.html
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
mods, order = {}, []

IMP = re.compile(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)';", re.S)
EXP_DECL = re.compile(r"^export\s+(?:async\s+)?(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)", re.M)
EXP_LIST = re.compile(r"^export\s*\{([^}]*)\};?\s*$", re.M)


def load(path):
    path = os.path.normpath(path)
    if path in mods:
        return
    src = open(path, encoding='utf-8').read()
    deps = []
    for names, rel in IMP.findall(src):
        dep = os.path.normpath(os.path.join(os.path.dirname(path), rel))
        deps.append((dep, [n.strip() for n in names.split(',') if n.strip()]))
        load(dep)
    exports = EXP_DECL.findall(src)
    for m in EXP_LIST.findall(src):
        exports += [n.strip() for n in m.split(',') if n.strip()]
    body = IMP.sub('', src)
    body = EXP_LIST.sub('', body)
    body = re.sub(r"^export\s+", '', body, flags=re.M)
    mods[path] = (deps, exports, body)
    order.append(path)


def var(path):
    return '__m_' + re.sub(r'\W', '_', os.path.relpath(path, ROOT))


load(os.path.join(ROOT, 'js', 'main.js'))
out = []
for p in order:
    deps, exports, body = mods[p]
    head = ''.join(f"const {{ {', '.join(n)} }} = {var(d)};\n" for d, n in deps)
    out.append(f"const {var(p)} = (() => {{\n{head}{body}\nreturn {{ {', '.join(exports)} }};\n}})();\n")
js = '\n'.join(out)

html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
css = open(os.path.join(ROOT, 'css', 'style.css'), encoding='utf-8').read()
title = re.search(r'<title>(.*?)</title>', html).group(1)
body = re.search(r'<body[^>]*>(.*)</body>', html, re.S).group(1)
body = re.sub(r'<script[^>]*src="js/main.js"[^>]*></script>', '', body)
fonts = re.search(r'<link href="https://fonts.googleapis.com[^>]*>', html).group(0)
# imagens embutidas (data URI) para a versão de arquivo único
import base64, glob
assets = {}
for f in sorted(glob.glob(os.path.join(ROOT, 'assets', '**', '*.png'), recursive=True)):
    rel = os.path.relpath(f, ROOT).replace(os.sep, '/')
    assets[rel] = 'data:image/png;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
import json as _json
assets_js = 'window.__ASSETS = ' + _json.dumps(assets) + ';'

page = f"""<title>{title}</title>
{fonts}
<style>
{css}
</style>
{body}
<script>
{assets_js}
document.body.dataset.mode = 'play';
{js}
</script>
"""
open(sys.argv[1], 'w', encoding='utf-8').write(page)
print('ok', len(page))
