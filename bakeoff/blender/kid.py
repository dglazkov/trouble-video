"""The gang kid: procedural body parts on a tiny FK rig, a run cycle, streaming scarf and hair."""
import math

import bpy
from mathutils import Matrix, Vector

from lib import MeshB, R, T, flat_mat, loft, sphere, toon_mat, tube, INK

INK_W = 0.011
HC = 0.15                      # head centre above the neck joint
HS = Vector((0.125, 0.136, 0.15))   # head radii
SCALE = 0.9


def head_pt(p, s=1.0):
    """Unit-sphere point -> head-local point (egg with a tapered chin)."""
    x, y, z = p
    if z < 0:
        t = min(1.0, -z) ** 1.5
        x *= 1 - 0.34 * t
        y *= 1 - 0.16 * t
    return Vector((x * HS.x * s, y * HS.y * s, z * HS.z * s + HC))


def face_pt(x, z, layer=1):
    y = -math.sqrt(max(0.02, 1 - x * x - z * z))
    return head_pt((x, y, z), 1.0 + 0.022 * layer)


def disc(mb, cx, cz, rx, rz, layer, mat, n=20, rings=3, rot=0.0):
    cr, sr = math.cos(rot), math.sin(rot)

    def pt(r, a):
        px, pz = rx * r * math.cos(a), rz * r * math.sin(a)
        return face_pt(cx + px * cr - pz * sr, cz + px * sr + pz * cr, layer)
    c = pt(0, 0)
    for k in range(n):
        a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
        mb.poly([c, pt(1 / rings, a0), pt(1 / rings, a1)], mat)
        for j in range(1, rings):
            r0, r1 = j / rings, (j + 1) / rings
            mb.poly([pt(r0, a0), pt(r1, a0), pt(r1, a1), pt(r0, a1)], mat)


def stroke(mb, pts, w, layer, mat, taper=True):
    """Fat polyline on the face, subdivided to follow the curvature."""
    fine = []
    for a, b in zip(pts, pts[1:]):
        a, b = Vector(a), Vector(b)
        steps = max(1, int((b - a).length / 0.05))
        fine += [a.lerp(b, i / steps) for i in range(steps)]
    fine.append(Vector(pts[-1]))
    m = len(fine)
    for i in range(m - 1):
        a, b = fine[i], fine[i + 1]
        d = (b - a).normalized()
        p = Vector((-d.y, d.x))
        wa = w * (0.35 + 0.65 * math.sin(math.pi * i / (m - 1))) if taper else w
        wb = w * (0.35 + 0.65 * math.sin(math.pi * (i + 1) / (m - 1))) if taper else w
        q = [a - p * wa / 2, b - p * wb / 2, b + p * wb / 2, a + p * wa / 2]
        mb.poly([face_pt(c.x, c.y, layer) for c in q], mat)


class Kid:
    def __init__(self):
        C = dict(
            skin=toon_mat('skin', '#ffdcc0', '#e58f86', rim='#bff6ff'),
            hair=toon_mat('hair', '#38f0dc', '#1a78c2', rim='#f0ffff'),
            jacket=toon_mat('jacket', '#ffd21a', '#ee6f14', rim='#fffbd0'),
            trim=toon_mat('trim', '#2a2748', '#120f28', rim='#19e6ff'),
            stripe=toon_mat('stripe', '#ff2f8e', '#a3145f'),
            shorts=toon_mat('shorts', '#3a3f86', '#1a1c4c', rim='#19e6ff'),
            scarf=toon_mat('scarf', '#ff3348', '#a50f48', rim='#ffc0b0'),
            shoe=toon_mat('shoe', '#f6f6ff', '#9a9fe0'),
            sole=toon_mat('sole', '#ff3348', '#a50f48'),
            sock=toon_mat('sock', '#f6f6ff', '#a9a4e0'),
            rimg=toon_mat('goggle_rim', '#5a5f86', '#252844', rim='#19e6ff'),
            lens=flat_mat('lens', '#ffa01e', 3.2),
            white=flat_mat('eye_white', '#ffffff', 1.0),
            iris=flat_mat('iris', '#ff8a1e', 1.3),
            iris2=flat_mat('iris2', '#c2400c', 1.0),
            ink=flat_mat('face_ink', '#1a1024', 1.0),
            mouth=flat_mat('mouth', '#7a1830', 1.0),
            tongue=flat_mat('tongue', '#ff7a8a', 1.0),
            band=flat_mat('bandage', '#fff3d6', 1.0),
            nose=flat_mat('nose', '#d9837c', 1.0),
        )
        self.C = C
        self.parts = []   # (object, joint)
        self.ink_obs = []

        def part(name, joint, mb, mats, outline=INK_W, smooth=True, recalc=True):
            ob = mb.build(name, [C[m] for m in mats], smooth=smooth, outline=outline, recalc=recalc)
            self.parts.append((ob, joint))
            if outline:
                self.ink_obs.append(ob)
            return ob

        # ---- torso: oversized boxy bomber jacket
        mb = MeshB().add(loft([
            (-0.17, 0.19, 0.16, 0, 0, 1), (-0.15, 0.225, 0.185, 0, 0, 1), (-0.08, 0.235, 0.19, 0, 0, 0),
            (0.06, 0.225, 0.18, 0, 0, 0), (0.19, 0.235, 0.18, 0, 0, 2), (0.245, 0.238, 0.178, 0, 0, 0),
            (0.36, 0.225, 0.16, 0, 0, 0), (0.43, 0.15, 0.12, 0, 0, 0), (0.48, 0.07, 0.07, 0, 0, 0)], n=24, e=2.7))
        # zipper placket + chest pocket patch
        mb.box((0, -0.186, 0.12), (0.035, 0.02, 0.5), 1)
        mb.box((-0.12, -0.176, 0.3), (0.09, 0.02, 0.06), 1)
        part('torso', 'spine', mb, ['jacket', 'trim', 'stripe'])
        # collar: tall popped ring
        ring = [(math.cos(a) * 0.115, math.sin(a) * 0.105 + 0.01, 0.455 + 0.02 * math.cos(a * 1) * 0) for a in [i * math.pi / 10 for i in range(20)]]
        mb = MeshB().add(tube(ring, (0.03, 0.06), n=8, up=(0, 0, 1), closed=True))
        part('scarf_ring', 'spine', mb, ['scarf'])

        # ---- pelvis + baggy shorts
        mb = MeshB().add(loft([(-0.17, 0.15, 0.125), (-0.06, 0.18, 0.15), (0.06, 0.17, 0.14), (0.1, 0.12, 0.1)], n=20, e=2.4))
        part('pelvis', 'root', mb, ['shorts'])

        for side, sx in (('L', 1), ('R', -1)):
            mb = MeshB().add(loft([(0.075, 0.045, 0.045), (0.04, 0.09, 0.09), (-0.1, 0.098, 0.098), (-0.27, 0.092, 0.092)], n=14))
            part('uarm' + side, 'sho' + side, mb, ['jacket'])
            mb = MeshB().add(loft([(0.04, 0.085, 0.085), (-0.1, 0.098, 0.098), (-0.23, 0.092, 0.092, 0, 0, 0),
                                   (-0.24, 0.082, 0.082, 0, 0, 1), (-0.29, 0.075, 0.075, 0, 0, 1)], n=14))
            part('farm' + side, 'elb' + side, mb, ['jacket', 'trim'])
            # fist: boxy knuckles + thumb, fingerless glove band
            mb = MeshB().add(loft([(0.0, 0.04, 0.045), (-0.02, 0.05, 0.06, 0, -0.004), (-0.085, 0.052, 0.066, 0, -0.008), (-0.11, 0.04, 0.05, 0, -0.008)], n=12, e=3.2))
            mb.add(loft([(0.012, 0.047, 0.052, 0, 0, 1), (-0.035, 0.055, 0.065, 0, -0.004, 1)], n=12, e=3.2, mat=1))
            mb.add(tube([(-sx * 0.045, -0.02, -0.03), (-sx * 0.06, -0.045, -0.06), (-sx * 0.04, -0.06, -0.09)], [(0.02, 0.02), (0.02, 0.02), (0.014, 0.014)], n=6))
            part('fist' + side, 'hand' + side, mb, ['skin', 'trim'])
            # thigh: wide shorts leg + skin knee
            mb = MeshB().add(loft([(0.05, 0.08, 0.08), (-0.04, 0.108, 0.108), (-0.28, 0.105, 0.105), (-0.31, 0.11, 0.11, 0, 0, 1), (-0.335, 0.11, 0.11, 0, 0, 1)], n=14))
            part('thigh' + side, 'hip' + side, mb, ['shorts', 'trim'])
            mb = MeshB().add(loft([(-0.3, 0.06, 0.06), (-0.4, 0.056, 0.058), (-0.44, 0.045, 0.045)], n=12))
            part('knee' + side, 'hip' + side, mb, ['skin'])
            mb = MeshB().add(loft([(0.04, 0.05, 0.05), (-0.06, 0.057, 0.062, 0, 0.008), (-0.18, 0.05, 0.055, 0, 0.008, 0),
                                   (-0.2, 0.052, 0.052, 0, 0, 1), (-0.25, 0.05, 0.05, 0, 0, 2), (-0.27, 0.05, 0.05, 0, 0, 1), (-0.4, 0.046, 0.046, 0, 0, 1)], n=12))
            part('shin' + side, 'knee' + side, mb, ['skin', 'sock', 'stripe'])
            # chunky high-top: loft runs heel -> toe (local z -> -Y)
            M = R('X', 90)
            b = -0.085
            mb = MeshB().add(loft([(-0.1, 0.045, 0.05, 0, b + 0.06), (-0.07, 0.066, 0.1, 0, b + 0.1), (0.0, 0.07, 0.1, 0, b + 0.1),
                                   (0.08, 0.074, 0.062, 0, b + 0.065), (0.17, 0.072, 0.05, 0, b + 0.052), (0.225, 0.045, 0.035, 0, b + 0.04)], n=14, e=2.5), M=M)
            mb.add(loft([(-0.115, 0.05, 0.022, 0, b + 0.012), (-0.08, 0.076, 0.024, 0, b + 0.012), (0.17, 0.082, 0.024, 0, b + 0.012),
                         (0.245, 0.05, 0.022, 0, b + 0.012)], n=14, e=3.0, mat=1), M=M)
            mb.add(loft([(-0.02, 0.073, 0.03, 0, b + 0.13), (0.05, 0.076, 0.03, 0, b + 0.1)], n=10, e=3.0, mat=2), M=M)
            part('foot' + side, 'ank' + side, mb, ['shoe', 'sole', 'stripe'])

        # ---- head
        mb = MeshB()
        v, f, m = sphere(1.0, 28, 18)
        mb.add(([head_pt(p) for p in v], f, m))
        mb.add(loft([(-0.04, 0.045, 0.045), (0.05, 0.042, 0.042)], n=10))  # neck
        part('head', 'head', mb, ['skin'])

        # hair cap
        mb = MeshB()
        keep = [fc for fc in f if (lambda c: c.z > -0.12 - 0.62 * c.y + (0.06 if c.y < 0 else 0.0))(sum((v[i] for i in fc), Vector()) / len(fc))]
        mb.add(([head_pt(p, 1.07) for p in v], keep, [0] * len(keep)))

        def spike(base, direction, length, ra, rb, bend=(0, 0, 0), n=6):
            b = head_pt(Vector(base).normalized(), 1.0)
            d = Vector(direction).normalized()
            pts = [b + d * (length * t) + Vector(bend) * (length * t * t) for t in [i / 5 for i in range(6)]]
            rad = [(ra * (1 - t) ** 0.8 + 0.003, rb * (1 - t) ** 0.8 + 0.003) for t in [i / 5 for i in range(6)]]
            return tube(pts, rad, n=n, up=tuple(Vector(base).normalized()))

        def lock(x0, z0, x1, z1, ra, rb, lift=0.0, s=1.1):
            pts, ups = [], []
            for i in range(6):
                t = i / 5
                x, z = x0 + (x1 - x0) * t, z0 + (z1 - z0) * t
                y = -math.sqrt(max(0.06, 1 - x * x - z * z))
                pts.append(head_pt((x, y, z), s + lift * t * t))
                ups.append((x, y, z))
            rad = [(ra * (1 - 0.85 * t) + 0.002, rb * (1 - 0.7 * t) + 0.002) for t in [i / 5 for i in range(6)]]
            return tube(pts, rad, n=6, up=ups)

        # bangs sweep across the forehead, side locks frame the face
        for x0, x1, z1 in ((-0.66, -0.76, 0.1), (-0.4, -0.5, 0.3), (-0.12, -0.22, 0.24), (0.14, 0.02, 0.33), (0.4, 0.34, 0.22), (0.66, 0.72, 0.08)):
            mb.add(lock(x0, 0.62, x1, z1, 0.05, 0.02, lift=0.06))
        for sx in (-1, 1):
            mb.add(lock(sx * 0.86, 0.3, sx * 0.9, -0.62, 0.04, 0.022, lift=0.1, s=1.08))
        part('hair', 'head', mb, ['hair']).visible_shadow = False

        # back / top spikes streaming backwards (separate so they can whip)
        mb = MeshB()
        back = [((0, -0.2, 1), (0, 0.6, 1), 0.2), ((0.45, 0.0, 0.9), (0.5, 0.8, 0.8), 0.2), ((-0.45, 0.0, 0.9), (-0.5, 0.8, 0.8), 0.2),
                ((0, 0.6, 0.8), (0, 1, 0.55), 0.3), ((0.65, 0.45, 0.6), (0.6, 1, 0.4), 0.27), ((-0.65, 0.45, 0.6), (-0.6, 1, 0.4), 0.27),
                ((0.9, 0.35, 0.15), (0.75, 1, 0.1), 0.25), ((-0.9, 0.35, 0.15), (-0.75, 1, 0.1), 0.25), ((0, 0.97, 0.2), (0, 1, 0.12), 0.36),
                ((0.5, 0.8, -0.1), (0.4, 1, -0.1), 0.3), ((-0.5, 0.8, -0.1), (-0.4, 1, -0.1), 0.3), ((0, 0.85, -0.45), (0, 1, -0.2), 0.27),
                ((0.7, 0.55, -0.4), (0.5, 1, -0.3), 0.22), ((-0.7, 0.55, -0.4), (-0.5, 1, -0.3), 0.22)]
        for base, d, L in back:
            mb.add(spike(base, d, L, 0.06, 0.042, bend=(0, 0.1, 0.3), n=7))
        part('hair_back', 'hairback', mb, ['hair'])

        # goggles pushed up on the forehead
        mb = MeshB()
        for sx in (-1, 1):
            c = Vector((sx * 0.36, 0, 0.66))
            c.y = -math.sqrt(1 - c.x ** 2 - c.z ** 2)
            p0, nrm = head_pt(c, 1.08), Vector((c.x * 0.8, c.y, c.z * 0.9)).normalized()
            mb.add(tube([p0, p0 + nrm * 0.045], [(0.05, 0.05), (0.046, 0.046)], n=14, up=(0, 0, 1), mat=0, cap_mat=1))
        strap = []
        for i in range(28):
            a = 2 * math.pi * i / 28
            z = 0.47 + 0.19 * math.cos(a)
            r = math.sqrt(1 - z * z)
            strap.append(head_pt((math.sin(a) * r, -math.cos(a) * r, z), 1.11))
        mb.add(tube(strap, (0.008, 0.022), n=6, up=(0, 0, 1), closed=True, mat=2))
        part('goggles', 'head', mb, ['rimg', 'lens', 'trim'], outline=0.007).visible_shadow = False

        # face decals (flat, unlit, no hull)
        mb = MeshB()
        for sx in (-1, 1):
            cx = sx * 0.4
            disc(mb, cx, -0.1, 0.2, 0.25, 1, 0, rot=sx * 0.12)
            disc(mb, cx - sx * 0.03, -0.12, 0.145, 0.215, 2, 1)
            disc(mb, cx - sx * 0.03, -0.06, 0.145, 0.15, 3, 2)          # darker upper iris
            disc(mb, cx - sx * 0.03, -0.12, 0.065, 0.11, 4, 3)          # pupil
            disc(mb, cx - sx * 0.03 + 0.06, -0.01, 0.05, 0.06, 5, 0, n=10, rings=1)   # highlight
            disc(mb, cx - sx * 0.03 - 0.06, -0.24, 0.025, 0.03, 5, 0, n=8, rings=1)
            # upper lash: thick arc with a flick at the outer corner
            arc = [(cx + sx * 0.25 * math.cos(a), -0.08 + 0.27 * math.sin(a)) for a in [math.radians(d) for d in range(155, 14, -20)]]
            arc.append((cx + sx * 0.3, -0.0))
            stroke(mb, arc, 0.085, 6, 3)
            stroke(mb, [(cx - sx * 0.2, -0.34), (cx + sx * 0.14, -0.37)], 0.03, 6, 3)   # lower lid
            stroke(mb, [(sx * 0.14, 0.2), (sx * 0.62, 0.36)], 0.08, 10, 3)             # angry brow
        disc(mb, 0.0, -0.6, 0.15, 0.12, 1, 4, n=16)                     # shouting mouth
        disc(mb, 0.0, -0.66, 0.09, 0.05, 2, 5, n=12, rings=2)
        disc(mb, 0.0, -0.515, 0.11, 0.028, 2, 0, n=12, rings=2)
        stroke(mb, [(-0.02, -0.33), (0.03, -0.36)], 0.035, 1, 7)        # nose
        stroke(mb, [(-0.66, -0.38), (-0.42, -0.46)], 0.09, 1, 6, taper=False)   # cheek bandage
        part('face', 'head', mb, ['white', 'iris', 'iris2', 'ink', 'mouth', 'tongue', 'band', 'nose'], outline=None, smooth=False, recalc=False)

        # scarf tails (rebuilt every pose)
        me = bpy.data.meshes.new('scarf_tails')
        self.scarf = bpy.data.objects.new('scarf_tails', me)
        bpy.context.scene.collection.objects.link(self.scarf)
        for m in (C['scarf'], INK()):
            me.materials.append(m)
        mod = self.scarf.modifiers.new('ink', 'SOLIDIFY')
        mod.thickness, mod.offset, mod.use_flip_normals, mod.use_rim, mod.material_offset = INK_W, 1.0, True, False, 8
        self.scarf['ink'] = INK_W
        self.ink_obs.append(self.scarf)
        for ob in self.ink_obs:
            ob['ink'] = ob['ink']

    # ------------------------------------------------------------------ pose
    def joints(self, phase, k, pos, tick):
        """FK for run-cycle phase (0..1), intensity k (0 calm sprint .. 1 all-out)."""
        tau = 2 * math.pi
        J = {}
        s, c = math.sin(tau * phase), math.cos(tau * phase)
        lean = 26 + 12 * k
        twist = (13 + 5 * k) * s
        root = T(*pos) @ Matrix.Scale(SCALE, 4) @ R('Z', -twist * 0.6) @ R('X', 7 + 3 * k) @ R('Y', 3 * s)
        J['root'] = root
        J['spine'] = root @ T(0, 0, 0.07) @ R('Z', twist * 1.5) @ R('X', lean)
        J['head'] = J['spine'] @ T(0, 0, 0.47) @ R('Z', -twist * 0.9) @ R('X', -(lean + 4 + 3 * k)) @ R('Y', -3 * s)
        J['hairback'] = J['head'] @ T(0, 0, HC) @ R('X', 5 * math.sin(tick * 2.1)) @ R('Z', 5 * math.sin(tick * 1.3 + 1)) @ T(0, 0, -HC)
        for side, sx, ph in (('L', 1, phase), ('R', -1, phase + 0.5)):
            ls, lc = math.sin(tau * ph), math.cos(tau * ph)
            thigh = (20 + 5 * k) + (52 + 12 * k) * ls
            rec = max(0.0, lc)                       # leg recovering (swinging forward)
            knee = 18 + (100 + 12 * k) * rec ** 0.75 + 22 * max(0.0, -ls) * max(0.0, -lc) * 2
            foot = 35 * rec - 38 * max(0.0, ls) + 25 * max(0.0, -ls)
            J['hip' + side] = root @ T(sx * 0.1, 0, -0.05) @ R('Y', -sx * 3) @ R('X', -thigh)
            J['knee' + side] = J['hip' + side] @ T(0, 0, -0.4) @ R('X', knee)
            J['ank' + side] = J['knee' + side] @ T(0, 0, -0.4) @ R('X', foot)
            # arms counter the legs
            arm = -5 + (66 + 14 * k) * -ls
            elbow = 92 + 18 * -ls + 10 * k
            J['sho' + side] = J['spine'] @ T(sx * 0.225, 0, 0.36) @ R('Y', -sx * (16 + 6 * max(0.0, ls))) @ R('X', -arm)
            J['elb' + side] = J['sho' + side] @ T(0, 0, -0.27) @ R('Z', sx * 20) @ R('X', -elbow)
            J['hand' + side] = J['elb' + side] @ T(0, 0, -0.285)
        return J

    def pose(self, phase, k, xy, tick, wind=1.0):
        J = self.joints(phase, k, (xy[0], xy[1], 0.0), tick)
        # ground the lower foot, then add the airborne hop
        low = min((J['ank' + s] @ Vector(p)).z for s in 'LR' for p in ((0, 0.1, -0.085), (0, -0.24, -0.085)))
        hop = 0.07 * (0.5 + 0.5 * math.cos(4 * math.pi * phase)) * (1 + 0.5 * k)
        J = self.joints(phase, k, (xy[0], xy[1], -low + hop), tick)
        self.J = J
        for ob, j in self.parts:
            ob.matrix_world = J[j]
        self._scarf(J, tick, k, wind)
        return J

    def _scarf(self, J, tick, k, wind):
        mb = MeshB()
        sp = J['spine']
        for (ox, L, ph, w) in ((0.05, 1.05 + 0.25 * k, 0.0, 0.085), (-0.04, 0.8 + 0.2 * k, 1.9, 0.07)):
            p0 = sp @ Vector((ox, 0.1, 0.45))
            pts, ups, rad = [], [], []
            n = 12
            for i in range(n):
                t = i / (n - 1)
                amp = (0.1 + 0.05 * k) * t
                p = p0 + Vector((ox * 9.0 * t + amp * 0.9 * math.sin(5.2 * t - tick * 1.9 + ph + 1),
                                 L * t * wind,
                                 0.5 * t - 0.15 * t * t + amp * math.sin(6.5 * t - tick * 2.6 + ph)))
                pts.append(p)
                tw = 0.9 * math.sin(4 * t - tick * 1.7 + ph)
                ups.append((math.sin(tw), 0, math.cos(tw)))
                rad.append((w * (1.0 - 0.25 * t), 0.012))
            mb.add(tube(pts, rad, n=8, up=ups))
        me = bpy.data.meshes.new('scarf_tails')
        me.from_pydata([tuple(v) for v in mb.verts], [], mb.faces)
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
        old = self.scarf.data
        for m in old.materials:
            me.materials.append(m)
        self.scarf.data = me
        bpy.data.meshes.remove(old)

    def set_ink(self, dist, lens):
        """Keep the hull outline roughly constant in screen pixels."""
        px = 3.2
        w = max(0.006, min(0.03, px * dist / (lens / 36 * 1920)))
        for ob in self.ink_obs:
            ob.modifiers['ink'].thickness = w * (ob['ink'] / INK_W) / SCALE
