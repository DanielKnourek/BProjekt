import React, { useRef, useEffect } from "react";

interface CanvasGraphProps {
  data: number[];
  lineColor?: string;
  backgroundColor?: string;
  fixedRange?: [number, number];
}

const CanvasGraph: React.FC<CanvasGraphProps> = ({
  data,
  lineColor = "#10b981", // Emerald 500
  backgroundColor = "transparent",
  fixedRange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track historical min and max so the graph only expands, never shrinks
  const minRef = useRef<number>(Infinity);
  const maxRef = useRef<number>(-Infinity);

  const handleReset = () => {
    minRef.current = Infinity;
    maxRef.current = -Infinity;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Sync canvas internal resolution with its display size to prevent stretching
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const drawWidth = rect.width;
    const drawHeight = rect.height;

    if (canvas.width !== drawWidth * dpr || canvas.height !== drawHeight * dpr) {
      canvas.width = drawWidth * dpr;
      canvas.height = drawHeight * dpr;
    }
    
    // Scale the context so we can continue using CSS-like coordinates
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, drawWidth, drawHeight);
    if (backgroundColor !== "transparent") {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, drawWidth, drawHeight);
    }

    if (data.length === 0) return;

    // Draw graph
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";

    // Auto-scale Y axis
    const currentMin = Math.min(...data);
    const currentMax = Math.max(...data);

    // Update historical extremes
    if (currentMin < minRef.current) minRef.current = currentMin;
    if (currentMax > maxRef.current) maxRef.current = currentMax;

    // Use fixed range if provided, otherwise use historical extremes
    const min = fixedRange ? fixedRange[0] : (minRef.current === Infinity ? 0 : minRef.current);
    const max = fixedRange ? fixedRange[1] : (maxRef.current === -Infinity ? 1 : maxRef.current);
    const range = max - min || 1; // Prevent divide by zero

    data.forEach((val, i) => {
      // X coordinate spaced evenly
      const x = (i / (data.length - 1 || 1)) * drawWidth;
      // Y coordinate mapped to canvas height (inverted because Y grows downwards)
      const y = drawHeight - ((val - min) / range) * drawHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw min/max text labels
    ctx.fillStyle = "#6b7280"; // Tailwind gray-500 for neutral subtle text
    ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "left";
    
    ctx.textBaseline = "top";
    ctx.fillText(`Max: ${max.toLocaleString()}`, 8, 8);
    
    ctx.textBaseline = "bottom";
    ctx.fillText(`Min: ${min.toLocaleString()}`, 8, drawHeight - 8);
  }, [data, lineColor, backgroundColor]);

  return (
    <div ref={containerRef} className="relative h-full w-full group">
      <canvas
        ref={canvasRef}
        className="h-full w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
      />
      <button
        onClick={handleReset}
        title="Reset Height"
        className="absolute top-2 right-2 rounded bg-white/50 dark:bg-gray-800/50 p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
};

export default CanvasGraph;
