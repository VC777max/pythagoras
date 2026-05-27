'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { useAspect, useTexture } from '@react-three/drei';
import * as THREE from 'three/webgpu';
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';

import {
  abs,
  blendScreen,
  float,
  mod,
  mx_cell_noise_float,
  oneMinus,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  pass,
  mix,
  add
} from 'three/tsl';

// Our custom padel logo as the main texture — fills the whole canvas
const TEXTUREMAP = { src: '/logo.png' };

extend(THREE);

/**
 * Generates a programmatic depth map on a canvas element.
 * The depth map gives the logo a 3D "sphere dome" effect:
 * - Center of the image protrudes toward the viewer (bright)
 * - Edges recede away (dark)
 * An extra hot-spot is added around the ball/racket region for extra pop.
 */
function createLogoDepthMap() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Black base (far away)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  // Large radial gradient — spherical dome that makes the whole logo pop out
  const dome = ctx.createRadialGradient(
    size * 0.5, size * 0.5, 0,
    size * 0.5, size * 0.5, size * 0.52
  );
  dome.addColorStop(0,    'rgba(255,255,255,1.0)');
  dome.addColorStop(0.35, 'rgba(200,200,200,0.9)');
  dome.addColorStop(0.6,  'rgba(120,120,120,0.6)');
  dome.addColorStop(0.85, 'rgba(40,40,40,0.3)');
  dome.addColorStop(1,    'rgba(0,0,0,0.0)');
  ctx.fillStyle = dome;
  ctx.fillRect(0, 0, size, size);

  // Extra highlight on the padel ball area (lower center of logo)
  const ball = ctx.createRadialGradient(
    size * 0.5, size * 0.6, 0,
    size * 0.5, size * 0.6, size * 0.14
  );
  ball.addColorStop(0,   'rgba(255,255,255,0.7)');
  ball.addColorStop(0.5, 'rgba(255,255,255,0.3)');
  ball.addColorStop(1,   'rgba(255,255,255,0.0)');
  ctx.fillStyle = ball;
  ctx.fillRect(0, 0, size, size);

  // Slight highlight on the left racket
  const racketL = ctx.createRadialGradient(
    size * 0.35, size * 0.38, 0,
    size * 0.35, size * 0.38, size * 0.18
  );
  racketL.addColorStop(0,   'rgba(255,255,255,0.5)');
  racketL.addColorStop(1,   'rgba(255,255,255,0.0)');
  ctx.fillStyle = racketL;
  ctx.fillRect(0, 0, size, size);

  // Slight highlight on the right racket
  const racketR = ctx.createRadialGradient(
    size * 0.65, size * 0.38, 0,
    size * 0.65, size * 0.38, size * 0.18
  );
  racketR.addColorStop(0,   'rgba(255,255,255,0.5)');
  racketR.addColorStop(1,   'rgba(255,255,255,0.0)');
  ctx.fillStyle = racketR;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

// Post Processing — full-screen scan line + bloom
const PostProcessing = ({
  strength = 1.2,
  threshold = 0.9,
  fullScreenEffect = true,
}) => {
  const { gl, scene, camera } = useThree();
  const progressRef = useRef({ value: 0 });

  const render = useMemo(() => {
    const postProcessing = new THREE.PostProcessing(gl);
    const scenePass = pass(scene, camera);
    const scenePassColor = scenePass.getTextureNode('output');
    const bloomPass = bloom(scenePassColor, strength, 0.5, threshold);

    const uScanProgress = uniform(0);
    progressRef.current = uScanProgress;

    // Horizontal scan-line that sweeps full screen height
    const scanPos = float(uScanProgress.value);
    const uvY = uv().y;
    const scanWidth = float(0.04);
    const scanLine = smoothstep(0, scanWidth, abs(uvY.sub(scanPos)));

    // Neon-lime scan overlay across FULL canvas width
    const neonLimeOverlay = vec3(0.83, 1.0, 0.0).mul(oneMinus(scanLine)).mul(0.5);

    const withScanEffect = mix(
      scenePassColor,
      add(scenePassColor, neonLimeOverlay),
      fullScreenEffect ? smoothstep(0.88, 1.0, oneMinus(scanLine)) : 1.0
    );

    const final = withScanEffect.add(bloomPass);
    postProcessing.outputNode = final;

    return postProcessing;
  }, [camera, gl, scene, strength, threshold, fullScreenEffect]);

  useFrame(({ clock }) => {
    progressRef.current.value = (Math.sin(clock.getElapsedTime() * 0.45) * 0.5 + 0.5);
    render.renderAsync();
  }, 1);

  return null;
};

const WIDTH = 300;
const HEIGHT = 300;

const Scene = () => {
  const [rawMap] = useTexture([TEXTUREMAP.src]);

  // Programmatic depth map — gives the logo a 3D dome/parallax effect
  const depthMap = useMemo(() => createLogoDepthMap(), []);

  const meshRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (rawMap) setVisible(true);
  }, [rawMap]);

  const { material, uniforms } = useMemo(() => {
    const uPointer = uniform(new THREE.Vector2(0));
    const uProgress = uniform(0);

    // Stronger parallax since the mesh now covers the full canvas
    const strength = 0.015;

    const tDepthMap = texture(depthMap);

    // Logo texture with depth-driven parallax offset
    const tMap = texture(
      rawMap,
      uv().add(tDepthMap.r.mul(uPointer).mul(strength))
    );

    // Full-canvas UV space for the dot grid
    const aspect = float(WIDTH).div(HEIGHT);
    const tUv = vec2(uv().x.mul(aspect), uv().y);

    // Denser tiling so dots fill the whole canvas without looking sparse
    const tiling = vec2(90.0);
    const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0);

    const brightness = mx_cell_noise_float(tUv.mul(tiling).div(2));
    const dist = float(tiledUv.length());
    const dot = float(smoothstep(0.5, 0.48, dist)).mul(brightness);

    const depth = tDepthMap;
    const flow = oneMinus(smoothstep(0, 0.025, abs(depth.sub(uProgress))));

    // Neon-lime laser dots — stronger multiplier so they glow on dark logo bg
    const mask = dot.mul(flow).mul(vec3(10.0, 12.0, 0.0));

    const final = blendScreen(tMap, mask);

    const material = new THREE.MeshBasicNodeMaterial({
      colorNode: final,
      transparent: true,
      opacity: 0,
    });

    return {
      material,
      uniforms: { uPointer, uProgress },
    };
  }, [rawMap, depthMap]);

  const [w, h] = useAspect(WIDTH, HEIGHT);

  useFrame(({ clock }) => {
    uniforms.uProgress.value = (Math.sin(clock.getElapsedTime() * 0.45) * 0.5 + 0.5);
    if (meshRef.current?.material) {
      const mat = meshRef.current.material;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, visible ? 1 : 0, 0.07);
    }
  });

  useFrame(({ pointer }) => {
    uniforms.uPointer.value = pointer;
  });

  // scaleFactor = 1.0 — mesh fills the ENTIRE canvas, not just a small centre box
  return (
    <mesh ref={meshRef} scale={[w, h, 1]} material={material}>
      <planeGeometry />
    </mesh>
  );
};

export const HeroFuturistic = ({ onExplore }) => {
  const titleWords = 'Padel Matcher'.split(' ');
  const subtitle = 'Connecting players, scheduling matches, instantly.';
  const [visibleWords, setVisibleWords] = useState(0);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [delays, setDelays] = useState([]);
  const [subtitleDelay, setSubtitleDelay] = useState(0);

  useEffect(() => {
    setDelays(titleWords.map(() => Math.random() * 0.07));
    setSubtitleDelay(Math.random() * 0.1);
  }, [titleWords.length]);

  useEffect(() => {
    if (visibleWords < titleWords.length) {
      const timeout = setTimeout(() => setVisibleWords(visibleWords + 1), 600);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => setSubtitleVisible(true), 800);
      return () => clearTimeout(timeout);
    }
  }, [visibleWords, titleWords.length]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#0d0e12', overflow: 'hidden' }}>

      {/* Text overlay — centered over the full-canvas logo */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        zIndex: 10, pointerEvents: 'none',
        padding: '0 40px', textTransform: 'uppercase',
      }}>
        {/* Glassmorphism pill — always readable regardless of logo behind it */}
        <div style={{
          background: 'rgba(10, 11, 16, 0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: '16px',
          padding: '20px 36px',
          border: '1px solid rgba(212,255,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}>
          {/* Title */}
          <div style={{
            fontSize: '32px', fontWeight: '900',
            letterSpacing: '-0.02em', color: '#ffffff',
            textShadow: '0 2px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.7)',
          }}>
            <div style={{ display: 'flex', gap: '12px', overflow: 'hidden' }}>
              {titleWords.map((word, index) => (
                <div
                  key={index}
                  className={index < visibleWords ? 'fade-in' : ''}
                  style={{
                    animationDelay: `${index * 0.13 + (delays[index] || 0)}s`,
                    opacity: index < visibleWords ? 1 : 0,
                    transition: 'opacity 0.5s ease',
                  }}
                >
                  {word}
                </div>
              ))}
            </div>
          </div>

          {/* Subtitle */}
          <div style={{
            fontSize: '11px', color: 'rgba(255,255,255,0.9)',
            fontWeight: '700', textAlign: 'center', letterSpacing: '0.12em',
            textShadow: '0 1px 12px rgba(0,0,0,0.95), 0 0 30px rgba(0,0,0,0.8)',
          }}>
            <div
              className={subtitleVisible ? 'fade-in-subtitle' : ''}
              style={{
                animationDelay: `${titleWords.length * 0.13 + 0.2 + subtitleDelay}s`,
                opacity: subtitleVisible ? 1 : 0,
                transition: 'opacity 0.5s ease',
              }}
            >
              {subtitle}
            </div>
          </div>
        </div>
      </div>

      {/* CTA button */}
      <button
        onClick={onExplore}
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          padding: '12px 32px',
          background: 'var(--color-primary)',
          color: '#0f111a',
          fontWeight: '900',
          borderRadius: '8px',
          border: 'none',
          textTransform: 'uppercase',
          fontSize: '12px',
          letterSpacing: '0.1em',
          cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(212,255,0,0.3)',
        }}
      >
        Enter App
      </button>

      {/* Three.js canvas — fills the full viewport */}
      <Canvas
        flat
        gl={async (props) => {
          const renderer = new THREE.WebGPURenderer(props);
          await renderer.init();
          return renderer;
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <PostProcessing fullScreenEffect={true} />
        <Scene />
      </Canvas>
    </div>
  );
};

export default HeroFuturistic;
