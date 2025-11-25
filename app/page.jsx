"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";

export default function StartPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState("easy");
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [overrideLimit, setOverrideLimit] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("allowMultiplePlays") === "true";
  });
  const [playLocked, setPlayLocked] = useState(() => {
    if (typeof window === "undefined") return false;
    const lastPlay = localStorage.getItem("lastPlayDate");
    return lastPlay === todayKey;
  });

  useEffect(() => {
    // trigger fade-in animation after mount
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem("allowMultiplePlays", overrideLimit ? "true" : "false");
  }, [overrideLimit]);

  const startGame = () => {
    if (!name.trim()) return alert("Enter your name!");

    const lastPlay = localStorage.getItem("lastPlayDate");
    if (!overrideLimit && lastPlay === todayKey) {
      return alert("You've already played today's challenge. Come back tomorrow!");
    }

    localStorage.setItem("playerName", name);
    localStorage.setItem("gameMode", mode);
    localStorage.setItem("lastPlayDate", todayKey);
    localStorage.setItem("activePlayDate", todayKey);
    setPlayLocked(true);
    router.push("/play");
  };


  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#2d8b57] text-white font-handdrawn overflow-hidden">
      {/* chalkboard texture overlay */}
      <div className="absolute inset-0 bg-[url('/chalk-texture.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>

      {/* main content */}
      <div
        className={`flex flex-col items-center gap-8 p-6 transition-all duration-700 ${
          loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
 <h1 className="text-[4rem] rotate-[-8deg] animate-chalkLoop">
  drawdle.
</h1>

        <p className="text-xl opacity-90 text-center max-w-md mt-4 mb-2">
          Try to match the AI’s choice! You get 5 attempts.
        </p>

        <div className="relative flex flex-col items-center">
  <input
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="...."
    className="w-72 text-black text-xl px-5 py-3 rounded-md outline-none border-4 border-white bg-white/90 focus:ring-2 focus:ring-white"
  />

  {/* Hand-drawn arrow and label */}
  <div className="absolute -bottom-16 -left-10 flex flex-col items-center text-white">
    <span className="text-4xl rotate-45 -mb-3.5">↑</span>
    <span className="text-2xl -rotate-10 tracking-widest">NAME</span>
  </div>
</div>

        {!overrideLimit && playLocked && (
          <p className="text-red-200 text-center text-lg max-w-sm">
            You&apos;ve already played today. Come back tomorrow or enable the override below for testing.
          </p>
        )}

        <button
          onClick={startGame}
          className="text-4xl font-bold underline decoration-[3px] underline-offset-4 hover:scale-110 transition-transform animate-bounce"
        >
          START
        </button>

        <div className="flex flex-col items-center gap-2 text-sm opacity-80">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={overrideLimit}
              onChange={(e) => setOverrideLimit(e.target.checked)}
              className="w-4 h-4 accent-[#2d8b57]"
            />
            <span>Override daily limit (dev use only)</span>
          </label>
        </div>
      </div>
    </div>
    
  );
}
