# -*- coding: utf-8 -*-
"""
Полный каталог текстур Minecraft 1.21.4:
  - все предметы (item/) и по одной канонической текстуре на блок (block/)
  - русские названия для избранных + авто-перевод по словарю
  - icons.zip со всеми PNG
Запуск: python build_full.py
"""
import io
import json
import os
import re
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor

from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
ICON_DIR = "icons-263"
ICONS = os.path.join(ROOT, "assets", ICON_DIR)
os.makedirs(ICONS, exist_ok=True)

REF_TAG = "26.3-assets"      # тег misode/mcmeta с ассетами
VERSION = "26.3"             # версия игры для подписей
RAW = f"https://raw.githubusercontent.com/misode/mcmeta/{REF_TAG}/assets/minecraft/textures"
TREE_API = f"https://api.github.com/repos/misode/mcmeta/git/trees/{REF_TAG}?recursive=1"
UA = {"User-Agent": "Mozilla/5.0 (compatible; icon-gallery-builder)"}

# ---------------------------------------------------------------- словарь
NOUNS = {
    "sword": ("меч", "m"), "pickaxe": ("кирка", "f"), "axe": ("топор", "m"), "shovel": ("лопата", "f"),
    "hoe": ("мотыга", "f"), "helmet": ("шлем", "m"), "chestplate": ("нагрудник", "m"),
    "leggings": ("поножи", "p"), "boots": ("ботинки", "p"), "bow": ("лук", "m"), "arrow": ("стрела", "f"),
    "shield": ("щит", "m"), "trident": ("трезубец", "m"), "crossbow": ("арбалет", "m"), "mace": ("булава", "f"),
    "apple": ("яблоко", "n"), "bread": ("хлеб", "m"), "beef": ("говядина", "f"), "porkchop": ("свинина", "f"),
    "chicken": ("курица", "f"), "mutton": ("баранина", "f"), "rabbit": ("кролик", "m"), "cod": ("треска", "f"),
    "salmon": ("лосось", "m"), "potato": ("картофель", "m"), "carrot": ("морковь", "f"),
    "cookie": ("печенье", "n"), "cake": ("торт", "m"), "pie": ("пирог", "m"), "stew": ("суп", "m"),
    "soup": ("суп", "m"), "berries": ("ягоды", "p"), "honey": ("мёд", "m"), "milk": ("молоко", "n"),
    "ore": ("руда", "f"), "block": ("блок", "m"), "planks": ("доски", "p"), "log": ("бревно", "n"),
    "wood": ("древесина", "f"), "stairs": ("ступени", "p"), "slab": ("плита", "f"), "fence": ("забор", "m"),
    "gate": ("калитка", "f"), "door": ("дверь", "f"), "trapdoor": ("люк", "m"), "button": ("кнопка", "f"),
    "sign": ("табличка", "f"), "leaves": ("листва", "f"), "sapling": ("саженец", "m"),
    "flower": ("цветок", "m"), "wool": ("шерсть", "f"), "ingot": ("слиток", "m"), "nugget": ("самородок", "m"),
    "shard": ("осколок", "m"), "dust": ("пыль", "f"), "powder": ("порошок", "m"), "ball": ("шар", "m"),
    "stick": ("палка", "f"), "string": ("нить", "f"), "feather": ("перо", "n"), "bone": ("кость", "f"),
    "leather": ("кожа", "f"), "paper": ("бумага", "f"), "book": ("книга", "f"), "brick": ("кирпич", "m"),
    "glass": ("стекло", "n"), "torch": ("факел", "m"), "lantern": ("фонарь", "m"), "candle": ("свеча", "f"),
    "chest": ("сундук", "m"), "barrel": ("бочка", "f"), "furnace": ("печь", "f"), "table": ("стол", "m"),
    "anvil": ("наковальня", "f"), "cauldron": ("котёл", "m"), "bucket": ("ведро", "n"), "boat": ("лодка", "f"),
    "minecart": ("вагонетка", "f"), "rail": ("рельсы", "p"), "pearl": ("жемчуг", "m"), "eye": ("глаз", "m"),
    "star": ("звезда", "f"), "totem": ("тотем", "m"), "elytra": ("элитры", "p"), "potion": ("зелье", "n"),
    "bottle": ("бутылочка", "f"), "key": ("ключ", "m"), "egg": ("яйцо", "n"), "head": ("голова", "f"),
    "skull": ("череп", "m"), "banner": ("знамя", "n"), "carpet": ("ковёр", "m"), "bed": ("кровать", "f"),
    "rod": ("удочка", "f"), "shears": ("ножницы", "p"), "coal": ("уголь", "m"), "diamond": ("алмаз", "m"),
    "emerald": ("изумруд", "m"), "lapis": ("лазурит", "m"), "quartz": ("кварц", "m"),
    "amethyst": ("аметист", "m"), "netherite": ("незерит", "m"), "copper": ("медь", "f"),
    "gold": ("золото", "n"), "iron": ("железо", "n"), "cobblestone": ("булыжник", "m"),
    "stone": ("камень", "m"), "dirt": ("земля", "f"), "sand": ("песок", "m"), "gravel": ("гравий", "m"),
    "obsidian": ("обсидиан", "m"), "bedrock": ("бедрок", "m"), "sponge": ("губка", "f"),
    "glowstone": ("светокамень", "m"), "netherrack": ("незерак", "m"), "soul": ("душа", "f"),
    "sandstone": ("песчаник", "m"), "terracotta": ("терракота", "f"), "concrete": ("бетон", "m"),
    "concrete_powder": ("сухой бетон", "m"), "shulker": ("шалкер", "m"), "box": ("ящик", "m"),
    "shell": ("раковина", "f"), "scute": ("щиток", "m"), "membrane": ("мембрана", "f"),
    "spawn_egg": ("яйцо призыва", "n"), "disc": ("пластинка", "f"), "template": ("шаблон", "m"),
    "sherd": ("черепок", "m"), "trim": ("узор", "m"), "seed": ("семена", "p"), "seeds": ("семена", "p"),
    "bulb": ("луковица", "f"), "root": ("корень", "m"), "vine": ("лоза", "f"), "kelp": ("ламинария", "f"),
    "lily": ("кувшинка", "f"), "bush": ("куст", "m"), "sprouts": ("ростки", "p"), "fern": ("папоротник", "m"),
    "grass": ("трава", "f"), "moss": ("мох", "m"), "sculk": ("скалк", "m"), "froglight": ("лягушкин свет", "m"),
    "coral": ("коралл", "m"), "fan": ("веер", "m"), "stem": ("стебель", "m"), "cactus": ("кактус", "m"),
    "bamboo": ("бамбук", "m"), "sugar_cane": ("сахарный тростник", "m"), "chorus": ("хорус", "m"),
    "fruit": ("плод", "m"), "hop": ("хмель", "m"), "pod": ("стручок", "m"), "wart": ("нарост", "m"),
    "fungus": ("гриб", "m"), "mushroom": ("гриб", "m"), "hanging_sign": ("висячая табличка", "f"),
    "sign": ("табличка", "f"), "frame": ("рамка", "f"), "painting": ("картина", "f"),
    "item_frame": ("рамка", "f"), "armor_stand": ("стойка для брони", "f"),
}

ADJS = {
    "oak": {"m": "дубовый", "f": "дубовая", "n": "дубовое", "p": "дубовые"},
    "spruce": {"m": "еловый", "f": "еловая", "n": "еловое", "p": "еловые"},
    "birch": {"m": "берёзовый", "f": "берёзовая", "n": "берёзовое", "p": "берёзовые"},
    "jungle": {"m": "тропический", "f": "тропическая", "n": "тропическое", "p": "тропические"},
    "acacia": {"m": "акациевый", "f": "акациевая", "n": "акациевое", "p": "акациевые"},
    "dark_oak": {"m": "тёмно-дубовый", "f": "тёмно-дубовая", "n": "тёмно-дубовое", "p": "тёмно-дубовые"},
    "mangrove": {"m": "мангровый", "f": "мангровая", "n": "мангровое", "p": "мангровые"},
    "cherry": {"m": "вишнёвый", "f": "вишнёвая", "n": "вишнёвое", "p": "вишнёвые"},
    "crimson": {"m": "багровый", "f": "багровая", "n": "багровое", "p": "багровые"},
    "warped": {"m": "искажённый", "f": "искажённая", "n": "искажённое", "p": "искажённые"},
    "diamond": {"m": "алмазный", "f": "алмазная", "n": "алмазное", "p": "алмазные"},
    "iron": {"m": "железный", "f": "железная", "n": "железное", "p": "железные"},
    "golden": {"m": "золотой", "f": "золотая", "n": "золотое", "p": "золотые"},
    "netherite": {"m": "незеритовый", "f": "незеритовая", "n": "незеритовое", "p": "незеритовые"},
    "stone": {"m": "каменный", "f": "каменная", "n": "каменное", "p": "каменные"},
    "wooden": {"m": "деревянный", "f": "деревянная", "n": "деревянное", "p": "деревянные"},
    "copper": {"m": "медный", "f": "медная", "n": "медное", "p": "медные"},
    "amethyst": {"m": "аметистовый", "f": "аметистовая", "n": "аметистовое", "p": "аметистовые"},
    "emerald": {"m": "изумрудный", "f": "изумрудная", "n": "изумрудное", "p": "изумрудные"},
    "quartz": {"m": "кварцевый", "f": "кварцевая", "n": "кварцевое", "p": "кварцевые"},
    "prismarine": {"m": "призмариновый", "f": "призмариновая", "n": "призмариновое", "p": "призмариновые"},
    "white": {"m": "белый", "f": "белая", "n": "белое", "p": "белые"},
    "orange": {"m": "оранжевый", "f": "оранжевая", "n": "оранжевое", "p": "оранжевые"},
    "magenta": {"m": "пурпурный", "f": "пурпурная", "n": "пурпурное", "p": "пурпурные"},
    "light_blue": {"m": "голубой", "f": "голубая", "n": "голубое", "p": "голубые"},
    "yellow": {"m": "жёлтый", "f": "жёлтая", "n": "жёлтое", "p": "жёлтые"},
    "lime": {"m": "лаймовый", "f": "лаймовая", "n": "лаймовое", "p": "лаймовые"},
    "pink": {"m": "розовый", "f": "розовая", "n": "розовое", "p": "розовые"},
    "gray": {"m": "серый", "f": "серая", "n": "серое", "p": "серые"},
    "light_gray": {"m": "светло-серый", "f": "светло-серая", "n": "светло-серое", "p": "светло-серые"},
    "cyan": {"m": "бирюзовый", "f": "бирюзовая", "n": "бирюзовое", "p": "бирюзовые"},
    "purple": {"m": "фиолетовый", "f": "фиолетовая", "n": "фиолетовое", "p": "фиолетовые"},
    "blue": {"m": "синий", "f": "синяя", "n": "синее", "p": "синие"},
    "brown": {"m": "коричневый", "f": "коричневая", "n": "коричневое", "p": "коричневые"},
    "green": {"m": "зелёный", "f": "зелёная", "n": "зелёное", "p": "зелёные"},
    "red": {"m": "красный", "f": "красная", "n": "красное", "p": "красные"},
    "black": {"m": "чёрный", "f": "чёрная", "n": "чёрное", "p": "чёрные"},
    "smooth": {"m": "гладкий", "f": "гладкая", "n": "гладкое", "p": "гладкие"},
    "cut": {"m": "обрезной", "f": "обрезная", "n": "обрезное", "p": "обрезные"},
    "chiseled": {"m": "резной", "f": "резная", "n": "резное", "p": "резные"},
    "polished": {"m": "полированный", "f": "полированная", "n": "полированное", "p": "полированные"},
    "cracked": {"m": "треснувший", "f": "треснувшая", "n": "треснувшее", "p": "треснувшие"},
    "mossy": {"m": "мшистый", "f": "мшистая", "n": "мшистое", "p": "мшистые"},
    "wet": {"m": "мокрый", "f": "мокрая", "n": "мокрое", "p": "мокрые"},
    "raw": {"m": "сырой", "f": "сырая", "n": "сырое", "p": "сырые"},
    "deepslate": {"m": "глубинносланцевый", "f": "глубинносланцевая", "n": "глубинносланцевое", "p": "глубинносланцевые"},
    "stripped": {"m": "обтёсанный", "f": "обтёсанная", "n": "обтёсанное", "p": "обтёсанные"},
    "waxed": {"m": "вощёный", "f": "вощёная", "n": "вощёное", "p": "вощёные"},
    "exposed": {"m": "подверженный", "f": "подверженная", "n": "подверженное", "p": "подверженные"},
    "weathered": {"m": "выветренный", "f": "выветренная", "n": "выветренное", "p": "выветренные"},
    "oxidized": {"m": "окисленный", "f": "окисленная", "n": "окисленное", "p": "окисленные"},
    "chipped": {"m": "сколотый", "f": "сколотая", "n": "сколотое", "p": "сколотые"},
    "damaged": {"m": "повреждённый", "f": "повреждённая", "n": "повреждённое", "p": "повреждённые"},
}

# избранные: id -> (ru, en, cat, note) — берём из старого data.js
CURATED_FILE = os.path.join(ROOT, "data.js")

def has(name, key):
    """Совпадение по границе слова: leggings не должно матчить egg."""
    return name == key or ("_" + name + "_").find("_" + key + "_") >= 0


CAT_RULES = [
    ("armor", ("helmet", "chestplate", "leggings", "boots", "armor")),
    ("weapon", ("sword", "bow", "arrow", "crossbow", "trident", "shield", "mace", "spear", "triden")),
    ("tool", ("pickaxe", "shovel", "hoe", "shears", "fishing_rod", "flint_and_steel", "bucket",
              "spyglass", "brush", "axe", "igniter", "compass", "clock", "map", "lead", "name_tag")),
    ("food", ("apple", "bread", "beef", "porkchop", "chicken", "mutton", "rabbit", "cod", "salmon",
              "potato", "carrot", "cookie", "cake", "pie", "stew", "soup", "berries", "honey",
              "melon", "chorus_fruit", "kelp", "beetroot", "pumpkin", "egg", "rotten_flesh", "spider_eye")),
    ("rare", ("pearl", "eye", "star", "totem", "elytra", "enchanted", "potion", "shulker", "heart_of",
              "echo_shard", "experience_bottle", "dragon_breath", "ghast_tear", "blaze_rod", "nether_star",
              "disc", "template", "sherd", "trim", "key", "netherite_ingot", "netherite_scrap", "saddle")),
]

BLOCK_JUNK = re.compile(
    r"^(destroy_stage_|debug|water_|lava_|fire_|soul_fire_|nether_portal|end_portal|end_gateway|"
    r"beacon_beam|moon_phases|sun$|particle|white$|dirt_path_top$)")
SUFFIXES = ("_top", "_bottom", "_side", "_front", "_inner", "_outer", "_open", "_on", "_off",
            "_end", "_stage", "_powered", "_lit", "_base", "_tip", "_contents", "_bloom",
            "_stem", "_age")

SUF_RE = re.compile(
    r"_(top|bottom|side|front|inner|outer|open|on|off|end|stage|powered|lit|base|tip|"
    r"contents|bloom|stem|age|north|south|east|west|not_cracked|slightly_cracked|"
    r"cracked|active|inactive)\d*$")
NUM_RE = re.compile(r"^(.*)_\d+$")


# ---------------------------------------------------------------- утилиты
def fetch(url, tries=6):
    import time as _t
    last = None
    for n in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=90) as r:
                data = r.read()
                if r.length is not None and len(data) < r.length:
                    raise IOError("short read")
                return data
        except Exception as e:  # noqa: BLE001
            last = e
            _t.sleep(1.5 * (n + 1))
    raise last


_tree_cache = {}


def _tree():
    if not _tree_cache:
        _tree_cache["t"] = json.loads(fetch(TREE_API))["tree"]
    return _tree_cache["t"]


def listing(folder):
    prefix = f"assets/minecraft/textures/{folder}/"
    return [p[len(prefix):] for p in (x["path"] for x in _tree())
            if p.startswith(prefix) and p.endswith(".png")]


def humanize(name):
    words = name.replace(".png", "").split("_")
    return " ".join(w.capitalize() for w in words)


def translate(name):
    """Простой перевод: [прилагательные] + существительное, иначе ''."""
    words = name.split("_")
    if not words:
        return ""
    # ищем существительное с конца (может быть составное из двух слов)
    for cut in (2, 1):
        if len(words) >= cut:
            key = "_".join(words[-cut:])
            if key in NOUNS:
                noun, gender = NOUNS[key]
                adjs = words[:-cut]
                if not adjs:
                    return noun
                if all(a in ADJS for a in adjs):
                    forms = [ADJS[a][gender] for a in adjs]
                    return " ".join(forms + [noun])
    # простое составное из трёх: прил + сущ (например white_wool)
    return ""


def category(name, folder, block_set):
    if folder == "block":
        return "block"
    if name in block_set:          # предмет, который ставится как блок
        return "block"
    low = name.lower()
    for cat, keys in CAT_RULES:
        for k in keys:
            if has(low, k):
                return cat
    return "material"


def block_base(filename):
    stem = filename[:-4]
    for _ in range(5):
        m = SUF_RE.search(stem)
        if m and m.start() > 0:
            stem = stem[: m.start()]
            continue
        m2 = NUM_RE.match(stem)
        if m2:
            stem = m2.group(1)
            continue
        break
    return stem


def grab(folder, fname):
    local = os.path.join(ICONS, fname)
    raw = None
    if os.path.exists(local) and os.path.getsize(local) > 20:
        raw = open(local, "rb").read()
    if raw is None:
        try:
            raw = fetch(f"{RAW}/{folder}/{fname}")
        except Exception:
            return None
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
        img = img.convert("RGBA")
        if img.height > img.width:          # анимационная полоса -> первый кадр
            img = img.crop((0, 0, img.width, img.width))
        if img.width != img.height:
            img = img.crop((0, 0, min(img.size), min(img.size)))
        return img
    except Exception:
        return None


def main():
    print("получаю списки файлов ...")
    items = listing("item")
    blocks = listing("block")
    print(f"item={len(items)} block={len(blocks)}")

    # канонические блоки: одна текстура на тип
    groups = {}
    for b in blocks:
        if BLOCK_JUNK.match(b):
            continue
        groups.setdefault(block_base(b), []).append(b)

    chosen_blocks = []
    for base, variants in groups.items():
        exact = f"{base}.png"
        pick = None
        if exact in variants:
            pick = exact
        else:
            for suf in ("_side", "_top", "_front", "_bottom", "_end"):
                cand = f"{base}{suf}.png"
                if cand in variants:
                    pick = cand
                    break
            if pick is None:
                pick = sorted(variants)[0]
        chosen_blocks.append((base, pick))
    print(f"блоков после схлопывания: {len(chosen_blocks)}")

    item_stems = {f[:-4] for f in items}

    def is_variant(stem):
        m = re.match(r"^(.*)_(\d{2})$", stem)
        if m and m.group(1) in item_stems:
            return True
        for suf in ("_open_front", "_open_back", "_open"):
            if stem.endswith(suf) and stem[: -len(suf)] in item_stems:
                return True
        return False

    tasks = []
    animated_done = set()
    for f in items:
        stem = f[:-4]
        m = re.match(r"^(.+)_(\d{2})$", stem)
        if m and m.group(1) in ("clock", "compass", "recovery_compass"):
            base_a = m.group(1)
            if base_a in animated_done:
                continue
            animated_done.add(base_a)
            tasks.append(("item", f, base_a))
            continue
        if is_variant(stem):          # кадр анимации / открытое состояние
            continue
        tasks.append(("item", f, stem))
    for base, pick in chosen_blocks:
        if base in item_stems:        # предпочитаем предметную иконку
            continue
        tasks.append(("block", pick, base))
    tasks = sorted(set(tasks))
    block_set = {base for base, _ in chosen_blocks} | {block_base(b) for b in blocks}
    print(f"всего текстур к загрузке: {len(tasks)}")

    curated = {}
    curated_by_src = {}
    if os.path.exists(CURATED_FILE):
        try:
            old = json.loads(open(CURATED_FILE, encoding="utf-8").read().split("=", 1)[1].rstrip().rstrip(";"))
            for it in old["items"]:
                if it.get("auto") or not it.get("note"):
                    continue          # авто-записи пересобираем заново
                curated[it["id"]] = it
                if it.get("src"):
                    curated_by_src[it["src"]] = it
            print(f"избранных с описанием: {len(curated)}")
        except Exception as e:
            print("curated skip:", e)

    records, missing = [], []
    done = 0

    def work(task):
        folder, fname, _base = task
        return task, grab(folder, fname)

    with ThreadPoolExecutor(max_workers=16) as ex:
        for (folder, fname, base), img in ex.map(work, tasks):
            done += 1
            if img is None:
                missing.append(f"{folder}/{fname}")
                continue
            img.save(os.path.join(ICONS, fname))
            src_rel = f"{folder}/{fname}"
            old = curated_by_src.get(src_rel) or curated.get(base)
            if old:
                records.append({**old, "file": f"assets/{ICON_DIR}/{fname}", "src": src_rel,
                                "w": img.width, "h": img.height})
                continue
            ru = translate(base) or ""
            records.append({
                "id": base,
                "ru": ru or humanize(base),
                "en": humanize(base),
                "cat": category(base, folder, block_set),
                "note": "",
                "file": f"assets/{ICON_DIR}/{fname}",
                "src": src_rel,
                "w": img.width,
                "h": img.height,
                "auto": True,
            })
            if done % 100 == 0:
                print(f"  {done}/{len(tasks)}")

    # порядок: избранные -> по категориям -> по имени
    cat_order = {"block": 0, "armor": 1, "tool": 2, "weapon": 3, "food": 4, "material": 5, "rare": 6}
    records.sort(key=lambda r: (0 if not r.get("auto") else 1,
                                cat_order.get(r["cat"], 9), r["en"].lower()))

    payload = {
        "cats": [{"id": c, "ru": r} for c, r in [
            ("all", "Все"), ("block", "Блоки"), ("armor", "Броня"), ("tool", "Инструменты"),
            ("weapon", "Оружие"), ("food", "Еда"), ("material", "Материалы"), ("rare", "Редкое")]],
        "items": records,
        "version": VERSION,
    }
    with open(os.path.join(ROOT, "data.json"), "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    with open(os.path.join(ROOT, "data.js"), "w", encoding="utf-8") as f:
        f.write("// Автогенерируется build_full.py\nwindow.MC_DATA = "
                + json.dumps(payload, ensure_ascii=False) + ";\n")

    # бандл: все PNG в одном файле (одна загрузка вместо тысячи запросов)
    import base64
    bundle = {}
    for r in records:
        with open(os.path.join(ROOT, r["file"]), "rb") as fh:
            bundle[r["id"]] = "data:image/png;base64," + base64.b64encode(fh.read()).decode("ascii")
    bundle_path = os.path.join(ROOT, "icons.bundle.js")
    with open(bundle_path, "w", encoding="utf-8") as f:
        f.write("// Автогенерируется build_full.py — все иконки в одном файле\n")
        f.write("window.MC_ICONS = " + json.dumps(bundle, ensure_ascii=False) + ";\n")
    print("icons.bundle.js: %.0f KB" % (os.path.getsize(bundle_path) / 1024))

    with zipfile.ZipFile(os.path.join(ROOT, "icons.zip"), "w", zipfile.ZIP_DEFLATED) as z:
        for r in records:
            z.write(os.path.join(ROOT, r["file"]), f"minecraft-icons/{r['id']}.png")
        z.write(os.path.join(ROOT, "data.js"), "minecraft-icons/data.js")
        if os.path.exists(os.path.join(ROOT, "README.md")):
            z.write(os.path.join(ROOT, "README.md"), "minecraft-icons/README.md")

    ru_count = sum(1 for r in records if not r.get("auto"))
    auto_ru = sum(1 for r in records if r.get("auto") and r["ru"] != r["en"])
    print(f"\nготово: {len(records)} иконок | избранных с описанием: {ru_count} | "
          f"авто-перевод: {auto_ru} | без загрузки: {len(missing)}")
    if missing[:10]:
        print("пропущены (пример):", missing[:10])


if __name__ == "__main__":
    main()
