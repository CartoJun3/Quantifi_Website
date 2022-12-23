import { LockClosedIcon, ScaleIcon } from "@heroicons/react/24/outline";
import { useWeb3React } from "@web3-react/core";
import { ethers } from "ethers";
import { useEffect, useState } from "react";

interface Stake {
  stakeDate: ethers.BigNumber;
  unlockDate: ethers.BigNumber;
  numTokens: ethers.BigNumber;
  weight: ethers.BigNumber;
}

export function Unstaking({
  totalStakes,
  getStake,
}: {
  totalStakes: number;
  getStake: (account: string, idx: number) => Promise<Stake>;
}) {
  const [allStakes, setAllStakes] = useState<Stake[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { account } = useWeb3React();

  // Get stake details
  useEffect(() => {
    if (!account) return;
    if (totalStakes === 0) return;
    // Reset stakes to empty array
    setAllStakes([]);
    const fetchStakes = async () => {
      let stakes = [];
      // Loop through all stakes
      for (let i = 0; i < totalStakes; i++) {
        const stake = await getStake(account, i);
        stakes.push(stake);
      }
      setAllStakes(stakes);
      setLoading(false);
    };
    console.log(allStakes);
    fetchStakes();
  }, [totalStakes, getStake, account]);

  return (
    <div className="w-full">
      <div className="mt-8 overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:-mx-6 md:mx-0 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
              >
                Amount <span className="text-gray-500">QNTFI</span>
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
              >
                Weight
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell"
              >
                Locked Date
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Unlocked Date
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Unstake</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {allStakes.map((stake, idx) => (
              <tr key={idx}>
                <td className="w-full py-4 pl-4 pr-3 text-sm font-medium text-gray-900 max-w-0 sm:w-auto sm:max-w-none sm:pl-6">
                  {stake?.numTokens?.toNumber()}
                  <dl className="font-normal lg:hidden">
                    <dt className="sr-only">Weight</dt>
                    <dd className="mt-1 text-gray-700 truncate">
                      <ScaleIcon className="inline w-5 h-5 mr-1 text-gray-400" />
                      {parseFloat(stake?.weight?.toString()).toLocaleString()}
                    </dd>
                    <dt className="sr-only sm:hidden">Locked Date</dt>
                    <dd className="mt-1 text-gray-500 truncate sm:hidden">
                      <LockClosedIcon className="inline w-5 h-5 mr-1 text-gray-400" />
                      {new Date(stake?.stakeDate.toNumber() * 1000).toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </dd>
                  </dl>
                </td>
                <td className="hidden px-3 py-4 text-sm text-gray-500 lg:table-cell">
                  {parseFloat(stake?.weight?.toString()).toLocaleString()}
                </td>
                <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell">
                  {new Date(stake?.stakeDate.toNumber() * 1000).toLocaleDateString(undefined, {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-3 py-4 text-sm text-gray-500">
                  {new Date(stake?.unlockDate.toNumber() * 1000).toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="py-4 pl-3 pr-4 text-sm font-medium text-right sm:pr-6">
                  <button className="text-indigo-600 hover:text-indigo-900">
                    Unstake<span className="sr-only"></span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
