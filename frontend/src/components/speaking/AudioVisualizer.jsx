// frontend/src/components/speaking/AudioVisualizer.jsx
import React, { useEffect, useRef } from 'react';

export const AudioVisualizer = ({ isActive }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    const bars = 30;
    const barWidth = canvas.width / bars;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < bars; i++) {
        const height = Math.random() * canvas.height * 0.8;
        const x = i * barWidth;
        const y = (canvas.height - height) / 2;

        ctx.fillStyle = `rgba(99, 102, 241, ${0.3 + Math.random() * 0.7})`;
        ctx.fillRect(x, y, barWidth - 2, height);
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={60}
      className="w-full h-16 rounded-lg"
    />
  );
};