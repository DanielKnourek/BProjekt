import { useState } from "react";
import Layout from "@src/Layout";
import LedControl from "@components/LedControl";
import ResponseLog from "@components/ResponseLog";
import { LogContext, Logger } from "@lib/Logger";

const App = () => {
  const [Logs, setLogs] = useState("");
  let logger: Logger = {
    get: Logs,
    set: setLogs,
  };
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
