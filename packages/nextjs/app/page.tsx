"use client";

import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { GameBoard } from "~~/components/GameBoard";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  return (
    <>
      <div className="flex items-center flex-col grow pt-10 pb-20 bg-black min-h-screen text-white">
        <div className="px-5 mb-8 w-full max-w-4xl">
          <h1 className="text-center">
            <span className="block text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]">
              Monad Frontline
            </span>
            <span className="block text-2xl mt-2 text-gray-400 italic">Parallel Conquest</span>
          </h1>

          <div className="flex justify-center items-center space-x-2 flex-col mt-6">
            <Address
              address={connectedAddress}
              chain={targetNetwork}
              blockExplorerAddressLink={
                targetNetwork?.id === hardhat.id ? `/blockexplorer/address/${connectedAddress}` : undefined
              }
            />
          </div>
        </div>

        {/* The core interactive component */}
        <GameBoard />

        {/* Footer/Info section */}
        <div className="mt-16 text-center text-gray-500 max-w-2xl px-4">
          <p>
            Experience the real-time speed of Monad. Click tiles to claim territory for your team. Spam click to trigger{" "}
            <span className="text-yellow-500 font-bold">OVERDRIVE</span> mode!
          </p>
        </div>
      </div>
    </>
  );
};

export default Home;
