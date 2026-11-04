/* =========================================================
   Minecraft Utilities — редактор скинов (64×64)
   ========================================================= */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = document.getElementById("skin-canvas");
  if (!canvas) return;

  const SIZE = 64;
  const SCALE = 11;
  const ctx = canvas.getContext("2d");

  const buf = document.createElement("canvas");
  buf.width = SIZE;
  buf.height = SIZE;
  const bctx = buf.getContext("2d");

  const slotA = document.createElement("canvas");
  const slotB = document.createElement("canvas");
  [slotA, slotB].forEach((c) => { c.width = SIZE; c.height = SIZE; });
  const actx = slotA.getContext("2d");
  const bctxSlot = slotB.getContext("2d");

  let tool = "pencil";
  let color = "#6ec25a";
  let history = [];
  let drawing = false;
  let rotY = 28;
  let rotX = -10;

  /* ---------- части скина (координаты UV) ---------- */
  const PARTS = {
    head: { ru: "Голова", rects: [[0, 0, 8, 8], [32, 0, 8, 8]] },
    body: { ru: "Тело", rects: [[16, 16, 8, 12], [16, 32, 8, 12]] },
    arms: { ru: "Руки", rects: [[40, 16, 16, 12], [40, 32, 16, 12], [32, 48, 16, 12], [48, 48, 16, 12]] },
    legs: { ru: "Ноги", rects: [[0, 16, 16, 12], [0, 32, 16, 12], [16, 48, 16, 12], [0, 48, 16, 12]] },
  };

  /* ---------- утилиты ---------- */
  function snapshot() {
    try {
      history.push(bctx.getImageData(0, 0, SIZE, SIZE));
      if (history.length > 60) history.shift();
    } catch (e) { /* ignore */ }
  }

  function setColor(hex) {
    color = hex;
    const c = $("skin-color");
    const h = $("skin-hex");
    if (c) c.value = hex;
    if (h) h.value = hex;
  }

  function render() {
    const W = SIZE * SCALE;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, W);
    for (let y = 0; y < SIZE; y += 8) {
      for (let x = 0; x < SIZE; x += 8) {
        ctx.fillStyle = ((x + y) / 8) % 2 ? "#1b2129" : "#232a33";
        ctx.fillRect(x * SCALE, y * SCALE, 8 * SCALE, 8 * SCALE);
      }
    }
    ctx.drawImage(buf, 0, 0, W, W);
    ctx.strokeStyle = "rgba(255,255,255,.07)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= SIZE; i += 8) {
      ctx.beginPath(); ctx.moveTo(i * SCALE + .5, 0); ctx.lineTo(i * SCALE + .5, W); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * SCALE + .5); ctx.lineTo(W, i * SCALE + .5); ctx.stroke();
    }
    updatePreview();
  }

  function cellAt(e) {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / (r.width / SIZE));
    const y = Math.floor((e.clientY - r.top) / (r.height / SIZE));
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return null;
    return { x, y };
  }

  function paint(x, y) {
    if (tool === "eraser") bctx.clearRect(x, y, 1, 1);
    else { bctx.fillStyle = color; bctx.fillRect(x, y, 1, 1); }
  }

  function pickAt(x, y) {
    const d = bctx.getImageData(x, y, 1, 1).data;
    if (d[3] === 0) return;
    setColor("#" + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, "0")).join(""));
  }

  function floodFill(x, y) {
    const img = bctx.getImageData(0, 0, SIZE, SIZE);
    const d = img.data;
    const i0 = (y * SIZE + x) * 4;
    const t = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]];
    const rgb = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16), 255];
    const stack = [[x, y]];
    const seen = new Set();
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cy < 0 || cx >= SIZE || cy >= SIZE) continue;
      const key = cy * SIZE + cx;
      if (seen.has(key)) continue;
      seen.add(key);
      const i = key * 4;
      if (d[i] !== t[0] || d[i + 1] !== t[1] || d[i + 2] !== t[2] || d[i + 3] !== t[3]) continue;
      d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    bctx.putImageData(img, 0, 0);
  }

  /* ---------- загрузка скинов ---------- */
  function loadInto(target, src, cb) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      target.clearRect(0, 0, SIZE, SIZE);
      target.imageSmoothingEnabled = false;
      target.drawImage(img, 0, 0, SIZE, SIZE);
      if (cb) cb();
    };
    img.src = src;
  }

  function loadDefault(which, slot) {
    const target = which === "a" ? actx : bctxSlot;
    const file = which === "a" ? "assets/skins/steve.png" : "assets/skins/alex.png";
    loadInto(target, file, () => {
      updateSlotThumb(which);
      if (which === "a" && !hasContent()) {
        bctx.clearRect(0, 0, SIZE, SIZE);
        bctx.drawImage(which === "a" ? slotA : slotB, 0, 0);
        render();
      }
    });
  }

  function hasContent() {
    const d = bctx.getImageData(0, 0, SIZE, SIZE).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return true;
    return false;
  }

  function updateSlotThumb(which) {
    const el = document.querySelector('.skin-thumb[data-slot="' + which + '"]');
    if (!el) return;
    const c = which === "a" ? slotA : slotB;
    el.src = c.toDataURL("image/png");
  }

  function copyRegion(fromCtx, toCtx, rects) {
    rects.forEach(([x, y, w, h]) => {
      const data = fromCtx.getImageData(x, y, w, h);
      toCtx.putImageData(data, x, y);
    });
  }

  function applyPart(part, from) {
    const spec = PARTS[part];
    if (!spec) return;
    snapshot();
    const src = from === "a" ? actx : bctxSlot;
    copyRegion(src, bctx, spec.rects);
    render();
  }

  /* ---------- 3D превью ---------- */
  // y — центр части по вертикали: ноги 6, тело 18, голова 28 (всего 32)
  const MODEL = [
    { name: "head", w: 8, h: 8, d: 8, x: 0, y: 28, z: 0 },
    { name: "body", w: 8, h: 12, d: 4, x: 0, y: 18, z: 0 },
    { name: "armL", w: 4, h: 12, d: 4, x: -6, y: 18, z: 0 },
    { name: "armR", w: 4, h: 12, d: 4, x: 6, y: 18, z: 0 },
    { name: "legL", w: 4, h: 12, d: 4, x: -2, y: 6, z: 0 },
    { name: "legR", w: 4, h: 12, d: 4, x: 2, y: 6, z: 0 },
  ];
  const FACES = {
    head: {
      front: [8, 8], back: [24, 8], left: [16, 8], right: [0, 8], top: [8, 0], bottom: [16, 0],
    },
    body: {
      front: [20, 20], back: [32, 20], left: [28, 20], right: [16, 20], top: [20, 16], bottom: [28, 16],
    },
    armL: { front: [36, 52], back: [44, 52], left: [40, 52], right: [32, 52], top: [36, 48], bottom: [40, 48] },
    armR: { front: [44, 20], back: [52, 20], left: [48, 20], right: [40, 20], top: [44, 16], bottom: [48, 16] },
    legL: { front: [20, 52], back: [28, 52], left: [24, 52], right: [16, 52], top: [20, 48], bottom: [24, 48] },
    legR: { front: [4, 20], back: [12, 20], left: [8, 20], right: [0, 20], top: [4, 16], bottom: [8, 16] },
  };

  const U = 6.5; // px на 1 unit

  function buildModel() {
    const host = $("skin-3d");
    if (!host) return;
    host.textContent = "";
    const skinUrl = buf.toDataURL("image/png");

    const stage = document.createElement("div");
    stage.className = "mc-stage";

    const model = document.createElement("div");
    model.className = "mc-model";
    model.style.transform = "rotateX(" + rotX + "deg) rotateY(" + rotY + "deg)";

    MODEL.forEach((part) => {
      const p = document.createElement("div");
      p.className = "mc-part";
      p.style.transform = "translate3d(" + (part.x * U) + "px," + ((16 - part.y) * U) + "px," + (part.z * U) + "px)";

      const f = FACES[part.name];
      const size = { front: [part.w, part.h], back: [part.w, part.h], left: [part.d, part.h], right: [part.d, part.h], top: [part.w, part.d], bottom: [part.w, part.d] };

      Object.keys(f).forEach((face) => {
        const [ux, uy] = f[face];
        const [fw, fh] = size[face];
        const div = document.createElement("div");
        div.className = "mc-face";
        const w = fw * U;
        const h = fh * U;
        div.style.width = w + "px";
        div.style.height = h + "px";
        div.style.left = (-w / 2) + "px";
        div.style.top = (-h / 2) + "px";
        div.style.backgroundImage = "url(" + skinUrl + ")";
        div.style.backgroundSize = (SIZE * U) + "px " + (SIZE * U) + "px";
        div.style.backgroundPosition = (-ux * U) + "px " + (-uy * U) + "px";

        const t = {
          front: "translateZ(" + (part.d / 2 * U) + "px)",
          back: "rotateY(180deg) translateZ(" + (part.d / 2 * U) + "px)",
          right: "rotateY(90deg) translateZ(" + (part.w / 2 * U) + "px)",
          left: "rotateY(-90deg) translateZ(" + (part.w / 2 * U) + "px)",
          top: "rotateX(90deg) translateZ(" + (part.h / 2 * U) + "px)",
          bottom: "rotateX(-90deg) translateZ(" + (part.h / 2 * U) + "px)",
        }[face];
        div.style.transform = t;
        p.appendChild(div);
      });
      model.appendChild(p);
    });

    stage.appendChild(model);
    host.appendChild(stage);

    let dragging = false;
    let px = 0;
    let py = 0;
    stage.addEventListener("pointerdown", (e) => {
      dragging = true;
      px = e.clientX;
      py = e.clientY;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      rotY += (e.clientX - px) * 0.6;
      rotX -= (e.clientY - py) * 0.4;
      rotX = Math.max(-70, Math.min(70, rotX));
      px = e.clientX;
      py = e.clientY;
      model.style.transform = "rotateX(" + rotX + "deg) rotateY(" + rotY + "deg)";
    });
    stage.addEventListener("pointerup", () => { dragging = false; });
  }

  function updatePreview() {
    clearTimeout(updatePreview.t);
    updatePreview.t = setTimeout(buildModel, 180);
  }

  /* ---------- скачивание ---------- */
  function downloadPng(size) {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const cc = c.getContext("2d");
    cc.imageSmoothingEnabled = false;
    cc.drawImage(buf, 0, 0, size, size);
    c.toBlob((blob) => {
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = "skin_" + size + ".png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, "image/png");
  }

  /* ---------- события ---------- */
  canvas.addEventListener("pointerdown", (e) => {
    const c = cellAt(e);
    if (!c) return;
    snapshot();
    if (tool === "pick") { pickAt(c.x, c.y); return; }
    if (tool === "fill") { floodFill(c.x, c.y); render(); return; }
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    paint(c.x, c.y);
    render();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const c = cellAt(e);
    if (!c) return;
    paint(c.x, c.y);
    render();
  });

  window.addEventListener("pointerup", () => { drawing = false; });

  $("skin-tools").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tool]");
    if (!b) return;
    tool = b.dataset.tool;
    [...$("skin-tools").children].forEach((x) => x.classList.toggle("is-active", x === b));
  });

  $("skin-color").addEventListener("input", (e) => setColor(e.target.value));
  $("skin-undo").addEventListener("click", () => {
    if (!history.length) return;
    bctx.putImageData(history.pop(), 0, 0);
    render();
  });
  $("skin-clear").addEventListener("click", () => {
    snapshot();
    bctx.clearRect(0, 0, SIZE, SIZE);
    render();
  });

  $("skin-parts").addEventListener("click", (e) => {
    const b = e.target.closest("[data-part]");
    if (!b) return;
    applyPart(b.dataset.part, b.dataset.from);
  });

  $("skin-load-a").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => loadInto(actx, r.result, () => updateSlotThumb("a"));
    r.readAsDataURL(f);
  });

  $("skin-load-b").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => loadInto(bctxSlot, r.result, () => updateSlotThumb("b"));
    r.readAsDataURL(f);
  });

  $("skin-use-a").addEventListener("click", () => {
    snapshot();
    bctx.clearRect(0, 0, SIZE, SIZE);
    bctx.drawImage(slotA, 0, 0);
    render();
  });

  $("skin-save-64").addEventListener("click", () => downloadPng(64));
  $("skin-save-128").addEventListener("click", () => downloadPng(128));

  /* ---------- инициализация ---------- */
  const palette = ["#ffffff", "#000000", "#7f7f7f", "#c6c6c6", "#4f9a3f", "#6ec25a",
    "#3ce0c8", "#2a9d8f", "#ffd24a", "#ff9f1c", "#e07a6a", "#a61e2e",
    "#b98cf5", "#6a4c93", "#3a5fcd", "#1f3a93", "#8b5a2b", "#c19a6b"];
  const sw = $("skin-swatches");
  palette.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch";
    b.style.background = c;
    b.addEventListener("click", () => setColor(c));
    sw.appendChild(b);
  });

  setColor("#6ec25a");
  loadDefault("a", slotA);
  loadDefault("b", slotB);
  setTimeout(() => {
    // стартовое содержимое холста — скин Стива
    bctx.drawImage(slotA, 0, 0);
    render();
    updateSlotThumb("a");
    updateSlotThumb("b");
  }, 600);
})();
