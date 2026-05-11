import { useState } from "react";
import Layout from "@src/Layout";
import LedControl from "@components/LedControl";
import ResponseLog from "@components/ResponseLog";
import { LogContext, Logger } from "@lib/Logger";
import { ENV, getAPIuri } from "./lib/env";
import ProgramControls from "@components/ProgramControls";
import StreamManager from "@components/StreamManager";

const App = () => {
  const [Logs, setLogs] = useState<Array<string>>([]);
  const logger: Logger = {
    get: Logs,
    set: setLogs,
  };
  const [Randomizer, setRandomizer] = useState<Array<string>>([]);

  return (
    <>
      <LogContext.Provider value={logger}>
        <Layout>
          <div className="flex flex-col gap-6">
            {/* General Programs (1 & 2) */}
            <ProgramControls />
            
            {/* Dedicated Stream Management (Program 3) */}
            <StreamManager />

            {/* Peripherals & Logs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex h-24 items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
                <p className="text-2xl text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
                  Buttons
                </p>
              </div>
              <div className="flex h-24 items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
                <LedControl />
              </div>
            </div>

            <div className="h-64 rounded bg-gray-50 dark:bg-gray-800 p-4 overflow-hidden">
              <ResponseLog />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Randomizer Control */}
              <div className="flex flex-col rounded bg-gray-50 p-6 dark:bg-gray-800 items-center justify-center">
                 <button
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-bold shadow-lg"
                    onClick={() => {
                      const sse = new EventSource(`${getAPIuri(ENV)}random`);
                      sse.onmessage = (e) => setRandomizer(prev => [...prev, e.data]);
                      sse.onerror = () => sse.close();
                    }}
                  >
                    Fetch Random Data
                  </button>
              </div>
              
              {/* Randomizer Output */}
              <div className="rounded bg-gray-50 p-4 dark:bg-gray-800 h-40 overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Numbers obtained via SSE</p>
                <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-thin">
                  {Randomizer.map((log, i) => (
                    <p key={i} className="text-sm font-mono text-indigo-600 dark:text-indigo-400 border-l-2 border-indigo-200 pl-2">
                      {log}
                    </p>
                  ))}
                  {Randomizer.length === 0 && (
                    <p className="text-sm text-gray-400 italic">No data received yet...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Layout>
      </LogContext.Provider>
    </>
  );
};

export default App;
