import React, { useState, useRef, useContext, useEffect, forwardRef, useImperativeHandle } from "react";
import CanvasGraph from "./CanvasGraph";
import { ENV, getAPIuri } from "@lib/env";
import { LogContext, addLog } from "@lib/Logger";

export interface StreamViewerProps {
  sampleRate?: number;
}
export interface StreamViewerHandle {
  startStream: () => void;
  stopStream: () => void;
}

const StreamViewer = forwardRef<StreamViewerHandle, StreamViewerProps>(({ sampleRate = 1000 }, ref) => {
  const Logger = useContext(LogContext);
  const [streamData, setStreamData] = useState<number[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [maxPoints, setMaxPoints] = useState<number>(200);
  const [bufferSeconds, setBufferSeconds] = useState<number>(1);

  const abortControllerRef = useRef<AbortController | null>(null);
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
            // Pop from the beginning of the buffer
            const popped = dataBufferRef.current.splice(0, pointsToPop);

            setStreamData((prev) => {
              const limit = maxPointsRef.current;
              let next = [...prev, ...popped];
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

  const startStream = async () => {
    if (isStreaming) return;
    setStreamData(new Array(maxPointsRef.current).fill(0));

    dataBufferRef.current = [];
    isBufferingRef.current = true;
    lastChunkTimeRef.current = Date.now();

    setIsStreaming(true);

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      if (Logger) addLog(Logger, "Connecting to stream...");

      const response = await fetch(`${getAPIuri(ENV)}program3stream`, { signal });
      if (!response.body) throw new Error("ReadableStream not supported");

      const reader = response.body.getReader();
      let buffer = new Uint8Array(0);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const newBuffer = new Uint8Array(buffer.length + value.length);
        newBuffer.set(buffer);
        newBuffer.set(value, buffer.length);

        const view = new DataView(newBuffer.buffer, newBuffer.byteOffset, newBuffer.byteLength);
        const newPoints: number[] = [];

        let i = 0;
        for (; i + 4 <= newBuffer.byteLength; i += 4) {
          newPoints.push(view.getInt32(i, true));
        }

        buffer = newBuffer.slice(i);

        if (newPoints.length > 0) {
          const now = Date.now();
          const dt = now - lastChunkTimeRef.current;
          lastChunkTimeRef.current = now;

          if (Logger) {
            // Only log if dt > 0 to avoid logging initial zero-time delta
            addLog(Logger, `Received chunk: ${newPoints.length} pts (delta: ${dt}ms)`);
          }

          // Push into the rendering buffer
          dataBufferRef.current.push(...newPoints);
        }
      }

      if (Logger) addLog(Logger, "Stream ended.");
    } catch (err: any) {
      if (err.name === 'AbortError') {
        if (Logger) addLog(Logger, "Stream stopped by user.");
      } else {
        if (Logger) addLog(Logger, `Stream error: ${err.message}`);
        console.error("Stream error", err);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const stopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  useImperativeHandle(ref, () => ({
    startStream,
    stopStream,
  }));

  return (
    <div className="mb-4 rounded bg-gray-50 p-4 dark:bg-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          Program 3: ADC stream
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Buffer ({bufferSeconds}s):</label>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                className="w-16 cursor-pointer accent-blue-600"
                value={bufferSeconds}
                onChange={(e) => setBufferSeconds(Number(e.target.value))}
                disabled={isStreaming}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Max Points:</label>
              <input
                type="number"
                min="10"
                max="5000"
                step="10"
                className="w-20 rounded border border-gray-300 bg-white p-1 text-sm text-gray-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                value={maxPoints}
                onChange={(e) => setMaxPoints(Number(e.target.value))}
                disabled={isStreaming}
              />
            </div>
          </div>
          <button
            onClick={isStreaming ? stopStream : startStream}
            title="Click to manually start/stop incoming stream"
            className={`rounded py-2 px-6 text-center font-bold text-xs uppercase tracking-widest transition-all border hover:brightness-95 active:scale-95 ${isStreaming
              ? "bg-green-200 text-green-900 border-green-400"
              : "bg-gray-100 text-gray-400 border-gray-200"
            }`}
          >
            {isStreaming ? "● Incoming Active" : "○ Downstream Stopped"}
          </button>
        </div>
      </div>

      <div className="h-64 w-full">
        <CanvasGraph data={streamData} />
      </div>
    </div>
  );
});

export default StreamViewer;
