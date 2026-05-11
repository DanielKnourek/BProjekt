import React, { useState, useContext, useEffect } from "react";
import { LogContext, addLog } from "@lib/Logger";
import { ENV, getAPIuri } from "@lib/env";

const STATS_POLLING_MS = 1000;

export interface ProgramControlsProps { }

const ProgramControls: React.FC<ProgramControlsProps> = () => {
  const Logger = useContext(LogContext);

  // States for Program 2: Test Bandwidth
  const [bwPayloadSize, setBwPayloadSize] = useState<number>(1024);
  const [isBwActive, setIsBwActive] = useState<boolean>(false);
  const [bwStats, setBwStats] = useState<{ sent: number; received: number } | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Effect to poll bandwidth stats
  useEffect(() => {
    if (!isBwActive) {
      setBwStats(null);
      return;
    }

    const fetchStats = () => {
      fetch(`${getAPIuri(ENV)}program2stats`)
        .then((res) => res.json())
        .then((data) => setBwStats(data))
        .catch((err) => console.error("Stats fetch error:", err));
    };

    fetchStats(); // Initial fetch
    const interval = setInterval(fetchStats, STATS_POLLING_MS);
    return () => clearInterval(interval);
  }, [isBwActive]);

  const programPaths: Record<string, string> = {
    test_int: "program1",
    test_bandwidth: "program2",
  };

  const toggleProgram = (
    programName: string,
    enable: boolean,
    additionalParams: Record<string, string | number> = {}
  ) => {
    const path = programPaths[programName] || "program";
    const params = new URLSearchParams({
      en: enable ? "1" : "0",
      ...Object.fromEntries(
        Object.entries(additionalParams).map(([k, v]) => [k, String(v)])
      ),
    });

    fetch(`${getAPIuri(ENV)}${path}?${params.toString()}`)
      .then((res) => res.text())
      .then((text) => {
        if (Logger) addLog(Logger, `${programName} ${enable ? "ON" : "OFF"} - ${text}`);
        if (programName === "test_bandwidth") {
          setIsBwActive(enable);
          if (enable) {
            setStartTime(Date.now());
          } else {
            setStartTime(null);
          }
        }
      })
      .catch((err) => {
        if (Logger) addLog(Logger, `Error: ${err}`);
      });
  };

  return (
    <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
      {/* Program 1: Test Int */}
      <div className="flex flex-col rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Test Int</h3>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-white font-bold text-sm transition-all hover:bg-emerald-700 active:scale-95 shadow-sm"
            onClick={() => toggleProgram("test_int", true)}
          >
            Enable
          </button>
          <button
            className="flex-1 rounded-lg bg-slate-100 dark:bg-slate-700 py-2.5 text-slate-600 dark:text-slate-300 font-bold text-sm transition-all hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 border border-slate-200 dark:border-slate-600"
            onClick={() => toggleProgram("test_int", false)}
          >
            Disable
          </button>
        </div>
        <p className="text-sm font-medium text-slate-400 dark:text-slate-400">
          Simple test program sending integer values to check link stability.
        </p>
      </div>

      {/* Program 2: Test Bandwidth */}
      <div className="flex flex-col rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Test Bandwidth</h3>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-white font-bold text-sm transition-all hover:bg-indigo-700 active:scale-95 shadow-sm"
            onClick={() => toggleProgram("test_bandwidth", true, { payload_size: bwPayloadSize })}
          >
            Enable
          </button>
          <button
            className="flex-1 rounded-lg bg-slate-100 dark:bg-slate-700 py-2.5 text-slate-600 dark:text-slate-300 font-bold text-sm transition-all hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 border border-slate-200 dark:border-slate-600"
            onClick={() => toggleProgram("test_bandwidth", false)}
          >
            Disable
          </button>
        </div>

        <div className="flex flex-col gap-2 mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
          <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Payload Size (bytes)</label>
          <div className="flex items-center gap-3">
            <input
              type="range" min="0" max="4000" step="128"
              className="flex-1 cursor-pointer accent-indigo-600"
              value={bwPayloadSize}
              onChange={(e) => setBwPayloadSize(Number(e.target.value) < 8 ? 8 : Number(e.target.value))}
              disabled={isBwActive}
            />
            <input
              type="number"
              className="w-24 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-2 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              value={bwPayloadSize}
              onChange={(e) => setBwPayloadSize(Number(e.target.value))}
              disabled={isBwActive}
            />
          </div>
        </div>

        {bwStats && startTime && (
          <div className="mt-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/20 p-4 border border-indigo-100 dark:border-indigo-800 shadow-inner">
            <div className="flex justify-between items-center text-xs font-mono text-indigo-700 dark:text-indigo-300">
              <div className="flex flex-col gap-1">
                <span>SENT: <span className="font-bold">{bwStats.sent.toLocaleString()}</span></span>
                <span>RECV: <span className="font-bold">{bwStats.received.toLocaleString()}</span></span>
              </div>

              {(() => {
                const elapsed = (Date.now() - startTime) / 1000;
                const totalBytes = (bwStats.sent + bwStats.received) * bwPayloadSize;
                const speed = elapsed > 0 ? (totalBytes / 1024) / elapsed : 0;
                return (
                  <>
                    <div className="text-center px-4 border-x border-indigo-200 dark:border-indigo-800">
                      <div className="text-[10px] uppercase font-bold opacity-60">Throughput</div>
                      <div className="text-lg font-black tracking-tight text-indigo-900 dark:text-indigo-200">
                        {speed.toFixed(1)} <span className="text-[10px]">KB/s</span>
                      </div>
                    </div>

                    <div className="flex flex-col text-right gap-1">
                      <span>TOTAL: <span className="font-bold">{(totalBytes / 1024).toFixed(0)} KB</span></span>
                      <span>TIME: <span className="font-bold">{elapsed.toFixed(0)}s</span></span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgramControls;
