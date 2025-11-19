"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function StartPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState("easy");

  useEffect(() => {
    // trigger fade-in animation after mount
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

const startGame = () => {
  if (!name.trim()) return alert("Enter your name!");
  localStorage.setItem("playerName", name);
  localStorage.setItem("gameMode", mode);
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

        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-3">
            {[
              { label: "Easy", value: "easy", note: "Relaxed play" },
              { label: "Hard", value: "hard", note: "10s timer" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                className={`px-4 py-2 rounded-md border-2 border-white text-xl transition-all ${
                  mode === option.value
                    ? "bg-white text-[#2d8b57] scale-105"
                    : "bg-transparent text-white hover:bg-white/10"
                }`}
              >
                <div>{option.label}</div>
                <div className="text-sm opacity-80">{option.note}</div>
              </button>
            ))}
          </div>
          <p className="text-lg opacity-80 text-center max-w-sm">
            Hard mode gives you 10 seconds per attempt—miss the timer and you
            lose the attempt automatically.
          </p>
        </div>

        <button
          onClick={startGame}
          className="text-4xl font-bold underline decoration-[3px] underline-offset-4 hover:scale-110 transition-transform animate-bounce"
        >
          START
        </button>
      </div>
    </div>
    
  );
}
