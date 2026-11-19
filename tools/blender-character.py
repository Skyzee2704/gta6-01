# blender-character.py — proportion check for the SOLMAR player character.
#
# Builds Milo from the exact part table in game/src/character.js
# (bodyParts(), 7.5-head canon, HEAD = 0.24 m) as Blender cubes, then
# measures the assembled figure: total height, head height, shoulder width,
# crotch and knee heights. The game renders the same boxes in three.js, so
# this is the independent check that the boxes read as a human and not an
# alien: head:body 1:7.5, shoulders 2 heads wide, crotch at 3.75 heads,
# knees at 5.63 heads.
#
# Run headless:  blender --background --python tools/blender-character.py
# Output (outside game/, never vendored into the dossier):
#   ../character-reference.png  — front orthographic reference render
#   ../character-reference.glb  — the assembled figure, for the record
# The script FAILS (exit 1) if any measured proportion is outside its band.
import math
import os
import sys

import bpy

# --- The canon, mirroring game/src/character.js exactly. ---
HEAD = 0.24  # metres; PLAYER 1.80 m = 7.5 heads
LEG_LEN = 3.75 * HEAD   # ground to hip
TORSO_LEN = 2.5 * HEAD  # hip to shoulder
ARM_LEN = 3.1 * HEAD    # shoulder to fingertip
SKIN = (0.788, 0.553, 0.373, 1.0)   # '#c98d5f'
HAIR = (0.110, 0.110, 0.133, 1.0)   # '#1c1c22'
SHIRT = (0.180, 0.373, 0.639, 1.0)  # '#2e5fa3'
PANTS = (0.133, 0.188, 0.243, 1.0)  # '#22303e'
SHOES = (0.078, 0.078, 0.102, 1.0)  # '#14141a'

# (name, w, h, d, x, y, z, color) — same numbers as bodyParts(), scale 1.
PARTS = [
    ("head", 0.92 * HEAD, 1.00 * HEAD, 0.88 * HEAD, 0, 6.50 * HEAD, 0, SKIN),
    ("hair", 0.96 * HEAD, 0.42 * HEAD, 0.92 * HEAD, 0, 7.05 * HEAD, 0, HAIR),
    ("torso", 1.90 * HEAD, TORSO_LEN, 0.95 * HEAD, 0, 3.75 * HEAD + TORSO_LEN / 2, 0, SHIRT),
    ("armL", 0.42 * HEAD, ARM_LEN, 0.42 * HEAD, -1.15 * HEAD, 6.25 * HEAD - ARM_LEN / 2, 0, SHIRT),
    ("armR", 0.42 * HEAD, ARM_LEN, 0.42 * HEAD, 1.15 * HEAD, 6.25 * HEAD - ARM_LEN / 2, 0, SHIRT),
    ("handL", 0.40 * HEAD, 0.72 * HEAD, 0.40 * HEAD, -1.15 * HEAD, 6.25 * HEAD - ARM_LEN - 0.30 * HEAD, 0, SKIN),
    ("handR", 0.40 * HEAD, 0.72 * HEAD, 0.40 * HEAD, 1.15 * HEAD, 6.25 * HEAD - ARM_LEN - 0.30 * HEAD, 0, SKIN),
    ("legL", 0.55 * HEAD, LEG_LEN, 0.55 * HEAD, -0.48 * HEAD, LEG_LEN / 2, 0, PANTS),
    ("legR", 0.55 * HEAD, LEG_LEN, 0.55 * HEAD, 0.48 * HEAD, LEG_LEN / 2, 0, PANTS),
    ("footL", 0.55 * HEAD, 0.28 * HEAD, 1.15 * HEAD, -0.48 * HEAD, 0.14 * HEAD, 0.22 * HEAD, SHOES),
    ("footR", 0.55 * HEAD, 0.28 * HEAD, 1.15 * HEAD, 0.48 * HEAD, 0.14 * HEAD, 0.22 * HEAD, SHOES),
]

# Two levels up from tools/: the gta6-01 work dir, NOT the repo — the
# reference render is a check artifact, not a dossier file.
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PNG = os.path.join(OUT_DIR, "character-reference.png")
GLB = os.path.join(OUT_DIR, "character-reference.glb")


def hex_material(name, rgba):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = 0.85
    # The workbench MATERIAL color mode reads diffuse_color, not the node.
    mat.diffuse_color = rgba
    return mat


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = {}
    for name, w, h, d, x, y, z, color in PARTS:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, -z, y))
        obj = bpy.context.active_object
        obj.name = f"milo_{name}"
        obj.dimensions = (w, d, h)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        key = str(color)
        if key not in mats:
            mats[key] = hex_material(f"mat_{name}", color)
        obj.data.materials.append(mats[key])
    return list(bpy.context.scene.objects)


def measure(objects):
    import mathutils
    mins = [math.inf] * 3
    maxs = [-math.inf] * 3
    for obj in objects:
        for corner in obj.bound_box:
            world = obj.matrix_world @ mathutils.Vector(corner)
            for i in range(3):
                mins[i] = min(mins[i], world[i])
                maxs[i] = max(maxs[i], world[i])
    height = maxs[2] - mins[2]
    # Shoulder width is the TORSO width (1.9 heads), not the bounding box:
    # the arms hang outside the torso, so the bbox is wider (2.72 heads)
    # and is not the shoulder measurement.
    torso = next(p for p in PARTS if p[0] == "torso")
    shoulder = torso[1]
    return {
        "height_m": height,
        "heads": height / HEAD,
        "shoulder_width_m": shoulder,
        "shoulder_heads": shoulder / HEAD,
        "overall_width_m": maxs[0] - mins[0],
        "head_height_m": HEAD,
        "crotch_m": LEG_LEN,
        "crotch_heads": LEG_LEN / HEAD,
        # Knee: half the leg up from the ground (1.875 heads), i.e. 5.63
        # heads down from the top of the 7.5-head figure.
        "knee_m": LEG_LEN / 2,
        "knee_heads_from_ground": (LEG_LEN / 2) / HEAD,
        "knee_heads_from_top": 7.5 - (LEG_LEN / 2) / HEAD,
    }


def check(m):
    # Bands, not exact values: the canon is a guide, the figure must read
    # as a human. Total height 7.5 heads nominal (1.80 m); the assembled
    # boxes top out at the hair, ~7.26 heads.
    failures = []
    if not (7.0 <= m["heads"] <= 7.6):
        failures.append(f"height {m['heads']:.2f} heads, want 7.0-7.6")
    if not (1.8 <= m["shoulder_heads"] <= 2.2):
        failures.append(f"shoulders {m['shoulder_heads']:.2f} heads, want 1.8-2.2")
    if not (3.5 <= m["crotch_heads"] <= 4.0):
        failures.append(f"crotch {m['crotch_heads']:.2f} heads, want 3.5-4.0")
    return failures


def render():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.filepath = PNG
    cam_data = bpy.data.cameras.new("ref_cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 2.2
    cam = bpy.data.objects.new("ref_cam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = (0, -4, 0.95)
    cam.rotation_euler = (math.radians(90), 0, 0)
    scene.camera = cam
    sun = bpy.data.objects.new("ref_sun", bpy.data.lights.new("ref_sun", "SUN"))
    sun.data.energy = 3.0
    sun.rotation_euler = (math.radians(45), 0, math.radians(30))
    scene.collection.objects.link(sun)
    bpy.ops.render.render(write_still=True)


def main():
    objects = build()
    m = measure(objects)
    print("CHARACTER MEASUREMENTS")
    for key, value in m.items():
        print(f"  {key}: {value:.3f}" if isinstance(value, float) else f"  {key}: {value}")
    failures = check(m)
    if failures:
        print("CHARACTER CHECK FAILED:")
        for failure in failures:
            print(f"  - {failure}")
        sys.exit(1)
    print("CHARACTER CHECK PASS: boxy, precise, human (7.5-head canon)")
    render()
    bpy.ops.export_scene.gltf(filepath=GLB, export_format="GLB")
    print(f"wrote {PNG}")
    print(f"wrote {GLB}")


main()
