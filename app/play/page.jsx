"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Undo2Icon,
  ArrowUpRightIcon,
  Trash2Icon,
  EraserIcon,
  InfoIcon,
  BotIcon,
} from "lucide-react";
import DrawingCanvas from "@/components/DrawingCanvas";


export default function PlayPage() {
  const [imageBase64, setImageBase64] = useState(null);
  const [aiGuess, setAiGuess] = useState("—");
  const [category, setCategory] = useState("—");
  const [categoryMatch, setCategoryMatch] = useState(false);
  const [colorMatch, setColorMatch] = useState(false);
  const [styleScore, setStyleScore] = useState(0);
  const [attempt, setAttempt] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [brushColor, setBrushColor] = useState("#000000");
  const [expectedCategory, setExpectedCategory] = useState("");
  const [shapeMatch, setShapeMatch] = useState(false);
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
  const undoRef = useRef(null);
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

  const [targetInfo, setTargetInfo] = useState(null);
  const hardMode = mode === "hard";

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
  fetch("https://drawdle-backend-v1.onrender.com/target")
    .then((res) => res.json())
    .then((data) => setTargetInfo(data))
    .catch((err) => console.error("Failed to fetch target:", err));
}, []);

useEffect(() => {
  const storedMode = localStorage.getItem("gameMode");
  if (storedMode === "hard" || storedMode === "easy") {
    setMode(storedMode);
  }
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

const submitDrawing = async () => {
  if (!hasDrawing) return alert("Draw something first!");
  setTimePenaltyMessage("");
  setLoading(true);
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

    setAiGuess(data.guess || "—");
    setCategory(data.category || "—");
    setCategoryMatch(categoryMatches);
    setColorMatch(Boolean(data.color_match));
    setStyleScore(Number(data.style_score) || 0);
    setExpectedCategory(data.expected_category || "");
    setShapeMatch(Boolean(data.shape_match));
    setHint(data.hint || "");
    setShowHint(false);
    setHintLocation(attemptNumber >= 3 ? data.hint_location || "" : "");

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
      setShowWin(true);
      setTimeout(() => (window.location.href = "/leaderboard"), 2000);
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
              <li>🕵️ Watch the category, colour, and shape lights — they turn green when you’re nailing it.</li>
              <li>🔮 After your first try, tap the Hint button for a cheeky little clue.</li>
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

      <div className="relative z-10 flex w-full justify-center px-3 py-4 sm:py-6">
        <div className="flex min-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col gap-4 sm:gap-6">
          {/* Top bar */}
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center text-2xl font-bold sm:text-left sm:text-3xl">
              Attempt {attempt} / {maxAttempts}
              {hardMode && timeLeft !== null && (
                <span className="ml-2 inline-block text-xl font-normal sm:ml-3">
                  · {String(timeLeft).padStart(2, "0")}s
                </span>
              )}
            </div>

            <div className="hidden sm:flex">
              <PaletteControls />
            </div>
          </header>

          {/* Canvas & feedback area */}
          <main className="flex flex-1 w-full flex-col items-center gap-4 sm:gap-6">
            {/* Colour palette (mobile) */}
            <div className="w-full flex justify-center sm:hidden">
              <PaletteControls className="justify-center flex-wrap" />
            </div>

            <div className="w-full">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-auto aspect-[3/4] sm:aspect-video flex items-center justify-center overflow-hidden">
                <DrawingCanvas
                  ref={undoRef}
                  width={1000}
                  height={800}
                  color={brushColor}
                  size={12}
                  onChangeImageBase64={setImageBase64}
                  onDrawStateChange={setHasDrawing}
                />
              </div>
            </div>

            {/* Status indicators */}
            <div className="flex w-full flex-wrap justify-center gap-5 sm:gap-12 items-center text-2xl sm:text-4xl font-semibold tracking-wider">
              {[
                {
                  ok: category?.toLowerCase() === expectedCategory?.toLowerCase(),
                  label: "Category",
                },
                { ok: colorMatch, label: "Colour" },
                { ok: shapeMatch, label: "Shape" },
              ].map((x) => (
                <div
                  key={x.label}
                  className={`uppercase ${
                    x.ok ? "text-green-300" : "text-red-300"
                  }`}
                >
                  {x.label}
                </div>
              ))}
            </div>

            {/* AI feedback */}
            <div className="w-full max-w-2xl text-center text-2xl sm:text-3xl flex flex-col items-center gap-2">
              <p className="leading-snug">
                <span className="font-bold">AI Guess:</span> {aiGuess}
              </p>
              <p className="opacity-90">Category: {category}</p>
              <div className="flex flex-col sm:flex-row gap-3 mt-1">
                <button
                  type="button"
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 border-white/70 text-xl ${
                    hint ? "opacity-90" : "opacity-50 cursor-not-allowed"
                  }`}
                  onClick={() => hint && setShowHint((prev) => !prev)}
                  disabled={!hint}
                >
                  <InfoIcon className="w-5 h-5" />
                  <span>Hint</span>
                </button>
              </div>
              {showHint && hint && (
                <p className="text-lg sm:text-2xl max-w-md text-center mt-1">
                  {hintLocation ? `${hint} ` : hint}
                </p>
              )}
              {timePenaltyMessage && (
                <p className="text-base text-red-200 mt-1">{timePenaltyMessage}</p>
              )}
            </div>
          </main>

          {/* Controls */}
          <footer className="mt-auto flex w-full justify-center pb-3 sm:pb-5">
            <div className="flex flex-wrap justify-center gap-3 sm:gap-14 items-center w-full max-w-3xl">
              {/* Undo */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={doUndo}
                  className="w-11 h-11 sm:w-16 sm:h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                >
                  <Undo2Icon className="w-8 h-8" />
                </button>
                <span className="text-lg">Undo</span>
              </div>

              {/* Clear */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => undoRef.current?.clear?.()}
                  className="w-11 h-11 sm:w-16 sm:h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                >
                  <Trash2Icon className="w-8 h-8" />
                </button>
                <span className="text-lg">Clear</span>
              </div>

              {/* Eraser */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => setBrushColor("#ffffff")}
                  className="w-11 h-11 sm:w-16 sm:h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                >
                  <EraserIcon className="w-8 h-8" />
                </button>
                <span className="text-lg">Eraser</span>
              </div>

              {/* Submit */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={submitDrawing}
                  disabled={loading}
                  className="w-11 h-11 sm:w-16 sm:h-16 bg-white text-[#2d8b57] rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg border-2 border-white disabled:opacity-50"
                >
                  <ArrowUpRightIcon className="w-8 h-8" />
                </button>
                <span className="text-lg">Submit</span>
              </div>
            </div>
          </footer>
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

      {loading && (
        <div className="fixed inset-0 bg-[#000000b0] backdrop-blur-sm flex flex-col items-center justify-center z-50 text-white font-handdrawn">
          <div className="absolute inset-0 bg-[url('/chalk-texture.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
          <div className="flex flex-col items-center justify-center gap-4 animate-[pulse_1.2s_ease-in-out_infinite]">
            <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white text-[#2d8b57] rounded-full flex items-center justify-center shadow-2xl border-4 border-white/70">
              <BotIcon className="w-16 h-16 sm:w-20 sm:h-20" />
            </div>
            <p className="text-4xl sm:text-5xl tracking-wide">
              Thinking<span className="animate-bounce">...</span>
            </p>
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
