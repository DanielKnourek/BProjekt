import React, { useState, useRef, useContext } from "react";
import CanvasGraph from "./CanvasGraph";
import { ENV, getAPIuri } from "@lib/env";
import { LogContext, addLog } from "@lib/Logger";

const StreamViewer: React.FC = () => {
  const Logger = useContext(LogContext);
  const [streamData, setStreamData] = useState<number[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [maxPoints, setMaxPoints] = useState<number>(500);
  const abortControllerRef = useRef<AbortController | null>(null);
  const maxPointsRef = useRef(maxPoints);

  React.useEffect(() => {
    maxPointsRef.current = maxPoints;
  }, [maxPoints]);

  const startStream = async () => {
    if (isStreaming) return;
    setStreamData([]);
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      if (Logger) addLog(Logger, "Connecting to stream...");
      
      // Sending GET request to /api/program3stream
      const response = await fetch(`${getAPIuri(ENV)}program3stream`, { signal });
      if (!response.body) throw new Error("ReadableStream not supported");

      const reader = response.body.getReader();
      let buffer = new Uint8Array(0);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Combine leftover buffer with new incoming bytes
        const newBuffer = new Uint8Array(buffer.length + value.length);
        newBuffer.set(buffer);
        newBuffer.set(value, buffer.length);

        const view = new DataView(newBuffer.buffer, newBuffer.byteOffset, newBuffer.byteLength);
        const newPoints: number[] = [];
        
        // Read 4 bytes at a time (32-bit integer)
        let i = 0;
        for (; i + 4 <= newBuffer.byteLength; i += 4) {
          newPoints.push(view.getInt32(i, true)); // true = little endian
        }
        
        // Keep the unread bytes for the next chunk
        buffer = newBuffer.slice(i);
        
        setStreamData((prev) => {
          // Keep only the latest data points based on user configuration
          const limit = maxPointsRef.current;
          const next = [...prev, ...newPoints];
          if (next.length > limit) return next.slice(next.length - limit);
          return next;
        });
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

  return (
    <div className="mb-4 rounded bg-gray-50 p-4 dark:bg-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          Program 3: Live Stream
        </h3>
        <div className="flex items-center gap-4">
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
          <div className="flex gap-2">
            <button
              onClick={startStream}
              disabled={isStreaming}
              className={`rounded px-4 py-2 text-white transition-colors ${
                isStreaming
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Start Stream
            </button>
            <button
              onClick={stopStream}
              disabled={!isStreaming}
              className={`rounded px-4 py-2 text-white transition-colors ${
                !isStreaming
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              Stop Stream
            </button>
          </div>
        </div>
      </div>
      
      <div className="h-64 w-full">
        <CanvasGraph data={streamData} />
      </div>
    </div>
  );
};

export default StreamViewer;
