import React, { Fragment, useEffect, useState } from "react";
import myPageAbi from "../components/abi/QIT.json";
import erc20ABI from "../components/abi/erc20.json";
import { useWeb3React, UnsupportedChainIdError } from "@web3-react/core";
import { BigNumber, ethers } from "ethers";
import { networkParams } from "../components/utils/networks";
import { ArrowDownIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Transition } from "@headlessui/react";
import Notification, { NotificationContent } from "../components/Notification";

function MyPage() {
  const [showNotification, setNotificationShow] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>("deposit");
  const [inputValue, setInputValue] = useState<string>("");
  const [outputValue, setOutputValue] = useState<string>();
  const [swapButtonText, setSwapButtonText] = useState<string>("Loading...");
  const [holdingValue, setHoldingValue] = useState<string>("0");
  const [contractInfo, setContractInfo] = useState<{
    address: ethers.Contract["address"];
    tokenName: string;
    qitbalance: ethers.BigNumber;
    allowance: ethers.BigNumber;
    lockupEnds: number;
    pendingWithdrawals: ethers.BigNumber;
  }>({
    address: "-",
    tokenName: "QIT",
    qitbalance: BigNumber.from(0),
    allowance: BigNumber.from(0),
    lockupEnds: 0,
    pendingWithdrawals: BigNumber.from(0),
  });

  const [notificationStatus, setNotificationStatus] =
    useState<NotificationContent["status"]>("info");
  const [notificationMessage, setNotificationMessage] = useState<string>("");
  const [notificationTitle, setNotificationTitle] = useState<string>("");

  const minDeposit = 1; // this will be updated to actual value
  const minTopup = 1; // this will be updated to actual value
  const tBNBChain = 56;
  const [loading, setLoading] = useState<boolean>(false); // loading state for button

  const { library, chainId, account, active, error, setError, connector } = useWeb3React();

  const QIT = new ethers.Contract("0xF836781d4F3801cEC6f97A7700c4097820aE7f05", myPageAbi, library);
  const ERC20 = new ethers.Contract(
    "0x55d398326f99059ff775485246999027b3197955",
    erc20ABI,
    library
  );
  function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(" ");
  }

  async function getHoldingValue(_address: string) {
    try {
      const _holdingValue = await QIT.getHoldingValue(_address);
      setHoldingValue(_holdingValue.toString());
    } catch (error) {
      console.error("Couldn't get holdingValue" + error);
    }
  }

  async function getWithdrawalValue(value: string) {
    const number = parseInt(value, 10);
    if (value !== "" || number == 0) {
      try {
        const n = ethers.utils.parseUnits(value, 6);
        const wd = await QIT.getWithdrawalReturn(n);
        setOutputValue((+ethers.utils.formatUnits(wd, 36)).toFixed(2));
      } catch (error) {
        console.log(error);
      }
    }
  }
  async function getDepositValue(value: string) {
    const number = parseInt(value, 10);
    if (value !== "" || number == 0) {
      if (number >= minDeposit) {
        try {
          const n = ethers.utils.parseEther(value);
          const deposit = await QIT.getDepositReturn(n);
          setOutputValue((+ethers.utils.formatUnits(deposit, 6)).toFixed(2));
        } catch (error) {
          console.log(error);
        }
      } else {
        //TODO: Change to red and show Min Deposit = $x
        //console.log("Input is less than minDeposit");
      }
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
    // DEPOSITS
    if (currentTab == "deposit" && inputValue !== "") {
      if (contractInfo.allowance.toBigInt() < ethers.utils.parseEther(inputValue).toBigInt()) {
        const ERC20connect = ERC20.connect(library.getSigner());
        try {
          // Approving
          const transaction = await ERC20connect.approve(
            QIT.address,
            ethers.utils.parseEther("10000000000000")
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
        }
        // update after completion
      } else {
        const QITconnect = QIT.connect(library.getSigner());
        try {
          // Depositing
          const transaction = await QITconnect.depositToFund(ethers.utils.parseEther(inputValue));
          changeNotificationContent("In progress", "Deposit Requested", "loading");
          setNotificationShow(true);
          const receipt = await transaction.wait();

          changeNotificationContent("Complete", "Deposit was successful", "success");
          console.log(receipt);

          await timeout(2000);
          setNotificationShow(false);
          _setContractInfo();
        } catch (error) {
          changeNotificationContent("Failed", "Deposit was rejected", "error");
          setNotificationShow(true);
          console.log("Unable to complete Deposit");
        }
      }
    }
    function timeout(delay: number) {
      return new Promise((res) => setTimeout(res, delay));
    }

    // WITHDRAWALS
    if (currentTab == "withdrawal") {
      if (
        contractInfo.qitbalance > BigNumber.from(0) &&
        inputValue !== "" &&
        Date.now() / 1000 > contractInfo.lockupEnds
      ) {
        if (ethers.utils.parseEther(inputValue).toBigInt() > 0) {
          const QITconnect = QIT.connect(library.getSigner());
          try {
            const transaction = await QITconnect.requestWithdrawal(
              ethers.utils.parseUnits(inputValue, 6)
            );
            changeNotificationContent("In progress", "Withdrawal Requested", "loading");
            setNotificationShow(true);
            const receipt = await transaction.wait();

            changeNotificationContent("Complete", "Withdrawal was successful", "success");
            console.log(receipt);

            await timeout(2000);
            setNotificationShow(false);
            _setContractInfo();
          } catch (error: any) {
            changeNotificationContent("Failed", "Withdrawal was rejected", "error");
            setNotificationShow(true);
            console.log("User rejected transaction");
          }
        }
      }
    }
  }

  // Sets the contract values
  // TODO: Is it possible to put this in the useEffect directly?
  async function _setContractInfo() {
    setLoading(true);
    try {
      setContractInfo({
        address: QIT.address,
        tokenName: "QIT",
        qitbalance: await QIT.balanceOf(account),
        allowance: await ERC20.allowance(account, QIT.address),
        lockupEnds: await QIT.withdrawalLockTime(account),
        pendingWithdrawals: await QIT.pendingWithdrawals(account),
      });
    } catch (error) {
      console.error("Couldn't set contract info: " + error);
    } finally {
      setLoading(false);
    }

    if (account !== null || account !== undefined) {
      await getHoldingValue(account!);
    } else {
      console.log("No account");
    }
  }
  // account change -> contract info update
  useEffect(() => {
    if (account) {
      _setContractInfo();
    }
  }, [account]);

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
  }, [inputValue, contractInfo.allowance]);

  function resetOutputValue(_currentTab: string) {
    if (_currentTab === currentTab) {
      return;
    }
    setOutputValue("");
  }

  // Update balances

  return (
    <>
      {/* Exchange */}
      <div className="min-h-screen">
        <div className="md:flex md:items-center md:justify-between">
          <div className="px-4 pt-4 mx-auto max-w-7xl sm:px-6 lg:flex lg:justify-between lg:px-8">
            <div className="flex-1 min-w-0">
              <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Quantifi Investor Fund
              </h2>
            </div>
          </div>
        </div>
        {/* Cards */}
        <div className="flex flex-col items-center justify-center w-full px-4 my-10 sm:flex-row sm:items-start ">
          {/* Holdings */}
          <div className="w-full max-w-lg min-h-full px-6 py-4 my-3 overflow-hidden text-gray-900 rounded-lg shadow-lg mx-7 bg-neutral-100 ">
            {/* Title */}
            <div className="mb-2 text-xl font-bold">My Holdings</div>
            <div>
              <div className="flex justify-between">
                <span className="block py-1 mb-2 mr-2 text-base font-semibold text-gray-700 rounded-full">
                  Tokens
                </span>
                <span className="text-right">
                  {!loading ? (
                    (+ethers.utils.formatUnits(contractInfo.qitbalance, 6)).toFixed(2)
                  ) : (
                    <svg
                      className="inline w-4 h-4 mr-1 -ml-1 text-black animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                  QIT
                </span>
              </div>

              <div className="flex justify-between h-full">
                <span className="block py-1 mb-2 mr-2 text-base font-semibold text-gray-700 rounded-full">
                  Value
                </span>
                <span className="text-right">
                  {!loading ? (
                    (+ethers.utils.formatEther(holdingValue)).toFixed(2)
                  ) : (
                    <svg
                      className="inline w-4 h-4 mr-1 -ml-1 text-black animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}{" "}
                  USDT
                </span>
              </div>

              <div className="flex justify-between">
                <span className="block py-1 mb-2 mr-2 text-base font-semibold text-gray-700 rounded-full">
                  Change
                </span>
                <span className="text-right">12%</span>
              </div>
            </div>
          </div>
          {/* My Withdrawals */}
          <div className="w-full h-full max-w-lg px-6 py-4 my-3 overflow-hidden text-gray-900 rounded-lg shadow-lg mx-7 bg-neutral-100 ">
            {/* Title */}
            <div className="mb-2 text-xl font-bold">My Withdrawals</div>
            <div>
              <div className="flex justify-between">
                <span className="block py-1 mb-2 mr-2 text-base font-semibold text-gray-700 rounded-full">
                  Withdrawal Lockup Ends
                </span>
                <span className="text-right">
                  {new Date(contractInfo.lockupEnds * 1000).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="block py-1 mb-2 mr-2 text-base font-semibold text-gray-700 rounded-full">
                  Pending Withdrawals
                </span>
                <span className="text-right">
                  {(+ethers.utils.formatUnits(contractInfo.pendingWithdrawals, 6)).toFixed(2)} QIT
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Information text */}
        <div className="bg-gray-800">
          <div className="px-4 py-16 mx-auto max-w-7xl sm:py-24 sm:px-6 lg:flex lg:justify-between lg:px-8">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                About the Fund
              </h1>
              <p className="mt-5 text-gray-400 text-md sm:text-xl">
                The Quantifi Investor Fund offers managed exposure to a wide array of
                cryptocurrencies on the BNB Blockchain. The fund prioritizes low drawdown and is
                directed by a sophisticated quantitative investment model (see{" "}
                <a
                  href="Https://joel-lowe.gitbook.io/quantifi"
                  className="text-gray-300 hover:text-white"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Docs
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="inline-block w-4 h-4 pl-1"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                    />
                  </svg>
                </a>
                ). Please note: Investment in the fund requires a minimum deposit of ${minDeposit},
                or minimum top up of ${minTopup}. All deposits are subject to a 30 day lockup and
                incur a 2% deposit fee.
              </p>
            </div>
          </div>
        </div>

        {/* Swap */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center justify-start w-full max-w-md px-4 my-10 text-black ">
            {/* Tab Section */}
            <div className="grid grid-cols-2 text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:border-gray-700 dark:text-gray-400">
              <div className="col-span-1">
                <button
                  onClick={() => {
                    setCurrentTab("deposit");
                    resetOutputValue("deposit");
                  }}
                  className={`${
                    currentTab == "deposit"
                      ? "active inline-block  rounded-t-lg  border-b-2  border-gray-100 p-4 text-gray-100"
                      : "inline-block rounded-t-lg  p-4 "
                  } w-full text-center font-normal transition duration-200 ease-in-out`}
                >
                  <div
                    className={`${
                      currentTab == "deposit" ? "-translate-y-1" : ""
                    } transition duration-200 ease-in-out`}
                  >
                    Deposit
                  </div>
                </button>
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => {
                    setCurrentTab("withdrawal");
                    resetOutputValue("withdrawal");
                  }}
                  className={`${
                    currentTab == "withdrawal"
                      ? "active inline-block  rounded-t-lg  border-b-2  border-gray-100 p-4 text-gray-100"
                      : "inline-block rounded-t-lg  p-4 "
                  } w-full text-center font-normal transition duration-200 ease-in-out`}
                >
                  <div
                    className={`${
                      currentTab == "withdrawal" ? "-translate-y-1" : ""
                    } transition duration-200 ease-in-out`}
                  >
                    Withdrawal
                  </div>
                </button>
              </div>
            </div>
            {/* End Tab Section */}

            {/* Input */}
            <div className="w-full my-5">
              <form>
                <div className="relative z-0 flex w-full mb-6 group">
                  <input
                    onChange={(e) => {
                      setInputValue(e.target.value),
                        currentTab === "deposit"
                          ? getDepositValue(e.target.value)
                          : getWithdrawalValue(e.target.value);
                    }}
                    type="number"
                    name="floating_input"
                    id="floating_input"
                    className="peer block w-full appearance-none border-0 border-b-2 border-gray-300 bg-transparent py-2.5 px-0 text-sm text-gray-300 focus:border-blue-600 focus:outline-none focus:ring-0 dark:border-gray-600 dark:text-white dark:focus:border-blue-500"
                    placeholder=" "
                    required
                  />
                  <label
                    htmlFor="floating_input"
                    className="absolute top-3 -z-10 origin-[0] -translate-y-6 scale-75 transform text-sm text-gray-300 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:left-0 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:font-medium peer-focus:text-blue-600 dark:text-gray-300 peer-focus:dark:text-blue-500"
                  >
                    From
                  </label>

                  <span className="inline-flex items-center px-3 text-sm text-white border-0 border-b-2 border-gray-300 appearance-none peer focus:border-blue-600 focus:outline-none focus:ring-0 dark:border-gray-600 dark:focus:border-blue-500">
                    {currentTab == "withdrawal" ? contractInfo?.tokenName : "USDT"}
                  </span>
                </div>
                <div className="flex justify-center">
                  <ArrowDownIcon className="w-5 h-5 text-gray-400" />
                </div>

                {/* Output */}
                <div className="relative z-0 flex w-full mb-6 group">
                  <input
                    type="number"
                    name="floating_output"
                    id="floating_output"
                    className="peer block w-full appearance-none border-0 border-b-2 border-gray-300 bg-transparent py-2.5 px-0 text-sm text-gray-300 focus:border-blue-600 focus:outline-none focus:ring-0 dark:border-gray-600 dark:text-white dark:focus:border-blue-500"
                    placeholder=" "
                    disabled
                  />
                  <label
                    htmlFor="floating_output"
                    className="absolute top-3 -z-10 origin-[0] -translate-y-6 scale-75 transform text-sm text-gray-300 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:left-0 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:font-medium peer-focus:text-blue-600 dark:text-gray-300 peer-focus:dark:text-blue-500"
                  >
                    To {outputValue}
                  </label>

                  <span className="inline-flex items-center px-3 text-sm text-white border-0 border-b-2 border-gray-300 appearance-none peer focus:border-blue-600 focus:outline-none focus:ring-0 dark:border-gray-600 dark:focus:border-blue-500">
                    {currentTab == "deposit" ? "QIT" : "USDT"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    swapOrApprove();
                  }}
                  type="button"
                  className="w-full  rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 "
                >
                  {swapButtonText}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Notification */}
      <Notification
        title={notificationTitle}
        message={notificationMessage}
        show={showNotification}
        status={notificationStatus}
        setNotificationShow={setNotificationShow}
      />
    </>
  );
}

export default MyPage;
