/**
 * ============================================================================
 * 3D LIQUID CHROME WAVE & LUMINOUS GRID — HERO SECTION VISUAL EXPERIENCE
 * ============================================================================
 * 
 * Portfolio of Sayyid Abdullah Azzam (WAGONEPC)
 * Built with Three.js (r128).
 * 
 * Aesthetic Architecture:
 *  - Top-down angled isometric camera perspective overlooking expansive terrain
 *  - Ultra-wide ground geometry (280 x 180 units) eliminating side voids on any display
 *  - Three-layer architectural depth:
 *      1. Luminous particle nodes (THREE.Points with circular radial-gradient glow)
 *      2. Semi-transparent metallic chrome wireframe grid (THREE.Mesh)
 *      3. Dark under-sheet mesh for occlusion and high-contrast deep black depth
 *  - Triple harmonic harmonic wave superposition (calm, sparse swells)
 *  - Mathematical plane raycasting for accurate mouse/touch fluid ripple physics
 *  - Cinematic camera yaw tilt and visibility-aware animation loop
 * ============================================================================
 */

(function () {
    'use strict';

    function initLiquidChromeWave() {
        const canvas = document.getElementById('liquid-chrome-canvas');
        const container = document.getElementById('hero-canvas-container');
        const heroSection = document.getElementById('hero-section') || container;

        if (!container || typeof THREE === 'undefined') {
            console.warn('[Three.js Wave] Canvas container atau library THREE tidak ditemukan.');
            return;
        }

        // ------------------------------------------------------------------------
        // 1. WEBGL RENDERER SETUP
        // ------------------------------------------------------------------------
        const rendererOptions = {
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        };

        if (canvas) {
            rendererOptions.canvas = canvas;
        }

        let renderer;
        try {
            renderer = new THREE.WebGLRenderer(rendererOptions);
        } catch (e) {
            console.error('[Three.js Wave] WebGL tidak didukung:', e);
            return;
        }

        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x050505, 1.0);

        if (!canvas) {
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
        // 2. SCENE, FOG & PERSPECTIVE CAMERA (TOP-DOWN ISOMETRIC VIEW)
        // ------------------------------------------------------------------------
        const scene = new THREE.Scene();
        // Fog halus yang memudarkan horizon belakang ke hitam pekat (#050505)
        scene.fog = new THREE.FogExp2(0x050505, 0.012);

        // Sudut pandang kamera isometrik dari atas menghadap ke hamparan gelombang
        const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
        camera.position.set(0, 32, 54);
        camera.lookAt(0, -2, -6);

        // ------------------------------------------------------------------------
        // 3. ULTRA-WIDE GEOMETRI BIDANG (HORIZONTAL & VERTICAL EXPANSIVE TOPOLOGY)
        // ------------------------------------------------------------------------
        // Lebar 280 x Kedalaman 180: menjangkau penuh tepi kiri dan kanan bahkan pada
        // layar ultrawide 21:9 atau resolusi besar, menghilangkan ruang kosong di samping.
        const planeWidth = 280;
        const planeDepth = 180;
        const segmentsX = 110;
        const segmentsY = 85;

        const geometry = new THREE.PlaneGeometry(planeWidth, planeDepth, segmentsX, segmentsY);
        // Putar bidang mendatar sejajar bidang lantai XZ
        geometry.rotateX(-Math.PI / 2);

        // Simpan posisi dasar asli setiap verteks
        const posAttr = geometry.attributes.position;
        const vertexCount = posAttr.count;
        const basePositions = new Float32Array(vertexCount * 3);
        for (let i = 0; i < vertexCount * 3; i++) {
            basePositions[i] = posAttr.array[i];
        }

        // ------------------------------------------------------------------------
        // 4. LAYER 1: CHROME WIREFRAME GRID
        // ------------------------------------------------------------------------
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0xd8dde3,
            wireframe: true,
            transparent: true,
            opacity: 0.38,
            depthWrite: false
        });
        const waveMesh = new THREE.Mesh(geometry, wireframeMaterial);
        scene.add(waveMesh);

        // ------------------------------------------------------------------------
        // 5. LAYER 2: GLOWING PARTICLES INTERSECTION NODES (WHITE RADIAL DOTS)
        // ------------------------------------------------------------------------
        // Pembuatan tekstur partikel bulat anti-aliased secara prosedural
        const createDotTexture = () => {
            const size = 64;
            const cvs = document.createElement('canvas');
            cvs.width = size;
            cvs.height = size;
            const ctx = cvs.getContext('2d');
            const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(0.3, 'rgba(235, 245, 255, 0.85)');
            grad.addColorStop(0.7, 'rgba(180, 200, 225, 0.25)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, size, size);
            return new THREE.CanvasTexture(cvs);
        };

        const pointsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1.6,
            map: createDotTexture(),
            transparent: true,
            opacity: 0.88,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const pointsMesh = new THREE.Points(geometry, pointsMaterial);
        scene.add(pointsMesh);

        // ------------------------------------------------------------------------
        // 6. LAYER 3: DARK UNDER-SHEET FOR DEPTH & OCCLUSION
        // ------------------------------------------------------------------------
        const darkMaterial = new THREE.MeshBasicMaterial({
            color: 0x050505,
            transparent: true,
            opacity: 0.82,
            depthWrite: true
        });
        const darkMesh = new THREE.Mesh(geometry, darkMaterial);
        darkMesh.position.y = -0.15;
        scene.add(darkMesh);

        // ------------------------------------------------------------------------
        // 7. INTERAKSI MOUSE & SENTUHAN (RAYCASTING PADA BIDANG MATEMATIS Y = 0)
        // ------------------------------------------------------------------------
        const raycaster = new THREE.Raycaster();
        const mouseNorm = new THREE.Vector2(-10, -10);
        const targetRippleCenter = new THREE.Vector2(0, 0);
        const currentRippleCenter = new THREE.Vector2(0, 0);
        let rippleStrength = 0.0;
        let targetStrength = 0.0;
        let mouseHovering = false;

        const mathPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectionPoint = new THREE.Vector3();

        const handlePointerMove = (e) => {
            const rect = heroSection.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                mouseHovering = true;
                mouseNorm.x = (x / rect.width) * 2 - 1;
                mouseNorm.y = -(y / rect.height) * 2 + 1;
                raycaster.setFromCamera(mouseNorm, camera);
                if (raycaster.ray.intersectPlane(mathPlane, intersectionPoint)) {
                    targetRippleCenter.x = intersectionPoint.x;
                    targetRippleCenter.y = intersectionPoint.z;
                    targetStrength = 3.6;
                }
            } else {
                mouseHovering = false;
                targetStrength = 0.0;
            }
        };

        window.addEventListener('mousemove', handlePointerMove, { passive: true });
        window.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length > 0) {
                handlePointerMove(e.touches[0]);
            }
        }, { passive: true });

        // ------------------------------------------------------------------------
        // 8. RENDER LOOP DENGAN FISIKA GELOMBANG HARMONIK & VISCOUS DAMPING
        // ------------------------------------------------------------------------
        const clock = new THREE.Clock();
        let animationFrameId;
        let isTabActive = true;

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
            // Kecepatan waktu lambat dan tenang (calm pacing)
            const t = elapsedTime * 0.42;

            // Redaman viskositas pergerakan kursor
            currentRippleCenter.x += (targetRippleCenter.x - currentRippleCenter.x) * 0.07;
            currentRippleCenter.y += (targetRippleCenter.y - currentRippleCenter.y) * 0.07;
            rippleStrength += (targetStrength - rippleStrength) * 0.05;
            if (!mouseHovering) {
                targetStrength *= 0.94;
            }

            const positions = geometry.attributes.position.array;

            for (let i = 0; i < vertexCount; i++) {
                const i3 = i * 3;
                const x = basePositions[i3];     // Koordinat X
                const z = basePositions[i3 + 2]; // Koordinat Z

                // Superposisi gelombang harmonik berfrekuensi rendah & luas (sparse swells)
                const wave1 = Math.sin(x * 0.035 + t * 0.85 + z * 0.018) * 4.4;
                const wave2 = Math.cos(z * 0.04 - t * 0.6 + x * 0.025) * 3.5;
                const wave3 = Math.sin((x + z) * 0.02 + t * 0.4) * 2.3;

                let totalHeight = wave1 + wave2 + wave3;

                // Riak air interaktif di sekitar kursor
                const dx = x - currentRippleCenter.x;
                const dz = z - currentRippleCenter.y;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist < 58.0 && rippleStrength > 0.01) {
                    const falloff = Math.exp(-dist * 0.06);
                    const rippleWave = Math.sin(dist * 0.28 - elapsedTime * 3.2) * (rippleStrength * 1.5) * falloff;
                    totalHeight += rippleWave;
                }

                positions[i3 + 1] = totalHeight;
            }

            geometry.attributes.position.needsUpdate = true;

            // Efek paralaks yaw kamera lembut untuk kedalaman visual sinematik
            camera.position.x = Math.sin(t * 0.25) * 4.0;
            camera.lookAt(0, -2, -6);

            renderer.render(scene, camera);
        }

        animate();

        // ------------------------------------------------------------------------
        // 9. RESPONSIVE RESIZE LISTENER
        // ------------------------------------------------------------------------
        const handleResize = () => {
            if (!container || !renderer || !camera) return;
            const w = container.clientWidth || window.innerWidth;
            const h = container.clientHeight || window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };

        window.addEventListener('resize', handleResize);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLiquidChromeWave);
    } else {
        initLiquidChromeWave();
    }
})();
