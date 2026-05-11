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
      <div className="flex flex-col rounded bg-gray-50 p-4 dark:bg-gray-800">
        <h3 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">Program 3: Streaming Manager</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side: System Config & Downstream Toggle */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">System State</label>
              <div className="flex gap-2">
                <button
                  className={`flex-1 rounded py-2 text-white transition-colors focus:outline-none font-semibold ${
                    isStreamActive ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
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
                  className={`flex-1 rounded py-2 text-white transition-colors focus:outline-none font-semibold ${
                    !isStreamActive ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                  }`}
                  onClick={() => toggleProgram(false)}
                  disabled={!isStreamActive}
                >
                  Disable System
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                   <label className="text-sm text-gray-500 dark:text-gray-400">Sample Rate (Hz)</label>
                   <span className="text-xs font-mono text-blue-600">{streamSampleRate} Hz</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min="100" max="10000" step="100"
                    className="flex-1 accent-blue-600"
                    value={streamSampleRate}
                    onChange={(e) => setStreamSampleRate(Number(e.target.value))}
                    disabled={isStreamActive}
                  />
                  <input
                    type="number"
                    className="w-20 rounded border border-gray-300 bg-white p-1 text-sm dark:bg-gray-700 dark:text-white"
                    value={streamSampleRate}
                    onChange={(e) => setStreamSampleRate(Number(e.target.value))}
                    disabled={isStreamActive}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-500 dark:text-gray-400">Samples per Frame</label>
                  <span className="text-xs font-mono text-blue-600">{streamSamplesPerFrame}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min="10" max="1000" step="10"
                    className="flex-1 accent-blue-600"
                    value={streamSamplesPerFrame}
                    onChange={(e) => setStreamSamplesPerFrame(Number(e.target.value))}
                    disabled={isStreamActive}
                  />
                  <input
                    type="number"
                    className="w-20 rounded border border-gray-300 bg-white p-1 text-sm dark:bg-gray-700 dark:text-white"
                    value={streamSamplesPerFrame}
                    onChange={(e) => setStreamSamplesPerFrame(Number(e.target.value))}
                    disabled={isStreamActive}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Upstream Controls */}
          <div className="border-t lg:border-t-0 lg:border-l border-gray-200 pt-6 lg:pt-0 lg:pl-8 dark:border-gray-700">
             <DacStreamer 
                ref={dacStreamerRef}
                sampleRate={streamSampleRate} 
                samplesPerFrame={streamSamplesPerFrame} 
              />
          </div>
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
