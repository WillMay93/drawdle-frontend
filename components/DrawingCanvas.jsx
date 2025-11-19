"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

const DrawingCanvas = forwardRef(function DrawingCanvas(
  {
    width = 1000,
    height = 800,
    color = "#000000",
    size = 10,
    onChangeImageBase64,
    eraser = false,
    onDrawStateChange = () => {},
  },
  ref
) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const paths = useRef([]); // For undo stack
  const currentPath = useRef([]);
  const hasMoved = useRef(false);

  // ---------------------------
  // Set up canvas
  // ---------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = size;
    ctx.strokeStyle = color;
    ctxRef.current = ctx;

    redraw();
  }, [width, height]);

  // ---------------------------
  // Update brush color & size
  // ---------------------------
  useEffect(() => {
    if (!ctxRef.current) return;
    ctxRef.current.lineWidth = size;
    ctxRef.current.strokeStyle = eraser ? "#ffffff" : color;
  }, [color, size, eraser]);

  // ---------------------------
  // Utility to get correct cursor/touch positions
  // ---------------------------
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;

    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  // ---------------------------
  // Start Drawing
  // ---------------------------
  const handleStart = (e) => {
    e.preventDefault();

    drawing.current = true;
    hasMoved.current = false;
    currentPath.current = [];

    const pos = getPos(e);
    currentPath.current.push(pos);

    ctxRef.current.beginPath();
    ctxRef.current.moveTo(pos.x, pos.y);
  };

  // ---------------------------
  // Drawing Move
  // ---------------------------
  const handleMove = (e) => {
    if (!drawing.current) return;
    const pos = getPos(e);
    hasMoved.current = true;

    currentPath.current.push(pos);

    const ctx = ctxRef.current;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  // ---------------------------
  // Stop Drawing
  // ---------------------------
  const handleEnd = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (currentPath.current.length === 0) return;

    const isDot = !hasMoved.current || currentPath.current.length === 1;
    const strokeColor = eraser ? "#ffffff" : color;

    if (isDot) {
      const point = currentPath.current[0];
      const ctx = ctxRef.current;
      ctx.beginPath();
      ctx.fillStyle = strokeColor;
      ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
      ctx.fill();

      paths.current.push({
        color: strokeColor,
        size,
        points: [point],
        isDot: true,
      });
    } else {
      paths.current.push({
        color: strokeColor,
        size,
        points: [...currentPath.current],
        isDot: false,
      });
    }

    currentPath.current = [];
    exportImage();
    onDrawStateChange(paths.current.length > 0);
  };

  // ---------------------------
  // Redraw all strokes (used for Undo, resize, etc.)
  // ---------------------------
  const redraw = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    paths.current.forEach((path) => {
      if (path.isDot && path.points.length) {
        const point = path.points[0];
        ctx.beginPath();
        ctx.fillStyle = path.color;
        ctx.arc(point.x, point.y, path.size / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      ctx.beginPath();
      ctx.lineWidth = path.size;
      ctx.strokeStyle = path.color;

      path.points.forEach((p, i) => {
        if (i === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          ctx.lineTo(p.x, p.y);
        }
      });

      ctx.stroke();
    });

    exportImage();
    onDrawStateChange(paths.current.length > 0);
  };

  // ---------------------------
  // Public functions: Undo + Clear
  // ---------------------------
  useImperativeHandle(ref, () => ({
    undo: () => {
      paths.current.pop();
      redraw();
    },
    clear: () => {
      paths.current = [];
      redraw();
    },
  }));

  // ---------------------------
  // Export to Base64
  // ---------------------------
  const exportImage = () => {
    const base64 = canvasRef.current.toDataURL("image/png");
    onChangeImageBase64(base64);
  };

  // ---------------------------
  // Disable scrolling while drawing on mobile
  // ---------------------------
  useEffect(() => {
    const preventScroll = (e) => {
      if (drawing.current) e.preventDefault();
    };
    document.addEventListener("touchmove", preventScroll, { passive: false });
    return () => document.removeEventListener("touchmove", preventScroll);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="touch-none select-none bg-white rounded-xl"
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    />
  );
});

export default DrawingCanvas;
