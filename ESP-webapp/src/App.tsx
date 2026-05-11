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
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  ESP32 Control Dashboard
                </h1>
                <p className="text-lg text-slate-600 font-medium">
                  Real-time Bidirectional Stream Management
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-2xl text-sm font-bold border border-indigo-100 shadow-sm">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                System Live
              </div>
            </header>

            {/* General Programs (1 & 2) */}
            <ProgramControls />
            
            {/* Dedicated Stream Management (Program 3) */}
            <StreamManager />

            {/* Peripherals & Logs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex h-24 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-200">
                <p className="text-2xl text-slate-300 font-bold uppercase tracking-widest">
                  Buttons
                </p>
              </div>
              <div className="flex h-24 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-200">
                <LedControl />
              </div>
            </div>

            <div className="h-64 rounded-xl bg-white shadow-sm border border-slate-200 p-4 overflow-hidden">
              <ResponseLog />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Randomizer Control */}
              <div className="flex flex-col rounded-xl bg-white shadow-sm border border-slate-200 p-6 items-center justify-center">
                 <button
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-bold shadow-md active:scale-95"
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
              <div className="rounded-xl bg-white shadow-sm border border-slate-200 p-4 h-40 overflow-hidden flex flex-col">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Numbers obtained via SSE</p>
                <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-thin">
                  {Randomizer.map((log, i) => (
                    <p key={i} className="text-sm font-mono text-indigo-600 border-l-2 border-indigo-100 pl-2">
                      {log}
                    </p>
                  ))}
                  {Randomizer.length === 0 && (
                    <p className="text-sm text-slate-400 italic">No data received yet...</p>
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
