// DrawingCanvas.jsx
import React, { useRef, useEffect } from "react";

export default function DrawingCanvas({
  width,
  height,
  color,
  size,
  onChangeImageBase64,
  clearRef,
  undoRef,
}) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawing = useRef(false);
  const history = useRef([]);
  const redoStack = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctxRef.current = ctx;
    saveHistory();

    // 🧠 Disable double-tap zoom on iOS
    document.addEventListener("gesturestart", (e) => e.preventDefault());
    document.addEventListener("touchmove", (e) => {
      if (isDrawing.current) e.preventDefault();
    }, { passive: false });
  }, []);

  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = color;
      ctxRef.current.lineWidth = size;
    }
  }, [color, size]);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    history.current.push(canvas.toDataURL());
    redoStack.current = [];
  };

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      offsetX: (clientX - rect.left) * scaleX,
      offsetY: (clientY - rect.top) * scaleY,
    };
  };

  const handleStart = (e) => {
    e.preventDefault();
    const { offsetX, offsetY } = getPos(e);
    isDrawing.current = true;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(offsetX, offsetY);
  };

  const handleMove = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const { offsetX, offsetY } = getPos(e);
    ctxRef.current.lineTo(offsetX, offsetY);
    ctxRef.current.stroke();
  };

  const handleEnd = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    isDrawing.current = false;
    ctxRef.current.closePath();
    saveHistory();
    onChangeImageBase64(canvasRef.current.toDataURL());
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (history.current.length <= 1) return;
    const last = history.current.pop();
    redoStack.current.push(last);
    const prev = history.current[history.current.length - 1];
    const img = new Image();
    img.src = prev;
    img.onload = () => {
      ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
      ctxRef.current.drawImage(img, 0, 0, canvas.width, canvas.height);
      onChangeImageBase64(canvas.toDataURL());
    };
  };

  // expose undo
  if (undoRef) undoRef.current = { undo };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-[80vh] rounded-xl touch-none"
        style={{ aspectRatio: "4/3" }}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
    </div>
  );

}
