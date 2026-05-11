import { useState } from "react";
import Layout from "@src/Layout";
import ResponseLog from "@components/ResponseLog";
import { LogContext, Logger } from "@lib/Logger";
import ProgramControls from "@components/ProgramControls";
import StreamManager from "@components/StreamManager";

const App = () => {
  const [Logs, setLogs] = useState<Array<string>>([]);
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
