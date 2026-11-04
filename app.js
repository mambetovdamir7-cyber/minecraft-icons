/* =========================================================
   Иконки Майнкрафта — логика галереи
   ========================================================= */
(function () {
  "use strict";

  const DATA = window.MC_DATA;
  if (!DATA || !Array.isArray(DATA.items)) return;

  const ITEMS = DATA.items;
  const CATS = DATA.cats;

  const CAT_COLOR = {
    block: "#8fbf6a",
    tool: "#86a9d4",
    weapon: "#e07a6a",
    food: "#e0b25c",
    material: "#3ce0c8",
    rare: "#b98cf5",
  };
  const CAT_LABEL = Object.fromEntries(CATS.map(c => [c.id, c.ru]));

  /* ---------- элементы ---------- */
  const $ = (id) => document.getElementById(id);
  const grid = $("grid");
  const chips = $("chips");
  const shown = $("shown");
  const empty = $("empty");
  const input = $("q");
  const modal = $("modal");
  const toastEl = $("toast");

  let activeCat = "all";
  let query = "";
  let view = [];       // текущий отфильтрованный список
  let current = -1;    // индекс открытой карточки

  /* ---------- утилиты ---------- */
  const norm = (s) => String(s).toLowerCase().replace(/ё/g, "е").trim();

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
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2200);
  }

  /* ---------- полка в герое ---------- */
  function buildShelf() {
    const shelf = $("shelf");
    const picks = ["diamond", "netherite_sword", "nether_star", "golden_apple", "ender_pearl", "tnt", "elytra", "emerald", "crafting_table"];
    picks.forEach((id) => {
      const item = ITEMS.find(i => i.id === id);
      if (!item) return;
      const cell = el("div", "cell");
      const img = el("img");
      img.src = item.file;
      img.alt = "";
      img.width = 56;
      img.height = 56;
      img.loading = "lazy";
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
      });
      chips.appendChild(b);
    });
  }

  /* ---------- фильтрация ---------- */
  function matches(item) {
    if (activeCat !== "all" && item.cat !== activeCat) return false;
    if (!query) return true;
    const q = norm(query);
    return norm(item.ru).includes(q)
      || norm(item.en).includes(q)
      || norm(item.id).includes(q)
      || norm(CAT_LABEL[item.cat] || "").includes(q);
  }

  function render() {
    view = ITEMS.filter(matches);
    grid.textContent = "";

    const frag = document.createDocumentFragment();
    view.forEach((item, i) => {
      const card = el("article", "card");
      card.dataset.id = item.id;
      card.style.setProperty("--cat", CAT_COLOR[item.cat] || "#6ec25a");
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", item.ru + " — открыть карточку");

      card.appendChild(el("span", "no", String(i + 1).padStart(2, "0")));

      const slot = el("div", "slot");
      const img = el("img");
      img.src = item.file;
      img.alt = item.ru;
      img.width = 64;
      img.height = 64;
      img.loading = "lazy";
      img.decoding = "async";
      slot.appendChild(img);

      card.appendChild(slot);
      card.appendChild(el("h3", null, item.ru));
      card.appendChild(el("span", "cat", CAT_LABEL[item.cat] || ""));

      const open = (e) => { if (!e || e.type !== "keydown" || e.key === "Enter" || e.key === " ") { e && e.preventDefault(); openModal(i); } };
      card.addEventListener("click", open);
      card.addEventListener("keydown", open);

      frag.appendChild(card);
    });

    grid.appendChild(frag);

    empty.hidden = view.length > 0;
    shown.innerHTML = view.length
      ? `Показано <b>${view.length}</b> из ${ITEMS.length}`
      : `0 из ${ITEMS.length}`;
    $("badge-count").textContent = `${ITEMS.length} иконок`;
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
    mImg.src = item.file;
    mImg.alt = item.ru;

    $("m-cat").textContent = CAT_LABEL[item.cat] || item.cat;
    $("m-name").textContent = item.ru;
    $("m-en").textContent = item.en;
    $("m-note").textContent = item.note || "";
    $("m-id").textContent = item.id;
    $("m-size").textContent = `${item.w}×${item.h} px`;
    $("m-cat2").textContent = CAT_LABEL[item.cat] || item.cat;
    $("m-src").textContent = "textures/" + (item.src || ("item/" + item.id + ".png"));
    $("m-pos").textContent = `${index + 1} / ${view.length}`;

    const dl = $("m-dl");
    dl.href = item.file;
    dl.setAttribute("download", item.id + ".png");

    modal.hidden = false;
    document.documentElement.style.overflow = "hidden";
    try {
      const u = new URL(location.href);
      u.searchParams.set("item", item.id);
      history.replaceState(null, "", u);
    } catch { /* file:// без истории — не критично */ }
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
    const next = (current + dir + view.length) % view.length;
    openModal(next);
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
      ta.value = cmd;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); toast("Скопировано: " + cmd); }
      catch { toast(cmd); }
      ta.remove();
    }
  }

  /* ---------- события ---------- */
  input.addEventListener("input", () => {
    query = input.value;
    render();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { input.value = ""; query = ""; render(); input.blur(); }
    if (e.key === "Enter" && view.length) openModal(0);
  });

  $("reset").addEventListener("click", () => {
    input.value = "";
    query = "";
    activeCat = "all";
    [...chips.children].forEach(c => {
      const on = c.dataset.cat === "all";
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-selected", on ? "true" : "false");
    });
    render();
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
      e.preventDefault();
      input.focus();
      input.select();
      return;
    }

    if (!modal.hidden) {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      return;
    }

    if (e.key === "Escape" && typing) { input.blur(); }
  });

  /* ---------- старт ---------- */
  buildShelf();
  buildChips();

  // предзаполненный поиск: ?q=алмаз
  const qp = new URLSearchParams(location.search).get("q");
  if (qp) { input.value = qp; query = qp; }

  render();

  // глубокая ссылка: ?item=diamond
  (function openFromURL() {
    const id = new URLSearchParams(location.search).get("item");
    if (!id) return;
    const idx = view.findIndex(i => i.id === id);
    if (idx >= 0) openModal(idx);
  })();
})();
