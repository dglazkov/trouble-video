"""Shared helpers: colours, mesh primitives, toon / outline / emission materials."""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector


def srgb(h, a=1.0):
    """'#rrggbb' -> linear RGBA tuple."""
    h = h.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, a)


# ----------------------------------------------------------------- materials
def _new(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    return mat, nt


def _out(nt, color_socket, strength=1.0):
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Strength'].default_value = strength
    nt.links.new(color_socket, em.inputs['Color'])
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    return em


def _mix(nt, fac, a, b):
    """Colour mix; fac/a/b may be sockets or constants."""
    m = nt.nodes.new('ShaderNodeMix')
    m.data_type = 'RGBA'
    for key, val in (('Factor_Float', fac), ('A_Color', a), ('B_Color', b)):
        sock = next(s for s in m.inputs if s.identifier == key)
        if isinstance(val, bpy.types.NodeSocket):
            nt.links.new(val, sock)
        else:
            sock.default_value = val
    return next(s for s in m.outputs if s.identifier == 'Result_Color')


def _math(nt, op, a, b=None, c=None):
    m = nt.nodes.new('ShaderNodeMath')
    m.operation = op
    for i, val in enumerate((a, b, c)):
        if val is None:
            continue
        if isinstance(val, bpy.types.NodeSocket):
            nt.links.new(val, m.inputs[i])
        else:
            m.inputs[i].default_value = val
    return m.outputs[0]


def _ndot(nt, vec):
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    d = nt.nodes.new('ShaderNodeVectorMath')
    d.operation = 'DOT_PRODUCT'
    nt.links.new(geo.outputs['Normal'], d.inputs[0])
    d.inputs[1].default_value = Vector(vec).normalized()
    return d.outputs['Value']


RIM_DIR = (0.75, 0.45, 0.35)


def toon_mat(name, light, shadow, rim=None, thr=0.22):
    """Hard 2-tone cel shader: sun-lit diffuse -> ShaderToRGB -> step, plus a hard rim."""
    mat, nt = _new(name)
    diff = nt.nodes.new('ShaderNodeBsdfDiffuse')
    diff.inputs['Color'].default_value = (1, 1, 1, 1)
    s2r = nt.nodes.new('ShaderNodeShaderToRGB')
    nt.links.new(diff.outputs[0], s2r.inputs[0])
    step = _math(nt, 'GREATER_THAN', s2r.outputs['Color'], thr)
    col = _mix(nt, step, srgb(shadow), srgb(light))
    if rim:
        lw = nt.nodes.new('ShaderNodeLayerWeight')
        lw.inputs['Blend'].default_value = 0.5
        edge = _math(nt, 'GREATER_THAN', lw.outputs['Facing'], 0.62)
        side = _math(nt, 'GREATER_THAN', _ndot(nt, RIM_DIR), 0.25)
        col = _mix(nt, _math(nt, 'MULTIPLY', edge, side), col, srgb(rim))
    _out(nt, col)
    return mat


def outline_mat(name='ink', color='#0a0618'):
    mat, nt = _new(name)
    rgb = nt.nodes.new('ShaderNodeRGB')
    rgb.outputs[0].default_value = srgb(color)
    _out(nt, rgb.outputs[0])
    mat.use_backface_culling = True
    mat.use_backface_culling_shadow = True
    return mat


def flat_mat(name, color, strength=1.0):
    mat, nt = _new(name)
    rgb = nt.nodes.new('ShaderNodeRGB')
    rgb.outputs[0].default_value = srgb(color)
    _out(nt, rgb.outputs[0], strength)
    return mat


FOG = '#30157a'


def env_mat(name, color, tones=(0.42, 0.72, 1.0), fog=0.85, fog_far=85.0):
    """Painted-background style: 3 hard tones from the normal, fading into violet haze."""
    mat, nt = _new(name)
    d = _ndot(nt, (0.25, -0.55, 0.8))
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    cr = ramp.color_ramp
    cr.interpolation = 'CONSTANT'
    base = Vector(srgb(color))
    cr.elements[0].position = 0.0
    cr.elements[0].color = (*(base * tones[0])[:3], 1)
    cr.elements[1].position = 0.38
    cr.elements[1].color = (*(base * tones[1])[:3], 1)
    e = cr.elements.new(0.7)
    e.color = (*(base * tones[2])[:3], 1)
    nt.links.new(_math(nt, 'MULTIPLY_ADD', d, 0.5, 0.5), ramp.inputs[0])
    cam = nt.nodes.new('ShaderNodeCameraData')
    f = _math(nt, 'DIVIDE', cam.outputs['View Z Depth'], fog_far)
    f = _math(nt, 'MINIMUM', f, 1.0)
    f = _math(nt, 'MULTIPLY', f, fog)
    _out(nt, _mix(nt, f, ramp.outputs['Color'], srgb(FOG)))
    return mat


def crt_mat(name, dark, bright, freq=90.0, strength=1.0):
    """Scanlined screen: alternating bands along world Z."""
    mat, nt = _new(name)
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Position'], sep.inputs[0])
    s = _math(nt, 'SINE', _math(nt, 'MULTIPLY', sep.outputs['Z'], freq))
    band = _math(nt, 'GREATER_THAN', s, -0.2)
    _out(nt, _mix(nt, band, srgb(dark), srgb(bright)), strength)
    return mat


# -------------------------------------------------------------------- meshes
def superellipse(n, rx, ry, e=2.0):
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n
        c, s = math.cos(a), math.sin(a)
        pts.append((rx * math.copysign(abs(c) ** (2 / e), c),
                    ry * math.copysign(abs(s) ** (2 / e), s)))
    return pts


def loft(secs, n=16, e=2.0, mat=0):
    """Rings stacked along Z. secs: (z, rx, ry[, ox, oy[, mat]]). Returns (verts, faces, mats)."""
    verts, faces, mats = [], [], []
    for sec in secs:
        z, rx, ry = sec[:3]
        ox = sec[3] if len(sec) > 3 else 0.0
        oy = sec[4] if len(sec) > 4 else 0.0
        for x, y in superellipse(n, rx, ry, e):
            verts.append(Vector((x + ox, y + oy, z)))
    for i in range(len(secs) - 1):
        m = secs[i][5] if len(secs[i]) > 5 else mat
        for k in range(n):
            a, b = i * n + k, i * n + (k + 1) % n
            faces.append((a, b, b + n, a + n))
            mats.append(m)
    for i, sec in ((0, secs[0]), (len(secs) - 1, secs[-1])):
        c = len(verts)
        verts.append(Vector(((sec[3] if len(sec) > 3 else 0), (sec[4] if len(sec) > 4 else 0), sec[0])))
        m = sec[5] if len(sec) > 5 else mat
        if i == len(secs) - 1 and len(secs) > 1:
            m = secs[-2][5] if len(secs[-2]) > 5 else mat
        for k in range(n):
            faces.append((c, i * n + k, i * n + (k + 1) % n))
            mats.append(m)
    return verts, faces, mats


def tube(points, radii, n=8, up=(0, 0, 1), mat=0, closed=False, cap_mat=None):
    """Tube along a polyline. radii: per point (ra, rb); ra along 'side', rb along local normal.
    up may be a single hint or a per-point list (controls twist)."""
    pts = [Vector(p) for p in points]
    verts, faces, mats = [], [], []
    m = len(pts)
    for i, p in enumerate(pts):
        if closed:
            t = pts[(i + 1) % m] - pts[i - 1]
        else:
            t = pts[min(i + 1, m - 1)] - pts[max(i - 1, 0)]
        t.normalize()
        u = Vector(up[i]) if isinstance(up, list) else Vector(up)
        side = t.cross(u)
        if side.length < 1e-4:
            side = t.cross(Vector((1, 0, 0)))
        side.normalize()
        nrm = side.cross(t).normalized()
        ra, rb = radii[i] if isinstance(radii, list) else radii
        for k in range(n):
            a = 2 * math.pi * k / n
            verts.append(p + side * (ra * math.cos(a)) + nrm * (rb * math.sin(a)))
    rings = m if closed else m - 1
    for i in range(rings):
        j = (i + 1) % m
        for k in range(n):
            a, b = i * n + k, i * n + (k + 1) % n
            c, d = j * n + (k + 1) % n, j * n + k
            faces.append((a, d, c, b))
            mats.append(mat)
    if not closed:
        for i in (0, m - 1):
            c = len(verts)
            verts.append(pts[i].copy())
            for k in range(n):
                tri = (c, i * n + k, i * n + (k + 1) % n)
                faces.append(tri if i == 0 else tri[::-1])
                mats.append(mat if (cap_mat is None or i == 0) else cap_mat)
    return verts, faces, mats


def sphere(r=1.0, nu=20, nv=12):
    verts, faces = [Vector((0, 0, r))], []
    for j in range(1, nv):
        th = math.pi * j / nv
        for i in range(nu):
            ph = 2 * math.pi * i / nu
            verts.append(Vector((r * math.sin(th) * math.cos(ph), r * math.sin(th) * math.sin(ph), r * math.cos(th))))
    verts.append(Vector((0, 0, -r)))
    for i in range(nu):
        faces.append((0, 1 + i, 1 + (i + 1) % nu))
    for j in range(nv - 2):
        for i in range(nu):
            a, b = 1 + j * nu + i, 1 + j * nu + (i + 1) % nu
            faces.append((a, a + nu, b + nu, b))
    last = len(verts) - 1
    base = 1 + (nv - 2) * nu
    for i in range(nu):
        faces.append((last, base + (i + 1) % nu, base + i))
    return verts, faces, [0] * len(faces)


class MeshB:
    """Accumulates geometry, then builds one object."""

    def __init__(self):
        self.verts, self.faces, self.mats = [], [], []

    def add(self, geo, M=None, mat=None):
        verts, faces, mats = geo
        o = len(self.verts)
        self.verts += [(M @ Vector(v)) if M is not None else Vector(v) for v in verts]
        self.faces += [tuple(i + o for i in f) for f in faces]
        self.mats += [mat] * len(faces) if mat is not None else list(mats)
        return self

    def quad(self, a, b, c, d, mat=0):
        return self.add(([a, b, c, d], [(0, 1, 2, 3)], [mat]))

    def poly(self, pts, mat=0):
        return self.add((list(pts), [tuple(range(len(pts)))], [mat]))

    def box(self, c, size, mat=0, M=None):
        cx, cy, cz = c
        sx, sy, sz = (s / 2 for s in size)
        v = [Vector((cx + dx * sx, cy + dy * sy, cz + dz * sz))
             for dz in (-1, 1) for dy in (-1, 1) for dx in (-1, 1)]
        f = [(0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)]
        return self.add((v, f, [mat] * 6), M=M)

    def build(self, name, mats, smooth=False, outline=None, recalc=True, shadow=True):
        me = bpy.data.meshes.new(name)
        me.from_pydata([tuple(v) for v in self.verts], [], self.faces)
        me.polygons.foreach_set('material_index', self.mats)
        if smooth:
            me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
        if recalc:
            bm = bmesh.new()
            bm.from_mesh(me)
            bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            bm.to_mesh(me)
            bm.free()
        me.update()
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        for m in mats:
            me.materials.append(m)
        ob.visible_shadow = shadow
        if outline:
            me.materials.append(INK())
            mod = ob.modifiers.new('ink', 'SOLIDIFY')
            mod.thickness = outline
            mod.offset = 1.0
            mod.use_flip_normals = True
            mod.use_rim = False
            mod.material_offset = len(mats) + 8
            ob['ink'] = outline
        return ob


_ink = None


def INK():
    global _ink
    if _ink is None:
        _ink = outline_mat()
    return _ink


def R(axis, deg):
    return Matrix.Rotation(math.radians(deg), 4, axis)


def T(x, y=None, z=None):
    return Matrix.Translation(x if y is None else (x, y, z))
