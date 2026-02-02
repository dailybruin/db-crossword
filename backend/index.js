import express from 'express';
import cors from "cors";
import fetch from 'node-fetch'; 
const app = express();
app.use(cors())

const port = 3000;

app.get("/api/crossword/latest", async (req, res) => {
  try {
    // 1. Choose the list file based on the query param
    const listFile = req.query.type === 'mini' 
      ? "mini-crossword-list.txt" 
      : "crossword-list.txt";

    // 2. Fetch the correct list
    const meta = await fetch(`https://wp.dailybruin.com/wp-content/crosswords/${listFile}`);
    let all_files = (await meta.text()).split("\n");
    
    let latest_file = ""
    if (all_files.length > 0) {
        latest_file = all_files[0].trim(); // Added trim() to remove potential carriage returns
    }

    // 3. Fetch the crossword JSON
    const crosswordRes = await fetch(`https://wp.dailybruin.com/wp-content/crosswords/${latest_file}`);
    const crossword = await crosswordRes.json();

    // 4. Extract date (assumes file structure is consistent, e.g., 'folder/date.json')
    const date = latest_file.split('/').at(-1).substring(0,10);

    
    res.json({ date: date, crossword });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error fetching crossword");
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});