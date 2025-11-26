"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Undo2Icon,
  ArrowUpRightIcon,
  Trash2Icon,
  EraserIcon,
  BotIcon,
} from "lucide-react";
import DrawingCanvas from "@/components/DrawingCanvas";

const COLOUR_LABELS = {
  "#000000": "Black",
  "#e63946": "Red",
  "#457b9d": "Blue",
  "#2a9d8f": "Green",
  "#f4a261": "Orange",
  "#f9c74f": "Yellow",
};
const SLOT_REVEAL_DURATION = 1200;


export default function PlayPage() {
  const [imageBase64, setImageBase64] = useState(null);
  const [aiGuess, setAiGuess] = useState("—");
  const [guessHistory, setGuessHistory] = useState([]);
  const [category, setCategory] = useState("—");
  const [categoryMatch, setCategoryMatch] = useState(false);
  const [colorMatch, setColorMatch] = useState(false);
  const [attempt, setAttempt] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(12);
  const [showIntro, setShowIntro] = useState(true);
  const [introLeaving, setIntroLeaving] = useState(false);
  const closeIntro = () => {
    if (!introLeaving) setIntroLeaving(true);
  };
  const [hasDrawing, setHasDrawing] = useState(false);
  const [hint, setHint] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [hintLocation, setHintLocation] = useState("");
  const [mode, setMode] = useState("easy");
  const [timeLeft, setTimeLeft] = useState(null);
  const [timePenaltyMessage, setTimePenaltyMessage] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedColourHex, setSubmittedColourHex] = useState("");
  const [guessCorrect, setGuessCorrect] = useState(false);
  const [statusRevealStage, setStatusRevealStage] = useState(1);
  const [targetUseHint, setTargetUseHint] = useState("");
  const [targetHintLoading, setTargetHintLoading] = useState(true);
  const [hintOpen, setHintOpen] = useState(true);
  const undoRef = useRef(null);
  const revealTimeoutRef = useRef(null);
  const winDelayRef = useRef(null);
  const redirectRef = useRef(null);
  const maxAttempts = 5;
  const doUndo = () => undoRef.current?.undo && undoRef.current.undo();
  const palette = ["#000000", "#e63946", "#457b9d", "#2a9d8f", "#f4a261", "#f9c74f"];

  const PaletteControls = ({ className = "" }) => (
    <div className={`flex gap-2 sm:gap-3 ${className}`}>
      {palette.map((c) => (
        <button
          key={c}
          onClick={() => setBrushColor(c)}
          className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 transition-all ${
            brushColor === c ? "border-white scale-110" : "border-transparent opacity-80"
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );

  const BrushSizeControl = () => (
    <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full text-sm sm:text-base">
      <span className="uppercase tracking-[0.25em] text-xs sm:text-[0.75rem]">Brush</span>
      <input
        type="range"
        min={4}
        max={28}
        step={1}
        value={brushSize}
        onChange={(e) => setBrushSize(Number(e.target.value))}
        className="accent-white h-2 w-28 sm:w-36"
      />
      <span className="w-8 text-center text-base sm:text-lg">{brushSize}</span>
    </div>
  );

  const hardMode = mode === "hard";
  const normalizedSubmittedColour = submittedColourHex?.toLowerCase() || "";
  const submittedColourLabel =
    hasSubmitted && normalizedSubmittedColour
      ? COLOUR_LABELS[normalizedSubmittedColour] || normalizedSubmittedColour.toUpperCase()
      : "Colour";
  const slotPlaceholder = <span className="slot-spin inline-block text-white">???</span>;

useEffect(() => {
  const today = new Date().toISOString().slice(0, 10);
  const lastPlayDate = localStorage.getItem("lastPlayDate");
  const activePlayDate = localStorage.getItem("activePlayDate");
  const override = localStorage.getItem("allowMultiplePlays") === "true";
    if (!override && lastPlayDate === today && activePlayDate !== today) {
      window.location.href = "/";
      return;
    }
  if (activePlayDate !== today) {
    localStorage.setItem("activePlayDate", today);
  }
}, []);

useEffect(() => {
  return () => {
    if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    if (winDelayRef.current) clearTimeout(winDelayRef.current);
    if (redirectRef.current) clearTimeout(redirectRef.current);
  };
}, []);

useEffect(() => {
  const storedMode = localStorage.getItem("gameMode");
  if (storedMode === "hard" || storedMode === "easy") {
    setMode(storedMode);
  }
}, []);

useEffect(() => {
  let active = true;
  const fetchHint = async () => {
    try {
      const res = await fetch("https://drawdle-backend-v1.onrender.com/target");
      const data = await res.json();
      if (!active) return;
      const usageHint =
        data.use_for ||
        data.use_hint ||
        data.usage_hint ||
        data.use_case ||
        data.usecase ||
        data.public_name ||
        data.location ||
        "";
      setTargetUseHint(usageHint);
    } catch (err) {
      console.error("Failed to fetch daily hint:", err);
      if (active) setTargetUseHint("");
    } finally {
      if (active) setTargetHintLoading(false);
    }
  };
  fetchHint();
  return () => {
    active = false;
  };
}, []);

useEffect(() => {
  if (!hardMode || showWin || showGameOver) {
    setTimeLeft(null);
    return;
  }
  setTimeLeft(10);
}, [hardMode, attempt, showWin, showGameOver]);

useEffect(() => {
  if (!hardMode || showWin || showGameOver) return;
  if (timeLeft === null || timeLeft <= 0) return;
  const timer = setInterval(() => {
    setTimeLeft((prev) => (prev === null ? prev : Math.max(prev - 1, 0)));
  }, 1000);
  return () => clearInterval(timer);
}, [hardMode, timeLeft, showWin, showGameOver]);

const handleTimeExpired = useCallback(() => {
  setTimePenaltyMessage("⏰ Time's up! Attempt lost.");
  setAttempt((currentAttempt) => {
    const nextAttempt = currentAttempt + 1;
    if (nextAttempt > maxAttempts) {
      setFinalScore(0);
      setShowGameOver(true);
      setTimeLeft(null);
      setTimeout(() => (window.location.href = "/leaderboard"), 2500);
      return currentAttempt;
    }
    setTimeLeft(10);
    return nextAttempt;
  });
  setShowHint(false);
}, [maxAttempts]);

useEffect(() => {
  if (!hardMode || showWin || showGameOver) return;
  if (timeLeft !== 0) return;
  handleTimeExpired();
}, [hardMode, timeLeft, showWin, showGameOver, handleTimeExpired]);

useEffect(() => {
  if (!timePenaltyMessage) return;
  const timeout = setTimeout(() => setTimePenaltyMessage(""), 2000);
  return () => clearTimeout(timeout);
}, [timePenaltyMessage]);

useEffect(() => {
  if (!showWin && !showGameOver) return;
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem("lastPlayDate", today);
  localStorage.removeItem("activePlayDate");
}, [showWin, showGameOver]);

useEffect(() => {
  const shouldLock = window.innerWidth < 640;
  if (!shouldLock) return;
  const prevOverflow = document.body.style.overflow;
  const prevPosition = document.body.style.position;
  const prevWidth = document.body.style.width;
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
  return () => {
    document.body.style.overflow = prevOverflow;
    document.body.style.position = prevPosition;
    document.body.style.width = prevWidth;
  };
}, []);

const submitDrawing = async () => {
  if (!hasDrawing) return alert("Draw something first!");
  setTimePenaltyMessage("");
  if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
  setStatusRevealStage(0);
  setLoading(true);
  setShowHint(false);
  const attemptNumber = attempt;

  try {
    const res = await fetch("https://drawdle-backend-v1.onrender.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_base64: imageBase64, attempt: attemptNumber, colour: brushColor }),
    });

    const data = await res.json();

    const success = Boolean(data.success);
    const categoryMatches =
      data.category_match !== undefined ? Boolean(data.category_match) : success;

    const newGuess = data.guess || "—";
    setAiGuess(newGuess);
    setCategory(data.category || "—");
    setCategoryMatch(categoryMatches);
    setColorMatch(Boolean(data.color_match));
    setSubmittedColourHex((brushColor || "").toLowerCase());
    const newHint = data.hint || "";
    const newHintLocation =
      !success && attemptNumber >= 3 ? data.hint_location || "" : "";
    setHint(newHint);
    setHintLocation(newHintLocation);
    setShowHint(!success && Boolean(newHint));
    setHasSubmitted(true);
    if (!success && newGuess && newGuess !== "—") {
      setGuessHistory((prev) => [newGuess, ...prev].slice(0, 5));
    }
    revealTimeoutRef.current = setTimeout(() => setStatusRevealStage(1), 500);
    setGuessCorrect(success);

    const scoreFromApi =
      typeof data.score === "number"
        ? data.score
        : (() => {
            const style = Number(data.style_score) || 0;
            let base = 50;
            if (data.color_match) base += 20;
            if (data.shape_match) base += 20;
            const styleBonus = Math.min(style, 25);
            const attemptPenalty = (attempt - 1) * 10;
            return Math.min(100, Math.max(0, base + styleBonus - attemptPenalty));
          })();
    const playerName = localStorage.getItem("playerName") || "Unknown";

    // Save leaderboard entry via Flask API
// Save leaderboard entry ONLY when guessed correctly
if (success) {
  try {
    await fetch("https://drawdle-backend-v1.onrender.com/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: playerName,
        score: scoreFromApi,
        attempts: attempt,
        image: imageBase64,
      }),
    });
  } catch (err) {
    console.error("Failed to save leaderboard entry:", err);
  }
}


    // Handle win / lose logic
    if (success) {
      setFinalScore(scoreFromApi);
      if (winDelayRef.current) clearTimeout(winDelayRef.current);
      if (redirectRef.current) clearTimeout(redirectRef.current);
      winDelayRef.current = setTimeout(() => {
        setShowWin(true);
        redirectRef.current = setTimeout(() => {
          window.location.href = "/leaderboard";
        }, 2000);
      }, SLOT_REVEAL_DURATION);
    } else if (attempt >= maxAttempts) {
      setFinalScore(scoreFromApi);
      setShowGameOver(true);
      setTimeout(() => (window.location.href = "/leaderboard"), 2500);
    } else {
      setAttempt((a) => a + 1);
    }
  } catch (err) {
    console.error(err);
    alert("Submission failed.");
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
    }
    setStatusRevealStage(1);
  } finally {
    setLoading(false);
  }
};

  

  return (
    <div className="relative min-h-dvh bg-[#2d8b57] text-white font-handdrawn overflow-hidden">
      {/* Intro */}
      {(showIntro || introLeaving) && (
        <div
          className={`fixed inset-0 bg-[#000000b0] flex items-center justify-center z-50 text-white font-handdrawn overflow-y-auto transition-opacity duration-500 ${
            introLeaving ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
          onTransitionEnd={() => {
            if (introLeaving) {
              setShowIntro(false);
              setIntroLeaving(false);
            }
          }}
        >
          <div className="absolute inset-0 bg-[url('/chalk-texture.png')] opacity-20 mix-blend-overlay"></div>

          <div
            className={`relative bg-[#2d8b57] border-4 border-white rounded-xl p-6 sm:p-10 text-center max-w-2xl w-[90%] shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-transform duration-500 ${
              introLeaving ? "scale-90 opacity-0" : "animate-chalkPop"
            }`}
          >
            <h2 className="text-3xl sm:text-5xl mb-6 font-handdrawn">🎨 How to Play 🎨</h2>

            <ul className="text-lg sm:text-2xl text-left leading-relaxed space-y-3 sm:space-y-4 mx-auto max-w-xl">
              <li>🧠 The AI is trying its best to guess your masterpiece!</li>
              <li>🔮 After each attempt, a hint fades in to nudge you toward the target.</li>
              <li>🚨 You’ve got 5 attempts to crack the secret prompt — make ’em count!</li>
              <li>🌈 Style points are up for grabs, so jazz up that drawing!</li>
            </ul>

            <button
              onClick={closeIntro}
              className="mt-8 bg-white text-[#2d8b57] px-8 sm:px-10 py-3 sm:py-4 rounded-md text-xl sm:text-2xl border-2 border-white hover:bg-[#2d8b57] hover:text-white transition-all hover:scale-105"
            >
              Got it! →
            </button>
          </div>
        </div>
      )}

      {/* Chalk texture */}
      <div className="absolute inset-0 bg-[url('/chalk-texture.png')] opacity-15 mix-blend-overlay pointer-events-none"></div>

      <div className="relative z-10 flex w-full justify-center px-3 py-2 sm:py-6">
        <div className="flex min-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col gap-3 sm:gap-6">
          {/* Canvas & feedback area */}
          <main className="flex flex-1 w-full flex-col items-center gap-3 sm:gap-6">
            <div className="w-full max-w-4xl mx-auto flex flex-col gap-2 sm:gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 text-xl sm:text-2xl font-bold">
                <div className="text-left flex-1">
                  Attempt {attempt} / {maxAttempts}
                  {hardMode && timeLeft !== null && (
                    <span className="ml-2 inline-block text-lg font-normal sm:ml-3">
                      · {String(timeLeft).padStart(2, "0")}s
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
                  <BrushSizeControl />
                  <PaletteControls className="justify-end flex-shrink-0" />
                </div>
              </div>

              <div className="relative bg-white rounded-2xl shadow-2xl w-full aspect-[3/4] sm:aspect-video flex items-center justify-center overflow-hidden">
                <DrawingCanvas
                  ref={undoRef}
                  width={1000}
                  height={800}
                  color={brushColor}
                  size={brushSize}
                  onChangeImageBase64={setImageBase64}
                  onDrawStateChange={setHasDrawing}
                />

                {(targetUseHint || !targetHintLoading || showHint) && (
                  <div
                    className={`absolute top-2 left-1/2 -translate-x-1/2 w-[92%] text-white transition-all duration-200 ${
                      hintOpen ? "opacity-100" : "opacity-90"
                    }`}
                  >
                    <div
                      className={`relative bg-[#2d8b57cc] border border-white/50 shadow-lg rounded-xl px-4 ${
                        hintOpen ? "py-3" : "py-5"
                      } flex flex-col items-center text-center`}
                    >
                      <button
                        onClick={() => setHintOpen((v) => !v)}
                        className="absolute right-2.5 top-2 bg-white/80 text-[#2d8b57] px-2 py-1 rounded-md text-[0.65rem] font-bold tracking-[0.2em] uppercase shadow-sm hover:scale-[1.02] transition-transform"
                      >
                        {hintOpen ? "Hide" : "Hint"}
                      </button>
                      {hintOpen && (
                        <p className="leading-snug text-lg sm:text-2xl text-center px-1 text-white mt-2">
                          {showHint
                            ? hint
                              ? hintLocation
                                ? `${hint} — Likely found: ${hintLocation}`
                                : hint
                              : "No hint available yet."
                            : targetHintLoading
                            ? "Fetching hint..."
                            : targetUseHint || "Hint unavailable for today."}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {loading && (
                  <div className="absolute inset-0 bg-[#2d8b57]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20 text-center">
                    <div className="flex items-center gap-3 text-3xl sm:text-4xl font-bold tracking-wide">
                      <BotIcon className="w-10 h-10 animate-pulse" />
                      <span>Analyzing…</span>
                    </div>
                    <p className="text-base uppercase tracking-[0.3em] text-white/80">
                      Hang tight
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Hidden state holders to keep values available without rendering */}
            <div className="hidden" aria-hidden="true">
              {category}
              {categoryMatch ? "match" : "no"}
              {submittedColourLabel}
              {colorMatch ? "color-match" : "color-miss"}
            </div>

            {/* AI guess / history / controls */}
            <div className="w-full max-w-4xl flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-5 text-2xl sm:text-4xl font-semibold tracking-wider mt-0 sm:-mt-2">
              <div className="w-full flex flex-row sm:flex-row items-start gap-3 sm:gap-5 flex-1">
                <div className="flex flex-col text-left">
                  <div
                    className={`uppercase ${
                      guessCorrect ? "text-green-300" : "text-red-300"
                    }`}
                  >
                    {statusRevealStage === 1 && hasSubmitted && aiGuess && aiGuess !== "—"
                      ? aiGuess
                      : slotPlaceholder}
                  </div>
                  <span className="mt-1 text-[0.65rem] sm:text-xs uppercase tracking-[0.4em] text-white/80">
                    AI Guess
                  </span>
                  {timePenaltyMessage && (
                    <p className="text-base text-red-200 mt-2">{timePenaltyMessage}</p>
                  )}
                </div>

                <div className="flex-1 flex flex-col text-left">
                  <p className="text-sm uppercase tracking-[0.4em] text-white/70 mb-1">
                    Previous Guesses
                  </p>
                  <div className="flex flex-wrap gap-2 text-base sm:text-xl font-normal">
                    {guessHistory.length === 0 ? (
                      <span className="text-white/50 text-sm">No guesses yet</span>
                    ) : (
                      guessHistory.map((guess, idx) => (
                        <span
                          key={`${guess}-${idx}`}
                          className="px-3 py-1 rounded-full border border-white/50 text-white/80 text-sm sm:text-base"
                        >
                          {guess}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-center sm:justify-end gap-3 sm:gap-4 items-center w-full sm:w-auto">
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={doUndo}
                    className="w-10 h-10 sm:w-14 sm:h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                  >
                    <Undo2Icon className="w-7 h-7" />
                  </button>
                  <span className="text-lg">Undo</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => undoRef.current?.clear?.()}
                    className="w-10 h-10 sm:w-14 sm:h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                  >
                    <Trash2Icon className="w-7 h-7" />
                  </button>
                  <span className="text-lg">Clear</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => setBrushColor("#ffffff")}
                    className="w-10 h-10 sm:w-14 sm:h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                  >
                    <EraserIcon className="w-7 h-7" />
                  </button>
                  <span className="text-lg">Eraser</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={submitDrawing}
                    disabled={loading}
                    className="w-10 h-10 sm:w-14 sm:h-14 bg-white text-[#2d8b57] rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg border-2 border-white disabled:opacity-50"
                  >
                    <ArrowUpRightIcon className="w-7 h-7" />
                  </button>
                  <span className="text-lg">Submit</span>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Win modal */}
      {showWin && (
        <div className="fixed inset-0 bg-[#000000b0] flex flex-col items-center justify-center z-50 text-white font-handdrawn">
          <div className="absolute inset-0 bg-[url('/chalk-texture.png')] opacity-20 mix-blend-overlay"></div>
          <div className="relative bg-[#2d8b57] border-4 border-white rounded-xl p-10 text-center max-w-xl shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            <h2 className="text-5xl sm:text-6xl mb-6">🎉 You Win! 🎉</h2>
            <p className="text-3xl mb-3">Final Score: <strong>{finalScore}</strong></p>
            <p className="text-xl mb-8">AI guessed correctly in {attempt} attempt{attempt > 1 && "s"}.</p>
            <button
              onClick={() => (window.location.href = "/leaderboard")}
              className="bg-white text-[#2d8b57] px-8 py-3 rounded-md text-2xl border-2 border-white hover:bg-[#2d8b57] hover:text-white transition-all hover:scale-105"
            >
              View Leaderboard →
            </button>
          </div>
        </div>
      )}
      {/* Game over modal */}
      {showGameOver && (
        <div className="fixed inset-0 bg-[#000000b0] flex flex-col items-center justify-center z-50 text-white font-handdrawn">
          <div className="absolute inset-0 bg-[url('/chalk-texture.png')] opacity-20 mix-blend-overlay"></div>
          <div className="relative bg-[#8b2d2d] border-4 border-white rounded-xl p-10 text-center max-w-xl shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            <h2 className="text-5xl sm:text-6xl mb-6">😅 Game Over</h2>
            <p className="text-3xl mb-3">Final Score: <strong>{finalScore}</strong></p>
            <p className="text-xl mb-8">You’ve used all {attempt} attempts — better luck next time!</p>
            <button
              onClick={() => (window.location.href = "/leaderboard")}
              className="bg-white text-[#8b2d2d] px-8 py-3 rounded-md text-2xl border-2 border-white hover:bg-[#8b2d2d] hover:text-white transition-all hover:scale-105"
            >
              View Leaderboard →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
