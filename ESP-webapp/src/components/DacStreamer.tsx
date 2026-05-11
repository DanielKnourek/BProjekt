import React, { useState, useRef, useContext, forwardRef, useImperativeHandle } from "react";
import { ENV, getAPIuri } from "@lib/env";
import { LogContext, addLog } from "@lib/Logger";

type SignalType = "constant" | "sine" | "audio";

interface DacStreamerProps {
  sampleRate: number;
  samplesPerFrame: number;
}

export interface DacStreamerHandle {
  startStreaming: () => void;
  stopStreaming: () => void;
}

const DacStreamer = forwardRef<DacStreamerHandle, DacStreamerProps>(({ sampleRate, samplesPerFrame }, ref) => {
  const Logger = useContext(LogContext);
  const [isStreaming, setIsStreaming] = useState(false);
  const [signalType, setSignalType] = useState<SignalType>("constant");

  // Signal parameters
  const [constantValue, setConstantValue] = useState(2048);
  const [sineFreq, setSineFreq] = useState(440);
  const [sineAmp, setSineAmp] = useState(1000);

  // Audio state
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const streamingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep track of phase for sine wave to ensure continuity between chunks
  const phaseRef = useRef(0);
  // Keep track of audio offset
  const audioOffsetRef = useRef(0);

  const startStreaming = async () => {
    if (isStreaming) return;

    setIsStreaming(true);
    streamingRef.current = true;
    setError(null);
    phaseRef.current = 0;
    audioOffsetRef.current = 0;
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    if (Logger) addLog(Logger, `Starting DAC Upstream (${signalType})...`);

    try {
      while (streamingRef.current) {
        const samples = generateSamples(samplesPerFrame);
        const binaryBuffer = new Int32Array(samples).buffer;

        const response = await fetch(`${getAPIuri(ENV)}program3data`, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
          },
          body: binaryBuffer,
          signal,
        });

        if (response.status === 403) {
          setError("Stream Busy: Another client is already streaming.");
          stopStreaming();
          break;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
    } catch (err: any) {
      if (streamingRef.current) {
        setError(`Streaming error: ${err.message}`);
        stopStreaming();
      }
    }
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    streamingRef.current = false;
    abortControllerRef.current?.abort();
    if (Logger) addLog(Logger, "DAC Upstream stopped.");
  };

  useImperativeHandle(ref, () => ({
    startStreaming,
    stopStreaming,
  }));

  const generateSamples = (count: number): number[] => {
    const samples: number[] = [];
    const dt = 1 / sampleRate;

    for (let i = 0; i < count; i++) {
      let val = 2048;

      if (signalType === "constant") {
        val = constantValue;
      } else if (signalType === "sine") {
        val = 2048 + Math.sin(phaseRef.current) * sineAmp;
        phaseRef.current += 2 * Math.PI * sineFreq * dt;
        if (phaseRef.current > 2 * Math.PI) phaseRef.current -= 2 * Math.PI;
      } else if (signalType === "audio" && audioBuffer) {
        const data = audioBuffer.getChannelData(0);
        if (audioOffsetRef.current < data.length) {
          val = 2048 + data[audioOffsetRef.current] * 2047;
          audioOffsetRef.current++;
        } else {
          audioOffsetRef.current = 0;
          val = 2048 + data[audioOffsetRef.current] * 2047;
        }
      }

      samples.push(Math.max(0, Math.min(4095, Math.floor(val))));
    }

    return samples;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const arrayBuffer = await file.arrayBuffer();
    try {
      const decodedData = await audioContextRef.current.decodeAudioData(arrayBuffer);
      setAudioBuffer(decodedData);
      if (Logger) addLog(Logger, `Audio loaded: ${file.name} (${decodedData.duration.toFixed(1)}s)`);
    } catch (err) {
      setError("Failed to decode audio file.");
      if (Logger) addLog(Logger, "Error decoding audio file.");
    }
  };

  return (
    <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
      <h4 className="mb-2 text-md font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-tight">DAC Upstream Control</h4>

      {error && (
        <div className="mb-2 rounded bg-red-100 p-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <select
            className="rounded border border-gray-300 bg-white p-2 text-sm focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            value={signalType}
            onChange={(e) => setSignalType(e.target.value as SignalType)}
            disabled={isStreaming}
          >
            <option value="constant">Constant (DC)</option>
            <option value="sine">Sine Wave</option>
            <option value="audio">Audio File (.wav)</option>
          </select>

          <button
            onClick={isStreaming ? stopStreaming : startStreaming}
            title="Click to manually start/stop outgoing stream"
            className={`flex-1 rounded py-2 px-4 text-center font-bold text-xs uppercase tracking-widest transition-all border hover:brightness-95 active:scale-95 ${isStreaming
              ? "bg-green-200 text-green-900 border-green-400 cursor-not-allowed"
              : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
            }`}
            disabled={isStreaming}
          >
            {isStreaming ? "● Outgoing Active" : "○ Upstream Stopped"}
          </button>
        </div>

        {signalType === "constant" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Constant Value (0-4095)</label>
            <div className="flex items-center gap-2">
              <input
                type="range" min="0" max="4095"
                value={constantValue}
                onChange={(e) => setConstantValue(Number(e.target.value))}
                className="flex-1 accent-blue-600"
                disabled={isStreaming}
              />
              <input
                type="number" min="0" max="4095"
                value={constantValue}
                onChange={(e) => setConstantValue(Number(e.target.value))}
                className="w-20 rounded border border-gray-300 p-1 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                disabled={isStreaming}
              />
            </div>
          </div>
        )}

        {signalType === "sine" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Frequency (Hz)</label>
              <div className="flex items-center gap-2">
                <input
                  type="range" min="0" max="5000" step={100}
                  value={sineFreq}
                  onChange={(e) => setSineFreq(Number(e.target.value) <= 0 ? 1 : Number(e.target.value))}
                  className="flex-1 accent-blue-600"
                  disabled={isStreaming}
                />
                <input
                  type="number" min="1" max="5000"
                  value={sineFreq}
                  onChange={(e) => setSineFreq(Number(e.target.value))}
                  className="w-20 rounded border border-gray-300 p-1 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  disabled={isStreaming}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Amplitude</label>
              <div className="flex items-center gap-2">
                <input
                  type="range" min="0" max="2047" step={64}
                  value={sineAmp}
                  onChange={(e) => setSineAmp(Number(e.target.value))}
                  className="flex-1 accent-blue-600"
                  disabled={isStreaming}
                />
                <input
                  type="number" min="0" max="2047"
                  value={sineAmp}
                  onChange={(e) => setSineAmp(Number(e.target.value))}
                  className="w-20 rounded border border-gray-300 p-1 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  disabled={isStreaming}
                />
              </div>
            </div>
          </div>
        )}

        {signalType === "audio" && (
          <div className="flex flex-col gap-2">
            <input
              type="file" accept=".wav"
              onChange={handleFileChange}
              className="text-xs text-gray-500"
              disabled={isStreaming}
            />
            {audioBuffer && (
              <span className="text-[10px] text-green-600">Audio ready: {(audioBuffer.length / audioBuffer.sampleRate).toFixed(1)}s</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default DacStreamer;
