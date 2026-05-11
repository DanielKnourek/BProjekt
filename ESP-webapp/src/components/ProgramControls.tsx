import React, { useState, useContext, useEffect } from "react";
import { LogContext, addLog } from "@lib/Logger";
import { ENV, getAPIuri } from "@lib/env";
import DacStreamer from "./DacStreamer";
const STATS_POLLING_MS = 1000;

export interface ProgramControlsProps {
  streamSampleRate?: number;
  setStreamSampleRate?: (val: number) => void;
  onStreamEnable?: () => void;
  onStreamDisable?: () => void;
}

const ProgramControls: React.FC<ProgramControlsProps> = ({ 
  streamSampleRate: propRate, 
  setStreamSampleRate: propSetRate,
  onStreamEnable,
  onStreamDisable
}) => {
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

  // States for Program 3: Streaming
  const [localSampleRate, setLocalSampleRate] = useState<number>(1000);
  const streamSampleRate = propRate ?? localSampleRate;
  const setStreamSampleRate = propSetRate ?? setLocalSampleRate;
  const [streamSamplesPerFrame, setStreamSamplesPerFrame] = useState<number>(100);

  const programPaths: Record<string, string> = {
    test_int: "program1",
    test_bandwidth: "program2",
    stream: "program3",
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
    <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      {/* Program 1: Test Int */}
      <div className="flex flex-col rounded bg-gray-50 p-4 dark:bg-gray-800">
        <h3 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">Test Int</h3>
        <div className="flex gap-2 mb-4">
          <button
            className="flex-1 rounded bg-green-600 py-2 text-white transition-colors hover:bg-green-700 focus:outline-none"
            onClick={() => toggleProgram("test_int", true)}
          >
            Enable
          </button>
          <button
            className="flex-1 rounded bg-red-600 py-2 text-white transition-colors hover:bg-red-700 focus:outline-none"
            onClick={() => toggleProgram("test_int", false)}
          >
            Disable
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Simple test program sending integer values.
        </p>
      </div>

      {/* Program 2: Test Bandwidth */}
      <div className="flex flex-col rounded bg-gray-50 p-4 dark:bg-gray-800">
        <h3 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">Test Bandwidth</h3>
        <div className="flex gap-2 mb-4">
          <button
            className="flex-1 rounded bg-green-600 py-2 text-white transition-colors hover:bg-green-700 focus:outline-none"
            onClick={() => toggleProgram("test_bandwidth", true, { payload_size: bwPayloadSize })}
          >
            Enable
          </button>
          <button
            className="flex-1 rounded bg-red-600 py-2 text-white transition-colors hover:bg-red-700 focus:outline-none"
            onClick={() => toggleProgram("test_bandwidth", false)}
          >
            Disable
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-500 dark:text-gray-400">Payload Size (bytes)</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="4000"
              step="128"
              className="flex-1"
              value={bwPayloadSize}
              onChange={(e) => setBwPayloadSize(Number(e.target.value) < 8 ? 8 : Number(e.target.value))}
              disabled={isBwActive}
            />
            <input
              type="number"
              className="w-24 rounded border border-gray-300 bg-white p-1 text-sm text-gray-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              value={bwPayloadSize}
              onChange={(e) => setBwPayloadSize(Number(e.target.value))}
              disabled={isBwActive}
            />
          </div>
        </div>
        {bwStats && startTime && (
          <div className="mt-4 rounded bg-blue-50 p-2 dark:bg-blue-900/30">
            <div className="flex justify-between items-center text-xs font-mono text-blue-700 dark:text-blue-300">
              <div className="flex flex-col">
                <span>Sent: <span className="font-bold">{bwStats.sent.toLocaleString()}</span></span>
                <span>Recv: <span className="font-bold">{bwStats.received.toLocaleString()}</span></span>
              </div>
              
              {(() => {
                const elapsed = (Date.now() - startTime) / 1000;
                const totalBytes = (bwStats.sent + bwStats.received) * bwPayloadSize;
                const speed = elapsed > 0 ? (totalBytes / 1024) / elapsed : 0;
                return (
                  <>
                    <div className="text-center px-2 border-x border-blue-200 dark:border-blue-800">
                      <div className="text-[10px] uppercase opacity-70">Speed</div>
                      <div className="text-sm font-bold">
                        {speed.toFixed(1)} KB/s
                      </div>
                    </div>

                    <div className="flex flex-col text-right">
                      <span>Total: <span className="font-bold">{(totalBytes / 1024).toFixed(0)} KB</span></span>
                      <span>Time: <span className="font-bold">{elapsed.toFixed(0)}s</span></span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Program 3: Streaming */}
      <div className="flex flex-col rounded bg-gray-50 p-4 dark:bg-gray-800">
        <h3 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">Streaming (DAC/ADC)</h3>
        <div className="flex gap-2 mb-4">
          <button
            className="flex-1 rounded bg-green-600 py-2 text-white transition-colors hover:bg-green-700 focus:outline-none"
            onClick={() => {
              toggleProgram("stream", true, {
                sample_rate_hz: streamSampleRate,
                samples_per_frame: streamSamplesPerFrame,
              });
              onStreamEnable?.();
            }}
          >
            Enable
          </button>
          <button
            className="flex-1 rounded bg-red-600 py-2 text-white transition-colors hover:bg-red-700 focus:outline-none"
            onClick={() => {
              toggleProgram("stream", false);
              onStreamDisable?.();
            }}
          >
            Disable
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-500 dark:text-gray-400">Sample Rate (Hz)</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                className="flex-1"
                value={streamSampleRate}
                onChange={(e) => setStreamSampleRate(Number(e.target.value))}
              />
              <input
                type="number"
                className="w-24 rounded border border-gray-300 bg-white p-1 text-sm text-gray-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                value={streamSampleRate}
                onChange={(e) => setStreamSampleRate(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-500 dark:text-gray-400">Samples per Frame</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                className="flex-1"
                value={streamSamplesPerFrame}
                onChange={(e) => setStreamSamplesPerFrame(Number(e.target.value))}
              />
              <input
                type="number"
                className="w-24 rounded border border-gray-300 bg-white p-1 text-sm text-gray-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                value={streamSamplesPerFrame}
                onChange={(e) => setStreamSamplesPerFrame(Number(e.target.value))}
              />
            </div>
          </div>
          
          <DacStreamer 
            sampleRate={streamSampleRate} 
            samplesPerFrame={streamSamplesPerFrame} 
          />
        </div>
      </div>
    </div>
  );
};

export default ProgramControls;
