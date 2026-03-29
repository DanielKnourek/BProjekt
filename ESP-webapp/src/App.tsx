import { useState } from "react";
import Layout from "@src/Layout";
import LedControl from "@components/LedControl";
import ResponseLog from "@components/ResponseLog";
import { LogContext, Logger } from "@lib/Logger";
import { ENV, getAPIuri } from "./lib/env";

const App = () => {
  const [Logs, setLogs] = useState<Array<string>>([]);
  let logger: Logger = {
    get: Logs,
    set: setLogs,
  };
  const [Randomizer, setRandomizer] = useState<Array<string>>([]);
  // let Randz: Logger = {
  //   get: Randomizer,
  //   set: setRandomizer,
  // };

  return (
    <>
      <LogContext.Provider value={logger}>
        <Layout>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div className="flex h-24 items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
              <p className="text-2xl text-gray-400 dark:text-gray-500">
                Buttons
              </p>
            </div>
            <div className="flex h-24 items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
              <div className="items-center text-2xl text-gray-400 dark:text-gray-500">
                <LedControl />
              </div>
            </div>
          </div>
          <div className="mb-4 flex h-48 items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
            <div className="h-full w-10/12 items-center justify-center p-2 text-2xl text-gray-400 dark:text-gray-500">
              <ResponseLog />
            </div>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div className="flex h-28 items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
              <p className="text-2xl text-gray-400 dark:text-gray-500">
                <button
                  onClick={() => {
                    const sse = new EventSource(`${getAPIuri(ENV)}random`);
                    console.group("getRandom");
                    sse.onmessage = (e) => {
                      console.log("data", e.data);
                      setRandomizer([...Randomizer, `${e.data}`]);
                    };
                    sse.onerror = (err) => {
                      console.warn(err);
                      console.groupEnd();
                      sse.close();
                    };
                  }}
                >
                  Get random
                </button>
              </p>
            </div>
            <div className="flex h-28 items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
              <div className="h-full w-10/12 items-center justify-center p-2 text-2xl text-gray-400 dark:text-gray-500">
                <div className="h-full rounded-xl bg-gray-400 p-2 text-sm text-white">
                  <p className="underline">Random number obtained from esp</p>
                  <div className="mb-8 flex h-4/5 overflow-y-scroll">
                    {Randomizer.map((log) => {
                      return <p>{log}</p>;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mb-4 flex h-48 items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
            <p className="text-2xl text-gray-400 dark:text-gray-500">+</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex h-28 items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
              <p className="text-2xl text-gray-400 dark:text-gray-500">+</p>
            </div>
            <div className="flex h-28 items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
              <p className="text-2xl text-gray-400 dark:text-gray-500">+</p>
            </div>
            <div className="flex h-28 items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
              <p className="text-2xl text-gray-400 dark:text-gray-500">+</p>
            </div>
            <div className="flex h-28 items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
              <p className="text-2xl text-gray-400 dark:text-gray-500">+</p>
            </div>
          </div>
        </Layout>
      </LogContext.Provider>
    </>
  );
};

export default App;
