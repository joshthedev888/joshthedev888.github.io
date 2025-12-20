import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

const defaultWorlds = [
    { id: 1, name: "WORLD 1", fog: 0x050510, plate: 0x333344, title: "Beginner", color: 0x00ffff },
    { id: 2, name: "WORLD 2", fog: 0x220000, plate: 0x552200, title: "World 2 Survivor", color: 0xff4400 },
    { id: 3, name: "WORLD 3", fog: 0x001100, plate: 0x004411, title: "World 3 Survivor", color: 0x00ff44 },
    { id: 4, name: "WORLD 4", fog: 0x112222, plate: 0x224466, title: "World 4 Survivor", color: 0x0088ff },
    { id: 5, name: "WORLD 5", fog: 0x110011, plate: 0x440044, title: "World 5 Survivor", color: 0xff00ff },
];

const defaultWorld = { name: "Unnamed World", fog: 0x000, plate: 0x444, title: "New World", color: 0xfff };
const defaultPlatformOptions = { width: 7, depth: 7, x: 0, y: 0, z: 0, color: 0x444444 };
const camDefaults = { fov: 75, near: 0.1, far: 1000, pos: { x: 0, y: 5, z: 10 } };
const rendDefaults = { antialias: true, alpha: false, shadowMap: false };

class JoshGameEngine {
    constructor(config = {}) {
        this.worlds = [...defaultWorlds, ...(config.worlds || [])];
        this.debugMode = config.debugMode || false;
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        this.keys = {};
        this.mouse = { yaw: 0, pitch: 0 };

        this._injectEngineStyles();
    }

    init(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) throw new Error(`JoshGameEngine Error: #${containerId} not found.`);

        this.scene = new THREE.Scene();

        const camSettings = { ...camDefaults, ...options.camera };
        this.camera = new THREE.PerspectiveCamera(camSettings.fov, window.innerWidth / window.innerHeight, camSettings.near, camSettings.far);
        this.camera.position.set(camSettings.pos.x, camSettings.pos.y, camSettings.pos.z);

        const rendSettings = { ...rendDefaults, ...options.renderer };
        this.renderer = new THREE.WebGLRenderer(rendSettings);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        if (rendSettings.shadowMap) this.renderer.shadowMap.enabled = true;
        
        container.appendChild(this.renderer.domElement);

        if (options.light !== false) {
            const intensity = options.light?.intensity || 0.8;
            const color = options.light?.color || 0xffffff;
            this.scene.add(new THREE.AmbientLight(color, intensity));
        }

        this._setupInputListeners();
        window.addEventListener('resize', () => this.onWindowResize());
        
        if (this.debugMode) console.log("JoshGameEngine: Engine initialized.");
    }

    _setupInputListeners() {
        window.onkeydown = (e) => this.keys[e.code] = true;
        window.onkeyup = (e) => this.keys[e.code] = false;

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                this.mouse.yaw -= e.movementX * 0.003;
                this.mouse.pitch = Math.max(-1.5, Math.min(1.5, this.mouse.pitch - e.movementY * 0.003));
            }
        });

        document.addEventListener('click', () => {
            if (this.renderer) document.body.requestPointerLock();
        });
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    start(updateCallback) {
        if (!this.renderer) {
            console.error("JoshGameEngine: Cannot start: Run init() first.");
            return;
        }
        if (this.debugMode) console.log("JoshGameEngine: Animation loop started.");
        
        const animate = () => {
            requestAnimationFrame(animate);
            if (updateCallback) updateCallback();
            this.renderer.render(this.scene, this.camera);
        };
        animate();
    }

    addWorld(world) {
        if (!world || world.id === undefined) throw new Error('JoshGameEngine Error: World needs a unique "id"');
        const isDuplicate = this.worlds.some(w => w.id === world.id);
        if (!isDuplicate) {
            this.worlds.push({ ...defaultWorld, ...world });
            if (this.debugMode) console.log(`JoshGameEngine: World ${world.id} added.`);
        }
    }

    getWorld(id) {
        const found = this.worlds.find(w => w.id === id);
        if (!found && this.debugMode) console.warn(`JoshGameEngine: World ID ${id} not found. Defaulting to World ID 1`);
        return found || this.worlds[0];
    }

    setWorld(id) {
        const world = this.getWorld(id);
        if (this.scene) {
            this.scene.background = new THREE.Color(world.fog);
            if (!this.scene.fog) {
                this.scene.fog = new THREE.Fog(world.fog, 15, 100);
            } else {
                this.scene.fog.color.set(world.fog);
            }
        }
        if (this.debugMode) console.log(`JoshGameEngine: Set to World: ${world.name}`);
        return world;
    }

    createPlatform(options = {}) {
        const settings = { ...defaultPlatformOptions, ...options };
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(settings.width, 1, settings.depth), 
            new THREE.MeshStandardMaterial({ color: settings.color })
        );
        mesh.position.set(settings.x, settings.y, settings.z);
        this.scene.add(mesh);
        if (this.debugMode) console.log(`JoshGameEngine: Platform created at Z: ${settings.z}, X: ${settings.x}, Y: ${settings.y}`);
        return mesh;
    }

    createPlayer(options = {}) {
        const p = new THREE.Group();
        const shirt = new THREE.MeshPhongMaterial({ color: options.shirt || 0x00d4ff });
        const pants = new THREE.MeshPhongMaterial({ color: options.pants || 0x0055ff });
        const skin = new THREE.MeshPhongMaterial({ color: options.skinColor || 0xffdbac });

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skin);
        head.position.y = 1.9;
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), shirt);
        torso.position.y = 1.2;

        const limbGeo = new THREE.BoxGeometry(0.3, 0.7, 0.3);
        const armL = new THREE.Mesh(limbGeo, shirt); armL.position.set(-0.5, 1.2, 0);
        const armR = new THREE.Mesh(limbGeo, shirt); armR.position.set(0.5, 1.2, 0);
        const legL = new THREE.Mesh(limbGeo, pants); legL.position.set(-0.2, 0.4, 0);
        const legR = new THREE.Mesh(limbGeo, pants); legR.position.set(0.2, 0.4, 0);

        p.add(head, torso, armL, armR, legL, legR); 
        this.scene.add(p);
        
        if (this.debugMode) console.log("JoshGameEngine: Player spawned.");
        return { mesh: p, armL, armR, legL, legR, torso, head, shirt, pants }; 
    }

    updateThirdPersonCamera(targetMesh, distance = 7, heightOffset = 1.5) {
        if (!targetMesh) return;

        this.camera.position.set(
            targetMesh.position.x + Math.sin(this.mouse.yaw) * Math.cos(this.mouse.pitch) * distance,
            targetMesh.position.y + Math.sin(this.mouse.pitch) * distance + 4,
            targetMesh.position.z + Math.cos(this.mouse.yaw) * Math.cos(this.mouse.pitch) * distance
        );

        this.camera.lookAt(targetMesh.position.x, targetMesh.position.y + heightOffset, targetMesh.position.z);
        
        targetMesh.rotation.y = this.mouse.yaw + Math.PI;
    }

    _injectEngineStyles() {
        if (document.getElementById('jge-styles')) return;
        const style = document.createElement('style');
        style.id = 'jge-styles';
        style.innerHTML = `
            #jge-splash-screen {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: #000; display: flex; align-items: center; justify-content: center;
                z-index: 10000; color: white; font-family: 'Segoe UI', sans-serif;
                transition: opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1);
            }
            @keyframes jge-logo-pulse {
                0% { filter: drop-shadow(0 0 5px #00d4ff); transform: scale(1); }
                50% { filter: drop-shadow(0 0 20px #00d4ff); transform: scale(1.05); }
                100% { filter: drop-shadow(0 0 5px #00d4ff); transform: scale(1); }
            }
            @keyframes jge-scan {
                0% { top: -100%; }
                100% { top: 200%; }
            }
            .jge-logo-svg {
                width: 400px; height: 200px; margin-bottom: 20px;
                animation: jge-logo-pulse 3s infinite ease-in-out;
            }
            .jge-content-box {
                position: relative; overflow: hidden; padding: 40px;
                animation: jge-unity-entry 2.5s ease-out forwards;
            }
            @keyframes jge-unity-entry {
                0% { opacity: 0; transform: translateY(20px); filter: blur(10px); }
                100% { opacity: 1; transform: translateY(0); filter: blur(0px); }
            }
        `;
        document.head.appendChild(style);
    }

    async showSplash(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'none';
            container.style.opacity = '0';
        }

        return new Promise((resolve) => {
            const splash = document.createElement('div');
            splash.id = "jge-splash-screen";
            
            const logoSvg = `
                <svg class="jge-logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M30 20H70V35H55V70C55 78.2843 48.2843 85 40 85C31.7157 85 25 78.2843 25 70V60H40V70C40 70 40 70 40 70C40 70 40 70 40 70H40V20Z" fill="#00d4ff"/>
                    <rect x="75" y="20" width="5" height="65" fill="#00d4ff" fill-opacity="0.3"/>
                </svg>
            `;

            splash.innerHTML = `
                <div class="jge-content-box">
                    <div style="position: absolute; left: 0; width: 100%; height: 2px; background: rgba(0,212,255,0.5); animation: jge-scan 2.5s infinite linear; box-shadow: 0 0 15px #00d4ff;"></div>
                    ${logoSvg}
                    <div style="font-size: 10px; letter-spacing: 6px; color: #555; margin-bottom: 8px; font-weight: 400;">Game Engine made by &copy; 2025 Josh Sharma (VERSION 0.1.1)</div>
                    <div style="font-size: 32px; font-weight: 900; letter-spacing: 8px; text-transform: uppercase;">
                        JOSH<span style="color: #00d4ff;">GAME</span>
                    </div>
                    <div style="font-size: 12px; letter-spacing: 12px; color: #00d4ff; margin-left: 8px; opacity: 0.8;">ENGINE</div>
                </div>
            `;
            document.body.appendChild(splash);

            setTimeout(() => {
                splash.style.opacity = '0';
                
                if (container) {
                    container.style.display = 'block';
                    container.style.transition = 'opacity 2s ease-in';
                    setTimeout(() => container.style.opacity = '1', 100);
                }

                setTimeout(() => {
                    splash.remove();
                    resolve();
                }, 1500);
            }, 4000);
        });
    }
}

export { JoshGameEngine, THREE };