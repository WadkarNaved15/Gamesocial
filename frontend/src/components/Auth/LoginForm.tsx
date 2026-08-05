import React, { useState, useEffect, useRef, FormEvent, MouseEvent } from 'react';
import * as THREE from 'three';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  
  // FIX: Type the ref explicitly as HTMLDivElement | null
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ antialias: false });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(2, 2);

    const vertexShader = `
      varying vec2 v_texCoord;
      void main() {
          v_texCoord = uv;
          gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      varying vec2 v_texCoord;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;

      float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
          vec2 uv = v_texCoord;
          vec2 mouse = u_mouse / u_resolution;
          
          float n = 0.0;
          n += noise(uv * 3.0 + u_time * 0.4) * 0.5;
          n += noise(uv * 6.0 - u_time * 0.2) * 0.25;
          n += noise(uv * 12.0 + u_time * 0.6) * 0.125;
          
          float mask = smoothstep(0.3, 0.8, n);
          
          vec3 emerald = vec3(0.0, 1.0, 0.58);
          vec3 deepEmerald = vec3(0.0, 0.3, 0.15);
          vec3 obsidian = vec3(0.02, 0.03, 0.02);
          
          float dist = distance(uv, mouse);
          float glow = exp(-dist * 4.0) * 0.4;
          
          vec3 baseColor = mix(obsidian, deepEmerald, n * 0.6);
          vec3 finalColor = mix(baseColor, emerald, mask + glow);
          
          gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const uniforms: { [uniform: string]: THREE.IUniform } = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_mouse: { value: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) }
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // FIX: Typed global window mousemove event
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      (uniforms.u_mouse.value as THREE.Vector2).x = e.clientX;
      (uniforms.u_mouse.value as THREE.Vector2).y = window.innerHeight - e.clientY;
    };

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      (uniforms.u_resolution.value as THREE.Vector2).set(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    
    // FIX: Type the animation frame request ID as number
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
    };
  }, []);

  // FIX: Type form submit event
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Logging in with:', { email, password });
  };

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] text-[#e5e2e1] font-body overflow-hidden antialiased">
      <div ref={canvasContainerRef} className="fixed inset-0 z-0 overflow-hidden" />

      <main className="relative z-10 w-full max-w-[1440px] mx-auto min-h-screen flex items-center justify-start p-4 md:p-16">
        <div 
          className="bg-white text-black rounded-[2rem] relative z-10 w-full max-w-[600px] flex flex-col justify-between p-8 md:p-16 min-h-[700px]"
          style={{
            maskImage: 'radial-gradient(circle at right center, transparent 40px, black 41px)',
            WebkitMaskImage: 'radial-gradient(circle at right center, transparent 40px, black 41px)'
          }}
        >
          <div className="absolute top-8 left-8 font-headline text-4xl text-black opacity-20 tracking-tighter pointer-events-none">
            AESTHETIX
          </div>

          <div className="mt-12 md:mt-0 flex-grow flex flex-col justify-center">
            <div className="mb-12">
              <h1 className="font-headline text-[56px] md:text-[84px] text-black uppercase leading-[0.9] tracking-tighter">
                WELCOME<br />BACK
              </h1>
              <div className="mt-6 flex items-baseline gap-2 font-body text-base">
                <span className="text-gray-600">Need an account?</span>
                <a href="#signup" className="text-black font-label-mono hover:underline transition-colors font-bold">
                  Sign Up
                </a>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-md w-full">
              <div className="space-y-4">
                <div>
                  <label className="sr-only" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email"
                    className="w-full px-4 py-4 rounded-lg bg-white border border-[#e0e0e0] text-black transition-all duration-300 focus:border-black focus:shadow-[inset_0_0_0_1px_#000000] focus:outline-none placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="sr-only" htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full px-4 py-4 rounded-lg bg-white border border-[#e0e0e0] text-black transition-all duration-300 focus:border-black focus:shadow-[inset_0_0_0_1px_#000000] focus:outline-none placeholder-gray-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-[72px] rounded-full relative overflow-hidden flex items-center justify-between px-8 border border-[#3b4b3e] bg-transparent transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="font-bold text-xl tracking-tight text-black">Sign In</span>
                <div className="w-12 h-12 bg-[#EFFF00] rounded-full flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-black font-bold" style={{ fontSize: '24px' }}>
                    north_east
                  </span>
                </div>
              </button>

              <div className="flex justify-between items-center text-sm mt-4">
                <a href="#forgot" className="text-gray-600 hover:text-black transition-colors">
                  Forgot password?
                </a>
              </div>

              <div className="relative py-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-label-mono text-xs">OR</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  aria-label="Sign in with Google"
                  className="py-3 flex justify-center items-center rounded-lg border border-[#e0e0e0] bg-transparent text-black transition-all duration-300 hover:border-black hover:bg-[#f5f5f5]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                </button>

                <button
                  type="button"
                  aria-label="Sign in with Microsoft"
                  className="py-3 flex justify-center items-center rounded-lg border border-[#e0e0e0] bg-transparent text-black transition-all duration-300 hover:border-black hover:bg-[#f5f5f5]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
                    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                  </svg>
                </button>

                <button
                  type="button"
                  aria-label="Sign in with Apple"
                  className="py-3 flex justify-center items-center rounded-lg border border-[#e0e0e0] bg-transparent text-black transition-all duration-300 hover:border-black hover:bg-[#f5f5f5]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.1 13.92c-1.07.62-2.3.93-3.6.93-2.17 0-4.14-1.03-5.36-2.73-.24-.34-.17-.81.16-1.06.33-.24.79-.17 1.04.16.92 1.28 2.4 2.06 4.02 2.06 1.02 0 1.98-.24 2.8-.69.37-.2.83-.07 1.03.3s.06.84-.3 1.03zM15.5 12H13V9.5c0-.41-.34-.75-.75-.75s-.75.34-.75.75V12H9c-.41 0-.75.34-.75.75s.34.75.75.75h2.5v2.5c0 .41.34.75.75.75s.75-.34.75-.75V13.5h2.5c.41 0 .75-.34.75-.75s-.34-.75-.75-.75z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginForm;