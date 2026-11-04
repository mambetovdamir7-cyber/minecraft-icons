/* =========================================================
   Иконки Майнкрафта — логика галереи (полный каталог)
   ========================================================= */
(function () {
  "use strict";

  const DATA = window.MC_DATA;
  if (!DATA || !Array.isArray(DATA.items)) return;

  const ITEMS = DATA.items;
  const CATS = DATA.cats;

  // все иконки приходят одним бандлом (window.MC_ICONS), иначе — по путям
  const ICONS = window.MC_ICONS || {};
  const srcOf = (item) => ICONS[item.id] || item.file;

  const CAT_COLOR = {
    block: "#8fbf6a", tool: "#86a9d4", weapon: "#e07a6a",
    food: "#e0b25c", material: "#3ce0c8", rare: "#b98cf5",
  };
  const CAT_LABEL = Object.fromEntries(CATS.map(c => [c.id, c.ru]));

  const $ = (id) => document.getElementById(id);
  const grid = $("grid");
  const chips = $("chips");
  const shown = $("shown");
  const empty = $("empty");
  const input = $("q");
  const modal = $("modal");
  const toastEl = $("toast");

  const PAGE = 240;             // сколько карточек добавляем за раз
  let activeCat = "all";
  let query = "";
  let view = [];
  let rendered = 0;
  let current = -1;
  let size = 128;               // размер скачиваемого PNG

  /* ---------- утилиты ---------- */
  const norm = (s) => String(s).toLowerCase().replace(/ё/g, "е").trim();
  const rgb = (hex) => hex;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2400);
  }

  /* ---------- полка в герое ---------- */
  function buildShelf() {
    const shelf = $("shelf");
    const picks = ["diamond", "netherite_sword", "nether_star", "golden_apple",
                   "ender_pearl", "tnt", "elytra", "emerald", "crafting_table"];
    picks.forEach((id) => {
      const item = ITEMS.find(i => i.id === id);
      if (!item) return;
      const cell = el("div", "cell");
      const img = el("img");
      img.src = srcOf(item); img.alt = ""; img.width = 56; img.height = 56;
      img.loading = "lazy"; img.decoding = "async";
      cell.appendChild(img);
      shelf.appendChild(cell);
    });
  }

  /* ---------- фильтры ---------- */
  function buildChips() {
    CATS.forEach((cat) => {
      const count = cat.id === "all" ? ITEMS.length : ITEMS.filter(i => i.cat === cat.id).length;
      const b = el("button", "chip" + (cat.id === "all" ? " is-active" : ""));
      b.type = "button";
      b.dataset.cat = cat.id;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", cat.id === "all" ? "true" : "false");
      b.appendChild(document.createTextNode(cat.ru));
      b.appendChild(el("b", null, String(count)));
      b.addEventListener("click", () => {
        activeCat = cat.id;
        [...chips.children].forEach(c => {
          const on = c.dataset.cat === activeCat;
          c.classList.toggle("is-active", on);
          c.setAttribute("aria-selected", on ? "true" : "false");
        });
        render();
        window.scrollTo({ top: $("gallery").offsetTop - 70, behavior: "smooth" });
      });
      chips.appendChild(b);
    });
  }

  /* ---------- фильтрация и отрисовка порциями ---------- */
  function matches(item) {
    if (activeCat !== "all" && item.cat !== activeCat) return false;
    if (!query) return true;
    const q = norm(query);
    return norm(item.ru).includes(q) || norm(item.en).includes(q)
        || norm(item.id).includes(q) || norm(CAT_LABEL[item.cat] || "").includes(q);
  }

  function makeCard(item, index) {
    const card = el("article", "card");
    card.dataset.id = item.id;
    card.style.setProperty("--cat", CAT_COLOR[item.cat] || "#6ec25a");
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", item.ru + " — открыть карточку");

    card.appendChild(el("span", "no", String(index + 1).padStart(2, "0")));

    const slot = el("div", "slot");
    const img = el("img");
    img.src = srcOf(item);
    img.alt = item.ru;
    img.width = 64; img.height = 64;
    img.loading = "lazy"; img.decoding = "async";
    slot.appendChild(img);

    card.appendChild(slot);
    card.appendChild(el("h3", null, item.ru));
    card.appendChild(el("span", "cat", CAT_LABEL[item.cat] || ""));

    const open = (e) => {
      if (e && e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
      if (e) e.preventDefault();
      openModal(index);
    };
    card.addEventListener("click", open);
    card.addEventListener("keydown", open);
    return card;
  }

  function updateShown() {
    shown.innerHTML = view.length
      ? `Показано <b>${rendered}</b> из ${view.length}`
      : `0 из ${ITEMS.length}`;
  }

  function appendChunk() {
    const slice = view.slice(rendered, rendered + PAGE);
    if (!slice.length) return;
    const frag = document.createDocumentFragment();
    slice.forEach((item, i) => frag.appendChild(makeCard(item, rendered + i)));
    grid.appendChild(frag);
    rendered += slice.length;
    updateShown();
    $("sentinel").hidden = rendered >= view.length;
  }

  function render() {
    view = ITEMS.filter(matches);
    grid.textContent = "";
    rendered = 0;
    $("sentinel").hidden = true;
    empty.hidden = view.length > 0;
    appendChunk();
    updateShown();
    $("badge-count").textContent = `${ITEMS.length} текстур`;
    $("stat-total").textContent = String(ITEMS.length);
  }

  /* ---------- модальное окно ---------- */
  let lastFocus = null;

  function openModal(index) {
    const item = view[index];
    if (!item) return;
    current = index;
    lastFocus = document.activeElement;

    const box = modal.querySelector(".modal-card");
    box.style.setProperty("--cat", CAT_COLOR[item.cat] || "#6ec25a");

    const mImg = $("m-img");
    mImg.src = srcOf(item);
    mImg.alt = item.ru;

    $("m-cat").textContent = CAT_LABEL[item.cat] || item.cat;
    $("m-name").textContent = item.ru;
    $("m-en").textContent = item.ru === item.en ? "" : item.en;
    const note = item.note || "Текстура Minecraft " + DATA.version + ". Оригинал 16×16, апскейл — целые пиксели без сглаживания.";
    $("m-note").textContent = note;
    $("m-id").textContent = item.id;
    $("m-size").textContent = `${item.w}×${item.h} px`;
    $("m-cat2").textContent = CAT_LABEL[item.cat] || item.cat;
    $("m-src").textContent = "textures/" + (item.src || ("item/" + item.id + ".png"));
    $("m-pos").textContent = `${index + 1} / ${view.length}`;

    const dl = $("m-dl");
    dl.dataset.id = item.id;
    dl.href = srcOf(item);
    dl.setAttribute("download", item.id + ".png");

    modal.hidden = false;
    document.documentElement.style.overflow = "hidden";
    try {
      const u = new URL(location.href);
      u.searchParams.set("item", item.id);
      history.replaceState(null, "", u);
    } catch { /* file:// */ }
    setTimeout(() => modal.querySelector(".modal-close").focus(), 30);
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.documentElement.style.overflow = "";
    current = -1;
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  function step(dir) {
    if (current < 0 || !view.length) return;
    openModal((current + dir + view.length) % view.length);
  }

  /* ---------- скачивание с нужным разрешением ---------- */
  function downloadScaled(item, px) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = px; c.height = px;
        const ctx = c.getContext("2d");
        ctx.imageSmoothingEnabled = false;      // честные квадратные пиксели
        ctx.drawImage(img, 0, 0, px, px);
        c.toBlob((blob) => {
          if (!blob) { fallback(); return; }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${item.id}_${px}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 4000);
          toast(`Скачано: ${item.id}_${px}.png`);
        }, "image/png");
      } catch (e) {
        fallback();
      }
    };
    img.onerror = () => fallback();
    img.src = srcOf(item);

    function fallback() {
      const a = document.createElement("a");
      a.href = srcOf(item);
      a.download = `${item.id}.png`;
      a.click();
      toast("Скачан оригинал 16×16");
    }
  }

  /* ---------- копирование команды ---------- */
  async function copyCommand() {
    const item = view[current];
    if (!item) return;
    const cmd = `/give @p minecraft:${item.id} 1`;
    try {
      await navigator.clipboard.writeText(cmd);
      toast("Скопировано: " + cmd);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = cmd; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast("Скопировано: " + cmd); }
      catch { toast(cmd); }
      ta.remove();
    }
  }

  /* ---------- события ---------- */
  input.addEventListener("input", () => { query = input.value; render(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { input.value = ""; query = ""; render(); input.blur(); }
    if (e.key === "Enter" && view.length) openModal(0);
  });

  $("reset").addEventListener("click", () => {
    input.value = ""; query = ""; activeCat = "all";
    [...chips.children].forEach(c => {
      const on = c.dataset.cat === "all";
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-selected", on ? "true" : "false");
    });
    render();
  });

  $("m-sizes").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-size]");
    if (!b) return;
    size = Number(b.dataset.size);
    [...$("m-sizes").children].forEach(x => {
      const on = x === b;
      x.classList.toggle("is-active", on);
      x.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $("m-dl").textContent = size === 16 ? "Скачать оригинал" : `Скачать PNG · ${size}px`;
  });

  $("m-dl").addEventListener("click", (e) => {
    const item = view[current];
    if (!item) return;
    if (size === 16) return;             // прямая ссылка на оригинал
    e.preventDefault();
    downloadScaled(item, size);
  });

  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });

  $("m-prev").addEventListener("click", () => step(-1));
  $("m-next").addEventListener("click", () => step(1));
  $("m-copy").addEventListener("click", copyCommand);

  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.key === "/" && !typing) {
      e.preventDefault(); input.focus(); input.select(); return;
    }
    if (!modal.hidden) {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      return;
    }
    if (e.key === "Escape" && typing) input.blur();
  });

  // догрузка карточек при прокрутке
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => { if (en.isIntersecting) appendChunk(); });
    }, { rootMargin: "600px" });
    io.observe($("sentinel"));
  } else {
    window.addEventListener("scroll", () => {
      if (window.innerHeight + window.scrollY > document.body.offsetHeight - 800) appendChunk();
    });
  }

  /* ---------- старт ---------- */
  buildShelf();
  buildChips();

  const qp = new URLSearchParams(location.search).get("q");
  if (qp) { input.value = qp; query = qp; }

  render();
  $("m-dl").textContent = `Скачать PNG · ${size}px`;

  (function openFromURL() {
    const id = new URLSearchParams(location.search).get("item");
    if (!id) return;
    const idx = view.findIndex(i => i.id === id);
    if (idx >= 0) openModal(idx);
  })();
})();
