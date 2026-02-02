import puz
import json
import sys
from pathlib import Path

if len(sys.argv) < 2:
    print("Usage: python puz_to_json.py <path/to/puzzle.puz>")
    sys.exit(1)

puz_path = Path(sys.argv[1])
out_path = puz_path.with_suffix(".json")

p = puz.read(str(puz_path))

width = p.width
height = p.height
solution = p.solution  # flat string, row-major, '.' are blocks

def cell(r, c):
    return solution[r * width + c]

def is_block(r, c):
    return cell(r, c) == '.'

numbering = p.clue_numbering()

across = {}
down = {}

def get_across_answer(r, c):
    letters = []
    cc = c
    while cc < width and not is_block(r, cc):
        letters.append(cell(r, cc))
        cc += 1
    return "".join(letters)

def get_down_answer(r, c):
    letters = []
    rr = r
    while rr < height and not is_block(rr, c):
        letters.append(cell(rr, c))
        rr += 1
    return "".join(letters)

# Across clues
for clue in numbering.across:
    num = str(clue["num"])
    r = clue["cell"] // width
    c = clue["cell"] % width
    clue_text = p.clues[clue["clue_index"]]

    across[num] = {
        "answer": get_across_answer(r, c),
        "row": r,
        "col": c,
        "clue": clue_text
    }

# Down clues
for clue in numbering.down:
    num = str(clue["num"])
    r = clue["cell"] // width
    c = clue["cell"] % width
    clue_text = p.clues[clue["clue_index"]]

    down[num] = {
        "answer": get_down_answer(r, c),
        "row": r,
        "col": c,
        "clue": clue_text
    }

meta = {
    "title": p.title,
    "author": p.author,
    "copyright": p.copyright,
    "width": width,
    "height": height,
    "num_clues": len(p.clues)
}

result = {
    "meta": meta,
    "across": across,
    "down": down
}

with open(out_path, "w") as f:
    json.dump(result, f, indent=2)

print(f"Wrote {out_path}")
