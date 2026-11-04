/* =========================================================
   Minecraft Utilities — редактор текстур и ресурспак
   ========================================================= */
(function () {
  "use strict";

  const ICONS = window.MC_ICONS || {};
  const ITEMS = (window.MC_DATA && window.MC_DATA.items) || [];
  const BY_ID = {};
  ITEMS.forEach((it) => { BY_ID[it.id] = it; });
  if (!ITEMS.length) { console.warn("editor: нет данных каталога"); return; }

  const $ = (id) => document.getElementById(id);

  /* ---------- CRC32 + ZIP (без сжатия) ---------- */
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function zipStore(files) {
    const enc = new TextEncoder();
    const now = new Date();
    const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
    const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

    const parts = [];
    const central = [];
    let offset = 0;

    files.forEach((f) => {
      const name = enc.encode(f.name);
      const data = f.data;
      const crc = crc32(data);

      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);
      lh.setUint16(4, 20, true);
      lh.setUint16(6, 0, true);
      lh.setUint16(8, 0, true);
      lh.setUint16(10, dosTime, true);
      lh.setUint16(12, dosDate, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true);
      lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true);
      lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);

      const cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true);
      cd.setUint16(4, 20, true);
      cd.setUint16(6, 20, true);
      cd.setUint16(8, 0, true);
      cd.setUint16(10, 0, true);
      cd.setUint16(12, dosTime, true);
      cd.setUint16(14, dosDate, true);
      cd.setUint32(16, crc, true);
      cd.setUint32(20, data.length, true);
      cd.setUint32(24, data.length, true);
      cd.setUint16(28, name.length, true);
      cd.setUint16(30, 0, true);
      cd.setUint16(32, 0, true);
      cd.setUint16(34, 0, true);
      cd.setUint16(36, 0, true);
      cd.setUint32(38, 0, true);
      cd.setUint32(42, offset, true);
      central.push(new Uint8Array(cd.buffer), name);

      offset += 30 + name.length + data.length;
    });

    const cdStart = offset;
    let cdSize = 0;
    central.forEach((chunk) => { cdSize += chunk.length; });

    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(4, 0, true);
    end.setUint16(6, 0, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, cdStart, true);
    end.setUint16(20, 0, true);

    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
  }

  function dataUrlToBytes(url) {
    const b64 = url.split(",")[1];
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* ---------- состояние редактора ---------- */
  const SIZE = 16;
  const SCALE = 30;

  const canvas = $("tex-canvas");
  const ctx = canvas.getContext("2d");
  const buf = document.createElement("canvas");
  buf.width = SIZE;
  buf.height = SIZE;
  const bctx = buf.getContext("2d");

  let tool = "pencil";
  let color = "#ffffff";
  let currentId = "diamond";
  let currentKind = "item";
  let history = [];
  let drawing = false;
  const pack = new Map();

  function snapshot() {
    try {
      history.push(bctx.getImageData(0, 0, SIZE, SIZE));
      if (history.length > 80) history.shift();
    } catch (e) { /* ignore */ }
  }

  function setColor(hex) {
    color = hex;
    $("tex-color").value = hex;
    $("tex-hex").value = hex;
  }

  function render() {
    const W = SIZE * SCALE;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, W);
    // шахматка под прозрачностью
    const cell = SCALE;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        ctx.fillStyle = (x + y) % 2 ? "#232a33" : "#1b2129";
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
    ctx.drawImage(buf, 0, 0, W, W);
    ctx.strokeStyle = "rgba(255,255,255,.06)";
    ctx.lineWidth = 1;
    for (let i = 1; i < SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell + 0.5, 0);
      ctx.lineTo(i * cell + 0.5, W);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell + 0.5);
      ctx.lineTo(W, i * cell + 0.5);
      ctx.stroke();
    }
  }

  function loadTexture(id) {
    const item = BY_ID[id];
    currentId = id;
    currentKind = item && item.cat === "block" ? "block" : "item";
    history = [];
    bctx.clearRect(0, 0, SIZE, SIZE);
    const src = ICONS[id];
    if (src) {
      const img = new Image();
      img.onload = () => {
        bctx.imageSmoothingEnabled = false;
        bctx.clearRect(0, 0, SIZE, SIZE);
        bctx.drawImage(img, 0, 0, SIZE, SIZE);
        render();
      };
      img.src = src;
    } else {
      render();
    }
    $("tex-current").textContent = item ? item.ru : id;
    highlightList();
  }

  function cellAt(e) {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / (r.width / SIZE));
    const y = Math.floor((e.clientY - r.top) / (r.height / SIZE));
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return null;
    return { x, y };
  }

  function paint(x, y) {
    if (tool === "eraser") {
      bctx.clearRect(x, y, 1, 1);
    } else {
      bctx.fillStyle = color;
      bctx.fillRect(x, y, 1, 1);
    }
  }

  function pickAt(x, y) {
    const d = bctx.getImageData(x, y, 1, 1).data;
    if (d[3] === 0) return;
    const hex = "#" + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, "0")).join("");
    setColor(hex);
  }

  function floodFill(x, y) {
    const img = bctx.getImageData(0, 0, SIZE, SIZE);
    const d = img.data;
    const idx = (x, y) => (y * SIZE + x) * 4;
    const i0 = idx(x, y);
    const target = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]];
    const rgb = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16), 255];
    if (target[0] === rgb[0] && target[1] === rgb[1] && target[2] === rgb[2] && target[3] === 255) return;
    const stack = [[x, y]];
    const seen = new Set();
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cy < 0 || cx >= SIZE || cy >= SIZE) continue;
      const key = cy * SIZE + cx;
      if (seen.has(key)) continue;
      seen.add(key);
      const i = idx(cx, cy);
      if (d[i] !== target[0] || d[i + 1] !== target[1] || d[i + 2] !== target[2] || d[i + 3] !== target[3]) continue;
      d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    bctx.putImageData(img, 0, 0);
  }

  /* ---------- пак ---------- */
  function packMeta() {
    return JSON.stringify({
      pack: {
        pack_format: 46,
        description: "Minecraft Utilities — мои текстуры",
        supported_formats: { min_inclusive: 15, max_inclusive: 9999 },
      },
    }, null, 2);
  }

  function currentPng() {
    const c = document.createElement("canvas");
    c.width = SIZE;
    c.height = SIZE;
    const cc = c.getContext("2d");
    cc.imageSmoothingEnabled = false;
    cc.drawImage(buf, 0, 0);
    return c.toDataURL("image/png");
  }

  function scaledPng(srcCanvas, size) {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const cc = c.getContext("2d");
    cc.imageSmoothingEnabled = false;
    cc.drawImage(srcCanvas, 0, 0, size, size);
    return c.toDataURL("image/png");
  }

  function renderPackList() {
    const box = $("pack-list");
    box.textContent = "";
    let n = 0;
    pack.forEach((entry, id) => {
      n++;
      const row = document.createElement("div");
      row.className = "pack-item";
      const img = document.createElement("img");
      img.src = entry.url;
      img.alt = id;
      img.width = 32;
      img.height = 32;
      row.appendChild(img);
      const name = document.createElement("span");
      name.textContent = id;
      row.appendChild(name);
      const kind = document.createElement("b");
      kind.textContent = entry.kind;
      row.appendChild(kind);
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "✕";
      del.className = "pack-del";
      del.addEventListener("click", () => { pack.delete(id); renderPackList(); });
      row.appendChild(del);
      box.appendChild(row);
    });
    $("tex-pack").textContent = "Скачать пак (" + n + ")";
    $("tex-pack").classList.toggle("is-off", n === 0);
  }

  function buildPack() {
    if (!pack.size) return null;
    const files = [];
    files.push({ name: "pack.mcmeta", data: new TextEncoder().encode(packMeta()) });

    const firstUrl = pack.values().next().value.url;
    files.push({ name: "pack.png", data: dataUrlToBytes(firstUrl) });

    pack.forEach((entry, id) => {
      files.push({
        name: "assets/minecraft/textures/" + entry.kind + "/" + id + ".png",
        data: dataUrlToBytes(entry.url),
      });
    });
    return zipStore(files);
  }

  function download(blob, name) {
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /* ---------- список предметов ---------- */
  function renderTexList(filter) {
    const box = $("tex-list");
    box.textContent = "";
    const q = String(filter || "").toLowerCase().replace(/ё/g, "е");
    const list = ITEMS.filter((it) => !q
      || it.ru.toLowerCase().replace(/ё/g, "е").includes(q)
      || it.en.toLowerCase().includes(q)
      || it.id.includes(q)).slice(0, 120);

    list.forEach((it) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "tex-item" + (it.id === currentId ? " is-active" : "");
      row.dataset.id = it.id;

      const img = document.createElement("img");
      img.src = ICONS[it.id] || "";
      img.alt = "";
      img.width = 28;
      img.height = 28;
      img.loading = "lazy";
      row.appendChild(img);

      const span = document.createElement("span");
      span.textContent = it.ru;
      row.appendChild(span);

      const badge = document.createElement("b");
      badge.textContent = it.cat === "block" ? "block" : "item";
      row.appendChild(badge);

      row.addEventListener("click", () => loadTexture(it.id));
      box.appendChild(row);
    });
    if (!list.length) {
      const p = document.createElement("p");
      p.className = "tex-empty";
      p.textContent = "Ничего не найдено";
      box.appendChild(p);
    }
  }

  function highlightList() {
    [...document.querySelectorAll(".tex-item")].forEach((n) => {
      n.classList.toggle("is-active", n.dataset.id === currentId);
    });
  }

  /* ---------- события ---------- */
  canvas.addEventListener("pointerdown", (e) => {
    const c = cellAt(e);
    if (!c) return;
    snapshot();
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    if (tool === "pick") { pickAt(c.x, c.y); drawing = false; return; }
    if (tool === "fill") { floodFill(c.x, c.y); render(); drawing = false; return; }
    paint(c.x, c.y);
    render();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const c = cellAt(e);
    if (!c) return;
    if (tool === "pencil") { paint(c.x, c.y); }
    else if (tool === "eraser") { paint(c.x, c.y); }
    render();
  });

  window.addEventListener("pointerup", () => { drawing = false; });

  $("tex-tools").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tool]");
    if (!b) return;
    tool = b.dataset.tool;
    [...$("tex-tools").children].forEach((x) => x.classList.toggle("is-active", x === b));
  });

  $("tex-color").addEventListener("input", (e) => setColor(e.target.value));
  $("tex-hex").addEventListener("change", (e) => {
    const v = e.target.value.trim();
    if (/^#?[0-9a-f]{6}$/i.test(v)) setColor(v.startsWith("#") ? v : "#" + v);
  });

  $("tex-undo").addEventListener("click", () => {
    if (!history.length) return;
    bctx.putImageData(history.pop(), 0, 0);
    render();
  });

  $("tex-reset").addEventListener("click", () => {
    snapshot();
    bctx.clearRect(0, 0, SIZE, SIZE);
    render();
  });

  $("tex-add").addEventListener("click", () => {
    pack.set(currentId, { url: currentPng(), kind: currentKind });
    renderPackList();
    $("tex-pack").classList.remove("is-off");
  });

  $("tex-pack").addEventListener("click", (e) => {
    const blob = buildPack();
    if (!blob) return;
    e.preventDefault();
    download(blob, "minecraft-utilities-pack.zip");
  });

  $("tex-png").addEventListener("click", () => {
    const c = document.createElement("canvas");
    c.width = SIZE;
    c.height = SIZE;
    c.getContext("2d").drawImage(buf, 0, 0);
    download(new Blob([dataUrlToBytes(c.toDataURL("image/png"))], { type: "image/png" }), currentId + ".png");
  });

  $("tex-q").addEventListener("input", (e) => renderTexList(e.target.value));

  /* ---------- инициализация ---------- */
  const palette = ["#ffffff", "#000000", "#7f7f7f", "#c6c6c6", "#4f9a3f", "#6ec25a",
    "#3ce0c8", "#2a9d8f", "#ffd24a", "#ff9f1c", "#e07a6a", "#a61e2e",
    "#b98cf5", "#6a4c93", "#3a5fcd", "#1f3a93", "#8b5a2b", "#c19a6b"];
  const sw = $("tex-swatches");
  palette.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch";
    b.style.background = c;
    b.addEventListener("click", () => setColor(c));
    sw.appendChild(b);
  });

  setColor("#6ec25a");
  setColorsInit();

  function setColorsInit() {
    render();
    renderTexList("");
    loadTexture("diamond");
    renderPackList();
  }
})();
