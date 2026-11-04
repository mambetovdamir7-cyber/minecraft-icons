# -*- coding: utf-8 -*-
"""
Собирает ассеты для сайта-галереи иконок Minecraft:
  - скачивает оригинальные текстуры 1.21.4 (item/ и block/)
  - обрезает анимационные полосы до первого кадра
  - генерирует тайловый фон, favicon, архив icons.zip
  - пишет data.js с метаданными
"""
import io
import json
import os
import random
import time
import urllib.request
import zipfile

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
ICONS_DIR = os.path.join(ROOT, "assets", "icons")
FONTS_DIR = os.path.join(ROOT, "assets", "fonts")
os.makedirs(ICONS_DIR, exist_ok=True)
os.makedirs(FONTS_DIR, exist_ok=True)

BASE = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.4/assets/minecraft/textures"
FONT_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/pressstart2p/PressStart2P-Regular.ttf"

CATS = [
    ("all", "Все"),
    ("block", "Блоки"),
    ("tool", "Инструменты"),
    ("weapon", "Оружие"),
    ("food", "Еда"),
    ("material", "Материалы"),
    ("rare", "Редкое"),
]

# id, RU, EN, cat, note, [candidates]  (candidates -> ищем в item/, затем block/)
ITEMS = [
    # ---------------- БЛОКИ ----------------
    ("diamond_ore", "Алмазная руда", "Diamond Ore", "block", "Копается железной киркой или лучше. Ищите на глубине от −64 до 16.", None),
    ("deepslate_diamond_ore", "Алмазная руда в глубинном сланце", "Deepslate Diamond Ore", "block", "Вариант руды ниже Y=0: твёрже, времени на добычу больше.", None),
    ("diamond_block", "Алмазный блок", "Block of Diamond", "block", "9 алмазов в одном блоке. Классика для сейфа и пола в базе.", None),
    ("gold_block", "Золотой блок", "Block of Gold", "block", "9 золотых слитков. Раньше — валюта для бартера с пиглинами.", None),
    ("iron_block", "Железный блок", "Block of Iron", "block", "9 слитков железа. Удобно хранить металл компактно.", None),
    ("netherite_block", "Незеритовый блок", "Block of Netherite", "block", "9 слитков незерита: самый дорогой декоративный блок.", None),
    ("emerald_block", "Изумрудный блок", "Block of Emerald", "block", "9 изумрудов. Встречается в лесных особняках и у торговцев.", None),
    ("lapis_block", "Лазуритовый блок", "Block of Lapis Lazuli", "block", "9 лазурита. Часто используется в декоре и как топливо для стола.", None),
    ("redstone_block", "Блок редстоуна", "Block of Redstone", "block", "9 редстоуна. Даёт постоянный сигнал и работает как подвижная кнопка.", None),
    ("coal_ore", "Угольная руда", "Coal Ore", "block", "Первое топливо новичка. Добывается любой киркой.", None),
    ("iron_ore", "Железная руда", "Iron Ore", "block", "Чаще всего на высотах от −24 до 56, особенно в горах.", None),
    ("amethyst_block", "Аметистовый блок", "Block of Amethyst", "block", "Выращивается из друз в аметистовых жеодах. Звенит при ударе.", None),
    ("oak_log", "Дубовое бревно", "Oak Log", "block", "Старт любой игры: доски, палки и древесный уголь.", None),
    ("oak_planks", "Дубовые доски", "Oak Planks", "block", "База почти всех крафтов: верстак, сундук, палки.", None),
    ("obsidian", "Обсидиан", "Obsidian", "block", "Лава + вода. Ломается только алмазной киркой, нужен для портала в Край.", None),
    ("bedrock", "Бедрок", "Bedrock", "block", "Нижний слой мира, в выживании не ломается.", None),
    ("stone", "Камень", "Stone", "block", "Если добыть киркой — выпадет булыжник, а не камень.", None),
    ("cobblestone", "Булыжник", "Cobblestone", "block", "Самый доступный строительный материал и сырьё для печи.", None),
    ("glass", "Стекло", "Glass", "block", "Песок, переплавленный в печи. Ломается без выпадения.", None),
    ("tnt", "Динамит", "TNT", "block", "Порох + песок. Взрывается от редстоуна или поджигания.", "block/tnt_side.png"),
    ("crafting_table", "Верстак", "Crafting Table", "block", "Открывает сетку 3×3 — без него не собрать ничего серьёзного.", "block/crafting_table_top.png"),
    ("enchanting_table", "Стол зачарования", "Enchanting Table", "block", "Алмазы + обсидиан + книга. Чарует предметы за уровни.", "block/enchanting_table_top.png"),
    ("beacon", "Маяк", "Beacon", "block", "Звезда Края + обсидиан + стекло. Даёт эффекты на большой площади.", None),
    ("end_stone", "Эндстоун", "End Stone", "block", "Камень Края. Нужен для крафта эндер-сундука.", None),
    ("netherrack", "Незерак", "Netherrack", "block", "Порода Нижнего мира, горит бесконечно.", None),
    ("glowstone", "Светокамень", "Glowstone", "block", "Яркий свет в Нижнем мире. Пыль идёт на зелья.", None),
    ("sand", "Песок", "Sand", "block", "Падает без опоры. Сырьё для стекла и динамита.", None),
    ("ice", "Лёд", "Ice", "block", "Скользкий и хрупкий. Нужен для лодочных трасс.", None),

    # ---------------- ИНСТРУМЕНТЫ ----------------
    ("diamond_pickaxe", "Алмазная кирка", "Diamond Pickaxe", "tool", "3 алмаза + 2 палки. Берёт обсидиан и древние обломки.", None),
    ("netherite_pickaxe", "Незеритовая кирка", "Netherite Pickaxe", "tool", "Алмазная кирка + незеритовый слиток. Не горит и прочнее.", None),
    ("iron_pickaxe", "Железная кирка", "Iron Pickaxe", "tool", "Минимум для алмазов, золота и редстоуна.", None),
    ("diamond_axe", "Алмазный топор", "Diamond Axe", "tool", "Быстро валит деревья и наносит приличный урон.", None),
    ("diamond_shovel", "Алмазная лопата", "Diamond Shovel", "tool", "Земля, песок, гравий — за один клик.", None),
    ("diamond_hoe", "Алмазная мотыга", "Diamond Hoe", "tool", "Грядки и сбор урожая. Сено и листва — тоже её работа.", None),
    ("shears", "Ножницы", "Shears", "tool", "2 железа. Стрижка овец, листва, паутина, соты.", None),
    ("flint_and_steel", "Огниво", "Flint and Steel", "tool", "Кремень + железо. Портал в Нижний мир и поджог динамита.", None),
    ("bucket", "Ведро", "Bucket", "tool", "3 железа. Вода, лава, молоко, рыба и аксолотли.", None),
    ("spyglass", "Подзорная труба", "Spyglass", "tool", "2 меди + аметистовый осколок. Приближает мир в 10 раз.", None),

    # ---------------- ОРУЖИЕ ----------------
    ("diamond_sword", "Алмазный меч", "Diamond Sword", "weapon", "2 алмаза + палка. Урон 7, отличный баланс цены и силы.", None),
    ("netherite_sword", "Незеритовый меч", "Netherite Sword", "weapon", "Топовое оружие: урон 8 и никакого урона от огня.", None),
    ("iron_sword", "Железный меч", "Iron Sword", "weapon", "Урон 6. Нормальный выбор до первого алмаза.", None),
    ("bow", "Лук", "Bow", "weapon", "3 палки + 3 нити. Дальний бой, зачаровывается на мощь и пламя.", "item"),
    ("arrow", "Стрела", "Arrow", "weapon", "Кремень + палка + перо. Валюта для сделок с мастерами-лучниками.", None),
    ("trident", "Трезубец", "Trident", "weapon", "Дроп утопленников. Метательное оружие и зачарование «Тягун».", None),
    ("crossbow_standby", "Арбалет", "Crossbow", "weapon", "Мощнее лука, заряжается заранее. Хорош с фейерверками.", None),
    ("stone_sword", "Каменный меч", "Stone Sword", "weapon", "Булыжник + палка. Первый меч, который реально бьёт.", None),
    ("golden_sword", "Золотой меч", "Golden Sword", "weapon", "Быстрый, но хрупкий. Ценится за чары «Добыча» и «Разящий клинок».", None),

    # ---------------- ЕДА ----------------
    ("apple", "Яблоко", "Apple", "food", "2 единицы голода. Падает с дубовых листьев.", None),
    ("golden_apple", "Золотое яблоко", "Golden Apple", "food", "8 золотых слитков + яблоко. Регенерация и защита от урона.", None),
    ("bread", "Хлеб", "Bread", "food", "3 пшеницы. 5 единиц голода — базовая еда выживальщика.", None),
    ("cooked_beef", "Стейк", "Steak", "food", "8 единиц голода и насыщение лучше любого другого мяса.", None),
    ("beef", "Сырая говядина", "Raw Beef", "food", "Падает с коров. Лучше сначала пожарить в печи.", None),
    ("cooked_porkchop", "Жареная свинина", "Cooked Porkchop", "food", "8 единиц голода. Свиньи — самый быстрый источник еды.", None),
    ("chicken", "Сырая курица", "Raw Chicken", "food", "Может отравить. Готовьте на костре или в печи.", None),
    ("cooked_chicken", "Жареная курица", "Cooked Chicken", "food", "6 единиц голода без побочных эффектов.", None),
    ("carrot", "Морковь", "Carrot", "food", "Растёт на грядке. Сырая — 3 единицы голода.", None),
    ("golden_carrot", "Золотая морковь", "Golden Carrot", "food", "8 золотых самородков + морковь. Ингредиент ночного зрения.", None),
    ("baked_potato", "Печёная картошка", "Baked Potato", "food", "5 единиц голода. Самая дешёвая хорошая еда на ферме.", None),
    ("cookie", "Печенье", "Cookie", "food", "Пшеница + какао-бобы. Пачка печенья — сытный перекус.", None),
    ("cake", "Торт", "Cake", "food", "Молоко, сахар, яйца и пшеница. Съедается по кусочку.", None),
    ("pumpkin_pie", "Тыквенный пирог", "Pumpkin Pie", "food", "Тыква, сахар и яйцо. 8 единиц голода.", None),
    ("melon_slice", "Ломтик арбуза", "Melon Slice", "food", "2 единицы голода, но быстро восстанавливается на ферме.", None),
    ("sweet_berries", "Сладкие ягоды", "Sweet Berries", "food", "Растут в тайге. Едят и лисами, и игроками.", None),
    ("mushroom_stew", "Грибной суп", "Mushroom Stew", "food", "6 единиц голода. После съедения остаётся миска.", None),
    ("rotten_flesh", "Гнилая плоть", "Rotten Flesh", "food", "Еда зомби: голод насытит, но может отравить.", None),
    ("honey_bottle", "Бутылочка мёда", "Honey Bottle", "food", "Снимает яд и даёт 6 единиц голода. Осторожно с пчёлами.", None),

    # ---------------- МАТЕРИАЛЫ ----------------
    ("diamond", "Алмаз", "Diamond", "material", "Главный ресурс прогресса: кирки, мечи, броня, стол зачарования.", None),
    ("emerald", "Изумруд", "Emerald", "material", "Валюта жителей. Добывается в горах.", None),
    ("gold_ingot", "Золотой слиток", "Gold Ingot", "material", "Золото + бартер с пиглинами, яблоки, рельсы, часы.", None),
    ("iron_ingot", "Железный слиток", "Iron Ingot", "material", "Самый нужный металл: инструменты, броня, вёдра, рельсы.", None),
    ("copper_ingot", "Медный слиток", "Copper Ingot", "material", "Медь + громоотводы, подзорная труба и окисляющиеся блоки.", None),
    ("redstone", "Редстоун", "Redstone Dust", "material", "Провода и логика. Основа всех механизмов и зелий.", None),
    ("lapis_lazuli", "Лазурит", "Lapis Lazuli", "material", "Краситель и «валюта» стола зачарования.", None),
    ("coal", "Уголь", "Coal", "material", "Топливо и факелы. Добывается из угольной руды.", None),
    ("stick", "Палка", "Stick", "material", "2 доски. Из неё — почти весь инструмент в игре.", None),
    ("string", "Нить", "String", "material", "Падает с пауков. Луки, удочки, растяжки и шерсть.", None),
    ("feather", "Перо", "Feather", "material", "Куры и стрелы. Ещё — книга с пером и медленное падение.", None),
    ("gunpowder", "Порох", "Gunpowder", "material", "Криперы и гасты. Динамит, фейерверки, зелья.", None),
    ("bone", "Кость", "Bone", "material", "Скелеты. Костная мука ускоряет рост растений.", None),
    ("leather", "Кожа", "Leather", "material", "Коровы и кролики. Броня, сёдла, книги, рамки.", None),
    ("slime_ball", "Слизь", "Slimeball", "material", "Слизни. Липкие поршни и поршни-липучки.", None),
    ("paper", "Бумага", "Paper", "material", "Сахарный тростник. Карты, книги, фейерверки.", None),
    ("book", "Книга", "Book", "material", "3 бумаги + кожа. Стеллажи, стол зачарования, книги с пером.", "item"),
    ("flint", "Кремень", "Flint", "material", "Из гравия. Огниво, стрелы, зажигалки для костра.", None),
    ("amethyst_shard", "Аметистовый осколок", "Amethyst Shard", "material", "Растёт на друзах. Подзорная труба и блок аметиста.", None),
    ("glowstone_dust", "Светопыль", "Glowstone Dust", "material", "Из светокамня. Зелья и усиление редстоун-ламп.", None),

    # ---------------- РЕДКОЕ ----------------
    ("ender_pearl", "Эндер-жемчуг", "Ender Pearl", "rare", "Телепорт на 8 блоков. Нужен для Глаза Эндера и портала в Край.", None),
    ("ender_eye", "Глаз Эндера", "Eye of Ender", "rare", "Жемчуг + огненный порошок. Ищет крепость и открывает портал.", None),
    ("nether_star", "Звезда Нижнего мира", "Nether Star", "rare", "Дроп Иссушителя. Единственный путь к маяку.", None),
    ("netherite_ingot", "Незеритовый слиток", "Netherite Ingot", "rare", "4 обломка + 4 золотых слитка. Улучшает алмазную экипировку.", None),
    ("netherite_scrap", "Незеритовый обломок", "Netherite Scrap", "rare", "Добывается из древних обломков в Нижнем мире, плавится в слитки.", None),
    ("echo_shard", "Осколок эха", "Echo Shard", "rare", "Из глубин древнего города. Восстанавливает всё с эхом.", None),
    ("experience_bottle", "Бутылочка опыта", "Bottle o' Enchanting", "rare", "Продаётся у священника. Бросайте — и собирайте опыт.", None),
    ("ghast_tear", "Слеза гаста", "Ghast Tear", "rare", "Плач гаста в Нижнем мире. Нужна для зелья регенерации.", None),
    ("blaze_rod", "Огненный стержень", "Blaze Rod", "rare", "Дроп всполоха. Варочная стойка и огненный порошок.", None),
    ("dragon_breath", "Дыхание дракона", "Dragon's Breath", "rare", "Собирается бутылкой из облака дракона. Зелья длительного действия.", None),
    ("totem_of_undying", "Тотем бессмертия", "Totem of Undying", "rare", "Дроп эвокера. Спасает от смерти один раз.", None),
    ("elytra", "Элитры", "Elytra", "rare", "Крылья из корабля Края. Полёт с фейерверками — лучший транспорт.", None),
    ("enchanted_book", "Зачарованная книга", "Enchanted Book", "rare", "Находится в сокровищницах. Чарует предметы через наковальню.", None),
    ("shulker_shell", "Раковина шалкера", "Shulker Shell", "rare", "Дроп шалкера в Энде. Два осколка — и шалкеровый ящик готов.", None),
    ("heart_of_the_sea", "Сердце моря", "Heart of the Sea", "rare", "Из затонувших сокровищ. Нужно для крафта проводника.", None),
]


def fetch(url, tries=3):
    last = None
    for n in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; icon-gallery-builder)"})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.2 * (n + 1))
    raise last


def grab_texture(item_id, prefer):
    if prefer and "/" in prefer:
        cands = [prefer]
    elif prefer == "item":
        cands = [f"item/{item_id}.png"]
    else:
        cands = [f"item/{item_id}.png", f"block/{item_id}.png"]
    for rel in cands:
        try:
            raw = fetch(f"{BASE}/{rel}")
            img = Image.open(io.BytesIO(raw))
            img.load()
            img = img.convert("RGBA")
            # анимационная полоса -> первый кадр
            if img.height > img.width:
                img = img.crop((0, 0, img.width, img.width))
            return img, rel
        except Exception:
            continue
    return None, None


def build_background():
    """Тайловый каменный фон 96×96: два слоя блочного шума."""
    rng = np.random.default_rng(20260520)
    size = 96
    coarse = rng.integers(28, 46, size=(12, 12))
    tex = np.kron(coarse, np.ones((8, 8)))
    fine = rng.normal(0, 3.2, size=(size, size))
    tex = np.clip(tex + fine, 0, 255).astype(np.uint8)
    rgb = np.stack([tex, tex, np.clip(tex + 3, 0, 255).astype(np.uint8)], axis=-1)
    Image.fromarray(rgb, "RGB").save(os.path.join(ROOT, "assets", "bg-stone.png"))
    print("bg-stone.png")


def build_favicon(source_icon):
    """Фейс крипера 8×8, увеличенный до 64×64."""
    art = [
        "00000000",
        "00000000",
        "01100110",
        "01100110",
        "00011000",
        "00111100",
        "00111100",
        "00000000",
    ]
    g = (86, 168, 61)
    g_dark = (58, 122, 41)
    black = (18, 28, 17)
    px = 8
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 63, 63], fill=g_dark)
    d.rectangle([0, 0, 62, 62], fill=g)
    for y, row in enumerate(art):
        for x, ch in enumerate(row):
            if ch == "1":
                d.rectangle([x * px, y * px, x * px + px - 1, y * px + px - 1], fill=black)
    img.save(os.path.join(ROOT, "assets", "favicon.png"))
    print("favicon.png")


def build_hero_icons(records):
    """Полоса плавающих иконок для героя — берём самые узнаваемые."""
    return [r for r in records if r["id"] in ("diamond", "netherite_sword", "nether_star", "golden_apple", "ender_pearl", "tnt", "elytra", "emerald")]


def main():
    records = []
    missing = []
    for item_id, ru, en, cat, note, prefer in ITEMS:
        img, rel = grab_texture(item_id, prefer)
        if img is None:
            missing.append(item_id)
            print("MISS", item_id)
            continue
        fname = f"{item_id}.png"
        out = os.path.join(ICONS_DIR, fname)
        img.save(out)
        records.append({
            "id": item_id,
            "ru": ru,
            "en": en,
            "cat": cat,
            "note": note,
            "file": f"assets/icons/{fname}",
            "w": img.width,
            "h": img.height,
            "src": rel,
        })
        print("OK  ", item_id, rel, f"{img.width}x{img.height}")

    # шрифт
    font_path = os.path.join(FONTS_DIR, "PressStart2P-Regular.ttf")
    if not os.path.exists(font_path):
        open(font_path, "wb").write(fetch(FONT_URL))
        print("font ok")

    build_background()
    build_favicon(records[0] if records else None)

    payload = {
        "cats": [{"id": c, "ru": r} for c, r in CATS],
        "items": records,
        "version": "1.21.4",
    }
    with open(os.path.join(ROOT, "data.json"), "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)

    js = "// Автогенерируется build_assets.py\nwindow.MC_DATA = " + json.dumps(payload, ensure_ascii=False, indent=1) + ";\n"
    with open(os.path.join(ROOT, "data.js"), "w", encoding="utf-8") as f:
        f.write(js)

    # zip со всеми png + данными
    zip_path = os.path.join(ROOT, "icons.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for r in records:
            z.write(os.path.join(ROOT, r["file"]), f"minecraft-icons/{r['id']}.png")
        z.write(os.path.join(ROOT, "data.js"), "minecraft-icons/data.js")
        z.write(os.path.join(ROOT, "README.md"), "minecraft-icons/README.md") if os.path.exists(os.path.join(ROOT, "README.md")) else None
    print("zip", os.path.getsize(zip_path), "bytes")

    print(f"\nИтого иконок: {len(records)}; отсутствуют: {missing}")


if __name__ == "__main__":
    main()
