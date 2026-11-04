# -*- coding: utf-8 -*-
"""
Собирает автономную одностраничную версию сайта (один HTML со всеми ассетами
внутри data:-URI) и загружает её + icons.zip на catbox.moe (без аккаунта).

Запуск: python build_single.py
Результат: site-single.html + ссылки в консоли.
"""
import base64
import json
import mimetypes
import os
import re
import urllib.request
import uuid

ROOT = os.path.dirname(os.path.abspath(__file__))


def b64(path, mime):
    with open(os.path.join(ROOT, path), "rb") as f:
        return f"data:{mime};base64," + base64.b64encode(f.read()).decode("ascii")


def catbox_upload(path, timeout=180):
    """Загрузка файла на catbox.moe. Возвращает публичный URL."""
    boundary = "----dsh" + uuid.uuid4().hex
    name = os.path.basename(path)
    with open(path, "rb") as f:
        payload = f.read()
    ctype = mimetypes.guess_type(name)[0] or "application/octet-stream"
    body = b""
    body += f"--{boundary}\r\n".encode()
    body += b'Content-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n'
    body += f"--{boundary}\r\n".encode()
    body += f'Content-Disposition: form-data; name="fileToUpload"; filename="{name}"\r\n'.encode()
    body += f"Content-Type: {ctype}\r\n\r\n".encode()
    body += payload + b"\r\n"
    body += f"--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        "https://catbox.moe/user/api.php",
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace").strip()


def build():
    html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    css = open(os.path.join(ROOT, "styles.css"), encoding="utf-8").read()
    data = json.loads(open(os.path.join(ROOT, "data.js"), encoding="utf-8")
                      .read().split("=", 1)[1].rstrip().rstrip(";"))
    app = open(os.path.join(ROOT, "app.js"), encoding="utf-8").read()

    # ассеты внутрь CSS
    css = css.replace('url("assets/fonts/PressStart2P-Regular.ttf")', f'url("{b64("assets/fonts/PressStart2P-Regular.ttf", "font/ttf")}")')
    css = css.replace('url("assets/bg-stone.png")', f'url("{b64("assets/bg-stone.png", "image/png")}")')

    # иконки внутрь данных
    for it in data["items"]:
        it["file"] = b64(it["file"], "image/png")

    favicon = b64("assets/favicon.png", "image/png")
    brand = b64("assets/icons/diamond_block.png", "image/png")

    # подмены в разметке
    html = html.replace('<link rel="icon" href="assets/favicon.png" type="image/png">',
                        f'<link rel="icon" href="{favicon}" type="image/png">')
    html = re.sub(r'\s*<link rel="preload"[^>]*>\n?', "\n", html)
    html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{css}\n</style>")
    html = html.replace('src="assets/icons/diamond_block.png"', f'src="{brand}"')
    html = html.replace('src="assets/favicon.png"', f'src="{favicon}"')

    data_js = "window.MC_DATA = " + json.dumps(data, ensure_ascii=False) + ";"
    html = html.replace('<script src="data.js"></script>',
                        f"<script>\n{data_js}\n</script>")
    html = html.replace('<script src="app.js"></script>',
                        f"<script>\n{app}\n</script>")

    out = os.path.join(ROOT, "site-single.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print("site-single.html:", round(os.path.getsize(out) / 1024), "KB")
    return out


if __name__ == "__main__":
    single = build()

    print("загружаю icons.zip ...")
    zip_url = catbox_upload(os.path.join(ROOT, "icons.zip"))
    print("zip:", zip_url)

    # подставляем ссылку на архив в одиночную версию и в основной сайт не трогаем
    if zip_url.startswith("http"):
        txt = open(single, encoding="utf-8").read()
        txt = txt.replace('href="icons.zip"', f'href="{zip_url}"')
        open(single, "w", encoding="utf-8").write(txt)
        print("ссылка на архив вставлена в site-single.html")

    print("загружаю site-single.html ...")
    page_url = catbox_upload(single)
    print("PAGE:", page_url)
