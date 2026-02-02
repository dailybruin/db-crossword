from bs4 import BeautifulSoup
import json
import sys

def parseRow(row, jsonToAdd, rowIndex, acrossClues):
    word = ""
    wordCol = None
    startNum = None

    for i, cell in enumerate(row):
        letter = cell["letter"]
        num = cell["num"]

        prev_letter = row[i-1]["letter"] if i > 0 else ""
        next_letter = row[i+1]["letter"] if i < len(row)-1 else ""

        # Start of a new across word
        if letter != "" and (i == 0 or prev_letter == ""):
            startNum = num  # should exist for the start of a word
            word = letter
            wordCol = i

        # Continuation of a word
        elif letter != "":
            word += letter

        # End of a word (current cell blank OR end of row)
        if (letter == "" or i == len(row)-1 or next_letter == "") and word:
            if startNum in acrossClues:
                jsonToAdd[startNum] = {
                    "answer": word,
                    "row": rowIndex,
                    "col": wordCol
                }
            word = ""
            wordCol = None
            startNum = None


def parseCol(col, jsonToAdd, colIndex, downClues):
    word = ""
    wordRow = None
    startNum = None

    for i, cell in enumerate(col):
        letter = cell["letter"]
        num = cell["num"]

        prev_letter = col[i-1]["letter"] if i > 0 else ""
        next_letter = col[i+1]["letter"] if i < len(col)-1 else ""

        # Start of a new down word
        if letter != "" and (i == 0 or prev_letter == ""):
            startNum = num  # should exist for the start of a down clue
            word = letter
            wordRow = i

        # Continuation of a word
        elif letter != "":
            word += letter

        # End of a word (when next cell is blank OR at the bottom)
        if (letter == "" or i == len(col)-1 or next_letter == "") and word:
            if startNum in downClues:
                jsonToAdd[startNum] = {
                    "answer": word,
                    "row": wordRow,
                    "col": colIndex
                }
            word = ""
            wordRow = None
            startNum = None

    return jsonToAdd



def parse_crossword(html_path):
    with open(html_path, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f, "html.parser")

    across, down = {}, {}
    grid = []

    acrossClues = {}
    downClues = {}

    # Parse clues if they exist
    for clue_across in soup.find_all("div", {"direction" : "across"}):
        clueNum = clue_across.get("cluenum").split('A')[0].strip().replace("\u200d", "")
        clueClue = clue_across.find("span", class_="clueText").text.strip().replace("\u200d", "")
        acrossClues[clueNum] = clueClue
    
    for clue_down in soup.find_all("div", {"direction" : "down"}):
        clueNum = clue_down.get("cluenum").split('D')[0].strip().replace("\u200d", "")
        clueClue = clue_down.find("span", class_="clueText").text.strip().replace("\u200d", "")
        downClues[clueNum] = clueClue

    # Parse the grid
    row = []
    row_index = 0
    box_index = 0

    for el in soup.select(".crossword > div"):
        if "endRow" in el.get("class", []):
            grid.append(row)
            row = []
            row_index += 1
        elif "box" in el.get("class", []):
            letter_span = el.select_one(".letter-in-box")
            clue_num_span = el.select_one(".cluenum-in-box")
            letter = letter_span.text.strip() if letter_span else ""
            num = clue_num_span.text.strip("").replace("\u200d", "") if clue_num_span else None
            cell = {"letter": letter, "num": num}
            row.append(cell)
            box_index += 1

    # Start putting clues in correct format
    for i in range(len(grid)):
        parseRow(grid[i], across, rowIndex=i, acrossClues=acrossClues)

    for i in range(len(grid[0])):
       col = [grid[j][i] for j in range(len(grid))]
       parseCol(col, down, colIndex=i, downClues=downClues)

    data = {"across": across, "down": down}

    # Merge the clues and the answers
    for key in data['across']:
        data['across'][key]["clue"] = acrossClues[key]
    
    for key in data['down']:
        data['down'][key]["clue"] = downClues[key]

    return data


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Specify args [file name] [output file name]")
        exit(1)

    html_file_path = sys.argv[1]
    dest_data_path = sys.argv[2]
    
    crossword_data = parse_crossword(html_file_path)
    with open(dest_data_path, "w", encoding="utf-8") as f:
        json.dump(crossword_data, f, ensure_ascii=False, indent=2)

    print(f"Saved crossword data to {dest_data_path}")
