"""Rebuild the local Portuguese edition from the official variable source.
Requires: fonttools[woff], brotli. Original glyphs and metrics are preserved.
Run from any directory: python tools/fonts/build_42dot_pt.py
"""
from pathlib import Path
from copy import deepcopy
import hashlib
import json
import unicodedata
import urllib.request
import tempfile
from fontTools import subset

from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import otTables
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphCoordinates
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/fonts"
SOURCE = Path(tempfile.gettempdir()) / "Cobyte-Fontes/42dotSans-original.ttf"
URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/42dotsans/42dotSans%5Bwght%5D.ttf"
EXPECTED_SHA256 = "cf9ec2f79b6d13384eef338477a223800a547fbb21665eb0ea1330a513805b6a"
WEIGHTS = (300, 400, 500, 600, 700, 800)


def bounds(font, name):
    glyph = font["glyf"][name]
    glyph.recalcBounds(font["glyf"])
    return glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax


def add_glyph(font, name, glyph, width=0, lsb=None):
    if name not in font.getGlyphOrder():
        font.setGlyphOrder(font.getGlyphOrder() + [name])
    font["glyf"][name] = glyph
    glyph.recalcBounds(font["glyf"])
    font["hmtx"][name] = (width, glyph.xMin if lsb is None else lsb)
    if "vmtx" in font:
        font["vmtx"][name] = (font["head"].unitsPerEm, font["hhea"].ascent - glyph.yMax)


def transformed(font, source, matrix):
    glyphs = font.getGlyphSet()
    pen = TTGlyphPen(glyphs)
    glyphs[source].draw(TransformPen(pen, matrix))
    return pen.glyph()


def mapped(font, code, name):
    for table in font["cmap"].tables:
        if table.isUnicode() and table.format in (4, 12):
            table.cmap[code] = name


def build_marks(font, weight):
    cmap = font.getBestCmap()
    # Existing grave, tilde, circumflex punctuation and period supply the style.
    grave = cmap[0x300]
    gx, gy, gxx, _ = bounds(font, grave)
    add_glyph(font, "cobyte.grave", transformed(font, grave, (1, 0, 0, 1, -(gx + gxx) / 2, -gy)))
    add_glyph(font, "cobyte.acute", transformed(font, "cobyte.grave", (-1, 0, 0, 1, 0, 0)))
    tilde = cmap[0x303]
    tx, ty, txx, _ = bounds(font, tilde)
    add_glyph(font, "cobyte.tilde", transformed(font, tilde, (1, 0, 0, 1, -(tx + txx) / 2, -ty)))
    circum = cmap[ord("^")]
    cx, cy, cxx, _ = bounds(font, circum)
    add_glyph(font, "cobyte.circumflex", transformed(font, circum, (.58, 0, 0, .42, -(cx + cxx) * .29, -cy * .42)))
    period = cmap[ord(".")]
    px, py, pxx, _ = bounds(font, period)
    pen = TTGlyphPen(font.getGlyphSet())
    for offset in (-85, 85):
        font.getGlyphSet()[period].draw(TransformPen(pen, (.85, 0, 0, .85, offset - (px + pxx) * .425, -py * .85)))
    add_glyph(font, "cobyte.dieresis", pen.glyph())

    # Curved cedilla: a short attachment and a hook, with thickness matching weight.
    delta = (weight - 400) / 400
    pen = TTGlyphPen(None)
    pen.moveTo((-15 - 7*delta, 7))
    pen.lineTo((28 + 7*delta, 7))
    pen.lineTo((7, -39))
    pen.qCurveTo((76 + 7*delta, -35), (80 + 9*delta, -91))
    pen.qCurveTo((83 + 9*delta, -155 - 4*delta), (10, -163 - 4*delta))
    pen.qCurveTo((-30, -167 - 4*delta), (-62 - 5*delta, -147 - 4*delta))
    pen.lineTo((-48 - 3*delta, -110 + 5*delta))
    pen.qCurveTo((-20, -126 + 5*delta), (9, -125 + 5*delta))
    pen.qCurveTo((39 - 5*delta, -123 + 5*delta), (40 - 6*delta, -96))
    pen.qCurveTo((40 - 6*delta, -71 + 5*delta), (8, -72 + 5*delta))
    pen.lineTo((-40 - 6*delta, -72 + 5*delta))
    pen.closePath()
    add_glyph(font, "cobyte.cedilla", pen.glyph())
    return {0x300: "cobyte.grave", 0x301: "cobyte.acute",
            0x302: "cobyte.circumflex", 0x303: "cobyte.tilde",
            0x308: "cobyte.dieresis", 0x327: "cobyte.cedilla"}


def dotless_i(font):
    cmap = font.getBestCmap()
    if 0x131 in cmap:
        return cmap[0x131]
    original = font["glyf"][cmap[ord("i")]]
    coords, ends, flags = original.getCoordinates(font["glyf"])
    result, result_flags, result_ends = [], [], []
    last = 0
    height = bounds(font, cmap[ord("a")])[3]
    for end in ends:
        contour = list(coords[last:end+1])
        if max(y for x, y in contour) <= height + 20:
            result.extend(contour)
            result_flags.extend(flags[last:end+1])
            result_ends.append(len(result)-1)
        last = end + 1
    glyph = Glyph()
    glyph.numberOfContours = len(result_ends)
    glyph.coordinates = GlyphCoordinates(result)
    glyph.endPtsOfContours = result_ends
    glyph.flags = bytearray(result_flags)
    from fontTools.ttLib.tables.ttProgram import Program
    glyph.program = Program()
    glyph.program.fromBytecode([])
    add_glyph(font, "cobyte.dotlessi", glyph, *font["hmtx"][cmap[ord("i")]])
    return "cobyte.dotlessi"


def add_decomposed_ligatures(font, pairs):
    # Append to ccmp without replacing the original shaping tables.
    table = font["GSUB"].table
    lookup = otTables.Lookup()
    lookup.LookupType = 4
    lookup.LookupFlag = 0
    lookup.SubTableCount = 1
    subtable = otTables.LigatureSubst()
    subtable.ligatures = {}
    for first, accent, output in pairs:
        ligature = otTables.Ligature()
        ligature.CompCount = 2
        ligature.Component = [accent]
        ligature.LigGlyph = output
        subtable.ligatures.setdefault(first, []).append(ligature)
    lookup.SubTable = [subtable]
    index = len(table.LookupList.Lookup)
    table.LookupList.Lookup.append(lookup)
    table.LookupList.LookupCount += 1
    for record in table.FeatureList.FeatureRecord:
        if record.FeatureTag == "ccmp":
            record.Feature.LookupListIndex.insert(0, index)
            record.Feature.LookupCount += 1


def build(weight):
    font = TTFont(SOURCE)
    options = subset.Options()
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_legacy = True
    options.name_languages = ["*"]
    reduction = subset.Subsetter(options=options)
    reduction.populate(unicodes=set(range(0x250)) | set(range(0x300, 0x370)) | set(range(0x2000, 0x2070)) | {0x20AC, 0x2122, 0x2212})
    reduction.subset(font)
    font = instantiateVariableFont(font, {"wght": weight}, inplace=True)
    original = font.getBestCmap().copy()
    original_glyphs = {name: deepcopy(font["glyf"][name]) for name in set(original.values())}
    original_metrics = {name: font["hmtx"][name] for name in original_glyphs}
    marks = build_marks(font, weight)
    dotless = dotless_i(font)
    pairs, created = [], []
    # Canonically composed Latin characters; preserve all characters supplied upstream.
    for code in range(0xC0, 0x180):
        decomposition = unicodedata.normalize("NFD", chr(code))
        if len(decomposition) != 2:
            continue
        base, accent = map(ord, decomposition)
        if base not in original or accent not in marks:
            continue
        base_name = original[base]
        draw_base = dotless if base == ord("i") else base_name
        target = original.get(code)
        if target is None:
            target = "cobyte.uni%04X" % code
            xmin, ymin, xmax, ymax = bounds(font, draw_base)
            center = (xmin + xmax) / 2
            mark = marks[accent]
            glyphs = font.getGlyphSet()
            pen = TTGlyphPen(glyphs)
            pen.addComponent(draw_base, (1, 0, 0, 1, 0, 0))
            if accent == 0x327:
                pen.addComponent(mark, (1, 0, 0, 1, center, ymin + 3))
            else:
                pen.addComponent(mark, (1, 0, 0, 1, center, ymax + 45))
            add_glyph(font, target, pen.glyph(), *font["hmtx"][base_name])
            mapped(font, code, target)
            created.append(chr(code))
        # Newly missing combining marks are supplied for decomposed input as well.
        if accent not in original:
            mapped(font, accent, marks[accent])
        mark_name = original.get(accent, marks[accent])
        pairs.append((base_name, mark_name, target))
    add_decomposed_ligatures(font, pairs)
    spacing = {0xB4: 0x301, 0xB8: 0x327, 0xA8: 0x308, 0x2C6: 0x302}
    for code, accent in spacing.items():
        if code not in original:
            name = "cobyte.spacing%04X" % code
            add_glyph(font, name, transformed(font, marks[accent],
                (1,0,0,1,200,0 if accent == 0x327 else 640)), 400)
            mapped(font, code, name)
    # Rename derivative internally; CSS retains the requested family alias.
    for name_id, text in {1:"Cobyte 42dot Sans PT", 2:str(weight),
            3:"Cobyte42dotSansPT-1.0-%s" % weight,
            4:"Cobyte 42dot Sans PT %s" % weight,
            6:"Cobyte42dotSansPT-%s" % weight,
            16:"Cobyte 42dot Sans PT", 17:str(weight)}.items():
        font["name"].setName(text, name_id, 3, 1, 0x409)
    # Verify that no upstream outline or horizontal metrics changed.
    for name, old in original_glyphs.items():
        new = font["glyf"][name]
        assert old.compile(font["glyf"]) == new.compile(font["glyf"]), name
        assert original_metrics[name] == font["hmtx"][name], name
    required = "áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ"
    assert all(ord(char) in font.getBestCmap() for char in required)
    font["OS/2"].usWeightClass = weight
    font.save(SOURCE.parent / ("42dot-sans-pt-%s.ttf" % weight))
    font.flavor = "woff2"
    target = OUT / ("42dot-sans-pt-%s.woff2" % weight)
    font.save(target)
    reopened = TTFont(target)
    assert all(ord(char) in reopened.getBestCmap() for char in required)
    return {"weight": weight, "added": "".join(created), "bytes": target.stat().st_size}


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    SOURCE.parent.mkdir(parents=True, exist_ok=True)
    if not SOURCE.exists():
        urllib.request.urlretrieve(URL, SOURCE)
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != EXPECTED_SHA256:
        raise RuntimeError("Upstream font changed; review the source before regenerating.")
    results = [build(weight) for weight in WEIGHTS]
    (OUT / "build-manifest.json").write_text(json.dumps({
        "source": URL,
        "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "results": results
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=True))
