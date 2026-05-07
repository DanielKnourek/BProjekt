import React, { useRef, useEffect } from "react";

interface CanvasGraphProps {
  data: number[];
  width?: number;
  height?: number;
  lineColor?: string;
  backgroundColor?: string;
}

const CanvasGraph: React.FC<CanvasGraphProps> = ({
  data,
  width = 600,
  height = 300,
  lineColor = "#10b981", // Emerald 500
  backgroundColor = "transparent",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
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

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    if (backgroundColor !== "transparent") {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
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

    // Use historical extremes, unless they are Infinity (which means data is empty or just reset)
    const min = minRef.current === Infinity ? 0 : minRef.current;
    const max = maxRef.current === -Infinity ? 1 : maxRef.current;
    const range = max - min || 1; // Prevent divide by zero

    data.forEach((val, i) => {
      // X coordinate spaced evenly
      const x = (i / (data.length - 1 || 1)) * width;
      // Y coordinate mapped to canvas height (inverted because Y grows downwards)
      const y = height - ((val - min) / range) * height;

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
    ctx.fillText(`Min: ${min.toLocaleString()}`, 8, height - 8);
  }, [data, width, height, lineColor, backgroundColor]);

  return (
    <div className="relative h-full w-full group">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
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
