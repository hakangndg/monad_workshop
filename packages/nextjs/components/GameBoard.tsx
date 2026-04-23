"use client";

import { useEffect, useRef, useState } from "react";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export const GameBoard = () => {
  // --- STATE ---
  // 0: Empty, 1: Red, 2: Blue, 3: Green
  const [board, setBoard] = useState<number[]>(Array(225).fill(0));
  const [selectedTeam, setSelectedTeam] = useState<number>(1);
  const [isOverdrive, setIsOverdrive] = useState(false);
  const [flashingTile, setFlashingTile] = useState<number | null>(null);
  const clickTimes = useRef<number[]>([]);

  // --- SMART CONTRACT HOOKS ---
  const { writeContractAsync: claimTileTx } = useScaffoldWriteContract("MonadFrontline");

  const { data: boardData } = useScaffoldReadContract({
    contractName: "MonadFrontline",
    functionName: "getBoard",
    watch: true, // Auto-refresh every block (approx 2s in Monad)
  });

  // Sync board with contract when not wildly clicking
  useEffect(() => {
    if (Array.isArray(boardData) && boardData.length === 225) {
      // In a real high-frequency scenario, we might want to blend optimistic UI and chain data
      setBoard([...(boardData as number[])]);
    }
  }, [boardData]);

  // --- LOGIC ---
  const handleTileClick = async (index: number) => {
    const now = Date.now();
    clickTimes.current.push(now);

    // Filter clicks in the last 1 second
    clickTimes.current = clickTimes.current.filter(time => now - time < 1000);

    // Calculate TPS and Overdrive
    const currentTPS = clickTimes.current.length;
    const overdriveActive = currentTPS >= 5;
    setIsOverdrive(overdriveActive);

    const multiplier = overdriveActive ? 3 : 1;

    // --- OPTIMISTIC UI ---
    // Flash effect
    setFlashingTile(index);
    setTimeout(() => setFlashingTile(null), 150);

    // Update local state IMMEDIATELY before waiting for tx
    const newBoard = [...board];
    newBoard[index] = selectedTeam;
    setBoard(newBoard);

    // Send transaction in the background
    try {
      // Background execution, don't await the UI update on this
      claimTileTx({
        functionName: "claimTile",
        args: [BigInt(index), selectedTeam, multiplier],
      });
    } catch (error) {
      console.error("Claim failed", error);
      // Revert logic could go here if needed
    }
  };

  // --- DOMINANCE BAR CALCULATION ---
  const totalColored = board.filter(t => t !== 0).length || 1; // Prevent division by zero
  const redCount = board.filter(t => t === 1).length;
  const blueCount = board.filter(t => t === 2).length;
  const greenCount = board.filter(t => t === 3).length;

  const redPct = (redCount / totalColored) * 100;
  const bluePct = (blueCount / totalColored) * 100;
  const greenPct = (greenCount / totalColored) * 100;

  return (
    <>
      {/* GLOBAL OVERDRIVE TINT */}
      {isOverdrive && (
        <div
          className="fixed inset-0 pointer-events-none bg-red-600/10 animate-pulse z-0"
          style={{ boxShadow: "inset 0 0 150px rgba(239,68,68,0.5)" }}
        />
      )}

      <div
        className={`flex flex-col items-center gap-6 p-4 w-full max-w-4xl relative z-10 transition-all duration-300 ${isOverdrive ? "animate-shake" : ""}`}
      >
        {/* DOMINANCE BAR */}
        <div className="w-full h-8 flex rounded-full overflow-hidden border border-gray-700 bg-gray-900">
          <div
            style={{ width: `${redPct}%`, transition: "width 0.3s ease" }}
            className="bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] h-full"
          ></div>
          <div
            style={{ width: `${bluePct}%`, transition: "width 0.3s ease" }}
            className="bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] h-full"
          ></div>
          <div
            style={{ width: `${greenPct}%`, transition: "width 0.3s ease" }}
            className="bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)] h-full"
          ></div>
        </div>

        {/* OVERDRIVE INDICATOR */}
        <div className="flex justify-between items-center w-full">
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedTeam(1)}
              className={`btn ${selectedTeam === 1 ? "btn-error shadow-[0_0_15px_rgba(239,68,68,0.8)]" : "btn-outline"}`}
            >
              Red Team
            </button>
            <button
              onClick={() => setSelectedTeam(2)}
              className={`btn ${selectedTeam === 2 ? "btn-info shadow-[0_0_15px_rgba(59,130,246,0.8)]" : "btn-outline"}`}
            >
              Blue Team
            </button>
            <button
              onClick={() => setSelectedTeam(3)}
              className={`btn ${selectedTeam === 3 ? "btn-success shadow-[0_0_15px_rgba(34,197,94,0.8)]" : "btn-outline"}`}
            >
              Green Team
            </button>
          </div>

          <div className="flex flex-col items-end">
            <span
              className={`text-xl font-bold ${isOverdrive ? "text-yellow-400 animate-pulse drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" : "text-gray-500"}`}
            >
              {isOverdrive ? "🔥 OVERDRIVE (3X) 🔥" : "TPS: " + clickTimes.current.length}
            </span>
          </div>
        </div>

        {/* GRID */}
        <div
          className="grid gap-1 bg-black p-2 rounded-lg border border-gray-800 shadow-[0_0_30px_rgba(0,0,0,0.8)]"
          style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}
        >
          {board.map((tile, index) => {
            let bgColor = "bg-gray-900";
            let glow = "";
            if (tile === 1) {
              bgColor = "bg-red-500";
              glow = "shadow-[0_0_10px_rgba(239,68,68,0.8)] z-10";
            }
            if (tile === 2) {
              bgColor = "bg-blue-500";
              glow = "shadow-[0_0_10px_rgba(59,130,246,0.8)] z-10";
            }
            if (tile === 3) {
              bgColor = "bg-green-500";
              glow = "shadow-[0_0_10px_rgba(34,197,94,0.8)] z-10";
            }

            // Impact Flash Effect
            if (flashingTile === index) {
              bgColor = "bg-white";
              glow = "shadow-[0_0_30px_rgba(255,255,255,1)] z-20 scale-125 transition-transform";
            }

            return (
              <div
                key={index}
                onClick={() => handleTileClick(index)}
                className={`w-6 h-6 md:w-8 md:h-8 cursor-pointer transition-colors duration-100 border border-gray-800 hover:border-white rounded-sm ${bgColor} ${glow}`}
              />
            );
          })}
        </div>
      </div>
    </>
  );
};
