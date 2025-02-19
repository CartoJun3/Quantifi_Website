import { fetchSigner } from "@wagmi/core";
import { BigNumber, ethers } from "ethers";
import React, { useEffect, useState } from "react";
import Introduction from "../components//presale/Introduction";
import PitchDeck from "../components/presale/PitchDeck";
import Raises from "../components/presale/Raises";
import ProgressBar from '../components/presale/ProgressBar';
import LiquiditySwapCard2 from "../components/swap/LiquiditySwapCardPresale";
import ModelInfo from "../components/presale/ModelInfo";
import { timeout } from "../components/utils/timeout";
import seedRoundABI from "../components/abi/seedRound.json";
import erc20ABI from "../components/abi/erc20.json";
import vestingABI from "../components/abi/vesting.json";
import { useAccount, useProvider } from "wagmi";
import Notification, { NotificationContent } from "../components/Notification";
import {
  BlueGradient,
  PurpleBlueGradientCombined,
  PurpleGradient,
} from "../components/svg/GradientCircles";
function presale() {
  const [showNotification, setNotificationShow] = useState(false);
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationContent["status"]>("info");
  const [notificationMessage, setNotificationMessage] = useState<string>("");
  const [notificationTitle, setNotificationTitle] = useState<string>("");

  const [currentTab, setCurrentTab] = useState<string>("deposit");
  const [inputValue, setInputValue] = useState<string>("");
  const [outputValue, setOutputValue] = useState<string>();
  const [swapButtonText, setSwapButtonText] = useState<string>("Loading...");
  const [holdingValue, setHoldingValue] = useState<string>("0");
  const [contractInfo, setContractInfo] = useState<{
    address: ethers.Contract["address"];
    tokenName: string;
    usdtbalance: ethers.BigNumber;
    allowance: ethers.BigNumber;
    tokensForSale: ethers.BigNumber;
    salePrice: ethers.BigNumber;
  }>({
    address: "-",
    tokenName: "QNTFI",
    usdtbalance: BigNumber.from(0),
    allowance: BigNumber.from(0),
    tokensForSale: BigNumber.from(0),
    salePrice: BigNumber.from(0),
  });

  const [vestInfo, setVestInfo] = useState<{
    vestStart: ethers.BigNumber;
    vestFinish: ethers.BigNumber;
    amount: ethers.BigNumber;
    claimed: ethers.BigNumber;
  }>({
    vestStart: BigNumber.from(0),
    vestFinish: BigNumber.from(0),
    amount: BigNumber.from(0),
    claimed: BigNumber.from(0),
  });
  
  const [ready, setReady] = useState<boolean>(false);
  useEffect(() => {
    setReady(true);
  }, []);

  const minDeposit = 100; // this will be updated to actual value
  const minTopup = 100; // this will be updated to actual value
  const [loading, setLoading] = useState<boolean>(false); // loading state for button

  const { address, isConnecting, isDisconnected, isConnected } = useAccount();
  const provider = useProvider();

  const VEST = new ethers.Contract(
    "0xc33fa56be7B09c47467bEC1D03C1CE10f51A4fd5",
    vestingABI,
    provider
  );

  const SEED = new ethers.Contract(
    "0x64ae06f97665e5e262783319290ae7f115abed32",
    seedRoundABI,
    provider
  );

  const USDT = new ethers.Contract(
    "0x55d398326f99059ff775485246999027b3197955",
    erc20ABI,
    provider
  );

  async function getHoldingValue() {
    if (isConnecting) {
      console.log("Connecting...");
      return;
    }
    if (isDisconnected) {
      console.log("Disconnected");
      return;
    }
    if (isConnected) {
      console.log("Connected", address);
      try {
        const _holdingValue = await USDT.balanceOf(address);
        setHoldingValue(_holdingValue.toString());
      } catch (error) {
        console.error("Couldn't get holdingValue: " + error);
      }
    }
  }

  async function getDepositValue(value: string) {
    const number = parseInt(value, 10);
    const numQNTFI=number*20; // price is 5c
    if (value !== "" || number == 0) {
      if (number >= minDeposit) {
          setOutputValue(numQNTFI.toFixed(0));
      } else {
        setOutputValue("Min deposit is " + minDeposit);
      }
    } else {
      setOutputValue("0");
    }
  }
  

  function changeNotificationContent(
    title: NotificationContent["title"],
    message: NotificationContent["message"],
    status: NotificationContent["status"]
  ) {
    setNotificationTitle(title);
    setNotificationMessage(message);
    setNotificationStatus(status);
  }

  // Logic to determine if user can swap or needs approval first
  async function swapOrApprove() {
    const signer = await fetchSigner();
    // DEPOSITS
    if (currentTab == "deposit" && inputValue !== "" && signer) {
      if (contractInfo.allowance.toBigInt() < ethers.utils.parseEther(inputValue).toBigInt()) {
        const ERC20connect = USDT.connect(signer);
        try {
          setLoading(true);
          console.log("Approving");
          // Approving
          const transaction = await ERC20connect.approve(
            SEED.address,
            ethers.utils.parseEther("10000000")
          );
          changeNotificationContent("In progress", "Approval Requested", "loading");
          setNotificationShow(true);
          const receipt = await transaction.wait();

          changeNotificationContent("Complete", "Approval was successful", "success");
          console.log(receipt);
          _setContractInfo();
          await timeout(2000);
          setNotificationShow(false);
        } catch (error) {
          changeNotificationContent("Failed", "Approval was rejected", "error");
          setNotificationShow(true);
          console.log("Wallet transaction did not complete");
        } finally {
          setLoading(false);
        }
        // update after completion
      } else {
        const SEEDconnect = SEED.connect(signer);
        try {
          setLoading(true);
          console.log("Depositing");
          // Depositing
          const transaction = await SEEDconnect.buyToken(ethers.utils.parseEther(inputValue));
          console.log("Transaction: ", transaction);
          changeNotificationContent("In progress", "Deposit Requested", "loading");
          setNotificationShow(true);
          const receipt = await transaction.wait();

          changeNotificationContent("Complete", "Deposit was successful", "success");
          console.log("Receipt: ", receipt);

          await timeout(2000);
          setNotificationShow(false);
          _setContractInfo();
        } catch (error) {
          changeNotificationContent("Failed", "Deposit was rejected", "error");
          setNotificationShow(true);
          console.log("Unable to complete Deposit");
        } finally {
          setLoading(false);
        }
      }
    } else {
      console.log("No signer");
    }
  }

  // Sets the contract values
  async function _setContractInfo() {
    setLoading(true);
    try {
      setContractInfo({
        address: "-",
        tokenName: "QNTFI",
        usdtbalance: await USDT.balanceOf(address),
        allowance: await USDT.allowance(address, SEED.address),
        tokensForSale: await SEED.tokensForSale(),
        salePrice: await SEED.salePrice(),
      });
      console.log("Contract Info: ", contractInfo);
    } catch (error) {
      console.error("Couldn't set QIT contract info: " + error);
    } finally {
      setLoading(false);
      console.log("Contract Info: ", contractInfo);
    }

    if (isConnected) {
      await getHoldingValue();
    } else if (isConnecting) {
      console.log("Connecting account");
    } else {
      console.log("Not connected");
    }
  }
  // account change -> contract info update
  useEffect(() => {
    if (address !== undefined) {
      _setContractInfo();
    }
  }, [address]);

  // Returns swap button with correct body text based on input value
  function changeSwapButtonText() {
    if (inputValue == "") {
      setSwapButtonText("Enter Amount");
    }
    if (inputValue !== "") {
      if (currentTab === "withdrawal") {
        setSwapButtonText("Swap QIT for USDT");
      } else if (
        contractInfo.allowance.toBigInt() < ethers.utils.parseUnits(inputValue, 6).toBigInt() &&
        currentTab === "deposit"
      ) {
        setSwapButtonText("Give permission to deposit USDT");
      } else if (
        contractInfo.allowance.toBigInt() >= ethers.utils.parseUnits(inputValue, 6).toBigInt()
      ) {
        setSwapButtonText("Swap USDT for QIT");
      }
    }
  }
  // Keeps track of input value to update swap button text
  useEffect(() => {
    changeSwapButtonText();
  }, [inputValue, contractInfo.allowance, currentTab]);

  function resetOutputValue(_currentTab: string) {
    if (_currentTab === currentTab) {
      return;
    }
    setOutputValue("");
  }

  return (
    <div className="flex w-screen flex-col justify-center bg-black">
      <header className="flex w-full justify-center text-center">
      <div className="pt-4 text-5xl font-extrabold sm:text-7xl ">
        <span className="text-slate-300 drop-shadow-md bg-clip-text ">QuantiFi Investors</span>
      </div>
      </header>
      <div className="flex justify-center">
      <main className="grid justify-center w-screen max-w-5xl grid-cols-2 gap-8 px-6 py-12 mb-12 sm:px-8 gap-y-20">
      <div className="col-span-2 sm:col-span-1">
            <Introduction />
          </div>

          <div className="h-64 col-span-2 sm:col-span-1">
            <PitchDeck />
          </div>
        </main>
          </div>
          <main className="flex w-full flex-col items-center justify-center">
      {/* Information text */}
        <div className="relative flex min-h-fit snap-start items-center justify-center overflow-x-clip py-8 align-middle">
        <PurpleBlueGradientCombined className="absolute scale-125 animate-pulse-slow sm:scale-100" />
        <div className="mx-2 text-center align-middle text-gray-200">
          <div className="mt-3 mr-0 text-center sm:mx-auto sm:mt-5 sm:max-w-xl sm:text-lg md:mt-5 md:text-2xl lg:mx-0">
            <span className="mr-0 drop-shadow">The QNTFI Presale Round 1 begins on Wednesday 19 April at 12pm UTC. 5% of the total supply (10 mil) tokens will be sold at $0.05. Participation is open on a first-in first-served basis. All tokens purchased will be immediately vested, and can be claimed progressively over the following 12 months. <span className="font-bold">Connect Wallet</span> to join or see below for more information.</span>
          </div>
        </div>
      </div>
        {/* Cards */}
        <div className="my-10 flex w-full flex-col items-center justify-center px-4 sm:flex-row sm:items-start ">
        {/* Sale Progress */}
          <div className="my-3 mx-7 h-full w-full max-w-lg overflow-hidden rounded-lg bg-neutral-100 px-6 py-4 text-gray-900 shadow-lg ">
            {/* Title */}
            <div className="flex justify-between">
            <span className="mb-2 text-xl font-bold">Status: Presale 1 </span>
            <span className="text-right mb-2 text-l font-bold">Sale Price: $0.05</span>
            </div>
            <div>
              <div className="flex justify-between">
                <span className="mb-2 mr-2 block rounded-full py-1 text-base font-semibold text-gray-700">
                  QNTFI Sold in Sale
                </span>
                <span className="text-right">
                  {(+ethers.utils.formatUnits(contractInfo.tokensForSale, 18)).toFixed(2)} / 10,000,000
                </span>
              </div>
              <div className="flex justify-between">
                <span className="mb-2 mr-2 block rounded-full py-1 text-base font-semibold text-gray-700">
                  USD Raised in Sale
                </span>
                <span className="text-right">
                  ${((+ethers.utils.formatUnits(contractInfo.tokensForSale, 18))/20).toFixed(2)} / $500,000
                </span>
              </div>
              <div className="justify-between">
          <span className="mb-2 mr-2 block rounded-full py-1 text-base font-semibold text-gray-700">
          <ProgressBar percent={(+ethers.utils.formatUnits(contractInfo.tokensForSale, 18)) / 10000000 * 100} />
          </span>
        </div>
            </div>
          </div>
          {/* Holdings */}
          <div className="my-3 mx-7 min-h-full w-full max-w-lg overflow-hidden rounded-lg bg-neutral-100 px-6 py-4 text-gray-900 shadow-lg ">
            {/* Title */}
            <div className="mb-2 text-xl font-bold">Your Vested Tokens</div>
            <div>
              <div className="flex justify-between">
                <span className="mb-2 mr-2 block rounded-full py-1 text-base font-semibold text-gray-700">
                  Tokens
                </span>
                <span className="text-right">
                  {
                    (+ethers.utils.formatUnits(vestInfo.amount, 18)).toLocaleString()
                  }{" "}
                  QNTFI
                </span>
              </div>

              <div className="flex h-full justify-between">
                <span className="mb-2 mr-2 block rounded-full py-1 text-base font-semibold text-gray-700">
                  Eligible to Claim
                </span>
                <span className="text-right">
                  {"0 "}
                  QNTFI
                </span>
              </div>
            </div>
          </div>
        </div>
        <LiquiditySwapCard2
          loading={loading}
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          resetOutputValue={resetOutputValue}
          swapButtonText={swapButtonText}
          inputValue={inputValue}
          setInputValue={setInputValue}
          outputValue={outputValue}
          getDepositValue={getDepositValue}
          swapOrApprove={swapOrApprove}
          USDTBalance={(+ethers.utils.formatEther(contractInfo.usdtbalance)).toFixed(2)}
        />
      </main>
      <div className='flex justify-center w-screen'>
      <section className="bg-gray-50 grid justify-center w-screen grid-cols-2 gap-8 px-6 py-12 mb-12 sm:px-8 gap-y-20">
      <div className="text-center pt-4 text-3xl font-extrabold col-span-2">
        <span className="text-slate-700 drop-shadow-md bg-clip-text ">Supporting Information</span>
      </div>
      <div className="flex justify-center col-span-2 mt-4">
            <Raises />
          </div>
      
          <div className="justify-center col-span-2 sm:col-span-1">
      <ModelInfo
        heading="About the Trading Model"
        content="The licenced strategy is designed to observe and extract insightful patterns from price data in an unconventional and sophisticated manner, allowing it to uncover opportunities that may be obscured to traditional manual application.
        By leveraging the opportunities identified by the model, QuantiFi is able to gain an advantage and execute systematically, capitalizing on the inherent limitations of human behavior."
      /></div>
      <div className="justify-center col-span-2 sm:col-span-1">
      <ModelInfo
        heading="What to expect from the model?"
        content="The model is designed to trade assets that are highly liquid and offers compounded returns beyond 3x of the benchmark (BTC) on an annual basis, while managing downside risk. With an emphasis on recovery from drawdown by actioning opportunities systematically, maximum losses are mostly kept inside single digits. On average, the strategy is invested less than 50% of the time while maintaining only 1/3 of the volatility of the benchmark (BTC), allowing for greater returns with lower risk."
      />
      </div>
      </section></div>
      {/* Notification */}
      <Notification
        title={notificationTitle}
        message={notificationMessage}
        show={showNotification}
        status={notificationStatus}
        setNotificationShow={setNotificationShow}
      />
    </div>
  );
}

export default presale;
