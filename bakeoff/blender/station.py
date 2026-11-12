"""The corridor: ribs, neon, CRT signage, katakana stencils, window bays, stars and a planet."""
import math
import random

import bpy
from mathutils import Vector

from lib import MeshB, crt_mat, env_mat, flat_mat, srgb, tube, sphere, _new, _out, _mix, _math, _ndot

Y0, Y1, BAY = -64.0, 112.0, 4.0
# half cross-section, x>=0 side, floor -> ceiling
PROFILE = [(2.2, 0.0), (2.6, 0.5), (2.6, 2.7), (1.7, 3.6)]

# Stencil glyphs as stroke polylines in a unit box.
GLYPHS = {
    'ト': [[(0.3, 1.0), (0.3, 0.0)], [(0.3, 0.62), (0.8, 0.38)]],
    'ラ': [[(0.2, 0.98), (0.8, 0.98)], [(0.08, 0.66), (0.9, 0.66), (0.78, 0.28), (0.36, 0.0)]],
    'ブ': [[(0.05, 0.86), (0.74, 0.86), (0.64, 0.4), (0.24, 0.0)], [(0.82, 1.06), (0.87, 0.92)], [(0.96, 1.06), (1.01, 0.92)]],
    'ル': [[(0.28, 0.92), (0.28, 0.42), (0.06, 0.03)], [(0.6, 0.98), (0.6, 0.04), (0.96, 0.4)]],
    'セ': [[(0.05, 0.6), (0.9, 0.72), (0.74, 0.4)], [(0.34, 1.0), (0.34, 0.1), (0.9, 0.1)]],
    'ク': [[(0.36, 1.0), (0.1, 0.5)], [(0.36, 0.86), (0.84, 0.86), (0.7, 0.4), (0.3, 0.0)]],
    'タ': [[(0.36, 1.0), (0.1, 0.5)], [(0.36, 0.86), (0.84, 0.86), (0.7, 0.4), (0.3, 0.0)], [(0.3, 0.56), (0.68, 0.34)]],
    'ー': [[(0.05, 0.5), (0.95, 0.5)]],
    '0': [[(0.15, 0.0), (0.15, 1.0), (0.85, 1.0), (0.85, 0.0), (0.15, 0.0)]],
    '7': [[(0.1, 1.0), (0.85, 1.0), (0.4, 0.0)]],
    '4': [[(0.7, 0.0), (0.7, 1.0), (0.1, 0.35), (0.95, 0.35)]],
    '>': [[(0.15, 1.0), (0.85, 0.5), (0.15, 0.0)]],
}


def stencil(mb, text, origin, u, v, size, mat, w=0.13, gap=0.25):
    """Draw glyph strokes as fat quads on the plane (origin, u, v)."""
    origin, u, v = Vector(origin), Vector(u).normalized(), Vector(v).normalized()
    n = u.cross(v)
    x = 0.0
    for ch in text:
        for stroke in GLYPHS.get(ch, []):
            for a, b in zip(stroke, stroke[1:]):
                a2, b2 = Vector(a), Vector(b)
                d = (b2 - a2).normalized()
                p = Vector((-d.y, d.x)) * w / 2
                a2, b2 = a2 - d * w / 2, b2 + d * w / 2
                q = [a2 - p, b2 - p, b2 + p, a2 + p]
                mb.poly([origin + n * 0.012 + u * ((x + c.x) * size) + v * (c.y * size) for c in q], mat)
        x += 1.0 + gap


def star_mat():
    mat, nt = _new('stars')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    vor = nt.nodes.new('ShaderNodeTexVoronoi')
    vor.inputs['Scale'].default_value = 1.1
    nt.links.new(tc.outputs['Object'], vor.inputs['Vector'])
    star = _math(nt, 'LESS_THAN', vor.outputs['Distance'], 0.045)
    big = nt.nodes.new('ShaderNodeTexNoise')
    big.inputs['Scale'].default_value = 0.012
    nt.links.new(tc.outputs['Object'], big.inputs['Vector'])
    neb = _math(nt, 'GREATER_THAN', big.outputs[0], 0.56)
    sky = _mix(nt, neb, srgb('#05061c'), srgb('#1a0b45'))
    col = _mix(nt, star, sky, (6.0, 6.5, 8.0, 1.0))
    _out(nt, col)
    return mat


def planet_mat():
    mat, nt = _new('planet')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs[0])
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 0.03
    nt.links.new(tc.outputs['Object'], noise.inputs['Vector'])
    z = _math(nt, 'ADD', _math(nt, 'MULTIPLY', sep.outputs['Z'], 0.05), _math(nt, 'MULTIPLY', noise.outputs[0], 0.9))
    band = _math(nt, 'GREATER_THAN', _math(nt, 'SINE', _math(nt, 'MULTIPLY', z, 5.0)), 0.1)
    lit = _mix(nt, band, srgb('#52c8f0'), srgb('#d8f6ff'))
    dark = _mix(nt, band, srgb('#2a1c86'), srgb('#3c2aa8'))
    term = _math(nt, 'GREATER_THAN', _ndot(nt, (-0.5, -0.75, 0.45)), 0.05)
    _out(nt, _mix(nt, term, dark, lit), 1.0)
    return mat


def build():
    rnd = random.Random(7)
    M = dict(
        wall=env_mat('wall', '#1b1e58'),
        floor=env_mat('floor', '#171a4c', tones=(0.5, 0.8, 1.0)),
        rib=env_mat('rib', '#2f3690'),
        dark=env_mat('dark', '#0c0d2a'),
        hazard=env_mat('hazard', '#ffb21e', fog=0.75),
        paint=env_mat('paint', '#e8ecff', fog=0.8),
        cyan=flat_mat('neon_cyan', '#19e6ff', 7.0),
        mag=flat_mat('neon_mag', '#ff2bc8', 7.0),
        glow=env_mat('floor_glow', '#6a1a8c', tones=(1, 1, 1), fog=0.6),
        lamp=flat_mat('lamp', '#d6f0ff', 4.0),
        amber=flat_mat('amber', '#ffb020', 5.0),
        dash=flat_mat('dash', '#ffb020', 2.2),
        crt=crt_mat('crt', '#04302c', '#0c6a5c', 70.0, 1.0),
        crt_txt=flat_mat('crt_txt', '#7dffd0', 4.5),
        crt_red=crt_mat('crt_red', '#3a0418', '#8a0c30', 70.0, 1.2),
        crt_txt2=flat_mat('crt_txt2', '#ffd9a0', 5.0),
    )
    names = list(M)
    idx = {k: i for i, k in enumerate(names)}
    mb = MeshB()      # everything painted/static
    ribs = MeshB()    # chunky ribs get an ink outline

    full = [(-x, z) for x, z in PROFILE] + [(x, z) for x, z in reversed(PROFILE)]  # left floor -> ceiling -> right floor
    nb = int((Y1 - Y0) / BAY)
    for b in range(nb):
        ya, yb = Y0 + b * BAY, Y0 + (b + 1) * BAY
        # floor
        mb.quad(Vector((-2.2, ya, 0)), Vector((2.2, ya, 0)), Vector((2.2, yb, 0)), Vector((-2.2, yb, 0)), idx['floor'])
        # floor seams + lane dashes
        mb.box((0, ya + 0.02, 0.004), (4.4, 0.06, 0.008), idx['dark'])
        for xx in (-1.1, 1.1):
            mb.box((xx, (ya + yb) / 2, 0.004), (0.05, BAY, 0.008), idx['dark'])
        for k in range(2):
            mb.box((0, ya + 0.6 + k * 2.0, 0.006), (0.16, 1.1, 0.012), idx['dash'])
        window = (b % 3 != 2)
        for (xa, za), (xb, zb) in zip(full, full[1:]):
            right_wall = (xa == 2.6 and xb == 2.6)
            left_wall = (xa == -2.6 and xb == -2.6)
            ceil = (za == 3.6 and zb == 3.6)
            if right_wall and window:
                # frame around an opening z 0.95..2.35, y inset 0.55
                wa, wb, z0, z1 = ya + 0.55, yb - 0.55, 0.95, 2.35
                x = 2.6
                mb.quad(Vector((x, ya, 2.7)), Vector((x, yb, 2.7)), Vector((x, yb, z1)), Vector((x, ya, z1)), idx['wall'])
                mb.quad(Vector((x, ya, z0)), Vector((x, yb, z0)), Vector((x, yb, 0.5)), Vector((x, ya, 0.5)), idx['wall'])
                mb.quad(Vector((x, ya, z1)), Vector((x, wa, z1)), Vector((x, wa, z0)), Vector((x, ya, z0)), idx['wall'])
                mb.quad(Vector((x, wb, z1)), Vector((x, yb, z1)), Vector((x, yb, z0)), Vector((x, wb, z0)), idx['wall'])
                # chunky sill + mullion
                mb.box((x + 0.1, (wa + wb) / 2, z0 - 0.06), (0.5, wb - wa + 0.3, 0.12), idx['rib'])
                mb.box((x + 0.1, (wa + wb) / 2, z1 + 0.06), (0.5, wb - wa + 0.3, 0.12), idx['rib'])
                mb.box((x + 0.12, (wa + wb) / 2, (z0 + z1) / 2), (0.1, 0.1, z1 - z0), idx['dark'])
                continue
            mat = idx['wall']
            mb.quad(Vector((xa, ya, za)), Vector((xb, ya, zb)), Vector((xb, yb, zb)), Vector((xa, yb, za)), mat)
            if ceil:
                mb.box((0, (ya + yb) / 2, 3.58), (1.3, 1.5, 0.05), idx['lamp'])
                mb.box((0, (ya + yb) / 2, 3.55), (1.7, 1.9, 0.06), idx['dark'])
            if left_wall or (right_wall and not window):
                sx = 1 if xa > 0 else -1
                x = xa - sx * 0.01
                u = Vector((0, -sx, 0))  # reading direction seen from inside
                # panel seams
                for zz in (1.0, 2.2):
                    mb.box((x, (ya + yb) / 2, zz), (0.03, BAY, 0.05), idx['dark'])
                kind = (b * 5 + (0 if sx < 0 else 2)) % 4
                yc = (ya + yb) / 2
                if kind == 0:   # CRT wall monitor with katakana
                    mb.box((x - sx * 0.05, yc, 1.62), (0.16, 2.5, 1.0), idx['dark'])
                    xs = x - sx * 0.14
                    o = Vector((xs, yc + sx * 1.1, 1.2))
                    mb.quad(o, o + u * 2.2, o + u * 2.2 + Vector((0, 0, 0.84)), o + Vector((0, 0, 0.84)), idx['crt'])
                    stencil(mb, 'トラブル', o + u * 0.18 + Vector((0, 0, 0.2)), u, (0, 0, 1), 0.4, idx['crt_txt'], w=0.15)
                elif kind == 1:  # big painted sector stencil
                    o = Vector((x, yc + sx * 1.3, 1.15))
                    stencil(mb, 'セクター07', o, u, (0, 0, 1), 0.36, idx['paint'], w=0.16, gap=0.2)
                    mb.box((x, yc, 0.78), (0.02, 3.0, 0.1), idx['hazard'])
                elif kind == 2:  # pipes + hazard blocks
                    for zz in (1.3, 1.55, 1.8):
                        mb.box((x - sx * 0.06, yc, zz), (0.12, BAY, 0.12), idx['rib'])
                    for k in range(5):
                        mb.box((x - sx * 0.005, ya + 0.6 + k * 0.7, 2.4), (0.02, 0.35, 0.2), idx['hazard'])
                else:            # red warning CRT
                    mb.box((x - sx * 0.05, yc, 1.9), (0.16, 1.7, 0.8), idx['dark'])
                    xs = x - sx * 0.14
                    o = Vector((xs, yc + sx * 0.7, 1.58))
                    mb.quad(o, o + u * 1.4, o + u * 1.4 + Vector((0, 0, 0.64)), o + Vector((0, 0, 0.64)), idx['crt_red'])
                    stencil(mb, '>>47', o + u * 0.12 + Vector((0, 0, 0.14)), u, (0, 0, 1), 0.26, idx['crt_txt2'], w=0.16)
        # neon strips: cyan in the upper chamfer corners, magenta along the floor edge
        for sx in (-1, 1):
            mb.box((sx * 2.57, (ya + yb) / 2, 2.72), (0.07, BAY - 0.7, 0.07), idx['cyan'])
            mb.box((sx * 2.22, (ya + yb) / 2, 0.05), (0.06, BAY - 0.7, 0.06), idx['mag'])
            mb.box((sx * 1.95, (ya + yb) / 2, 0.003), (0.42, BAY - 0.9, 0.006), idx['glow'])
            mb.box((sx * 1.2, (ya + yb) / 2, 3.52), (0.22, BAY, 0.16), idx['rib'])  # ceiling conduits
        # rib: chunky arch frame
        inner = [(x * 0.84, min(z, 3.6) * 0.9 if z > 0 else 0.0) for x, z in full]
        d = 0.28
        for (oa, ob_), (ia, ib) in zip(zip(full, full[1:]), zip(inner, inner[1:])):
            v = [Vector((oa[0], ya - d, oa[1])), Vector((ob_[0], ya - d, ob_[1])), Vector((ib[0], ya - d, ib[1])), Vector((ia[0], ya - d, ia[1])),
                 Vector((oa[0], ya + d, oa[1])), Vector((ob_[0], ya + d, ob_[1])), Vector((ib[0], ya + d, ib[1])), Vector((ia[0], ya + d, ia[1]))]
            f = [(0, 1, 2, 3), (7, 6, 5, 4), (3, 2, 6, 7), (0, 3, 7, 4), (1, 5, 6, 2)]
            ribs.add((v, f, [0] * 5))
        # rib details: hazard feet, amber marker lamps
        for sx in (-1, 1):
            mb.box((sx * 2.12, ya, 0.3), (0.34, 0.6, 0.12), idx['hazard'])
            mb.box((sx * 2.19, ya - 0.3, 1.75), (0.06, 0.03, 0.5), idx['amber'])
        # hanging CRT sign, facing the camera (-Y), every third bay alternating side
        if b % 3 == 1:
            sx = 1 if (b // 3) % 2 else -1
            cx, cy, cz = sx * 0.95, ya + 1.4, 2.75
            mb.box((cx, cy, cz), (1.5, 0.3, 0.62), idx['dark'])
            mb.box((cx - 0.55, cy, 3.25), (0.06, 0.06, 0.5), idx['rib'])
            mb.box((cx + 0.55, cy, 3.25), (0.06, 0.06, 0.5), idx['rib'])
            o = Vector((cx - 0.68, cy - 0.16, cz - 0.24))
            scr, txt = ('crt', 'crt_txt') if sx < 0 else ('crt_red', 'crt_txt2')
            mb.quad(o, o + Vector((1.36, 0, 0)), o + Vector((1.36, 0, 0.48)), o + Vector((0, 0, 0.48)), idx[scr])
            stencil(mb, 'トラブル' if sx < 0 else 'セクタ7', o + Vector((0.08, 0, 0.1)), (1, 0, 0), (0, 0, 1), 0.25, idx[txt], w=0.16)

    # end bulkhead with a glowing ring door
    mb.quad(Vector((-2.7, Y1, 0)), Vector((2.7, Y1, 0)), Vector((2.7, Y1, 3.7)), Vector((-2.7, Y1, 3.7)), idx['dark'])
    ring = [(math.cos(a) * 1.4, Y1 - 0.2, 1.8 + math.sin(a) * 1.4) for a in [i * math.pi / 12 for i in range(24)]]
    mb.add(tube(ring, (0.09, 0.09), n=6, up=(0, 1, 0), closed=True), mat=idx['cyan'])

    station = mb.build('station', [M[k] for k in names], recalc=False, shadow=False)
    rib_ob = ribs.build('ribs', [M['rib']], outline=0.03, shadow=False)

    # outside: star field + banded planet with a ring
    sky = MeshB()
    sky.quad(Vector((260, -500, -300)), Vector((260, 3000, -300)), Vector((260, 3000, 500)), Vector((260, -500, 500)))
    sky.build('sky', [star_mat()], recalc=False, shadow=False)
    pl = MeshB().add(sphere(62, 48, 24)).build('planet', [planet_mat()], smooth=True, shadow=False)
    pl.location = (150, 300, 58)
    pl.rotation_euler = (0.35, 0.2, 0)
    rg = MeshB()
    for i in range(64):
        a0, a1 = 2 * math.pi * i / 64, 2 * math.pi * (i + 1) / 64
        for r0, r1, m in ((80, 94, 0), (97, 112, 1)):
            rg.quad(Vector((math.cos(a0) * r0, math.sin(a0) * r0, 0)), Vector((math.cos(a1) * r0, math.sin(a1) * r0, 0)),
                    Vector((math.cos(a1) * r1, math.sin(a1) * r1, 0)), Vector((math.cos(a0) * r1, math.sin(a0) * r1, 0)), m)
    ring_ob = rg.build('planet_ring', [flat_mat('ring_a', '#f4e6ff', 1.2), flat_mat('ring_b', '#ff7ab8', 1.0)], recalc=False, shadow=False)
    ring_ob.location = pl.location
    ring_ob.rotation_euler = (1.25, 0.35, 0)
    return station, rib_ob
