"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function StartPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // trigger fade-in animation after mount
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const [wiping, setWiping] = useState(false);

const startGame = () => {
  if (!name.trim()) return alert("Enter your name!");
  setWiping(true);
  setTimeout(() => {
    localStorage.setItem("playerName", name);
    router.push("/play");
  }, 1200); // delay while animation plays
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

        <button
          onClick={startGame}
          className="text-4xl font-bold underline decoration-[3px] underline-offset-4 hover:scale-110 transition-transform animate-bounce"
        >
          START
        </button>
      </div>
      {wiping && (
  <div className="fixed inset-0 bg-[#2d8b57] z-50 animate-[wipe_4s_ease-in-out_forwards] pointer-events-none" />
)}

    </div>
    
  );
}
