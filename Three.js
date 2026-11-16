/**
 * ============================================================================
 * 3D LIQUID CHROME WAVE SHADER — HERO SECTION VISUAL EXPERIENCE
 * ============================================================================
 * 
 * Portfolio of Sayyid Abdullah Azzam (WAGONEPC)
 * Built with Three.js (r125+) and Custom WebGL GLSL Shaders.
 * 
 * Features:
 *  - GPU-accelerated harmonic fluid wave physics with Simplex Noise
 *  - High-performance semi-translucent liquid chrome surface with ACES Filmic tone mapping
 *  - Reflective Fresnel curves and dual directional specular highlights
 *  - Monochromatic wireframe mesh overlay
 *  - Glowing particle intersection nodes
 *  - Interactive mouse & touch water ripple displacement with viscous damping
 *  - Smooth camera yaw parallax & responsive window resizing
 *  - Automatic performance optimization (capped pixelRatio, visibility-aware loop)
 * 
 * Hosting: Optimized for static deployment on Vercel
 * ============================================================================
 */

(function () {
    'use strict';

    /**
     * Inisialisasi scene Three.js saat DOM siap
     */
    function initHeroWave() {
        // Cari container hero wave: dukung ID container hero utama atau fallback ID
        const container = document.getElementById('hero-canvas-container') ||
            document.getElementById('threejs-hero-chrome-wave') ||
            document.getElementById('hero-section');

        if (!container) {
            console.warn('[Three.js Wave] Container hero canvas tidak ditemukan.');
            return;
        }

        // Pastikan library Three.js telah dimuat
        if (typeof THREE === 'undefined') {
            console.error('[Three.js Wave] Library Three.js belum dimuat. Pastikan skrip Three.js disertakan sebelum file ini.');
            return;
        }

        // Dapatkan dimensi awal container
        let width = container.clientWidth || window.innerWidth;
        let height = container.clientHeight || window.innerHeight;

        // ------------------------------------------------------------------------
        // 1. SCENE & FOG
        // ------------------------------------------------------------------------
        const scene = new THREE.Scene();
        // Fog halus warna hitam pekat (#050505) untuk memadukan tepian gelombang ke background
        scene.fog = new THREE.FogExp2(0x050505, 0.032);

        // ------------------------------------------------------------------------
        // 2. KAMERA PERSPEKTIF
        // ------------------------------------------------------------------------
        const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
        camera.position.set(0, -8.6, 7.2);
        camera.lookAt(0, 0, 0.4);

        // ------------------------------------------------------------------------
        // 3. RENDERER WEBGL
        // ------------------------------------------------------------------------
        // Cek apakah sudah ada elemen canvas di dalam container
        const existingCanvas = document.getElementById('liquid-chrome-canvas');
        const rendererOptions = {
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        };

        if (existingCanvas) {
            rendererOptions.canvas = existingCanvas;
        }

        let renderer;
        try {
            renderer = new THREE.WebGLRenderer(rendererOptions);
        } catch (err) {
            console.error('[Three.js Wave] Gagal menginisialisasi WebGLRenderer:', err);
            return;
        }

        renderer.setSize(width, height);
        // Batasi pixel ratio ke maks 2 untuk efisiensi performa pada layar Retina / mobile
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        // Tone mapping ACESFilmic untuk pantulan chrome metalik fotorealistik
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.4;

        // Jika canvas baru dibuat oleh Three.js, tambahkan ke container
        if (!existingCanvas) {
            renderer.domElement.id = 'liquid-chrome-canvas';
            renderer.domElement.style.width = '100%';
            renderer.domElement.style.height = '100%';
            renderer.domElement.style.display = 'block';
            renderer.domElement.style.position = 'absolute';
            renderer.domElement.style.top = '0';
            renderer.domElement.style.left = '0';
            container.appendChild(renderer.domElement);
        }

        // ------------------------------------------------------------------------
        // 4. PENCAHAYAAN STUDIO CHROME
        // ------------------------------------------------------------------------
        // Ambient Light: pencahayaan dasar gelap untuk bayangan kontras tinggi
        const ambientLight = new THREE.AmbientLight(0x222222, 1.6);
        scene.add(ambientLight);

        // Key Light: cahaya putih terang terarah dari atas depan kanan
        const keyLight = new THREE.DirectionalLight(0xffffff, 4.0);
        keyLight.position.set(5, 10, 10);
        scene.add(keyLight);

        // Rim Light: cahaya aksen perak lembut dari belakang kiri bawah
        const rimLight = new THREE.DirectionalLight(0xa0a0a0, 2.5);
        rimLight.position.set(-6, -4, 4);
        scene.add(rimLight);

        // ------------------------------------------------------------------------
        // 5. GLSL SHADER: SIMPLEX NOISE & PERHITUNGAN GELOMBANG PADA GPU
        // ------------------------------------------------------------------------
        const waveVertexShader = `
            uniform float uTime;
            uniform vec2 uMouse;
            uniform float uMouseSpeed;

            varying vec2 vUv;
            varying float vElevation;
            varying float vDistToMouse;
            varying vec3 vNormal;
            varying vec3 vViewPosition;

            // Algoritma Simplex Noise 2D GLSL
            vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy));
                vec2 x0 = v - i + dot(i, C.xx);
                vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod(i, 289.0);
                vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
                vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
                m = m * m;
                m = m * m;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
                vec3 g;
                g.x  = a0.x  * x0.x  + h.x  * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            void main() {
                vUv = uv;
                vec3 pos = position;

                // FISIKA GELOMBANG JARANG & TENANG (CALM & SPARSE LIQUID WAVES)
                // Frekuensi spasial rendah (0.12 - 0.18) untuk bukit gelombang lebar & anggun
                // Skala waktu lambat (0.28) untuk gerakan relaks dan tenang
                float t = uTime * 0.28;
                float broadWave1 = sin(pos.x * 0.15 + t * 0.7) * cos(pos.y * 0.18 + t * 0.5) * 1.1;
                float broadWave2 = sin(pos.y * 0.22 - t * 0.8 + pos.x * 0.14) * 0.6;
                float gentleNoise = snoise(pos.xy * 0.10 + vec2(t * 0.12, t * 0.08)) * 0.95;

                float baseElevation = broadWave1 + broadWave2 + gentleNoise;

                // INTERAKSI RIPPLE KURSOR / SENTUHAN
                vec2 mouseWorld = uMouse * vec2(13.0, 9.0);
                float dist = distance(pos.xy, mouseWorld);
                vDistToMouse = dist;

                // Radius riak halus & atenuasi eksponensial (viscous damping)
                float rippleRadius = 7.0;
                float influence = smoothstep(rippleRadius, 0.0, dist);
                float rippleFreq = 2.2;
                float rippleDamping = exp(-dist * 0.45);
                float waterRipple = sin(dist * rippleFreq - uTime * 2.8) * rippleDamping * (0.9 + uMouseSpeed * 1.4);

                pos.z += baseElevation + influence * waterRipple;
                vElevation = pos.z;

                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                vViewPosition = -mvPosition.xyz;
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;

        // Uniforms yang dikirim ke GPU pada setiap frame
        const uniforms = {
            uTime: { value: 0 },
            uMouse: { value: new THREE.Vector2(0, 0) },
            uMouseSpeed: { value: 0 }
        };

        // Geometri bidang datar densitas tinggi untuk kehalusan wireframe & liquid
        const planeGeometry = new THREE.PlaneGeometry(32, 24, 160, 120);

        // ------------------------------------------------------------------------
        // 6. MATERIAL 1: SEMI-TRANSPARENT LIQUID CHROME SURFACE
        // ------------------------------------------------------------------------
        const surfaceFragmentShader = `
            varying vec2 vUv;
            varying float vElevation;
            varying float vDistToMouse;
            varying vec3 vNormal;
            varying vec3 vViewPosition;

            void main() {
                vec3 viewDir = normalize(vViewPosition);
                vec3 normal = normalize(vNormal);

                // Efek pantulan Fresnel chrome reflektif tinggi
                float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.2);

                // Pantulan specular liquid chrome
                vec3 refVec = reflect(-viewDir, normal);
                float spec1 = pow(max(dot(refVec, normalize(vec3(0.6, 0.9, 0.8))), 0.0), 35.0);
                float spec2 = pow(max(dot(refVec, normalize(vec3(-0.8, -0.5, 0.5))), 0.0), 18.0);

                // Gradasi warna berdasarkan elevasi (deep void hitam ke silver terang di puncak)
                float crest = smoothstep(-1.2, 2.5, vElevation);
                vec3 deepVoid = vec3(0.02, 0.02, 0.03);
                vec3 silverMid = vec3(0.35, 0.36, 0.40);
                vec3 silverCrest = vec3(0.94, 0.96, 1.0);

                vec3 col = mix(deepVoid, silverMid, crest);
                col = mix(col, silverCrest, pow(crest, 2.2));
                col += vec3(0.95, 0.95, 1.0) * (spec1 * 1.8 + spec2 * 0.6);
                col += vec3(0.9, 0.92, 0.98) * fresnel * 0.55;

                // Sorotan cahaya lembut di sekitar kursor
                float rippleGlow = smoothstep(3.8, 0.0, vDistToMouse) * 0.35;
                col += vec3(rippleGlow * 0.5);

                gl_FragColor = vec4(col, 0.86);
            }
        `;

        const surfaceMaterial = new THREE.ShaderMaterial({
            vertexShader: waveVertexShader,
            fragmentShader: surfaceFragmentShader,
            uniforms: uniforms,
            transparent: true,
            side: THREE.DoubleSide
        });

        const surfaceMesh = new THREE.Mesh(planeGeometry, surfaceMaterial);
        surfaceMesh.rotation.x = -Math.PI * 0.38;
        surfaceMesh.position.set(0, -0.6, -1.2);
        scene.add(surfaceMesh);

        // ------------------------------------------------------------------------
        // 7. MATERIAL 2: MONOCHROMATIC CHROME WIREFRAME GRID
        // ------------------------------------------------------------------------
        const wireframeFragmentShader = `
            varying float vDistToMouse;
            varying float vElevation;

            void main() {
                float heightAlpha = smoothstep(-1.0, 2.2, vElevation);
                float cursorGlow = smoothstep(3.5, 0.0, vDistToMouse);
                vec3 wireColor = mix(vec3(0.24, 0.24, 0.28), vec3(0.98, 0.98, 1.0), heightAlpha * 0.75 + cursorGlow * 0.5);
                gl_FragColor = vec4(wireColor, 0.35 + heightAlpha * 0.45 + cursorGlow * 0.3);
            }
        `;

        const wireframeMaterial = new THREE.ShaderMaterial({
            vertexShader: waveVertexShader,
            fragmentShader: wireframeFragmentShader,
            uniforms: uniforms,
            wireframe: true,
            transparent: true
        });

        const wireframeMesh = new THREE.Mesh(planeGeometry, wireframeMaterial);
        wireframeMesh.rotation.x = surfaceMesh.rotation.x;
        wireframeMesh.position.set(0, -0.58, -1.18);
        scene.add(wireframeMesh);

        // ------------------------------------------------------------------------
        // 8. MATERIAL 3: GLOWING CHROME INTERSECTION NODES (POINTS)
        // ------------------------------------------------------------------------
        // Injeksi gl_PointSize di akhir main() setelah 'influence' terdefinisi
        const nodeVertexShader = waveVertexShader.replace(
            'gl_Position = projectionMatrix * mvPosition;',
            `gl_Position = projectionMatrix * mvPosition;
             gl_PointSize = 3.2 * (1.0 + influence * 1.2);`
        );

        const nodeFragmentShader = `
            varying float vElevation;
            varying float vDistToMouse;

            void main() {
                // Bentuk titik partikel lingkaran lembut anti-aliased
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;

                float alpha = smoothstep(0.5, 0.0, dist);
                float glow = smoothstep(-0.6, 2.0, vElevation);
                float cursorBoost = smoothstep(3.2, 0.0, vDistToMouse);
                vec3 ptColor = mix(vec3(0.48, 0.48, 0.52), vec3(1.0, 1.0, 1.0), glow + cursorBoost);
                gl_FragColor = vec4(ptColor, alpha * (0.6 + glow * 0.35 + cursorBoost * 0.35));
            }
        `;

        const nodeMaterial = new THREE.ShaderMaterial({
            vertexShader: nodeVertexShader,
            fragmentShader: nodeFragmentShader,
            uniforms: uniforms,
            transparent: true
        });

        const nodePoints = new THREE.Points(planeGeometry, nodeMaterial);
        nodePoints.rotation.x = surfaceMesh.rotation.x;
        nodePoints.position.set(0, -0.57, -1.16);
        scene.add(nodePoints);

        // ------------------------------------------------------------------------
        // 9. EVENT TRACKING: MOUSE & TOUCH INTERACTION
        // ------------------------------------------------------------------------
        let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
        let lastMouseX = 0, lastMouseY = 0, currentMouseSpeed = 0;

        window.addEventListener('mousemove', (e) => {
            const normX = (e.clientX / window.innerWidth) * 2 - 1;
            const normY = -(e.clientY / window.innerHeight) * 2 + 1;
            targetX = normX;
            targetY = normY;

            const dx = normX - lastMouseX;
            const dy = normY - lastMouseY;
            const instantSpeed = Math.sqrt(dx * dx + dy * dy) * 4.0;
            currentMouseSpeed = Math.min(currentMouseSpeed + instantSpeed, 1.8);

            lastMouseX = normX;
            lastMouseY = normY;
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length > 0) {
                const touch = e.touches[0];
                targetX = (touch.clientX / window.innerWidth) * 2 - 1;
                targetY = -(touch.clientY / window.innerHeight) * 2 + 1;
                currentMouseSpeed = 1.2;
            }
        }, { passive: true });

        // ------------------------------------------------------------------------
        // 10. RESPONSIVE RESIZE HANDLER
        // ------------------------------------------------------------------------
        const handleResize = () => {
            const w = container.clientWidth || window.innerWidth;
            const h = container.clientHeight || window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };

        window.addEventListener('resize', handleResize);

        // ------------------------------------------------------------------------
        // 11. ANIMATION RENDER LOOP DENGAN VISCOUS INTERPOLATION
        // ------------------------------------------------------------------------
        const clock = new THREE.Clock();
        let animationFrameId;
        let isTabActive = true;

        // Optimasi baterai & resource: jeda render saat tab browser tidak aktif
        document.addEventListener('visibilitychange', () => {
            isTabActive = !document.hidden;
            if (isTabActive) {
                clock.start();
                animate();
            } else {
                clock.stop();
                cancelAnimationFrame(animationFrameId);
            }
        });

        function animate() {
            if (!isTabActive) return;
            animationFrameId = requestAnimationFrame(animate);

            const elapsedTime = clock.getElapsedTime();
            uniforms.uTime.value = elapsedTime;

            // Interpolasi viskositas ultra-halus untuk redaman kursor
            mouseX += (targetX - mouseX) * 0.035;
            mouseY += (targetY - mouseY) * 0.035;
            uniforms.uMouse.value.set(mouseX, mouseY);

            currentMouseSpeed *= 0.94;
            uniforms.uMouseSpeed.value = currentMouseSpeed;

            // Efek paralaks kamera halus saat kursor bergerak
            camera.position.x = mouseX * 1.0;
            camera.position.y = -8.6 + mouseY * 0.5;
            camera.lookAt(0, 0, 0.4);

            renderer.render(scene, camera);
        }

        // Jalankan loop animasi
        animate();
    }

    // Jalankan saat dokumen selesai dimuat
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeroWave);
    } else {
        initHeroWave();
    }
})();
