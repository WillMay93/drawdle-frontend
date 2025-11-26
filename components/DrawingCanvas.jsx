"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from "react";

const DrawingCanvas = forwardRef(function DrawingCanvas(
  {
    width = 1000,
    height = 800,
    color = "#000000",
    size = 10,
    onChangeImageBase64,
    eraser = false,
    onDrawStateChange = () => {},
    className = "",
  },
  ref
) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const paths = useRef([]); // For undo stack
  const currentPath = useRef([]);
  const hasMoved = useRef(false);

  const exportImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const base64 = canvas.toDataURL("image/png");
    onChangeImageBase64(base64);
  }, [onChangeImageBase64]);

  const drawStroke = useCallback((ctx, stroke) => {
    const pts = stroke.points;
    if (!pts.length) return;

    // Handle single-point dots
    if (stroke.isDot || pts.length === 1) {
      const point = pts[0];
      ctx.beginPath();
      ctx.fillStyle = stroke.color;
      ctx.arc(point.x, point.y, stroke.size / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.beginPath();
    ctx.lineWidth = stroke.size;
    ctx.strokeStyle = stroke.color;
    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length - 1; i++) {
      const current = pts[i];
      const next = pts[i + 1];
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      ctx.quadraticCurveTo(current.x, current.y, midX, midY);
    }

    // Final segment to the last point
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    paths.current.forEach((path) => {
      drawStroke(ctx, path);
    });

    exportImage();
    onDrawStateChange(paths.current.length > 0);
  }, [drawStroke, exportImage, onDrawStateChange]);

  // ---------------------------
  // Set up canvas
  // ---------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;

    redraw();
  }, [width, height, redraw]);

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
    const pts = currentPath.current;

    // For the first segment, draw a straight line; afterwards smooth with quadratic curves
    if (pts.length === 2) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (pts.length > 2) {
      const prev = pts[pts.length - 2];
      const midX = (prev.x + pos.x) / 2;
      const midY = (prev.y + pos.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      ctx.stroke();
    }
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
    redraw();
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
      className={`block h-full w-full touch-none select-none bg-white rounded-xl ${className}`}
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
