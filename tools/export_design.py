# -*- coding: utf-8 -*-
"""Figma 取り込み用に、1枚完結の静的 HTML を書き出す。

- 外部CSS を <style> に取り込む
- 画像（<img src> と CSS の url()）を data URI に埋め込む
- JS を外す代わりに、スクロール連動の表示アニメを「表示済み」に固定する
- Google マップの iframe は読み込めないのでプレースホルダに置き換える
"""
import base64, io, mimetypes, os, re, sys

src = sys.argv[1]            # 例: koln/index.html
dst = sys.argv[2]            # 例: design-export/koln-design.html
base = os.path.dirname(os.path.abspath(src))

def datauri(path):
    if not os.path.isfile(path):
        return None
    mime = mimetypes.guess_type(path)[0] or 'application/octet-stream'
    with open(path, 'rb') as f:
        return 'data:%s;base64,%s' % (mime, base64.b64encode(f.read()).decode())

embedded, missed = [], []

def inline_css(css_path):
    """CSS を読み、その中の url() を data URI に差し替える"""
    css_dir = os.path.dirname(css_path)
    with io.open(css_path, encoding='utf-8') as f:
        css = f.read()

    def repl(m):
        raw = m.group(1).strip('\'"')
        if raw.startswith(('data:', 'http://', 'https://', '//')):
            return m.group(0)
        p = os.path.normpath(os.path.join(css_dir, raw.split('?')[0]))
        uri = datauri(p)
        if uri is None:
            missed.append(p)
            return m.group(0)
        embedded.append(p)
        return 'url(%s)' % uri

    return re.sub(r'url\(([^)]+)\)', repl, css)

html = io.open(src, encoding='utf-8').read()

# 1) <link rel=stylesheet>（ローカル分）を <style> に展開
def link_repl(m):
    tag = m.group(0)
    href = re.search(r'href="([^"]+)"', tag)
    if not href or href.group(1).startswith(('http://', 'https://', '//')):
        return tag
    p = os.path.normpath(os.path.join(base, href.group(1)))
    if not os.path.isfile(p):
        missed.append(p)
        return tag
    return '<style>\n/* ===== %s ===== */\n%s\n</style>' % (
        href.group(1), inline_css(p))

html = re.sub(r'<link[^>]+rel="stylesheet"[^>]*>', link_repl, html)

# 2) <img src> を data URI に
def img_tag_repl(m):
    tag = m.group(0)
    s = re.search(r'src="([^"]+)"', tag)
    if not s:
        return tag
    raw = s.group(1)
    if raw.startswith(('data:', 'http://', 'https://', '//')):
        return tag
    p = os.path.normpath(os.path.join(base, raw.split('?')[0]))
    uri = datauri(p)
    if uri is None:
        missed.append(p)
        return tag
    embedded.append(p)
    return tag.replace('src="%s"' % raw, 'src="%s"' % uri)

html = re.sub(r'<img\b[^>]*>', img_tag_repl, html)

# 2.5) 本来 JS が body に付ける is-loaded を最初から付けておく
def body_repl(m):
    tag = m.group(0)
    c = re.search(r'class="([^"]*)"', tag)
    if c:
        return tag.replace('class="%s"' % c.group(1),
                           'class="%s is-loaded"' % c.group(1))
    return tag[:-1] + ' class="is-loaded">'

html = re.sub(r'<body\b[^>]*>', body_repl, html, count=1)

# 3) <script> を除去
html = re.sub(r'<script\b[^>]*>.*?</script>', '', html, flags=re.S)
html = re.sub(r'<script\b[^>]*/>', '', html)

# 4) Google マップの iframe はプレースホルダに
html = re.sub(
    r'<iframe\b[^>]*maps[^>]*>\s*</iframe>',
    '<div class="x-mapholder">Google マップ（書き出し時は非表示）</div>',
    html, flags=re.S | re.I)

# 5) JS 前提の状態を固定するスタイルを最後に差し込む
override = '''
<style>
/* ===== Figma 書き出し用の上書き（元のCSSは変更していません） ===== */
/* スクロール連動で出てくる要素を「表示済み」に固定 */
.reveal, .reveal-img, .reveal-text, .reveal > *, [class*="reveal"]{
  opacity:1 !important; transform:none !important;
  clip-path:none !important; visibility:visible !important;
}
/* ローディング画面は書き出しに不要 */
#loader, .loader{ display:none !important; }
/* 固定配置はページ先頭に流し込む（Figmaで重なるのを防ぐ） */
.header{ position:absolute !important; }
.gopop{ display:none !important; }
/* マップのプレースホルダ */
.x-mapholder{
  display:flex; align-items:center; justify-content:center;
  min-height:320px; border:1px dashed var(--gold-line);
  color:var(--ink-mut); font-size:13px; letter-spacing:.14em;
}
/* 横並びスライドは全件見えるように折り返す */
.carousel, [class*="__carousel"], [class*="-carousel"]{
  overflow:visible !important; flex-wrap:wrap !important;
  scroll-snap-type:none !important;
}
</style>
</head>'''
html = html.replace('</head>', override, 1)

os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
io.open(dst, 'w', encoding='utf-8').write(html)

print('書き出し: %s （%.1f MB）' % (dst, os.path.getsize(dst) / 1048576.0))
print('埋め込んだ画像: %d 件' % len(set(embedded)))
for p in sorted(set(embedded)):
    print('   ・%s' % os.path.relpath(p))
if missed:
    print('埋め込めなかった参照: %d 件' % len(set(missed)))
    for p in sorted(set(missed)):
        print('   ✗ %s' % p)
