import React, { useState, useRef, useContext } from "react";
import StreamViewer, { StreamViewerHandle } from "./StreamViewer";
import DacStreamer, { DacStreamerHandle } from "./DacStreamer";
import { LogContext, addLog } from "@lib/Logger";
import { ENV, getAPIuri } from "@lib/env";

const StreamManager: React.FC = () => {
  const Logger = useContext(LogContext);
  const streamViewerRef = useRef<StreamViewerHandle>(null);
  const dacStreamerRef = useRef<DacStreamerHandle>(null);
  const [streamSampleRate, setStreamSampleRate] = useState<number>(1000);
  const [streamSamplesPerFrame, setStreamSamplesPerFrame] = useState<number>(100);
  const [isStreamActive, setIsStreamActive] = useState(false);

  const toggleProgram = (
    enable: boolean,
    additionalParams: Record<string, string | number> = {}
  ) => {
    const params = new URLSearchParams({
      en: enable ? "1" : "0",
      ...Object.fromEntries(
        Object.entries(additionalParams).map(([k, v]) => [k, String(v)])
      ),
    });

    fetch(`${getAPIuri(ENV)}program3?${params.toString()}`)
      .then((res) => res.text())
      .then((text) => {
        if (Logger) addLog(Logger, `Streaming ${enable ? "ON" : "OFF"} - ${text}`);
        setIsStreamActive(enable);
        if (enable) {
          streamViewerRef.current?.startStream();
          dacStreamerRef.current?.startStreaming();
        } else {
          streamViewerRef.current?.stopStream();
          dacStreamerRef.current?.stopStreaming();
        }
      })
      .catch((err) => {
        if (Logger) addLog(Logger, `Error: ${err}`);
      });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Controls Card */}
      <div className="flex flex-col rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Program 3: Streaming Manager</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left Side: System Config & Downstream Toggle */}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">System State Control</label>
              <div className="flex gap-3">
                <button
                  className={`flex-1 rounded-lg py-2.5 font-bold text-sm transition-all shadow-sm active:scale-95 ${isStreamActive
                      ? "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-400 border border-slate-200 dark:border-slate-600 cursor-not-allowed"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  onClick={() => toggleProgram(true, {
                    sample_rate_hz: streamSampleRate,
                    samples_per_frame: streamSamplesPerFrame,
                  })}
                  disabled={isStreamActive}
                >
                  Enable System
                </button>
                <button
                  className={`flex-1 rounded-lg py-2.5 font-bold text-sm transition-all shadow-sm active:scale-95 ${!isStreamActive
                      ? "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-400 border border-slate-200 dark:border-slate-600 cursor-not-allowed"
                      : "bg-red-500 text-white hover:bg-red-600"
                    }`}
                  onClick={() => toggleProgram(false)}
                  disabled={!isStreamActive}
                >
                  Disable System
                </button>
              </div>
            </div>

            <div className="space-y-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Sample Rate (Hz)</label>
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{streamSampleRate} Hz</span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range" min="100" max="10000" step="100"
                    className="flex-1 cursor-pointer accent-indigo-600"
                    value={streamSampleRate}
                    onChange={(e) => setStreamSampleRate(Number(e.target.value))}
                    disabled={isStreamActive}
                  />
                  <input
                    type="number"
                    className="w-24 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-2 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={streamSampleRate}
                    onChange={(e) => setStreamSampleRate(Number(e.target.value))}
                    disabled={isStreamActive}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Samples per Frame</label>
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{streamSamplesPerFrame}</span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range" min="10" max="1000" step="10"
                    className="flex-1 cursor-pointer accent-indigo-600"
                    value={streamSamplesPerFrame}
                    onChange={(e) => setStreamSamplesPerFrame(Number(e.target.value))}
                    disabled={isStreamActive}
                  />
                  <input
                    type="number"
                    className="w-24 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-2 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={streamSamplesPerFrame}
                    onChange={(e) => setStreamSamplesPerFrame(Number(e.target.value))}
                    disabled={isStreamActive}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Upstream Controls */}
            <DacStreamer
              ref={dacStreamerRef}
              sampleRate={streamSampleRate}
              samplesPerFrame={streamSamplesPerFrame}
            />
        </div>
      </div>

      {/* Viewer / Graph Card */}
      <StreamViewer
        ref={streamViewerRef}
        sampleRate={streamSampleRate}
      />
    </div>
  );
};

export default StreamManager;
