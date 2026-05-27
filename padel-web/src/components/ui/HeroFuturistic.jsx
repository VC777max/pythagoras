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

// Padel logo image and depth map placeholders
const TEXTUREMAP = { src: 'https://i.postimg.cc/XYwvXN8D/img-4.png' };
const DEPTHMAP = { src: 'https://i.postimg.cc/2SHKQh2q/raw-4.webp' };

extend(THREE);

// Post Processing component
const PostProcessing = ({
  strength = 1,
  threshold = 1,
  fullScreenEffect = true,
}) => {
  const { gl, scene, camera } = useThree();
  const progressRef = useRef({ value: 0 });

  const render = useMemo(() => {
    const postProcessing = new THREE.PostProcessing(gl);
    const scenePass = pass(scene, camera);
    const scenePassColor = scenePass.getTextureNode('output');
    const bloomPass = bloom(scenePassColor, strength, 0.5, threshold);

    // Create the scanning effect uniform
    const uScanProgress = uniform(0);
    progressRef.current = uScanProgress;

    // Neon lime green overlay instead of red (d4ff00 -> RGB approx 0.83, 1.0, 0.0)
    const scanPos = float(uScanProgress.value);
    const uvY = uv().y;
    const scanWidth = float(0.05);
    const scanLine = smoothstep(0, scanWidth, abs(uvY.sub(scanPos)));
    const neonLimeOverlay = vec3(0.83, 1.0, 0.0).mul(oneMinus(scanLine)).mul(0.4);

    // Mix the original scene with the neon-lime overlay
    const withScanEffect = mix(
      scenePassColor,
      add(scenePassColor, neonLimeOverlay),
      fullScreenEffect ? smoothstep(0.9, 1.0, oneMinus(scanLine)) : 1.0
    );

    // Add bloom effect after scan effect
    const final = withScanEffect.add(bloomPass);

    postProcessing.outputNode = final;

    return postProcessing;
  }, [camera, gl, scene, strength, threshold, fullScreenEffect]);

  useFrame(({ clock }) => {
    // Animate the scan line from top to bottom
    progressRef.current.value = (Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5);
    render.renderAsync();
  }, 1);

  return null;
};

const WIDTH = 300;
const HEIGHT = 300;

const Scene = () => {
  const [rawMap, depthMap] = useTexture([TEXTUREMAP.src, DEPTHMAP.src]);

  const meshRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (rawMap && depthMap) {
      setVisible(true);
    }
  }, [rawMap, depthMap]);

  const { material, uniforms } = useMemo(() => {
    const uPointer = uniform(new THREE.Vector2(0));
    const uProgress = uniform(0);

    const strength = 0.01;

    const tDepthMap = texture(depthMap);

    const tMap = texture(
      rawMap,
      uv().add(tDepthMap.r.mul(uPointer).mul(strength))
    );

    const aspect = float(WIDTH).div(HEIGHT);
    const tUv = vec2(uv().x.mul(aspect), uv().y);

    const tiling = vec2(120.0);
    const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0);

    const brightness = mx_cell_noise_float(tUv.mul(tiling).div(2));

    const dist = float(tiledUv.length());
    const dot = float(smoothstep(0.5, 0.49, dist)).mul(brightness);

    const depth = tDepthMap;

    const flow = oneMinus(smoothstep(0, 0.02, abs(depth.sub(uProgress))));

    // Neon lime mask color (0.83, 1.0, 0.0) instead of red (10, 0, 0)
    const mask = dot.mul(flow).mul(vec3(8.3, 10.0, 0.0));

    const final = blendScreen(tMap, mask);

    const material = new THREE.MeshBasicNodeMaterial({
      colorNode: final,
      transparent: true,
      opacity: 0,
    });

    return {
      material,
      uniforms: {
        uPointer,
        uProgress,
      },
    };
  }, [rawMap, depthMap]);

  const [w, h] = useAspect(WIDTH, HEIGHT);

  useFrame(({ clock }) => {
    uniforms.uProgress.value = (Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5);
    // Smooth transition
    if (meshRef.current && meshRef.current.material) {
      const mat = meshRef.current.material;
      mat.opacity = THREE.MathUtils.lerp(
        mat.opacity,
        visible ? 1 : 0,
        0.07
      );
    }
  });

  useFrame(({ pointer }) => {
    uniforms.uPointer.value = pointer;
  });

  const scaleFactor = 0.40;
  return (
    <mesh ref={meshRef} scale={[w * scaleFactor, h * scaleFactor, 1]} material={material}>
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
    <div className="h-svh" style={{ position: 'relative', width: '100%', height: '100vh', background: '#0d0e12', overflow: 'hidden' }}>
      <div className="h-svh uppercase items-center w-full absolute z-60 pointer-events-none px-10 flex justify-center flex-col" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 10, pointerEvents: 'none', padding: '0 40px', textTransform: 'uppercase' }}>
        <div style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-0.02em', color: '#ffffff' }}>
          <div style={{ display: 'flex', gap: '12px', overflow: 'hidden' }}>
            {titleWords.map((word, index) => (
              <div
                key={index}
                className={index < visibleWords ? 'fade-in' : ''}
                style={{ 
                  animationDelay: `${index * 0.13 + (delays[index] || 0)}s`, 
                  opacity: index < visibleWords ? 1 : 0,
                  transition: 'opacity 0.5s ease'
                }}
              >
                {word}
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: '12px', marginTop: '8px', color: 'rgba(255,255,255,0.6)', fontWeight: '700', textAlign: 'center' }}>
          <div
            className={subtitleVisible ? 'fade-in-subtitle' : ''}
            style={{ 
              animationDelay: `${titleWords.length * 0.13 + 0.2 + subtitleDelay}s`, 
              opacity: subtitleVisible ? 1 : 0,
              transition: 'opacity 0.5s ease'
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={onExplore}
        style={{ 
          position: 'absolute', 
          bottom: '40px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          zIndex: 20, 
          width: 'auto', 
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
          boxShadow: '0 4px 20px rgba(212,255,0,0.2)'
        }}
      >
        Enter App
      </button>

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
