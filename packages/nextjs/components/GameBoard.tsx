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
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds for testing
  const [aiMode, setAiMode] = useState(false);
  const [powerUpIndex, setPowerUpIndex] = useState<number | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [hasMinted, setHasMinted] = useState(false);
  const clickTimes = useRef<number[]>([]);
  const boardRef = useRef<number[]>(board);

  const isGameOver = timeLeft <= 0;

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
      setBoard([...(boardData as number[])]);
      boardRef.current = [...(boardData as number[])];
    }
  }, [boardData]);

  // Sync boardRef manually for optimistic updates
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  // Countdown Timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    } else if (timeLeft === 0 && !isMinting && !hasMinted) {
      // Start Minting Simulation
      setIsMinting(true);
      setTimeout(() => {
        setIsMinting(false);
        setHasMinted(true);
      }, 3000); // 3s minting phase
    }
  }, [timeLeft, isMinting, hasMinted]);

  // --- AI INVASION LOGIC ---
  useEffect(() => {
    if (!aiMode || isGameOver) return;
    const aiTeam = 4; // Purple
    const interval = setInterval(() => {
      const currentBoard = boardRef.current;
      const aiTiles = currentBoard.map((t, i) => (t === aiTeam ? i : -1)).filter(i => i !== -1);
      let candidateTiles: number[] = [];

      if (aiTiles.length === 0) {
        candidateTiles = [112]; // Center
      } else {
        aiTiles.forEach(index => {
          const x = index % 15;
          const y = Math.floor(index / 15);
          if (x > 0) candidateTiles.push(index - 1);
          if (x < 14) candidateTiles.push(index + 1);
          if (y > 0) candidateTiles.push(index - 15);
          if (y < 14) candidateTiles.push(index + 15);
        });
        candidateTiles = candidateTiles.filter(t => currentBoard[t] !== aiTeam);
      }

      candidateTiles = Array.from(new Set(candidateTiles));
      if (candidateTiles.length > 0) {
        // AI is fast: claim 2 tiles at a time
        const numToClaim = Math.min(2, candidateTiles.length);
        const shuffled = candidateTiles.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, numToClaim);

        selected.forEach(tileIndex => {
          setBoard(prev => {
            const newB = [...prev];
            newB[tileIndex] = aiTeam;
            return newB;
          });
          claimTileTx({ functionName: "claimTile", args: [BigInt(tileIndex), aiTeam, 1] }).catch(console.error);
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [aiMode, isGameOver, claimTileTx]);

  // --- POWER-UP SPAWN LOGIC ---
  useEffect(() => {
    if (isGameOver) return;
    const interval = setInterval(() => {
      const emptyTiles = boardRef.current.map((t, i) => (t === 0 ? i : -1)).filter(i => i !== -1);
      if (emptyTiles.length > 0) {
        const randomIndex = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
        setPowerUpIndex(randomIndex);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [isGameOver]);

  // --- FOG OF WAR LOGIC ---
  const isRevealed = (index: number, team: number, currentBoard: number[]) => {
    // Base tiles are always revealed for their respective teams
    if (team === 1 && index === 0) return true;
    if (team === 2 && index === 14) return true;
    if (team === 3 && index === 210) return true;

    // If we already own the tile, it is revealed
    if (currentBoard[index] === team) return true;

    // Check 4 neighbors
    const x = index % 15;
    const y = Math.floor(index / 15);

    const neighbors = [];
    if (x > 0) neighbors.push(index - 1); // left
    if (x < 14) neighbors.push(index + 1); // right
    if (y > 0) neighbors.push(index - 15); // up
    if (y < 14) neighbors.push(index + 15); // down

    // Revealed if any neighbor is owned by our team OR is our base tile
    return neighbors.some(n => {
      if (currentBoard[n] === team) return true;
      if (team === 1 && n === 0) return true;
      if (team === 2 && n === 14) return true;
      if (team === 3 && n === 210) return true;
      return false;
    });
  };

  // --- LOGIC ---
  const handleTileClick = async (index: number) => {
    if (isGameOver) return;
    if (!isRevealed(index, selectedTeam, board)) return; // FOG OF WAR BLOCK

    const now = Date.now();
    clickTimes.current.push(now);

    // Filter clicks in the last 1 second
    clickTimes.current = clickTimes.current.filter(time => now - time < 1000);

    // Calculate TPS and Overdrive
    const currentTPS = clickTimes.current.length;
    const overdriveActive = currentTPS >= 5;
    setIsOverdrive(overdriveActive);

    const multiplier = overdriveActive ? 3 : 1;

    // --- OPTIMISTIC UI & TRANSACTION ---
    setFlashingTile(index);
    setTimeout(() => setFlashingTile(null), 150);

    if (index === powerUpIndex) {
      // 💣 AREA BOMB
      setPowerUpIndex(null);
      const x = index % 15;
      const y = Math.floor(index / 15);
      const targetIndices: number[] = [];

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx <= 14 && ny >= 0 && ny <= 14) {
            targetIndices.push(ny * 15 + nx);
          }
        }
      }

      setBoard(prev => {
        const newB = [...prev];
        targetIndices.forEach(i => (newB[i] = selectedTeam));
        return newB;
      });

      // Monad Parallel Execution Demo: Fire all tx at once!
      Promise.all(
        targetIndices.map(i =>
          claimTileTx({ functionName: "claimTile", args: [BigInt(i), selectedTeam, multiplier] }).catch(console.error),
        ),
      );
    } else {
      // Normal click
      setBoard(prev => {
        const newB = [...prev];
        newB[index] = selectedTeam;
        return newB;
      });
      claimTileTx({ functionName: "claimTile", args: [BigInt(index), selectedTeam, multiplier] }).catch(console.error);
    }
  };

  // --- DOMINANCE BAR CALCULATION ---
  const totalColored = board.filter(t => t !== 0).length || 1; // Prevent division by zero
  const redCount = board.filter(t => t === 1).length;
  const blueCount = board.filter(t => t === 2).length;
  const greenCount = board.filter(t => t === 3).length;
  const purpleCount = board.filter(t => t === 4).length;

  const redPct = (redCount / totalColored) * 100;
  const bluePct = (blueCount / totalColored) * 100;
  const greenPct = (greenCount / totalColored) * 100;
  const purplePct = (purpleCount / totalColored) * 100;

  // Winner calculation
  let winner = null;
  let winnerColor = "";
  if (isGameOver && !isMinting) {
    const scores = [
      { name: "RED TEAM", count: redCount, color: "text-red-500", bg: "bg-red-500" },
      { name: "BLUE TEAM", count: blueCount, color: "text-blue-500", bg: "bg-blue-500" },
      { name: "GREEN TEAM", count: greenCount, color: "text-green-500", bg: "bg-green-500" },
      { name: "AI SWARM", count: purpleCount, color: "text-purple-500", bg: "bg-purple-500" },
    ];
    scores.sort((a, b) => b.count - a.count);

    if (scores[0].count === scores[1].count) {
      winner = "DRAW";
      winnerColor = "text-gray-400";
    } else {
      winner = scores[0].name;
      winnerColor = scores[0].color;
    }
  }

  return (
    <>
      {/* MINTING & NFT OVERLAY */}
      {isGameOver && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center backdrop-blur-md">
          {isMinting ? (
            <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(250,204,21,0.8)]"></div>
              <h2 className="text-4xl font-mono text-yellow-400 font-bold animate-pulse">
                Minting Soulbound Warlord NFT...
              </h2>
              <p className="text-gray-400 font-mono">Securing final game state on Monad...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center animate-zoom-in">
              <h1 className="text-5xl font-black text-white mb-8 drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
                BATTLE CONCLUDED
              </h1>

              {/* NFT CARD */}
              <div
                className={`relative p-1 rounded-2xl bg-gradient-to-br from-yellow-300 via-yellow-600 to-yellow-900 shadow-[0_0_50px_rgba(250,204,21,0.5)] transform hover:scale-105 transition-transform duration-500`}
              >
                <div className="bg-gray-900 rounded-xl p-8 flex flex-col items-center border border-yellow-500/50 min-w-[350px]">
                  <div className="text-yellow-400 text-sm font-mono mb-6 tracking-[0.2em]">WARLORD TROPHY #42</div>
                  <h2 className={`text-5xl font-black mb-2 drop-shadow-[0_0_30px_currentColor] ${winnerColor}`}>
                    {winner === "DRAW" ? "IT'S A DRAW" : `${winner}`}
                  </h2>
                  <p className="text-gray-400 font-mono mb-8">
                    {winner === "DRAW" ? "No clear victor." : "SUPREME CHAMPION"}
                  </p>

                  <div className="w-full flex justify-between text-sm font-mono border-t border-gray-800 pt-4">
                    <span className="text-red-500">RED: {redCount}</span>
                    <span className="text-blue-500">BLU: {blueCount}</span>
                    <span className="text-green-500">GRN: {greenCount}</span>
                    <span className="text-purple-500">AI: {purpleCount}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setTimeLeft(30);
                  setHasMinted(false);
                }}
                className="mt-12 px-8 py-4 bg-transparent border-2 border-white text-white font-bold text-xl rounded-full hover:bg-white hover:text-black transition-colors"
              >
                PLAY AGAIN
              </button>
            </div>
          )}
        </div>
      )}

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
        {/* TIMER */}
        <div className={`text-5xl font-mono font-black ${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-white"}`}>
          00:{timeLeft.toString().padStart(2, "0")}
        </div>

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
          <div
            style={{ width: `${purplePct}%`, transition: "width 0.3s ease" }}
            className="bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)] h-full"
          ></div>
        </div>

        {/* CONTROLS */}
        <div className="flex justify-between items-center w-full">
          <div className="flex gap-4 items-center">
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

            {/* AI TOGGLE */}
            <div className="divider divider-horizontal mx-1"></div>
            <button
              onClick={() => setAiMode(!aiMode)}
              className={`btn ${aiMode ? "bg-purple-600 text-white hover:bg-purple-700 shadow-[0_0_15px_rgba(168,85,247,0.8)]" : "btn-outline border-purple-600 text-purple-600"}`}
            >
              {aiMode ? "🤖 AI VIRUS ON" : "👾 AI VIRUS OFF"}
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
            const canClick = isRevealed(index, selectedTeam, board);

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
            if (tile === 4) {
              bgColor = "bg-purple-500";
              glow = "shadow-[0_0_10px_rgba(168,85,247,0.8)] z-10";
            }

            // Power-Up Pulse
            if (index === powerUpIndex) {
              bgColor = "bg-yellow-400 animate-bounce";
              glow = "shadow-[0_0_30px_rgba(250,204,21,1)] z-20";
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
                className={`w-6 h-6 md:w-8 md:h-8 transition-colors duration-100 border border-gray-800 rounded-sm ${bgColor} ${glow} ${canClick ? "cursor-pointer hover:border-white hover:z-30" : "cursor-not-allowed opacity-40"}`}
              />
            );
          })}
        </div>
      </div>
    </>
  );
};
