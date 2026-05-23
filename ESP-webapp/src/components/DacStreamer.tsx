import React, { useState, useRef, useContext, forwardRef, useImperativeHandle } from "react";
import { ENV, getAPIuri } from "@lib/env";
import { LogContext, addLog } from "@lib/Logger";

type SignalType = "constant" | "sine" | "audio";

interface DacStreamerProps {
  sampleRate: number;
  samplesPerFrame: number;
  onDataReceived?: (data: Int32Array) => void;
}

export interface DacStreamerHandle {
  startStreaming: () => void;
  stopStreaming: () => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  getSettings: () => {
    signalType: SignalType;
    sineFreq: number;
    sineAmp: number;
    offset: number;
    constantValue: number;
  };
  setSettings: (settings: {
    signalType?: SignalType;
    sineFreq?: number;
    sineAmp?: number;
    offset?: number;
    constantValue?: number;
  }) => void;
}

const DacStreamer = forwardRef<DacStreamerHandle, DacStreamerProps>(({ sampleRate, samplesPerFrame, onDataReceived }, ref) => {
  const Logger = useContext(LogContext);
  const [isUplinkActive, setIsUplinkActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [signalType, setSignalType] = useState<SignalType>("constant");

  // Signal parameters
  const [constantValue, setConstantValue] = useState(2048);
  const [sineFreq, setSineFreq] = useState(440);
  const [sineAmp, setSineAmp] = useState(1000);
  const [offset, setOffset] = useState(2048);

  // Audio state
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const streamingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  // Keep track of phase for sine wave to ensure continuity between chunks
  const phaseRef = useRef(0);
  const audioOffsetRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);

  const getWsUri = (env: any) => {
    const base = getAPIuri(env);
    // Replace http with ws, handles https -> wss as well
    return base.replace(/^http/, "ws") + "program3data";
  };

  const connect = async () => {
    if (wsRef.current) return;

    setError(null);
    const wsUrl = getWsUri(ENV);
    if (Logger) addLog(Logger, `Connecting WebSocket to ${wsUrl}...`);

    try {
      const socket = new WebSocket(wsUrl);
      socket.binaryType = 'arraybuffer';
      wsRef.current = socket;

      socket.onopen = () => {
        if (Logger) addLog(Logger, "WebSocket Connected");
        setIsConnected(true);
        if (streamingRef.current) startDataLoop();
      };

      socket.onmessage = (event) => {
        if (onDataReceived && event.data instanceof ArrayBuffer) {
          onDataReceived(new Int32Array(event.data));
        }
      };

      socket.onclose = () => {
        if (Logger) addLog(Logger, "WebSocket disconnected.");
        wsRef.current = null;
        setIsConnected(false);
        setIsUplinkActive(false);
        streamingRef.current = false;
      };

      socket.onerror = (ev) => {
        console.error("WebSocket Error:", ev);
        setError("WebSocket connection failed.");
        disconnect();
      };

    } catch (err: any) {
      setError(`WS Setup error: ${err.message}`);
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    setIsUplinkActive(false);
    streamingRef.current = false;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  };

  const startStreaming = async () => {
    if (isUplinkActive) return;

    setIsUplinkActive(true);
    streamingRef.current = true;
    phaseRef.current = 0;
    audioOffsetRef.current = 0;

    if (!wsRef.current) {
      await connect();
    } else if (wsRef.current.readyState === WebSocket.OPEN) {
      startDataLoop();
    }
  };

  const startDataLoop = async () => {
    const frameDurationMs = (samplesPerFrame / sampleRate) * 1000;

    try {
      while (streamingRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        const startTime = Date.now();

        const samples = generateSamples(samplesPerFrame);
        const buffer = new Int32Array(samples).buffer;

        wsRef.current.send(buffer);

        const elapsedTime = Date.now() - startTime;
        const sleepTime = Math.max(0, frameDurationMs - elapsedTime);

        if (sleepTime > 0) {
          await new Promise((r) => setTimeout(r, sleepTime));
        }
      }
    } catch (err) {
      console.error("Data loop error:", err);
    }
  };

  const stopStreaming = () => {
    setIsUplinkActive(false);
    streamingRef.current = false;
    if (Logger) addLog(Logger, "DAC Upstream stopped.");
  };

  useImperativeHandle(ref, () => ({
    startStreaming,
    stopStreaming,
    connect,
    disconnect,
    getSettings: () => ({
      signalType,
      sineFreq,
      sineAmp,
      offset,
      constantValue,
    }),
    setSettings: (settings) => {
      if (settings.signalType !== undefined) setSignalType(settings.signalType);
      if (settings.sineFreq !== undefined) setSineFreq(settings.sineFreq);
      if (settings.sineAmp !== undefined) setSineAmp(settings.sineAmp);
      if (settings.offset !== undefined) setOffset(settings.offset);
      if (settings.constantValue !== undefined) setConstantValue(settings.constantValue);
    },
  }));


  const generateSamples = (count: number): number[] => {
    const samples: number[] = [];
    const dt = 1 / sampleRate;

    for (let i = 0; i < count; i++) {
      let val = 2048;

      if (signalType === "constant") {
        val = constantValue;
      } else if (signalType === "sine") {
        val = offset + Math.sin(phaseRef.current) * sineAmp;
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
    <div className="mt-1 border-t border-slate-100 dark:border-slate-700 pt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>
        </div>
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">DAC Upstream Control</h4>
        {isConnected && (
          <div className="flex items-center gap-2 px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black border border-indigo-100 dark:border-indigo-800 animate-in fade-in zoom-in duration-300">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
            CONNECTED
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-xs font-medium text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/50 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          {error}
        </div>
      )}

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-4">
          <select
            className="flex-1 md:flex-none min-w-[180px] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            value={signalType}
            onChange={(e) => setSignalType(e.target.value as SignalType)}
            disabled={isUplinkActive}
          >
            <option value="constant">Constant (DC)</option>
            <option value="sine">Sine Wave</option>
            <option value="audio">Audio File (.wav)</option>
          </select>

          <button
            onClick={isUplinkActive ? stopStreaming : startStreaming}
            className={`flex-1 md:flex-none md:min-w-[200px] rounded-lg py-2.5 px-6 text-center font-bold text-xs uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${isUplinkActive
              ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 ring-4 ring-indigo-500/10 cursor-default"
              : "bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-400 border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600"
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isUplinkActive ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
              {isUplinkActive ? "Upstream Active" : "Start Upstream"}
            </div>
          </button>
        </div>

        {signalType === "constant" && (
          <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Constant Value (0-4095)</label>
            <div className="flex items-center gap-4">
              <input
                type="range" min="0" max="4095"
                value={constantValue}
                onChange={(e) => setConstantValue(Number(e.target.value))}
                className="flex-1 cursor-pointer accent-indigo-600"
                disabled={isUplinkActive}
              />
              <input
                type="number" min="0" max="4095"
                value={constantValue}
                onChange={(e) => setConstantValue(Number(e.target.value))}
                className="w-24 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-2 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                disabled={isUplinkActive}
              />
            </div>
          </div>
        )}

        {signalType === "sine" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Frequency (Hz)</label>
              <input
                type="number" min="1" max="5000"
                value={sineFreq}
                onChange={(e) => setSineFreq(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-2 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                disabled={isUplinkActive}
              />
              <input
                type="range" min="0" max="5000" step="100"
                value={sineFreq}
                onChange={(e) => setSineFreq(Number(e.target.value) <= 0 ? 1 : Number(e.target.value))}
                className="w-full cursor-pointer accent-indigo-600"
                disabled={isUplinkActive}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Amplitude</label>
              <input
                type="number" min="0" max="2047"
                value={sineAmp}
                onChange={(e) => setSineAmp(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-2 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                disabled={isUplinkActive}
              />
              <input
                type="range" min="0" max="2047" step={64}
                value={sineAmp}
                onChange={(e) => setSineAmp(Number(e.target.value))}
                className="w-full cursor-pointer accent-indigo-600"
                disabled={isUplinkActive}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Offset (Center)</label>
              <input
                type="number" min="0" max="4095"
                value={offset}
                onChange={(e) => setOffset(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-2 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                disabled={isUplinkActive}
              />
              <input
                type="range" min="0" max="4095"
                value={offset}
                onChange={(e) => setOffset(Number(e.target.value))}
                className="w-full cursor-pointer accent-indigo-600"
                disabled={isUplinkActive}
              />
            </div>
          </div>
        )}

        {signalType === "audio" && (
          <div className="flex flex-col gap-3 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Load Waveform (.wav)</label>
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="file" accept=".wav"
                onChange={handleFileChange}
                className="flex-1 text-sm text-slate-400 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 dark:file:bg-indigo-900/30 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50 cursor-pointer"
                disabled={isUplinkActive}
              />
              {audioBuffer && (
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-bold border border-emerald-100 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  READY: {(audioBuffer.length / audioBuffer.sampleRate).toFixed(1)}s
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default DacStreamer;
