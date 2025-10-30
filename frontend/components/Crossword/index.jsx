import { Crossword } from "@guardian/react-crossword"
import data from "./data"

export default function CrosswordTest() {
  return (
    <div style={{ maxWidth: "400px", margin: "2rem auto" }}>
      <h2>Hi</h2>
      <Crossword
        data={data}
        theme={{
          cellBackground: "#fff",
          cellBorder: "#000",
          numberColor: "#000",
          highlightBackground: "#d3f4ff",
          correctCellBackground: "#c8f7c5",
        }}
      />
    </div>
  );
}