import express from 'express';
import cors from "cors";
import fetch from 'node-fetch'; // npm install node-fetch@2
const app = express();
app.use(cors())

const port = 3000;

// Proxy route to fetch the latest crossword
app.get("/api/crossword/latest", async (req, res) => {
  try {
    // crossword-list.txt contains the filename of the latest crossword
    const meta = await fetch("https://wp.dailybruin.com/wp-content/crosswords/crossword-list.txt");
    let all_files = (await meta.text()).split("\n");
    let latest_file = ""
    if (all_files.length > 0) {
        latest_file = all_files[0]
    }

    const crosswordRes = await fetch(`https://wp.dailybruin.com/wp-content/crosswords/${latest_file}`);
    const crossword = await crosswordRes.json();

    res.json({ date: latest_file.split("-")[0], crossword });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error fetching crossword");
  }
});


// Optional: basic test route
app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
