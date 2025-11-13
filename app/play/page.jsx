"use client";

import { useState, useRef, useEffect} from "react";
import { Undo2Icon, ArrowUpRightIcon } from "lucide-react";
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
  const undoRef = useRef(null);
  const maxAttempts = 5;
  const doUndo = () => undoRef.current?.undo && undoRef.current.undo();
  const palette = ["#000000", "#e63946", "#457b9d", "#2a9d8f", "#f4a261", "#f9c74f"];

  const [targetInfo, setTargetInfo] = useState(null);

useEffect(() => {
  fetch("http://127.0.0.1:5050/target")
    .then((res) => res.json())
    .then((data) => setTargetInfo(data))
    .catch((err) => console.error("Failed to fetch target:", err));
}, []);


const submitDrawing = async () => {
  if (!imageBase64) return alert("Draw something first!");
  setLoading(true);

  try {
    const res = await fetch("http://127.0.0.1:5050/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_base64: imageBase64, attempt }),
    });

    const data = await res.json();

    setAiGuess(data.guess || "—");
    setCategory(data.category || "—");
    setCategoryMatch(Boolean(data.success));
    setColorMatch(Boolean(data.color_match));
    setStyleScore(Number(data.style_score) || 0);
    setExpectedCategory(data.expected_category || "");
    setShapeMatch(Boolean(data.shape_match));

    // Calculate final score
    const style = data.style_score ?? 0;

// New strict scoring
let base = 50; // base if guessed correctly
if (data.color_match) base += 20;
if (data.shape_match) base += 20;
const styleBonus = Math.min(styleScore, 10);
const attemptPenalty = (attempt - 1) * 10;

const score = Math.min(100, Math.max(0, base + styleBonus - attemptPenalty));
    const playerName = localStorage.getItem("playerName") || "Unknown";

    // Save leaderboard entry via Flask API
    try {
      await fetch("http://127.0.0.1:5050/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: playerName,
          score,
          attempts: attempt,
          image: imageBase64,
        }),
      });
    } catch (err) {
      console.error("Failed to save leaderboard entry:", err);
    }

    // Handle win / lose logic
    if (data.success) {
      setFinalScore(score);
      setShowWin(true);
      setTimeout(() => (window.location.href = "/leaderboard"), 2000);
    } else if (attempt >= maxAttempts) {
      setFinalScore(score);
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
    <div className="relative min-h-screen bg-[#2d8b57] text-white font-handdrawn flex flex-col items-center justify-between py-4 px-3 overflow-hidden">
      
      
      {/* Intro */}

{showIntro && (
  <div className="absolute inset-0 bg-[#000000b0] flex items-center justify-center z-50 text-white font-handdrawn overflow-y-auto">
    <div className="absolute inset-0 bg-[url('/chalk-texture.png')] opacity-20 mix-blend-overlay"></div>

    <div className="relative bg-[#2d8b57] border-4 border-white rounded-xl p-6 sm:p-10 text-center max-w-2xl w-[90%] shadow-[0_0_30px_rgba(255,255,255,0.2)] animate-chalkPop">
      <h2 className="text-3xl sm:text-5xl mb-6 font-handdrawn">🎨 How to Play 🎨</h2>

      <ul className="text-lg sm:text-2xl text-left leading-relaxed space-y-3 sm:space-y-4 mx-auto max-w-lg">
        <li>🧠 <strong>AI is the judge</strong> — it will guess your drawing.</li>
        <li>🟢 <strong>Indicators turn green</strong> when you’re correct.</li>
        <li>🏆 <strong>Guess it correctly</strong> and you win the round.</li>
        <li>⏱️ <strong>The quicker and more stylish</strong>, the higher your score!</li>
        <li>🌈 <strong>Bring it to life with colour</strong> — creativity counts!</li>
        <li>✏️ <strong>You have 5 attempts</strong> to help the AI guess it right!</li>
      </ul>

      <button
        onClick={() => setShowIntro(false)}
        className="mt-8 bg-white text-[#2d8b57] px-8 sm:px-10 py-3 sm:py-4 rounded-md text-xl sm:text-2xl border-2 border-white hover:bg-[#2d8b57] hover:text-white transition-all hover:scale-105"
      >
        Got it! →
      </button>
    </div>
  </div>
)}


      {/* Chalk texture */}
      <div className="absolute inset-0 bg-[url('/chalk-texture.png')] opacity-15 mix-blend-overlay pointer-events-none"></div>

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between z-20 gap-3">
      <div className="flex gap-3 items-center">
  {[...Array(maxAttempts)].map((_, i) => (
    <div
      key={i}
      className={`w-8 h-8 sm:w-8 sm:h-8 rounded-full border-2 ${
        i < attempt ? "bg-white border-white" : "border-white/60"
      } ${i === attempt - 1 ? "animate-chalkPop" : ""} transition-all`}
      
    ></div>
  ))}
</div>

        <div className="flex flex-wrap justify-end gap-2 max-w-[80%]">
          {palette.map((c) => (
            <button
              key={c}
              onClick={() => setBrushColor(c)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 transition-all ${
                brushColor === c ? "border-white scale-110" : "border-transparent opacity-80"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10 px-3">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl aspect-4/3 sm:aspect-video flex items-center justify-center overflow-hidden">
          <DrawingCanvas
            width={1000}
            height={800}
            color={brushColor}
            size={12}
            onChangeImageBase64={setImageBase64}
            undoRef={undoRef}
          />
        </div>

        {/* Status indicators */}
        <div className="flex justify-center gap-8 items-center mt-8 flex-wrap">
        {[
  {
    ok: category?.toLowerCase() === expectedCategory?.toLowerCase(),
    label: "Category",
  },
  { ok: colorMatch, label: "Colour" },
  { ok: shapeMatch, label: "Shape" },
].map((x) => (
  <div key={x.label} className="flex flex-col items-center">
    <div
      className={`w-16 h-16 rounded-full transition-all ${
        x.ok ? "bg-green-500 scale-110" : "bg-red-500"
      }`}
    ></div>
    <span className="mt-2 text-base font-semibold">{x.label}</span>
  </div>
))}


        </div>

        {/* AI feedback */}
        <div className="text-center mt-8 text-xl sm:text-2xl">
          <p>
            <span className="font-bold">AI Guess:</span> {aiGuess}
          </p>
          <p className="opacity-90">Category: {category}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-10 items-center z-20">
        <button
          onClick={doUndo}
          className="w-16 h-16 sm:w-15 sm:h-15 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-md"
        >
          <Undo2Icon className="w-8 h-8 sm:w-10 sm:h-10" />
        </button>
        <button
          onClick={submitDrawing}
          disabled={loading}
          className="w-16 h-16 sm:w-15 sm:h-15 bg-white text-[#2d8b57] rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg disabled:opacity-50 border-2 border-white hover:bg-[#2d8b57] hover:text-white"
        >
          <ArrowUpRightIcon className="w-8 h-8 sm:w-10 sm:h-10" />
        </button>
      </div>

      {/* Win modal */}
      {showWin && (
        <div className="absolute inset-0 bg-[#000000b0] flex flex-col items-center justify-center z-50 text-white font-handdrawn">
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
  <div className="absolute inset-0 bg-[#000000b0] backdrop-blur-sm flex flex-col items-center justify-center z-50 text-white font-handdrawn">
    <div className="absolute inset-0 bg-[url('/chalk-texture.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
    <div className="flex flex-col items-center justify-center animate-pulse">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-32 h-32 mb-4 opacity-90"
        fill="none"
        viewBox="0 0 24 24"
        stroke="white"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 17v1a3 3 0 0 0 6 0v-1m3-5a9 9 0 1 0-18 0 9 9 0 0 0 18 0z"
        />
      </svg>
      <p className="text-4xl sm:text-5xl tracking-wide animate-[pulse_1.2s_ease-in-out_infinite]">
        Thinking<span className="animate-bounce">...</span>
      </p>
    </div>
  </div>
)}


      {/* Game over modal */}
      {showGameOver && (
        <div className="absolute inset-0 bg-[#000000b0] flex flex-col items-center justify-center z-50 text-white font-handdrawn">
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
