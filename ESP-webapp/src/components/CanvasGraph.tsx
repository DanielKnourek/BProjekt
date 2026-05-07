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
    // For fixed scales, you could pass min/max as props
    const min = Math.min(...data);
    const max = Math.max(...data);
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
  }, [data, width, height, lineColor, backgroundColor]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="h-full w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
    />
  );
};

export default CanvasGraph;
