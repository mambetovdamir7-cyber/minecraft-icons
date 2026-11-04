# -*- coding: utf-8 -*-
"""
Сбор рецептов Minecraft 1.21.4 (misode/mcmeta) в компактный recipes.js:
  - сетка крафта, плавка, камень, кузнечный стол
  - теги предметов раскрываются до конкретных id
  - отдельно таблица варки зелий (в ванилле она захардкожена)
"""
import json
import os
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.abspath(__file__))
REF = "26.3-data"
RAW = f"https://raw.githubusercontent.com/misode/mcmeta/{REF}"
H = {"User-Agent": "icon-gallery-builder"}

STATIONS = {
    "crafting_shaped": "crafting",
    "crafting_shapeless": "crafting",
    "crafting_transmute": "crafting",
    "smelting": "furnace",
    "blasting": "blasting",
    "smoking": "smoking",
    "campfire_cooking": "campfire",
    "stonecutting": "stonecutter",
    "smithing_transform": "smithing",
    "smithing_trim": "smithing",
}

# ---------------- зелья (ванильная таблица варки) ----------------
BASE_POTIONS = [("water", "nether_wart", "awkward")]
POTION_RECIPES = [
    ("awkward", "golden_carrot", "night_vision"),
    ("awkward", "magma_cream", "fire_resistance"),
    ("awkward", "rabbit_foot", "leaping"),
    ("awkward", "glistering_melon_slice", "healing"),
    ("awkward", "spider_eye", "poison"),
    ("awkward", "pufferfish", "water_breathing"),
    ("awkward", "ghast_tear", "regeneration"),
    ("awkward", "blaze_powder", "strength"),
    ("awkward", "sugar", "swiftness"),
    ("awkward", "turtle_helmet", "turtle_master"),
    ("awkward", "phantom_membrane", "slow_falling"),
    ("awkward", "breeze_rod", "wind_charged"),
    ("awkward", "slime_block", "oozing"),
    ("awkward", "stone", "infested"),
    ("awkward", "cobweb", "weaving"),
]
MODIFIERS = [
    ("redstone", "long", "длительность"),
    ("glowstone_dust", "strong", "усиление"),
    ("fermented_spider_eye", "corrupt", "порча"),
    ("gunpowder", "splash", "взрывное"),
    ("dragon_breath", "lingering", "туманное"),
]
POTION_NAMES = {
    "night_vision": "Ночное зрение", "fire_resistance": "Огнестойкость", "leaping": "Прыгучесть",
    "healing": "Лечение", "poison": "Отравление", "water_breathing": "Подводное дыхание",
    "regeneration": "Регенерация", "strength": "Сила", "swiftness": "Скорость",
    "turtle_master": "Мастер-черепаха", "slow_falling": "Медленное падение",
    "wind_charged": "Ветер", "oozing": "Слизь", "infested": "Заражение", "weaving": "Плетение",
    "awkward": "Неуклюжее", "water": "Вода",
}


def fetch(url, tries=6):
    import time as _t
    last = None
    for n in range(tries):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=90)
            data = r.read()
            if r.length is not None and len(data) < r.length:
                raise IOError("short read")
            return data
        except Exception as e:  # noqa: BLE001
            last = e
            _t.sleep(1.5 * (n + 1))
    raise last


def get_json(path):
    return json.loads(fetch(f"{RAW}/{path}"))


def tree():
    url = f"https://api.github.com/repos/misode/mcmeta/git/trees/{REF}?recursive=1"
    return json.loads(fetch(url))["tree"]


def norm_ing(v):
    """Приводит ингредиент к списку вариантов ['minecraft:x', '#tag']."""
    if isinstance(v, str):
        return [v]
    if isinstance(v, list):
        out = []
        for x in v:
            out += norm_ing(x)
        return out
    if isinstance(v, dict):
        if "item" in v:
            return [v["item"]]
        if "tag" in v:
            return ["#" + v["tag"]]
    return []


def main():
    print("читаю дерево репозитория ...")
    files = [t["path"] for t in tree()
             if t["path"].startswith("data/minecraft/recipe/") and t["path"].endswith(".json")]
    tag_files = [t["path"] for t in tree()
                 if t["path"].startswith("data/minecraft/tags/item/") and t["path"].endswith(".json")]
    print(f"рецептов: {len(files)} | тегов: {len(tag_files)}")

    tags = {}
    if tag_files:
        with ThreadPoolExecutor(max_workers=12) as ex:
            for path, raw in zip(tag_files, ex.map(lambda p: fetch(f"{RAW}/{p}"), tag_files)):
                name = "minecraft:" + path.rsplit("/", 1)[1][:-5]
                try:
                    tags[name] = json.loads(raw).get("values", [])
                except Exception:
                    pass
        print("тегов загружено:", len(tags))

    def resolve(opt):
        """#tag -> первый конкретный предмет (для иконки)."""
        if not opt.startswith("#"):
            return opt.replace("minecraft:", "", 1), opt
        vals = tags.get(opt.replace("#", ""), [])
        for v in vals:
            v = v if isinstance(v, str) else v.get("id", "")
            if v.startswith("minecraft:"):
                return v.replace("minecraft:", "", 1), opt
        return "barrier", opt

    recipes = []
    bad = 0

    def work(path):
        try:
            return path, json.loads(fetch(f"{RAW}/{path}"))
        except Exception:
            return path, None

    with ThreadPoolExecutor(max_workers=12) as ex:
        for path, js in ex.map(work, files):
            if not js:
                bad += 1
                continue
            rtype = js.get("type", "").replace("minecraft:", "")
            station = STATIONS.get(rtype)
            if not station:
                continue
            res = js.get("result") or {}
            if isinstance(res, str):
                res = {"id": res, "count": 1}
            rid = (res.get("id") or "").replace("minecraft:", "")
            if not rid:
                continue
            item = {
                "i": path.rsplit("/", 1)[1][:-5],
                "s": station,
                "r": rid,
                "n": res.get("count", 1),
            }
            if rtype == "crafting_shaped":
                item["t"] = "shaped"
                item["p"] = js.get("pattern", [])
                key = {}
                for sym, v in (js.get("key") or {}).items():
                    opts = norm_ing(v)
                    parts = []
                    for o in opts:
                        icon, ref = resolve(o)
                        parts.append({"id": icon, "ref": ref})
                    key[sym] = parts
                item["k"] = key
            elif rtype == "crafting_shapeless":
                item["t"] = "shapeless"
                ing = []
                for v in js.get("ingredients", []):
                    opts = norm_ing(v)
                    parts = []
                    for o in opts:
                        icon, ref = resolve(o)
                        parts.append({"id": icon, "ref": ref})
                    ing.append(parts)
                item["g"] = ing
            elif rtype in ("smelting", "blasting", "smoking", "campfire_cooking"):
                item["t"] = "cook"
                ing = []
                for o in norm_ing(js.get("ingredient")):
                    icon, ref = resolve(o)
                    ing.append({"id": icon, "ref": ref})
                item["g"] = [ing]
                if js.get("cookingtime"):
                    item["c"] = js["cookingtime"]
            elif rtype == "stonecutting":
                item["t"] = "cut"
                ing = []
                for o in norm_ing(js.get("ingredient")):
                    icon, ref = resolve(o)
                    ing.append({"id": icon, "ref": ref})
                item["g"] = [ing]
            elif rtype in ("smithing_transform", "smithing_trim"):
                item["t"] = "smith"
                slots = []
                for k in ("template", "base", "addition"):
                    v = js.get(k)
                    opts = norm_ing(v) if v else []
                    if not opts:
                        slots.append([])
                        continue
                    parts = []
                    for o in opts:
                        icon, ref = resolve(o)
                        parts.append({"id": icon, "ref": ref})
                    slots.append(parts)
                item["g"] = slots
            else:
                item["t"] = "misc"
            recipes.append(item)

    recipes.sort(key=lambda x: (x["r"], x["i"]))
    payload = {
        "version": "26.3",
        "stations": [{"id": "crafting", "ru": "Верстак"}, {"id": "furnace", "ru": "Печь"},
                     {"id": "blasting", "ru": "Плавильня"}, {"id": "smoking", "ru": "Коптильня"},
                     {"id": "campfire", "ru": "Костёр"}, {"id": "stonecutter", "ru": "Камнерез"},
                     {"id": "smithing", "ru": "Кузнечный стол"}],
        "recipes": recipes,
        "potions": {
            "base": [{"from": b, "ing": i, "to": t, "name": POTION_NAMES.get(t, t)} for b, i, t in BASE_POTIONS],
            "list": [{"from": b, "ing": i, "to": t, "name": POTION_NAMES.get(t, t)} for b, i, t in POTION_RECIPES],
            "mods": [{"ing": i, "kind": k, "ru": ru} for i, k, ru in MODIFIERS],
        },
    }
    out = os.path.join(ROOT, "recipes.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write("// Автогенерируется build_recipes.py — рецепты Minecraft 1.21.4\n")
        f.write("window.MC_RECIPES = " + json.dumps(payload, ensure_ascii=False) + ";\n")
    print(f"готово: {len(recipes)} рецептов, ошибок {bad}, файл {os.path.getsize(out)//1024} КБ")


if __name__ == "__main__":
    main()
