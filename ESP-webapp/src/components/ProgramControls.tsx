import React, { useState, useContext } from "react";
import { LogContext, addLog } from "@lib/Logger";
import { ENV, getAPIuri } from "@lib/env";

const ProgramControls: React.FC = () => {
  const Logger = useContext(LogContext);

  // States for Program 2: Test Bandwidth
  const [bwPayloadSize, setBwPayloadSize] = useState<number>(1024);

  // States for Program 3: Streaming
  const [streamSampleRate, setStreamSampleRate] = useState<number>(1000);
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
              min="8"
              max="4096"
              step="8"
              className="flex-1"
              value={bwPayloadSize}
              onChange={(e) => setBwPayloadSize(Number(e.target.value))}
            />
            <input
              type="number"
              className="w-24 rounded border border-gray-300 bg-white p-1 text-sm text-gray-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              value={bwPayloadSize}
              onChange={(e) => setBwPayloadSize(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Program 3: Streaming */}
      <div className="flex flex-col rounded bg-gray-50 p-4 dark:bg-gray-800">
        <h3 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">Streaming (DAC/ADC)</h3>
        <div className="flex gap-2 mb-4">
          <button
            className="flex-1 rounded bg-green-600 py-2 text-white transition-colors hover:bg-green-700 focus:outline-none"
            onClick={() =>
              toggleProgram("stream", true, {
                sample_rate_hz: streamSampleRate,
                samples_per_frame: streamSamplesPerFrame,
              })
            }
          >
            Enable
          </button>
          <button
            className="flex-1 rounded bg-red-600 py-2 text-white transition-colors hover:bg-red-700 focus:outline-none"
            onClick={() => toggleProgram("stream", false)}
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
        </div>
      </div>
    </div>
  );
};

export default ProgramControls;
