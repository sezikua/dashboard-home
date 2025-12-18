"use client"

import { useCallback } from "react"
import Particles from "react-tsparticles"
import { loadSlim } from "tsparticles-slim"
import type { Engine } from "tsparticles-engine"

export default function ParticleBackground() {
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine)
  }, [])

  return (
    <div className="fixed inset-0 z-0">
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          background: {
            color: {
              value: "#0d1117",
            },
          },
          fpsLimit: 120,
          interactivity: {
            events: {
              onClick: {
                enable: true,
                mode: "push",
              },
              onHover: {
                enable: true,
                mode: "repulse",
                parallax: {
                  enable: true,
                  force: 40,
                  smooth: 20,
                },
              },
              resize: true,
            },
            modes: {
              push: {
                quantity: 4,
              },
              repulse: {
                distance: 150,
                duration: 0.4,
              },
            },
          },
          particles: {
            color: {
              value: ["#1054e8ff", "#c4c70cff", "#e3e30cff"],
            },
            links: {
              color: "#ffffff",
              distance: 150,
              enable: true,
              opacity: 0.2,
              width: 1,
              triangles: {
                enable: false,
              },
              warp: true,
            },
            collisions: {
              enable: true,
            },
            move: {
              direction: "none",
              enable: true,
              outModes: {
                default: "out",
              },
              random: false,
              speed: 1.8,
              straight: false,
              path: {
                enable: true,
                delay: {
                  value: 0.1,
                },
                options: {
                  size: 5,
                  draw: false,
                  increment: 0.001,
                },
              },
              trail: {
                enable: true,
                length: 5,
                fillColor: {
                  value: "#000000",
                },
              },
            },
            number: {
              density: {
                enable: true,
                area: 800,
              },
              value: 60,
            },
            opacity: {
              value: 0.3,
            },
            shape: {
              type: "circle",
            },
            size: {
              value: { min: 1, max: 3 },
            },
            zIndex: {
              value: {
                min: 0,
                max: 100,
              },
              opacityRate: 0.3,
              sizeRate: 1,
              velocityRate: 1,
            },
          },
          detectRetina: true,
          motion: {
            disable: false,
            reduce: {
              factor: 4,
              value: true,
            },
          },
        }}
      />
    </div>
  )
}


