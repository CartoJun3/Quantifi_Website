import Carousel from "../components/carousel";

// home page
function HomePage() {
  return (
    <>
      {/* Background colour cone */}
      <div className="max-w-full cone animate-wiggle"></div>
      <div className="relative">
        {/* 1 */}
        <div className="min-h-screen">
          <main className="flex items-center h-full px-4 mx-auto mt-10 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
            {/* Text part */}
            <div className="items-start w-full sm:text-center lg:text-left">
              <h1 className="text-4xl font-bold tracking-tight text-gray-200 sm:text-5xl sm:tracking-tight md:text-6xl md:tracking-tight">
                <span className="block">The Decentralized world of</span>
                <span className="block text-gray-200">Cryptocurrency</span>
              </h1>
              <p className="mt-3 text-gray-200 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-2xl lg:mx-0">
                Buy, sell and earn crypto.
              </p>
              <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                {/* Get started button */}
                <div>
                  <button className="w-full h-full flex items-center justify-center px-8 py-3 text-base font-medium rounded-md text-white bg-gradient-to-r from-[#4FC0FF] via-[#6977EE] to-[#FF6098] md:py-4 md:text-lg md:px-10 hover:opacity-80 transition-all ease-in duration-75">
                    <a href="#">Get started</a>
                  </button>
                </div>

                <div className="mt-2 sm:mt-0">
                  {/* Dashboard button */}
                  <div className="sm:ml-3 bg-gradient-to-r from-[#4FC0FF] via-[#6977EE] to-[#FF6098] rounded-lg p-0.5 ">
                    <button className="w-full flex items-center justify-center text-base font-medium rounded-md px-8 py-3 md:py-3.5 md:text-lg md:px-8 hover:bg-gray-200 bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-700 transition-all ease-in duration-75 text-gray-900 dark:text-gray-200">
                      <a href="/dashboard">View Dashboard</a>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* <div className="w-1/2">
            <video className="w-full h-full " autoPlay loop>
              <source src="/logo_vid.mp4" />
            </video>
          </div> */}
          </main>
        </div>
        {/* 2 */}
        <div className="mb-32">
          <Carousel />
        </div>
        {/* 3 */}
        <div className="flex items-start justify-center mb-32 min-h-fit">
          <div className="mx-2 my-20 text-center text-gray-900 dark:text-gray-200">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl sm:tracking-tight md:text-6xl md:tracking-tight">
              <span className="block">Are you ready to join us?</span>
            </h1>
            <div className="mt-3 mr-0 text-center sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-2xl lg:mx-0">
              <span className="mr-0">Find more information about QuantiFi.</span>
            </div>
            {/* Glowing buttons, need to stay together */}
            <div className="flex items-center justify-center mt-5 max-h-16">
              <button className="items-center w-8/12 text-2xl text-center btnAnimated rounded-2xl h-14 font-lg">
                <div className="z-10">Get started</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default HomePage;
