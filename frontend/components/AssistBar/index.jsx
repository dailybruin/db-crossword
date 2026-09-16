import { useEffect, useState } from "react";
import {
  Pause,
  Play,
  Eraser,
  CheckCircle,
  Lightbulb,
  Grid3x3,
} from "lucide-react";
import { formatTime } from "../Crossword/format";
import "./AssistBar.css";

export default function AssistBar({
  time,
  isRunning,
  onToggleTimer,
  onCheck,
  onRevealWord,
  onRevealAll,
  onClear,
}) {
  return (
    <div className="assist">
      <div className="assist__timer">
        <span className="assist__time">{formatTime(time)}</span>
        <button
          type="button"
          className="assist__toggle"
          onClick={onToggleTimer}
          aria-label={isRunning ? "Pause the timer" : "Resume the timer"}
        >
          {isRunning ? (
            <Pause size={14} aria-hidden="true" />
          ) : (
            <Play size={14} aria-hidden="true" />
          )}
          <span>{isRunning ? "Pause" : "Resume"}</span>
        </button>
      </div>

      <div className="assist__tools">
        <CheckTool onCheck={onCheck} />
        <button type="button" className="tool" onClick={onRevealWord}>
          <Lightbulb size={15} aria-hidden="true" />
          <span>Reveal word</span>
        </button>
        <ConfirmTool
          icon={<Grid3x3 size={15} aria-hidden="true" />}
          label="Reveal all"
          confirmLabel="Reveal all?"
          onConfirm={onRevealAll}
        />
        <ConfirmTool
          icon={<Eraser size={15} aria-hidden="true" />}
          label="Clear grid"
          confirmLabel="Clear grid?"
          onConfirm={onClear}
        />
      </div>
    </div>
  );
}

/**
 * Marking wrong letters is invisible when there are none, so the button says
 * what it found.
 */
function CheckTool({ onCheck }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (result === null) return undefined;
    const id = setTimeout(() => setResult(null), 2500);
    return () => clearTimeout(id);
  }, [result]);

  let label = "Check";
  if (result === 0) label = "No mistakes";
  else if (result > 0) label = `${result} wrong`;

  return (
    <button
      type="button"
      className="tool tool--check"
      onClick={() => setResult(onCheck())}
      aria-live="polite"
    >
      <CheckCircle size={15} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

/**
 * A tool that throws away work, so it asks once. A stray tap is easy on a
 * phone; getting your grid back after one isn't.
 */
function ConfirmTool({ icon, label, confirmLabel, onConfirm }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return undefined;
    const id = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(id);
  }, [armed]);

  return (
    <button
      type="button"
      className={armed ? "tool tool--armed" : "tool"}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      {icon}
      <span>{armed ? confirmLabel : label}</span>
    </button>
  );
}
