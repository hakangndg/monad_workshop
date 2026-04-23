// packages/nextjs/app/page.tsx
"use client";

import type { NextPage } from "next";
import { useState } from "react";

// 15x15 = 225 Kare
const TOTAL_TILES = 15 * 15; 

// 🔥 GIGACHAD FIX: Config'i ezip direkt Tailwind'in kendi renklerini ve custom shadow'ları basıyoruz
const teams = {
  0: { id: 0, name: "Empty", bg: "bg-zinc-900", border: "border-zinc-800 hover:bg-zinc-700", shadow: "" },
  1: { id: 1, name: "Red", bg: "bg-red-500", border: "border-red-900", shadow: "shadow-[0_0_15px_#ef4444] hover:border-white" },
  2: { id: 2, name: "Blue", bg: "bg-blue-500", border: "border-blue-900", shadow: "shadow-[0_0_15px_#3b82f6] hover:border-white" },
  3: { id: 3, name: "Green", bg: "bg-green-500", border: "border-green-900", shadow: "shadow-[0_0_15px_#22c55e] hover:border-white" },
};

const HomePage: NextPage = () => {
  const [gridState, setGridState] = useState<number[]>(Array(TOTAL_TILES).fill(0));

  const percentages = { blue: 33, red: 33, green: 34 };
  const [tpsValue, setTpsValue] = useState(25);

  const handleTileClick = (index: number) => {
    // ŞİMDİLİK: Kullanıcının MAVİ takımda (id: 2) olduğunu varsayıyoruz
    const playerTeamId = 2;

    setGridState(prev => {
      const newState = [...prev];
      newState[index] = playerTeamId; // Mavileştiriyoruz
      return newState;
    });

    // Test: Tıkladıkça sağdaki overdrive barını doldur
    setTpsValue(prev => Math.min(prev + 5, 100));
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center p-4">
      
      {/* 📊 DOMINANCE BAR */}
      <div className="w-full max-w-4xl flex flex-col items-center gap-2 mt-6 mb-10">
        <span className="text-white font-mono text-xs tracking-widest uppercase">TERRITORY CONTROL (Dominance)</span>
        <div className="w-full h-8 bg-zinc-950 rounded-full overflow-hidden flex shadow-lg border-2 border-zinc-700">
          <div style={{ width: `${percentages.blue}%` }} className="bg-blue-500 h-full transition-all duration-500 shadow-[0_0_15px_#3b82f6]"></div>
          <div style={{ width: `${percentages.red}%` }} className="bg-red-500 h-full transition-all duration-500 shadow-[0_0_15px_#ef4444]"></div>
          <div style={{ width: `${percentages.green}%` }} className="bg-green-500 h-full transition-all duration-500 shadow-[0_0_15px_#22c55e]"></div>
        </div>
      </div>

      <div className="flex flex-row items-center gap-8">
        {/* 🎮 15x15 GRID SAVAŞ ALANI */}
        <div className="grid grid-cols-[repeat(15,_minmax(0,_1fr))] gap-1.5 p-3 bg-black border-4 border-zinc-800 rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.05)]">
          {gridState.map((teamId, index) => {
            const team = teams[teamId as keyof typeof teams] || teams[0];
            return (
              <button
                key={index}
                onClick={() => handleTileClick(index)}
                className={`w-10 h-10 rounded-md transition-all duration-150 active:scale-90 hover:scale-110 z-10 
                  ${team.bg} ${team.border} ${team.shadow}`}
              />
            );
          })}
        </div>

        {/* ⚡ OVERDRIVE BAR */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-yellow-400 font-bold text-xs tracking-wider uppercase rotate-90 my-10">OVERDRIVE</span>
          <div className="w-8 h-[450px] bg-zinc-950 rounded-full border border-zinc-800 p-1 flex items-end">
            <div 
              style={{ height: `${tpsValue}%` }} 
              className="w-full bg-yellow-400 rounded-full shadow-[0_0_15px_#facc15] transition-all duration-300"
            />
          </div>
        </div>
      </div>

      <p className="mt-14 text-zinc-700 text-sm font-mono tracking-widest uppercase">
        Monad Network | Territory War | Parallel Conquest
      </p>
    </div>
  );
};

export default HomePage;