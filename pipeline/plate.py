"""Paint a PLATE: one drawing on the key colour that a shot lays over its set whole (a cut-in on one or two of the
cast in the middle of doing something), from their model sheets.

  plate.py STEM WHO[,WHO2[,WHO3,WHO4]] "what the picture shows" [--size 2K] [--aspect 16:9]
      -> kits/WHO/closeup/STEM_N.jpg and its sidecar, logged in every named kit's log.jsonl

Two of the cast in one drawing are painted TOGETHER (a grip, a haul): hands and holds are drawn, not overlapped.
A change of expression is an edit of a plate (paint.py WHO edit FILE "...") graded back with pipeline/match.py.
A shot shows a plate with plates: { name: { src, key: "magenta" } } and cels: [{ plate, x, y, scale }].
"""
import os, sys
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(__file__))
import paint


def prompt(specs, what):
    n = len(specs); ords = ["FIRST", "SECOND", "THIRD", "FOURTH"]
    who = (f"the character from the FIRST image ({paint.WORDS[specs[0].get('pronoun', 'she')]['p']} model sheet)" if n == 1 else
           "the two characters from the FIRST and SECOND images (their model sheets, one each)" if n == 2 else
           f"the {['three', 'four'][n - 3]} characters from the first {n} images (their model sheets, one each)")      # the fall's ring of hands is all four in one drawing
    designs = " ".join(f"{s['name'].upper()} (the {ords[i]} image): {paint.design_text(s)}" for i, s in enumerate(specs))
    return (f"Anime film frame, widescreen, of {who}. A model sheet only shows what a character looks like: do NOT copy its standing "
            f"figures, its poses or its callouts. The picture holds exactly ONE drawing and nothing else: {what} "
            f"The designs, exactly as on the model sheets: {designs} "
            f"Style: a 1990s cel anime key frame exactly like the LAST image: {paint.STYLE}, white highlight shapes in eyes and hair, "
            "no motion blur, no speed lines, no ground, no shadows on the ground, no scenery, no text, no brand marks. Every hand has five fingers and every figure "
            "two arms and two legs. Background: one flat solid pure magenta (#FF00FF) everywhere, also in every gap, and nothing else.")


def main():
    if len(sys.argv) < 4 or sys.argv[1] in ("-h", "--help"): sys.exit(__doc__)
    stem, names, what = sys.argv[1], sys.argv[2].split(","), sys.argv[3]
    size = sys.argv[sys.argv.index("--size") + 1] if "--size" in sys.argv else "2K"
    specs = [paint.spec_of(n) for n in names]
    out = paint.take(os.path.join(paint.kit_dir(names[0]), "closeup"), stem)
    refs = [paint.design_ref(n, s) for n, s in zip(names, specs)] + [os.path.join(paint.ROOT, specs[0]["style"])]
    aspect = sys.argv[sys.argv.index("--aspect") + 1] if "--aspect" in sys.argv else "16:9"
    if not paint.generate(names[0], out, prompt(specs, what), refs, aspect=aspect, size=size, kind="plate:" + stem, extra={"who": names}): sys.exit(1)
    for n in names[1:]: paint.log(n, {"file": paint.rel(out), "kind": "plate:" + stem, "note": f"painted together with {names[0]}; the take is in that kit"})


if __name__ == "__main__": main()
