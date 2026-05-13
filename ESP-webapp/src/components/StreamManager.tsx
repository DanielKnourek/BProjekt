import React, { useState, useRef, useContext, useEffect } from "react";
import StreamViewer, { StreamViewerHandle } from "./StreamViewer";
import DacStreamer, { DacStreamerHandle } from "./DacStreamer";
import { LogContext, addLog } from "@lib/Logger";
import { ENV, getAPIuri } from "@lib/env";

interface Preset {
  name: string;
  settings: {
    streamSampleRate: number;
    streamSamplesPerFrame: number;
    viewer: {
      bufferSeconds: number;
      maxPoints: number;
      useFixedScale: boolean;
    };
    dac: {
      signalType: any;
      sineFreq: number;
      sineAmp: number;
      offset: number;
      constantValue: number;
    };
  };
}

const PRESETS_STORAGE_KEY = "esp32_dashboard_presets";

const StreamManager: React.FC = () => {
  const Logger = useContext(LogContext);
  const streamViewerRef = useRef<StreamViewerHandle>(null);
  const dacStreamerRef = useRef<DacStreamerHandle>(null);
  const [streamSampleRate, setStreamSampleRate] = useState<number>(1000);
  const [streamSamplesPerFrame, setStreamSamplesPerFrame] = useState<number>(100);
  const [isStreamActive, setIsStreamActive] = useState(false);

  // Presets state
  const [presets, setPresets] = useState<Preset[]>([]);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Load presets on mount
  useEffect(() => {
    const saved = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (saved) {
      try {
        setPresets(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse presets", e);
      }
    }
  }, []);

  const savePreset = (name: string) => {
    if (!name.trim()) return;
    
    const viewerSettings = streamViewerRef.current?.getSettings();
    const dacSettings = dacStreamerRef.current?.getSettings();

    if (!viewerSettings || !dacSettings) {
      if (Logger) addLog(Logger, "Error: Could not get component settings.");
      return;
    }

    const newPreset: Preset = {
      name: name.trim(),
      settings: {
        streamSampleRate,
        streamSamplesPerFrame,
        viewer: viewerSettings,
        dac: dacSettings,
      },
    };

    const updatedPresets = [...presets.filter(p => p.name !== newPreset.name), newPreset];
    setPresets(updatedPresets);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updatedPresets));
    setActivePreset(newPreset.name);
    if (Logger) addLog(Logger, `Preset "${newPreset.name}" saved.`);
  };

  const loadPreset = (preset: Preset) => {
    setStreamSampleRate(preset.settings.streamSampleRate);
    setStreamSamplesPerFrame(preset.settings.streamSamplesPerFrame);
    
    streamViewerRef.current?.setSettings(preset.settings.viewer);
    dacStreamerRef.current?.setSettings(preset.settings.dac);

    setActivePreset(preset.name);
    if (Logger) addLog(Logger, `Preset "${preset.name}" loaded.`);
  };

  const deletePreset = (name: string) => {
    const updatedPresets = presets.filter(p => p.name !== name);
    setPresets(updatedPresets);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updatedPresets));
    if (activePreset === name) setActivePreset(null);
    if (Logger) addLog(Logger, `Preset "${name}" deleted.`);
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Program 3: Streaming Manager</h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative group">
              <select
                className="appearance-none bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-10 py-2 text-sm font-bold text-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-all min-w-[200px]"
                value={activePreset || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "ADD_NEW") {
                    const name = window.prompt("Enter new preset name:");
                    if (name) {
                      savePreset(name);
                    }
                  } else if (val !== "") {
                    const preset = presets.find(p => p.name === val);
                    if (preset) loadPreset(preset);
                  } else {
                    setActivePreset(null);
                  }
                }}
              >
                <option value="" disabled className="dark:bg-slate-800 text-slate-400 dark:text-slate-400">Select Preset...</option>

                {presets.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
                <option value="ADD_NEW" className="text-indigo-600 dark:text-indigo-400 font-bold">+ Add current as new...</option>
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"></path></svg>
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            
            {activePreset && (
              <button
                onClick={() => deletePreset(activePreset)}
                className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-100 dark:border-red-900/50 active:scale-95 shadow-sm"
                title="Delete active preset"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            )}
          </div>
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
              onDataReceived={(data) => streamViewerRef.current?.pushData(data)}
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

