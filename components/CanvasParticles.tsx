'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  pulse: number;
  pulseSpeed: number;
  currentOpacity?: number;
  currentSize?: number;
}

export default function CanvasParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });

  const config = {
    particleCount: 80,
    maxDistance: 120,
    mouseRadius: 150,
    particleSpeed: 0.5,
    particleSize: { min: 1, max: 3 },
    connectionOpacity: 0.3,
    particleOpacity: 0.8
  };

  const colors = {
    particles: ['#6c5ce7', '#a29bfe', '#0984e3', '#6c5ce7', '#e84393'],
    connections: '#6c5ce7'
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Create particles
    const createParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < config.particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * config.particleSpeed,
          vy: (Math.random() - 0.5) * config.particleSpeed,
          size: Math.random() * (config.particleSize.max - config.particleSize.min) + config.particleSize.min,
          color: colors.particles[Math.floor(Math.random() * colors.particles.length)],
          opacity: Math.random() * config.particleOpacity + 0.2,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: 0.02 + Math.random() * 0.02
        });
      }
    };

    // Update particles
    const updateParticles = () => {
      particlesRef.current.forEach(particle => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) {
          particle.vx *= -1;
          particle.x = Math.max(0, Math.min(canvas.width, particle.x));
        }
        if (particle.y < 0 || particle.y > canvas.height) {
          particle.vy *= -1;
          particle.y = Math.max(0, Math.min(canvas.height, particle.y));
        }

        // Update pulse for breathing effect
        particle.pulse += particle.pulseSpeed;
        particle.currentOpacity = particle.opacity + Math.sin(particle.pulse) * 0.3;

        // Mouse interaction
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < config.mouseRadius) {
          const force = (config.mouseRadius - distance) / config.mouseRadius;
          const angle = Math.atan2(dy, dx);
          particle.vx -= Math.cos(angle) * force * 0.01;
          particle.vy -= Math.sin(angle) * force * 0.01;
          
          // Increase size and opacity near mouse
          particle.currentSize = particle.size * (1 + force * 0.5);
          particle.currentOpacity = Math.min(1, particle.opacity + force * 0.5);
        } else {
          particle.currentSize = particle.size;
        }

        // Limit velocity
        const maxVel = config.particleSpeed * 2;
        particle.vx = Math.max(-maxVel, Math.min(maxVel, particle.vx));
        particle.vy = Math.max(-maxVel, Math.min(maxVel, particle.vy));

        // Apply friction
        particle.vx *= 0.99;
        particle.vy *= 0.99;
      });
    };

    // Draw particles
    const drawParticles = () => {
      particlesRef.current.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, particle.currentOpacity || particle.opacity));
        ctx.fillStyle = particle.color;
        
        // Add glow effect
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.arc(
          particle.x, 
          particle.y, 
          particle.currentSize || particle.size, 
          0, 
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      });
    };

    // Draw connections
    const drawConnections = () => {
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const dx = particlesRef.current[i].x - particlesRef.current[j].x;
          const dy = particlesRef.current[i].y - particlesRef.current[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < config.maxDistance) {
            const opacity = (1 - distance / config.maxDistance) * config.connectionOpacity;
            
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.strokeStyle = colors.connections;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particlesRef.current[i].x, particlesRef.current[i].y);
            ctx.lineTo(particlesRef.current[j].x, particlesRef.current[j].y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      updateParticles();
      drawConnections();
      drawParticles();
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    // Touch move handler
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseRef.current.x = e.touches[0].clientX;
        mouseRef.current.y = e.touches[0].clientY;
      }
    };

    // Resize handler
    const handleResize = () => {
      resizeCanvas();
      createParticles();
    };

    // Visibility change handler
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      } else {
        if (!animationFrameRef.current) {
          animate();
        }
      }
    };

    // Initialize
    resizeCanvas();
    createParticles();
    animate();

    // Add event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
