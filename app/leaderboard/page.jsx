"use client";
import { useEffect, useState } from "react";

export default function LeaderboardPage() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/leaderboard")
      .then((res) => res.json())
      .then((data) => {
        setScores(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="relative min-h-screen bg-[#2d8b57] text-white font-handdrawn flex flex-col items-center justify-center p-6">
      {/* Chalk texture overlay */}
      <div className="absolute inset-0 bg-[url('/chalk-texture.png')] opacity-15 mix-blend-overlay pointer-events-none"></div>

      <h1 className="text-6xl mb-8 animate-[scribble_2s_ease-in-out_1]">
        🏆 Leaderboard
      </h1>

      {loading ? (
        <p className="text-3xl animate-pulse">Loading...</p>
      ) : scores.length === 0 ? (
        <p className="text-3xl opacity-80">No scores yet — be the first!</p>
      ) : (
        <div className="bg-white/10 border-4 border-white rounded-2xl p-8 shadow-xl max-w-4xl w-full">
          {scores.map((entry, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row items-center justify-between py-5 border-b border-white/30 last:border-none gap-6"
            >
              {/* Left side: rank + name */}
              <div className="flex items-center gap-4">
                <span className="text-3xl">{index + 1}.</span>
                <div className="flex flex-col">
                  <span className="text-2xl">{entry.name}</span>
                  <span className="text-sm opacity-80">
                    Attempts: {entry.attempts}
                  </span>
                </div>
              </div>

              {/* Middle: image thumbnail */}
              {entry.image && (
                <button
                  onClick={() => setSelectedImage(entry.image)}
                  className="relative group"
                >
                  <img
                    src={entry.image}
                    alt="Player drawing"
                    className="w-32 h-24 object-contain rounded-lg border-2 border-white/40 shadow-md group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-lg font-bold transition-opacity">
                    View
                  </span>
                </button>
              )}

              {/* Right side: score */}
              <span className="text-4xl font-bold">{entry.score}</span>
            </div>
          ))}
        </div>
      )}

      {/* Back button */}
      <button
        onClick={() => (window.location.href = "/")}
        className="mt-10 text-3xl underline decoration-[3px] underline-offset-4 hover:scale-110 transition-transform"
      >
        Back to Start
      </button>

      {/* Image preview modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-[#000000b0] backdrop-blur-sm flex items-center justify-center z-50 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <div className="absolute inset-0 bg-[url('/chalk-texture.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
          <div className="relative p-4 bg-[#2d8b57] border-4 border-white rounded-2xl shadow-2xl max-w-4xl w-[90%] flex flex-col items-center animate-chalkPop">
            <img
              src={selectedImage}
              alt="Zoomed drawing"
              className="max-h-[75vh] object-contain rounded-lg border-4 border-white shadow-lg"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="mt-6 bg-white text-[#2d8b57] px-8 py-3 rounded-md text-2xl border-2 border-white hover:bg-[#2d8b57] hover:text-white transition-all hover:scale-105"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
