'use client';

import { useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { type Container, type ISourceOptions } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';

export default function ElectricParticles() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = async (container?: Container): Promise<void> => {
    console.log(container);
  };

  const options: ISourceOptions = useMemo(
    () => ({
      background: {
        color: {
          value: 'transparent',
        },
      },
      fpsLimit: 120,
      interactivity: {
        events: {
          onClick: {
            enable: true,
            mode: 'push',
          },
          onHover: {
            enable: true,
            mode: 'grab',
          },
        },
        modes: {
          push: {
            quantity: 2,
          },
          grab: {
            distance: 150,
            links: {
              opacity: 0.8,
              color: '#60a5fa',
            },
          },
        },
      },
      particles: {
        color: {
          value: ['#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
        },
        links: {
          color: {
            value: '#3b82f6',
          },
          distance: 120,
          enable: true,
          opacity: 0.2,
          width: 1,
          triangles: {
            enable: true,
            opacity: 0.05,
          },
        },
        move: {
          enable: true,
          speed: 1.5,
          direction: 'none',
          random: true,
          straight: false,
          outModes: {
            default: 'bounce',
          },
        },
        number: {
          value: 100,
          density: {
            enable: true,
            width: 1920,
            height: 1080,
          },
        },
        opacity: {
          value: { min: 0.1, max: 0.6 },
          animation: {
            enable: true,
            speed: 1,
            sync: false,
          },
        },
        shape: {
          type: ['circle', 'triangle'],
        },
        size: {
          value: { min: 1, max: 4 },
          animation: {
            enable: true,
            speed: 2,
            sync: false,
          },
        },
        twinkle: {
          particles: {
            enable: true,
            frequency: 0.05,
            opacity: 1,
          },
        },
      },
      detectRetina: true,
    }),
    [],
  );

  if (init) {
    return (
      <Particles
        id="electric-particles"
        particlesLoaded={particlesLoaded}
        options={options}
        className="absolute inset-0 -z-10"
      />
    );
  }

  return null;
}
