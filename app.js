/* =========================================================
   Иконки Майнкрафта — галерея, коллекции, избранное
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
    block: "#8fbf6a", armor: "#a8b7c7", tool: "#86a9d4", weapon: "#e07a6a",
    food: "#e0b25c", material: "#3ce0c8", rare: "#b98cf5",
  };
  const CAT_LABEL = Object.fromEntries(CATS.map(c => [c.id, c.ru]));
  const BY_ID = Object.fromEntries(ITEMS.map(i => [i.id, i]));

  const FAV_KEY = "mc_favs_v1";
  let favs = new Set();
  try { favs = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); } catch { favs = new Set(); }

  /* ---------- готовые подборки ---------- */
  const COLLECTIONS = [
    {
      id: "diamond", name: "Алмазный сет", note: "Полный комплект из алмазов",
      ids: ["diamond_helmet", "diamond_chestplate", "diamond_leggings", "diamond_boots",
            "diamond_sword", "diamond_pickaxe", "diamond_axe", "diamond_shovel", "diamond_hoe",
            "diamond", "diamond_block", "diamond_ore", "deepslate_diamond_ore"],
    },
    {
      id: "netherite", name: "Незеритовый сет", note: "Топовая экипировка игры",
      ids: ["netherite_helmet", "netherite_chestplate", "netherite_leggings", "netherite_boots",
            "netherite_sword", "netherite_pickaxe", "netherite_axe", "netherite_shovel",
            "netherite_ingot", "netherite_scrap", "netherite_block", "ancient_debris"],
    },
    {
      id: "iron", name: "Железный сет", note: "Рабочая лошадка выживания",
      ids: ["iron_helmet", "iron_chestplate", "iron_leggings", "iron_boots",
            "iron_sword", "iron_pickaxe", "iron_axe", "iron_shovel", "iron_hoe",
            "iron_ingot", "iron_block", "iron_ore", "raw_iron", "bucket", "shears", "flint_and_steel"],
    },
    {
      id: "gold", name: "Золотой сет", note: "Быстрый, но хрупкий",
      ids: ["golden_helmet", "golden_chestplate", "golden_leggings", "golden_boots",
            "golden_sword", "golden_pickaxe", "golden_axe", "golden_shovel", "golden_hoe",
            "gold_ingot", "gold_block", "gold_ore", "raw_gold", "golden_apple", "golden_carrot"],
    },
    {
      id: "stone", name: "Камень и дерево", note: "Старт любой игры",
      ids: ["wooden_sword", "wooden_pickaxe", "wooden_axe", "wooden_shovel", "wooden_hoe",
            "stone_sword", "stone_pickaxe", "stone_axe", "stone_shovel", "stone_hoe",
            "oak_log", "oak_planks", "stick", "cobblestone", "crafting_table"],
    },
    {
      id: "food", name: "Еда и ферма", note: "Чтобы не умереть с голоду",
      ids: ["apple", "golden_apple", "bread", "wheat", "wheat_seeds", "carrot", "potato",
            "baked_potato", "beetroot", "cookie", "cake", "pumpkin_pie", "melon_slice",
            "sweet_berries", "honey_bottle", "milk_bucket", "egg", "beef", "cooked_beef",
            "porkchop", "cooked_porkchop", "chicken", "cooked_chicken", "mutton", "cooked_mutton"],
    },
    {
      id: "potions", name: "Зелья и алхимия", note: "Варочная стойка и ингредиенты",
      ids: ["brewing_stand", "cauldron", "glass_bottle", "potion", "splash_potion",
            "lingering_potion", "blaze_powder", "blaze_rod", "nether_wart", "ghast_tear",
            "dragon_breath", "fermented_spider_eye", "glowstone_dust", "redstone", "sugar",
            "rabbit_foot", "magma_cream", "phantom_membrane", "spider_eye", "gunpowder"],
    },
    {
      id: "redstone", name: "Красный камень", note: "Механизмы и автоматика",
      ids: ["redstone", "redstone_torch", "redstone_block", "repeater", "comparator",
            "piston", "sticky_piston", "observer", "hopper", "dispenser", "dropper",
            "lever", "tripwire_hook", "target", "daylight_detector", "note_block", "tnt",
            "rail", "powered_rail", "detector_rail", "activator_rail"],
    },
    {
      id: "music", name: "Музыка", note: "Пластинки и музыкальные блоки",
      ids: ["music_disc_13", "music_disc_cat", "music_disc_blocks", "music_disc_chirp",
            "music_disc_far", "music_disc_mall", "music_disc_mellohi", "music_disc_stal",
            "music_disc_strad", "music_disc_ward", "music_disc_11", "music_disc_wait",
            "music_disc_otherside", "music_disc_5", "music_disc_pigstep", "music_disc_relic",
            "jukebox", "note_block"],
    },
    {
      id: "rare", name: "Редкости", note: "То, за чем ходят в Край и Нижний мир",
      ids: ["nether_star", "elytra", "totem_of_undying", "enchanted_book", "ender_pearl",
            "ender_eye", "dragon_breath", "echo_shard", "heart_of_the_sea", "shulker_shell",
            "trident", "beacon", "conduit", "experience_bottle", "ghast_tear", "wither_skeleton_skull"],
    },
    {
      id: "colors", name: "16 цветов", note: "Шерсть, бетон и красители",
      ids: ["white_wool", "orange_wool", "magenta_wool", "light_blue_wool", "yellow_wool",
            "lime_wool", "pink_wool", "gray_wool", "light_gray_wool", "cyan_wool",
            "purple_wool", "blue_wool", "brown_wool", "green_wool", "red_wool", "black_wool",
            "white_dye", "red_dye", "blue_dye", "green_dye"],
    },
    {
      id: "nether", name: "Нижний мир", note: "Портал, крепость и обломки",
      ids: ["obsidian", "flint_and_steel", "netherrack", "nether_bricks", "soul_sand",
            "soul_soil", "glowstone", "magma_block", "blaze_rod", "nether_wart",
            "ancient_debris", "quartz", "netherite_scrap", "crying_obsidian", "respawn_anchor"],
    },
  ];

  // оставляем только реально существующие id
  COLLECTIONS.forEach((c) => {
    c.items = c.ids.map(id => BY_ID[id]).filter(Boolean);
    c.cover = c.items[0];
  });

  const $ = (id) => document.getElementById(id);
  const grid = $("grid");
  const chips = $("chips");
  const shown = $("shown");
  const input = $("q");
  const modal = $("modal");
  const toastEl = $("toast");
  const tabs = $("tabs");

  const PAGE = 240;
  const GALLERY_MODES = new Set(["gallery", "collection", "favorites"]);

  let mode = "gallery";
  let activeCat = "all";
  let query = "";
  let collection = null;
  let view = [];
  let rendered = 0;
  let current = -1;
  let size = 128;

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
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2400);
  }

  function saveFavs() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify([...favs])); } catch { /* приватный режим */ }
    $("fav-count").textContent = String(favs.size);
    [...document.querySelectorAll("[data-fav]")].forEach((b) => {
      const on = favs.has(b.dataset.fav);
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.textContent = on ? "★" : "☆";
    });
  }

  /* ---------- полка в герое ---------- */
  function buildShelf() {
    const shelf = $("shelf");
    const picks = ["diamond", "netherite_sword", "nether_star", "golden_apple",
                   "ender_pearl", "tnt", "elytra", "emerald", "crafting_table"];
    picks.forEach((id) => {
      const item = BY_ID[id];
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
        window.scrollTo({ top: $("view-gallery").offsetTop - 80, behavior: "smooth" });
      });
      chips.appendChild(b);
    });
  }

  /* ---------- выборка ---------- */
  function pool() {
    if (mode === "favorites") return ITEMS.filter(i => favs.has(i.id));
    if (mode === "collection" && collection) return collection.items;
    return ITEMS;
  }

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

    const fav = el("button", "fav" + (favs.has(item.id) ? " is-on" : ""), favs.has(item.id) ? "★" : "☆");
    fav.type = "button";
    fav.dataset.fav = item.id;
    fav.setAttribute("aria-pressed", favs.has(item.id) ? "true" : "false");
    fav.setAttribute("aria-label", "В избранное");
    fav.addEventListener("click", (e) => { e.stopPropagation(); toggleFav(item.id); });
    card.appendChild(fav);

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
      : `0 из ${pool().length}`;
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

  function emptyState() {
    if (mode === "favorites") {
      $("empty-title").textContent = "В избранном пусто";
      $("empty-text").textContent = "Нажми ☆ на карточке или ★ в карточке предмета — иконка появится здесь. Избранное хранится в браузере.";
      $("reset").textContent = "Смотреть все иконки";
      return;
    }
    $("empty-title").textContent = "Пусто";
    $("empty-text").textContent = "Ничего не нашлось. Попробуйте «алмаз», «торт» или сбросьте фильтр.";
    $("reset").textContent = "Сбросить";
  }

  function render() {
    view = pool().filter(matches);
    grid.textContent = "";
    rendered = 0;
    $("sentinel").hidden = true;
    $("empty").hidden = view.length > 0;
    emptyState();
    appendChunk();
    updateShown();
    $("badge-count").textContent = `${ITEMS.length} текстур`;
    $("stat-total").textContent = String(ITEMS.length);
    $("coll-head").hidden = mode !== "collection" || !collection;
    if (collection && mode === "collection") {
      $("coll-title").textContent = collection.name;
      $("coll-sub").textContent = `${view.length} иконок`;
    }
  }

  /* ---------- коллекции ---------- */
  function renderCollections() {
    const wrap = $("coll-grid");
    wrap.textContent = "";
    COLLECTIONS.forEach((c) => {
      if (!c.items.length) return;
      const card = el("article", "coll");
      card.tabIndex = 0;
      card.setAttribute("role", "button");

      const cover = el("div", "coll-cover");
      if (c.cover) {
        const img = el("img");
        img.src = srcOf(c.cover);
        img.alt = "";
        img.loading = "lazy";
        img.width = 48; img.height = 48;
        cover.appendChild(img);
      }
      card.appendChild(cover);

      const body = el("div", "coll-body");
      body.appendChild(el("h3", null, c.name));
      body.appendChild(el("p", null, c.note));
      body.appendChild(el("span", "coll-count", `${c.items.length} иконок`));
      card.appendChild(body);

      const open = () => {
        collection = c;
        showMode("collection");
        window.scrollTo({ top: tabs.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });
      wrap.appendChild(card);
    });
  }

  /* ---------- режимы ---------- */
  function tabFor(m) { return m === "collection" ? "collections" : m; }

  function showMode(next) {
    mode = next;
    if (next === "collections") collection = null;
    [...tabs.children].forEach(t => {
      const on = t.dataset.mode === tabFor(next);
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });

    const toTabs = () => window.scrollTo({ top: tabs.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
    const inGallery = GALLERY_MODES.has(next);
    $("view-gallery").hidden = !inGallery;
    $("view-collections").hidden = next !== "collections";
    $("view-about").hidden = next !== "about";
    $("view-recipes").hidden = next !== "recipes";
    $("view-textures").hidden = next !== "textures";
    $("view-skins").hidden = next !== "skins";
    $("view-ench").hidden = next !== "ench";
    $("view-farms").hidden = next !== "farms";

    if (next === "recipes") { openRecipes(); toTabs(); return; }
    if (next === "textures" || next === "skins") { toTabs(); return; }
    if (next === "ench") { if (window.MCU_GUIDES) MCU_GUIDES.ench(); toTabs(); return; }
    if (next === "farms") { if (window.MCU_GUIDES) MCU_GUIDES.farms(); toTabs(); return; }
    if (next === "collections") { renderCollections(); toTabs(); return; }
    if (next === "about") { toTabs(); return; }
    render();
  }

  tabs.addEventListener("click", (e) => {
    const b = e.target.closest(".tab");
    if (!b) return;
    if (b.dataset.mode !== "collections") collection = null;
    showMode(b.dataset.mode);
  });

  $("coll-back").addEventListener("click", () => {
    collection = null;
    showMode("collections");
  });

  /* ---------- избранное ---------- */
  function toggleFav(id) {
    if (favs.has(id)) favs.delete(id); else favs.add(id);
    saveFavs();
    if (mode === "favorites") { render(); return; }
    const item = BY_ID[id];
    if (item) toast(favs.has(id) ? `В избранном: ${item.ru}` : `Убрано из избранного: ${item.ru}`);
    if (!modal.hidden && view[current] && view[current].id === id) updateModalFav(view[current]);
  }

  function updateModalFav(item) {
    const b = $("m-fav");
    const on = favs.has(item.id);
    b.textContent = on ? "★ В избранном" : "☆ В избранное";
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
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
    $("m-note").textContent = item.note
      || ("Текстура Minecraft " + DATA.version + ". Оригинал 16×16, апскейл — целые пиксели без сглаживания.");
    $("m-id").textContent = item.id;
    $("m-size").textContent = `${item.w}×${item.h} px`;
    $("m-cat2").textContent = CAT_LABEL[item.cat] || item.cat;
    $("m-src").textContent = "textures/" + (item.src || ("item/" + item.id + ".png"));
    $("m-pos").textContent = `${index + 1} / ${view.length}`;

    const dl = $("m-dl");
    dl.dataset.id = item.id;
    dl.href = srcOf(item);
    dl.setAttribute("download", item.id + ".png");

    updateModalFav(item);

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
    if (mode === "favorites") { showMode("gallery"); return; }
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
    if (size === 16) return;
    e.preventDefault();
    downloadScaled(item, size);
  });

  $("m-fav").addEventListener("click", () => {
    const item = view[current];
    if (item) toggleFav(item.id);
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


  /* =========================================================
     Раздел «Крафты»
     ========================================================= */
  const REC_CHUNK = 60;
  let recData = null;
  let recLoading = null;
  let recStation = "all";
  let recQuery = "";
  let recView = [];
  let recShown = 0;

  const STATION_RU = {
    crafting: "Верстак", furnace: "Печь", blasting: "Плавильня", smoking: "Коптильня",
    campfire: "Костёр", stonecutter: "Камнерез", smithing: "Кузнечный стол",
  };

  function loadRecipes() {
    if (recData) return Promise.resolve(recData);
    if (recLoading) return recLoading;
    recLoading = new Promise((resolve, reject) => {
      const sc = document.createElement("script");
      sc.src = "recipes.js";
      sc.onload = () => { recData = window.MC_RECIPES; resolve(recData); };
      sc.onerror = () => reject(new Error("recipes.js не загрузился"));
      document.head.appendChild(sc);
    });
    return recLoading;
  }

  function pretty(id) {
    return String(id).split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  function slotNode(opt, cls) {
    const box = el("div", "mini-slot" + (cls ? " " + cls : ""));
    if (opt && ICONS[opt.id]) {
      const it = BY_ID[opt.id];
      const img = el("img");
      img.src = ICONS[opt.id];
      img.alt = it ? it.ru : opt.id;
      img.loading = "lazy";
      img.width = 32;
      img.height = 32;
      box.appendChild(img);
      box.title = it ? it.ru : opt.id;
    } else {
      box.classList.add("void");
    }
    return box;
  }

  function gridFor(rec) {
    const g = el("div", "mini-grid");
    if (rec.t === "shaped") {
      const pattern = rec.p || [];
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          const ch = (pattern[y] || "")[x] || " ";
          const opts = ch !== " " ? (rec.k[ch] || []) : [];
          g.appendChild(slotNode(opts[0]));
        }
      }
      return g;
    }
    if (rec.t === "shapeless") {
      const ing = rec.g || [];
      for (let i = 0; i < 9; i++) g.appendChild(slotNode(ing[i] ? ing[i][0] : null));
      return g;
    }
    if (rec.t === "smith") {
      for (let i = 0; i < 3; i++) {
        const ing = (rec.g || [])[i];
        g.appendChild(slotNode(ing ? ing[0] : null));
      }
      g.classList.add("g-smith");
      return g;
    }
    const ing = (rec.g || [])[0];
    g.appendChild(slotNode(ing ? ing[0] : null));
    g.classList.add("g-one");
    return g;
  }

  function ingredientSummary(rec) {
    const counts = new Map();
    const add = (id) => counts.set(id, (counts.get(id) || 0) + 1);
    if (rec.t === "shaped") {
      (rec.p || []).forEach((row) => {
        for (const ch of row) {
          if (ch === " ") continue;
          const opts = rec.k[ch] || [];
          if (opts[0]) add(opts[0].id);
        }
      });
    } else {
      (rec.g || []).forEach((opts) => { if (opts && opts[0]) add(opts[0].id); });
    }
    return [...counts.entries()].map(([id, n]) => {
      const it = BY_ID[id];
      return (n > 1 ? n + "× " : "") + (it ? it.ru : pretty(id));
    }).join(", ");
  }

  function recCard(rec) {
    const card = el("article", "rec-card");
    const res = BY_ID[rec.r];

    card.appendChild(el("span", "rec-station", STATION_RU[rec.s] || rec.s));

    const body = el("div", "rec-body");
    body.appendChild(gridFor(rec));
    body.appendChild(el("span", "rec-arrow", "→"));

    const out = el("div", "rec-out");
    if (ICONS[rec.r]) {
      const oi = el("img");
      oi.src = ICONS[rec.r];
      oi.alt = res ? res.ru : rec.r;
      oi.loading = "lazy";
      oi.width = 40;
      oi.height = 40;
      out.appendChild(oi);
    }
    out.appendChild(el("span", "rec-name", res ? res.ru : pretty(rec.r)));
    if (rec.n > 1) out.appendChild(el("span", "rec-count", "×" + rec.n));
    body.appendChild(out);
    card.appendChild(body);

    const ing = ingredientSummary(rec);
    if (ing) card.appendChild(el("p", "rec-ing", ing));

    if (res) {
      card.style.cursor = "pointer";
      card.addEventListener("click", () => {
        const idx = view.findIndex(i => i.id === res.id);
        if (idx >= 0) { showMode("gallery"); openModal(idx); }
      });
    }
    return card;
  }

  function recFilter() {
    const q = norm(recQuery);
    return recData.recipes.filter((rec) => {
      if (recStation !== "all" && rec.s !== recStation) return false;
      if (!q) return true;
      const res = BY_ID[rec.r];
      const hay = [rec.r, rec.i, res ? res.ru : "", res ? res.en : "", ingredientSummary(rec)]
        .join(" ").toLowerCase().replace(/ё/g, "е");
      return hay.includes(q);
    });
  }

  function appendRecs() {
    const slice = recView.slice(recShown, recShown + REC_CHUNK);
    if (!slice.length) return;
    const frag = document.createDocumentFragment();
    slice.forEach((rec) => frag.appendChild(recCard(rec)));
    $("rec-grid").appendChild(frag);
    recShown += slice.length;
    $("rec-total").textContent = "Показано " + recShown + " из " + recView.length;
    $("rec-more").hidden = recShown >= recView.length;
  }

  function renderRecipes() {
    if (!recData) return;
    recView = recFilter();
    $("rec-grid").textContent = "";
    recShown = 0;
    appendRecs();
    if (!recView.length) $("rec-total").textContent = "Ничего не найдено";
  }

  function renderPotionTable() {
    const wrap = $("potion-table");
    if (!recData.potions || wrap.childElementCount) return;
    const p = recData.potions;
    const row = (fromId, ingId, toId, name) => {
      const r = el("div", "potion-row");
      r.appendChild(slotNode(fromId ? { id: fromId } : null));
      r.appendChild(el("span", "potion-op", "+"));
      r.appendChild(slotNode(ingId ? { id: ingId } : null));
      r.appendChild(el("span", "potion-op", "="));
      r.appendChild(slotNode(toId ? { id: toId } : null));
      r.appendChild(el("span", "potion-name", name));
      return r;
    };
    p.base.forEach((x) => wrap.appendChild(row(x.from, x.ing, "awkward", "Неуклюжее зелье")));
    p.list.forEach((x) => wrap.appendChild(row("awkward", x.ing, "potion", x.name)));
    p.mods.forEach((m) => {
      const r = el("div", "potion-row mod");
      r.appendChild(slotNode({ id: "potion" }));
      r.appendChild(el("span", "potion-op", "+"));
      r.appendChild(slotNode({ id: m.ing }));
      r.appendChild(el("span", "potion-op", "="));
      r.appendChild(el("span", "potion-name", "«" + m.ru + "» версия"));
      wrap.appendChild(r);
    });
  }

  function openRecipes() {
    loadRecipes()
      .then(() => { renderPotionTable(); renderRecipes(); })
      .catch(() => { $("rec-total").textContent = "Не удалось загрузить рецепты"; });
  }

  function buildRecChips() {
    if ($("rec-chips").childElementCount) return;
    const list = [{ id: "all", ru: "Все" }].concat(
      Object.keys(STATION_RU).map((id) => ({ id, ru: STATION_RU[id] })),
    );
    list.forEach((st) => {
      const b = el("button", "chip" + (st.id === "all" ? " is-active" : ""), st.ru);
      b.type = "button";
      b.addEventListener("click", () => {
        recStation = st.id;
        [...$("rec-chips").children].forEach((c) => c.classList.toggle("is-active", c === b));
        renderRecipes();
      });
      $("rec-chips").appendChild(b);
    });
  }

  /* ---------- старт ---------- */
  buildShelf();
  buildChips();
  buildRecChips();

  $("rec-q").addEventListener("input", (e) => { recQuery = e.target.value; renderRecipes(); });
  $("rec-more").addEventListener("click", appendRecs);

  const qp = new URLSearchParams(location.search).get("q");
  if (qp) { input.value = qp; query = qp; }

  saveFavs();
  render();

  // раздел из ссылки: ?view=collections
  (function openView() {
    const params = new URLSearchParams(location.search);
    const c = params.get('coll');
    if (c) {
      const found = COLLECTIONS.find(x => x.id === c && x.items.length);
      if (found) { collection = found; showMode('collection'); return; }
    }
    const v = params.get('view');
    if (v && ['gallery', 'recipes', 'ench', 'farms', 'skins', 'textures', 'collections', 'favorites', 'about'].includes(v)) showMode(v);
  })();
  $("m-dl").textContent = `Скачать PNG · ${size}px`;

  // доступ для модулей редакторов
  window.MCU = { ICONS: ICONS, BY_ID: BY_ID, ITEMS: ITEMS };

  (function openFromURL() {
    const id = new URLSearchParams(location.search).get("item");
    if (!id || !BY_ID[id]) return;
    const idx = view.findIndex(i => i.id === id);
    if (idx >= 0) openModal(idx);
  })();
})();
