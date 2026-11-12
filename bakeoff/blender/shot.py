"""Bake-off shot: 72 frames @24fps, drop on frame 35.

  blender -b --factory-startup -P bakeoff/blender/shot.py -- [--frames 10,35 | --frames 0-71] [--scale 50] [--cam side] [--out DIR]
"""
import math
import os
import random
import sys
import time

import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kid as kid_mod      # noqa: E402
import station             # noqa: E402
from lib import flat_mat, srgb   # noqa: E402

FPS, NFRAMES, DROP = 24, 72, 35
BEATS = (45, 55, 65)       # 52.38s, 52.80s, 53.20s
ROOT = os.path.dirname(os.path.dirname(HERE))


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def pulse(f, decay=0.55):
    """1.0 on a beat frame, decaying after it."""
    return max((decay ** (f - b) for b in BEATS if f >= b), default=0.0)


# ------------------------------------------------------------- shot timing
def twos(f):
    """Character holds: on twos, re-aligned so a fresh pose lands on the drop."""
    if f < DROP - 1:
        return f - f % 2
    if f < DROP:
        return DROP - 1
    return DROP + ((f - DROP) // 2) * 2


def kid_state(f):
    y = -(7.2 / FPS) * min(f, DROP) - (12.5 / FPS) * max(0, f - DROP)
    x = 0.22 + 0.12 * smooth((f - DROP) / 30)
    f2 = twos(f)
    if f2 < DROP:
        phase, k = 0.15 + f2 / 10.0, 0.0
    else:
        phase, k = 0.75 + (f2 - DROP) / 8.0, 1.0
    return x, y, phase % 1.0, k, f2


def cam_dist(f):
    if f < DROP:
        return 3.1 - 0.8 * smooth(f / DROP)
    u = (f - DROP) / (NFRAMES - 1 - DROP)
    return 2.3 - 2.2 * u ** 1.35


def cam_state(f):
    x, y, _, _, _ = kid_state(f)
    d = cam_dist(f)
    rnd = random.Random(f * 977 + 5)
    post = max(0, f - DROP)
    shake = 0.006 + (0.09 * 0.66 ** post if f >= DROP else 0.0) + 0.035 * pulse(f)
    pos = Vector((-0.42 + rnd.uniform(-1, 1) * shake, y - d, 0.36 + rnd.uniform(-1, 1) * shake))
    aim_d = max(d, 1.0)
    target = Vector((x * 0.75, pos.y + aim_d, 0.98 + 0.12 * smooth(1 - d / 3.0)))
    if f < DROP:
        lens = 22.0 + 1.5 * smooth(f / DROP)
    else:
        lens = 20.0 + 12.0 * 0.6 ** post + 2.5 * pulse(f)
    roll = 5.0 + (8.0 * smooth(post / 8.0) if f >= DROP else 0.0) + rnd.uniform(-1, 1) * shake * 40
    return pos, target, lens, roll, d


def fx_state(f):
    post = f - DROP
    fx = dict(impact=0, flash=0.0, disp=0.012, lines=0.0, bloom=0.85, zoom=0.0)
    if post >= 0:
        fx['lines'] = max(0.3, 1.0 * 0.72 ** max(0, post - 1)) + 0.4 * pulse(f)
        fx['disp'] = 0.012 + 0.1 * 0.6 ** post + 0.04 * pulse(f)
        fx['flash'] = (0.9 * 0.5 ** (post - 2) if post >= 2 else 0.0) + 0.35 * pulse(f, 0.4)
        fx['bloom'] = 0.85 + 0.6 * 0.7 ** post + 0.35 * pulse(f)
        fx['zoom'] = (0.018 if post < 2 else 0.08 * 0.55 ** (post - 2)) + 0.02 * pulse(f, 0.4)
        if post == 0:
            fx['impact'] = 1
        elif post == 1:
            fx['impact'] = 2
    return fx


# ------------------------------------------------------------------ scene
def setup_scene(scale):
    s = bpy.context.scene
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    s.render.engine = 'BLENDER_EEVEE'
    s.render.resolution_x, s.render.resolution_y = 1920, 1080
    s.render.resolution_percentage = scale
    s.render.fps = FPS
    s.frame_start, s.frame_end = 0, NFRAMES - 1
    s.render.image_settings.file_format = 'PNG'
    s.render.film_transparent = False
    try:
        s.view_settings.view_transform = 'Standard'
    except TypeError as e:
        print('view transform:', e)
    s.view_settings.look = 'None'
    s.eevee.taa_render_samples = 16
    s.eevee.use_shadows = True
    s.eevee.use_raytracing = False
    s.eevee.shadow_resolution_scale = 1.0
    w = bpy.data.worlds.new('void')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0, 0, 0, 1)
    s.world = w

    sun = bpy.data.lights.new('key', 'SUN')
    sun.energy = 1.0
    sun.angle = 0.0
    sun.use_shadow = True
    so = bpy.data.objects.new('key', sun)
    s.collection.objects.link(so)
    so.rotation_euler = Vector((0.42, 0.85, -0.1)).to_track_quat('-Z', 'Y').to_euler()

    cam = bpy.data.cameras.new('cam')
    cam.sensor_width = 36
    cam.clip_start, cam.clip_end = 0.03, 700
    co = bpy.data.objects.new('cam', cam)
    s.collection.objects.link(co)
    s.camera = co
    return s, co


def make_lines():
    me = bpy.data.meshes.new('speedlines')
    ob = bpy.data.objects.new('speedlines', me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(flat_mat('line_white', '#ffffff', 1.6))
    me.materials.append(flat_mat('line_black', '#05030f', 1.0))
    ob.visible_shadow = False
    return ob


def update_lines(ob, cam, f, amount, lens, focus):
    old = ob.data
    me = bpy.data.meshes.new('speedlines')
    for m in old.materials:
        me.materials.append(m)
    if amount > 0.01:
        rnd = random.Random(f * 131 + 1)
        d = 0.2
        hw = d * 18.0 / lens
        n = int(20 + 120 * amount)
        verts, faces, mats = [], [], []
        cx, cy = focus
        for i in range(n):
            th = rnd.uniform(0, 2 * math.pi)
            rin = rnd.uniform(0.42, 1.0) + 0.55 * (1 - amount)
            wd = rnd.uniform(0.004, 0.02) * (0.6 + amount)
            rout = 2.8
            o = len(verts)
            verts.append(((cx + rin * math.cos(th)) * hw, (cy + rin * math.sin(th)) * hw, -d))
            verts.append(((cx + rout * math.cos(th - wd)) * hw, (cy + rout * math.sin(th - wd)) * hw, -d))
            verts.append(((cx + rout * math.cos(th + wd)) * hw, (cy + rout * math.sin(th + wd)) * hw, -d))
            faces.append((o, o + 1, o + 2))
            mats.append(1 if rnd.random() < 0.22 else 0)
        me.from_pydata(verts, [], faces)
        me.polygons.foreach_set('material_index', mats)
    ob.data = me
    bpy.data.meshes.remove(old)
    ob.matrix_world = cam.matrix_world


# ------------------------------------------------------------- compositor
def build_comp(s):
    ng = bpy.data.node_groups.new('photography', 'CompositorNodeTree')
    s.compositing_node_group = ng
    ng.interface.new_socket(name='Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    N, L = ng.nodes, ng.links

    def sock(node, key, out=False):
        return next(x for x in (node.outputs if out else node.inputs) if x.identifier == key or x.name == key)

    def mix(blend, fac, a, b):
        m = N.new('ShaderNodeMix')
        m.data_type = 'RGBA'
        m.blend_type = blend
        for key, val in (('Factor_Float', fac), ('A_Color', a), ('B_Color', b)):
            if isinstance(val, bpy.types.NodeSocket):
                L.new(val, sock(m, key))
            else:
                sock(m, key).default_value = val
        return m

    def math_(op, a, b=None, clamp=False):
        m = N.new('ShaderNodeMath')
        m.operation = op
        m.use_clamp = clamp
        for i, val in enumerate((a, b)):
            if val is None:
                continue
            if isinstance(val, bpy.types.NodeSocket):
                L.new(val, m.inputs[i])
            else:
                m.inputs[i].default_value = val
        return m.outputs[0]

    rl = N.new('CompositorNodeRLayers')
    img = rl.outputs['Image']

    # bloom on the neon + a soft diffusion filter over everything
    glare = N.new('CompositorNodeGlare')
    glare.inputs['Type'].default_value = 'Bloom'
    glare.inputs['Quality'].default_value = 'High'
    glare.inputs['Highlights Threshold'].default_value = 1.15
    glare.inputs['Size'].default_value = 0.55
    L.new(img, glare.inputs['Image'])
    blur = N.new('CompositorNodeBlur')
    blur.inputs['Size'].default_value = (22, 22)
    L.new(glare.outputs['Image'], blur.inputs['Image'])
    diff = mix('LIGHTEN', 0.4, glare.outputs['Image'], blur.outputs['Image'])
    cur = sock(diff, 'Result_Color', True)

    # zoom blur on the hit (before the palette crush, so impact frames stay hard-edged)
    zb = N.new('CompositorNodeDBlur')
    zb.inputs['Samples'].default_value = 5
    L.new(cur, zb.inputs['Image'])
    cur = zb.outputs['Image']

    # impact frame: luminance -> hard limited palette
    bw = N.new('CompositorNodeRGBToBW')
    L.new(cur, bw.inputs[0])
    ramp = N.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    ramp.color_ramp.elements.new(0.5)
    L.new(bw.outputs[0], ramp.inputs[0])
    imp = mix('MIX', 0.0, cur, ramp.outputs['Color'])
    cur = sock(imp, 'Result_Color', True)

    # chromatic aberration
    lens = N.new('CompositorNodeLensdist')
    L.new(cur, lens.inputs['Image'])
    lens.inputs['Distortion'].default_value = 0.0
    cur = lens.outputs['Image']

    # flash
    expo = N.new('CompositorNodeExposure')
    L.new(cur, expo.inputs['Image'])
    cur = expo.outputs['Image']

    # vignette + grain
    co = N.new('CompositorNodeImageCoordinates')
    L.new(img, co.inputs['Image'])
    ln = N.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    L.new(co.outputs['Uniform'], ln.inputs[0])
    vig = math_('SUBTRACT', 1.0, math_('MULTIPLY', math_('SUBTRACT', ln.outputs['Value'], 0.3, clamp=True), 0.95))
    vm = mix('MULTIPLY', 1.0, cur, vig)
    cur = sock(vm, 'Result_Color', True)
    noise = N.new('ShaderNodeTexWhiteNoise')
    noise.noise_dimensions = '4D'
    L.new(co.outputs['Pixel'], noise.inputs['Vector'])
    grain = math_('MULTIPLY', math_('SUBTRACT', noise.outputs['Value'], 0.5), 0.045)
    gm = mix('ADD', 1.0, cur, grain)
    cur = sock(gm, 'Result_Color', True)

    out = N.new('NodeGroupOutput')
    L.new(cur, out.inputs[0])
    return dict(zb=zb, glare=glare, ramp=ramp, imp=imp, lens=lens, expo=expo, noise=noise, sock=sock)


IMPACT = {
    1: [(0.0, '#ffffff'), (0.1, '#ff1438'), (0.5, '#06030c')],   # negative: white void, red mids, black lights
    2: [(0.0, '#06030c'), (0.1, '#2412c8'), (0.42, '#fff6c8')],   # positive: black, ultramarine, hot cream
}


def apply_comp(c, f, fx):
    c['glare'].inputs['Strength'].default_value = fx['bloom']
    c['lens'].inputs['Dispersion'].default_value = fx['disp']
    c['expo'].inputs['Exposure'].default_value = fx['flash']
    c['zb'].inputs['Scale'].default_value = 1.0 + fx['zoom']
    c['noise'].inputs['W'].default_value = f * 1.37
    c['sock'](c['imp'], 'Factor_Float').default_value = 1.0 if fx['impact'] else 0.0
    if fx['impact']:
        for el, (pos, col) in zip(c['ramp'].color_ramp.elements, IMPACT[fx['impact']]):
            el.position = pos
            el.color = srgb(col)


# -------------------------------------------------------------------- main
def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    opt = dict(frames='0-71', scale='100', cam='shot', out=os.path.join(ROOT, 'out/bakeoff/blender/frames'), samples='16')
    for a, b in zip(argv[::2], argv[1::2]):
        opt[a.lstrip('-')] = b
    frames = []
    for part in opt['frames'].split(','):
        if '-' in part:
            a, b = part.split('-')
            frames += range(int(a), int(b) + 1)
        else:
            frames.append(int(part))

    t0 = time.time()
    s, cam = setup_scene(int(opt['scale']))
    s.eevee.taa_render_samples = int(opt['samples'])
    if opt['cam'] == 'shot':
        station.build()
    else:
        s.world.node_tree.nodes['Background'].inputs[0].default_value = (0.25, 0.25, 0.3, 1)
    kid = kid_mod.Kid()
    lines = make_lines()
    comp = build_comp(s)
    print('BUILD_SECONDS %.2f' % (time.time() - t0))

    times = []
    for f in frames:
        t1 = time.time()
        s.frame_set(f)
        x, y, phase, k, f2 = kid_state(f)
        kid.pose(phase, k, (x, y), f2 * 0.5)
        pos, target, lens, roll, d = cam_state(f)
        fx = fx_state(f)
        if opt['cam'] == 'side':
            pos, target, lens, roll = Vector((x + 4.0, y - 1.2, 0.9)), Vector((x, y, 0.85)), 50.0, 0.0
        elif opt['cam'] == 'front':
            pos, target, lens, roll = Vector((x, y - 1.6, 1.25)), Vector((x, y, 1.35)), 50.0, 0.0
        q = (target - pos).to_track_quat('-Z', 'Y')
        cam.matrix_world = Matrix.Translation(pos) @ q.to_matrix().to_4x4() @ Matrix.Rotation(math.radians(roll), 4, 'Z')
        cam.data.lens = lens
        kid.set_ink(max(0.6, (Vector((x, y, 1.0)) - pos).length), lens)
        # speed lines converge on the kid's chest in screen space
        chest = cam.matrix_world.inverted() @ (kid.J['spine'] @ Vector((0, 0, 0.3)))
        fo = (0.0, 0.0)
        if chest.z < -0.3:
            hw = 18.0 / lens
            fo = (max(-0.6, min(0.6, chest.x / -chest.z / hw)), max(-0.4, min(0.4, chest.y / -chest.z / hw)))
        update_lines(lines, cam, f, fx['lines'] if opt['cam'] == 'shot' else 0.0, lens, fo)
        apply_comp(comp, f, fx)
        s.render.filepath = os.path.join(opt['out'], 'f_%04d.png' % f)
        bpy.ops.render.render(write_still=True)
        times.append(time.time() - t1)
        print('FRAME %d %.2fs' % (f, times[-1]))
    print('RENDER_TOTAL %.2fs for %d frames, mean %.2fs, wall incl. build %.2fs'
          % (sum(times), len(times), sum(times) / max(1, len(times)), time.time() - t0))


main()
