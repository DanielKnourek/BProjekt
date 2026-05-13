import { useState, useRef, useContext, useEffect, forwardRef, useImperativeHandle } from "react";
import CanvasGraph from "./CanvasGraph";
import { LogContext, addLog } from "@lib/Logger";

export interface StreamViewerProps {
  sampleRate?: number;
}
export interface StreamViewerHandle {
  startStream: () => void;
  stopStream: () => void;
  pushData: (data: Int32Array) => void;
  getSettings: () => {
    bufferSeconds: number;
    maxPoints: number;
    useFixedScale: boolean;
  };
  setSettings: (settings: {
    bufferSeconds?: number;
    maxPoints?: number;
    useFixedScale?: boolean;
  }) => void;
}

const StreamViewer = forwardRef<StreamViewerHandle, StreamViewerProps>(({ sampleRate = 1000 }, ref) => {
  const Logger = useContext(LogContext);
  const [streamData, setStreamData] = useState<number[]>([]);
   const [isStreaming, setIsStreaming] = useState(false);
  const [useFixedScale, setUseFixedScale] = useState(false);
  const [maxPoints, setMaxPoints] = useState<number>(200);
  const [bufferSeconds, setBufferSeconds] = useState<number>(1);

  const maxPointsRef = useRef(maxPoints);
  const bufferSecondsRef = useRef(bufferSeconds);
  const sampleRateRef = useRef(sampleRate);

  // Buffering state
  const dataBufferRef = useRef<number[]>([]);
  const isBufferingRef = useRef<boolean>(false);
  const lastChunkTimeRef = useRef<number>(0);

  useEffect(() => {
    maxPointsRef.current = maxPoints;
    bufferSecondsRef.current = bufferSeconds;
    sampleRateRef.current = sampleRate;
  }, [maxPoints, bufferSeconds, sampleRate]);

  // The animation loop that drains the buffer smoothly
  useEffect(() => {
    if (!isStreaming) return;

    let animationFrameId: number;
    let lastDrawTime = performance.now();
    let fractionalPoints = 0;
    
    // Throttling state
    let lastUpdateTime = performance.now();
    let pendingPoppedPoints: number[] = [];

    const drawLoop = (time: number) => {
      const dt = time - lastDrawTime;
      lastDrawTime = time;

      const pps = sampleRateRef.current;
      const targetBufferSize = pps * bufferSecondsRef.current; // dynamic buffer seconds

      if (isBufferingRef.current) {
        // Wait until we have enough data to fill the buffer
        if (targetBufferSize === 0 || dataBufferRef.current.length >= targetBufferSize) {
          isBufferingRef.current = false;
          if (Logger) addLog(Logger, `Buffer filled (${dataBufferRef.current.length} pts), playing...`);
        }
      } else {
        if (dataBufferRef.current.length === 0 && targetBufferSize > 0) {
          // Buffer starved, pause and re-buffer
          isBufferingRef.current = true;
          if (Logger) addLog(Logger, `Buffer empty! Pausing to re-buffer ${targetBufferSize} pts...`);
        } else {
          // Drain at exactly the sample rate
          let drainRate = pps;
          if (targetBufferSize === 0) {
            // If target buffer size is 0, drain instantly
            drainRate = pps + dataBufferRef.current.length * 60;
          }

          fractionalPoints += drainRate * (dt / 1000);
          const pointsToPop = Math.floor(fractionalPoints);

          if (pointsToPop > 0) {
            fractionalPoints -= pointsToPop;
            // Pop from the beginning of the buffer and accumulate
            const popped = dataBufferRef.current.splice(0, pointsToPop);
            pendingPoppedPoints.push(...popped);
          }

          // Update React state at approx 30FPS (33.3ms) to reduce re-render overhead
          const timeSinceUpdate = time - lastUpdateTime;
          if (timeSinceUpdate >= 33 && pendingPoppedPoints.length > 0) {
            const currentBatch = [...pendingPoppedPoints];
            pendingPoppedPoints = [];
            lastUpdateTime = time;

            setStreamData((prev) => {
              const limit = maxPointsRef.current;
              let next = [...prev, ...currentBatch];
              if (next.length < limit) {
                // Pad with zeros at the beginning so the graph stays a constant width
                next = [...new Array(limit - next.length).fill(0), ...next];
              } else if (next.length > limit) {
                next = next.slice(next.length - limit);
              }
              return next;
            });
          }
        }
      }

      animationFrameId = requestAnimationFrame(drawLoop);
    };

    animationFrameId = requestAnimationFrame(drawLoop);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isStreaming]);


  const startStream = () => {
    if (isStreaming) return;
    setStreamData(new Array(maxPointsRef.current).fill(0));

    dataBufferRef.current = [];
    isBufferingRef.current = true;
    lastChunkTimeRef.current = Date.now();

    setIsStreaming(true);
    if (Logger) addLog(Logger, "ADC Stream Viewer active (Waiting for WebSocket data)");
  };

  const stopStream = () => {
    setIsStreaming(false);
  };

  const pushData = (data: Int32Array) => {
    if (!isStreaming) return;

    const now = Date.now();
    const dt = now - lastChunkTimeRef.current;
    lastChunkTimeRef.current = now;

    if (Logger) {
      addLog(Logger, `Received chunk: ${data.length} pts (delta: ${dt}ms)`);
    }

    // Push into the rendering buffer
    dataBufferRef.current.push(...Array.from(data));
  };

  useImperativeHandle(ref, () => ({
    startStream,
    stopStream,
    pushData,
    getSettings: () => ({
      bufferSeconds,
      maxPoints,
      useFixedScale,
    }),
    setSettings: (settings) => {
      if (settings.bufferSeconds !== undefined) setBufferSeconds(settings.bufferSeconds);
      if (settings.maxPoints !== undefined) setMaxPoints(settings.maxPoints);
      if (settings.useFixedScale !== undefined) setUseFixedScale(settings.useFixedScale);
    },
  }));


  return (
    <div className="mb-4 rounded-xl bg-white dark:bg-slate-800 p-4 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Program 3: ADC stream
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Buffer ({bufferSeconds}s):</label>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                className="w-20 cursor-pointer accent-indigo-600"
                value={bufferSeconds}
                onChange={(e) => setBufferSeconds(Number(e.target.value))}
                disabled={isStreaming}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Points:</label>
              <input
                type="number"
                min="10"
                max="5000"
                step="10"
                className="w-20 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                value={maxPoints}
                onChange={(e) => setMaxPoints(Number(e.target.value))}
                disabled={isStreaming}
              />
            </div>
            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4 ml-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Scale:</label>
              <button
                onClick={() => setUseFixedScale(!useFixedScale)}
                className={`text-[10px] font-bold px-4 py-1.5 rounded-lg border transition-all active:scale-95 shadow-sm uppercase tracking-wider ${
                  useFixedScale 
                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 ring-4 ring-amber-500/10"
                    : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 ring-4 ring-indigo-500/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${useFixedScale ? 'bg-amber-500 animate-pulse' : 'bg-indigo-500 animate-pulse'}`}></span>
                  {useFixedScale ? "Fixed Scale" : "Auto Scale"}
                </div>
              </button>
            </div>
          </div>
          
          <button
            onClick={isStreaming ? stopStream : startStream}
            className={`flex-1 md:flex-none md:min-w-[200px] rounded-lg py-2.5 px-6 text-center font-bold text-xs uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${isStreaming
              ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 ring-4 ring-indigo-500/10 cursor-default"
              : "bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-400 border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
              {isStreaming ? "Incoming Active" : "Stream Stopped"}
            </div>
          </button>
        </div>
      </div>

      <div className="h-64 w-full">
        <CanvasGraph 
          data={streamData} 
          fixedRange={useFixedScale ? [0, 4095] : undefined}
        />
      </div>
    </div>
  );
});

export default StreamViewer;
