import { useEffect, useState } from "react";
import Layout from "@src/Layout";
import ResponseLog from "@components/ResponseLog";
import { LogContext, Logger } from "@lib/Logger";
import ProgramControls from "@components/ProgramControls";
import StreamManager from "@components/StreamManager";
import { useTheme } from "./lib/ThemeContext";
import { ENV, getAPIuri } from "./lib/env";

const App = () => {
  const { isDark, toggleTheme } = useTheme();
  const [Logs, setLogs] = useState<Array<string>>([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${getAPIuri(ENV)}status`);
        setIsLive(res.status === 200);
      } catch (err) {
        setIsLive(false);
      }
    };

    checkHealth();
    const timer = setInterval(checkHealth, 10000);
    return () => clearInterval(timer);
  }, []);

  const logger: Logger = {
    get: Logs,
    set: setLogs,
  };

  return (
    <>
      <LogContext.Provider value={logger}>
        <Layout>
          <div className="flex flex-col gap-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  ESP32 Control Dashboard
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">
                  Real-time Bidirectional Stream Management
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-2xl text-sm font-bold border shadow-sm transition-all duration-500 ${
                  isLive 
                    ? "text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50" 
                    : "text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/50"
                }`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></span>
                  {isLive ? "System Live" : "System Offline"}
                </div>

                <button
                  onClick={toggleTheme}
                  className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:scale-105 active:scale-95 transition-all"
                  title="Toggle Dark Mode"
                >
                  {isDark ? (
                    <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12 10.607a1 1 0 010-1.414l.706-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z"></path></svg>
                  ) : (
                    <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
                  )}
                </button>
              </div>
            </header>

            {/* General Programs (1 & 2) */}
            <ProgramControls />
            
            {/* Dedicated Stream Management (Program 3) */}
            <StreamManager />

            {/* System Log */}
            <div className="h-96 overflow-hidden mb-8">
              <ResponseLog />
            </div>
          </div>
        </Layout>
      </LogContext.Provider>
    </>
  );
};

export default App;
