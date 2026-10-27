// Þrívíddarfelga í kóða (engin módelskrá), byggð í þrepum að hætti img2threejs:
// grunnform (dekk, felga, diskur) → bygging (teinar, nöf, rær, bremsudæla) → efni → lýsing → hreyfing.
// Hjólið snýst um öxulinn en bremsudælan (eini appelsínuguli hluturinn) stendur kyrr, eins og í alvöru bíl.
import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  Shape,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const TAU = Math.PI * 2;

// Snið (radíus, ás) snúið um Y-ás og síðan lagt þannig að öxullinn verði Z-ás
function lathe(points: [number, number][], segments = 128) {
  const g = new LatheGeometry(points.map(([r, y]) => new Vector2(r, y)), segments);
  g.rotateX(Math.PI / 2);
  return g;
}

export type WheelScene = { start: () => void; stop: () => void; renderOnce: () => void; dispose: () => void };

export function createWheelScene(canvas: HTMLCanvasElement, { animate }: { animate: boolean }): WheelScene {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const camera = new PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0.2, 5.1);
  camera.lookAt(0, -0.05, 0);

  const disposables: { dispose: () => void }[] = [pmrem, envTex];
  const track = <T extends BufferGeometry | Material>(x: T) => (disposables.push(x), x);

  // ---- Efni ----
  const rubber = track(new MeshStandardMaterial({ color: 0x141416, roughness: 0.92, metalness: 0 }));
  const rubberTread = track(new MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.97, metalness: 0 }));
  const alloy = track(new MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.24, metalness: 1, envMapIntensity: 1.1 }));
  const alloyDark = track(new MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.38, metalness: 1 }));
  const steel = track(new MeshStandardMaterial({ color: 0x8d9097, roughness: 0.5, metalness: 1 }));
  const caliperMat = track(new MeshStandardMaterial({ color: 0xe0560f, roughness: 0.42, metalness: 0.15 }));
  const holeMat = track(new MeshStandardMaterial({ color: 0x050505, roughness: 1 }));

  const assembly = new Group(); // allt hjólið (hallar sér, snýst ekki um öxul)
  const spin = new Group(); // það sem snýst um öxulinn
  assembly.add(spin);
  scene.add(assembly);

  // ---- Dekk (grunnform): hliðar með bungu og flatur slitflötur ----
  const tire = new Mesh(
    track(
      lathe([
        [0.7, -0.27],
        [0.76, -0.305],
        [0.86, -0.315],
        [0.94, -0.3],
        [0.985, -0.26],
        [1.0, -0.2],
        [1.0, 0.2],
        [0.985, 0.26],
        [0.94, 0.3],
        [0.86, 0.315],
        [0.76, 0.305],
        [0.7, 0.27],
      ]),
    ),
    rubber,
  );
  spin.add(tire);

  // Mynsturkubbar á slitfleti: þrjár raðir, miðröðin hliðruð
  const blockGeo = track(new BoxGeometry(0.06, 0.016, 0.1));
  const rows = [-0.13, 0, 0.13];
  const perRow = 72;
  const blocks = new InstancedMesh(blockGeo, rubberTread, perRow * rows.length);
  const dummy = new Object3D();
  let i = 0;
  rows.forEach((z, r) => {
    for (let k = 0; k < perRow; k++) {
      const a = ((k + (r === 1 ? 0.5 : 0)) / perRow) * TAU;
      dummy.position.set(Math.cos(a) * 1.003, Math.sin(a) * 1.003, z);
      dummy.rotation.set(0, 0, a + Math.PI / 2);
      dummy.rotation.y = r === 1 ? 0 : r === 0 ? 0.5 : -0.5;
      dummy.updateMatrix();
      blocks.setMatrixAt(i++, dummy.matrix);
    }
  });
  spin.add(blocks);

  // ---- Felgubarki og brún ----
  const barrel = new Mesh(
    track(
      lathe([
        [0.7, -0.29],
        [0.715, -0.275],
        [0.7, -0.25],
        [0.62, -0.2],
        [0.6, -0.05],
        [0.6, 0.16],
        [0.64, 0.22],
        [0.705, 0.255],
        [0.72, 0.285],
        [0.705, 0.3],
        [0.66, 0.29],
      ]),
    ),
    alloy,
  );
  spin.add(barrel);

  // ---- Teinar (bygging): tvöföld fimm teina felga, hver teinn mjókkar inn að nöf og sveigist fram ----
  const spokeShape = new Shape();
  spokeShape.moveTo(-0.03, 0.18);
  spokeShape.lineTo(0.03, 0.18);
  spokeShape.quadraticCurveTo(0.036, 0.44, 0.046, 0.64);
  spokeShape.lineTo(-0.046, 0.64);
  spokeShape.quadraticCurveTo(-0.036, 0.44, -0.03, 0.18);
  const spokeGeo = track(
    new ExtrudeGeometry(spokeShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.008, bevelSegments: 3, curveSegments: 12 }),
  );
  for (let k = 0; k < 5; k++) {
    for (const off of [-0.11, 0.11]) {
      const pivot = new Group();
      pivot.rotation.z = (k / 5) * TAU + off;
      const spoke = new Mesh(spokeGeo, alloy);
      spoke.position.z = 0.11;
      spoke.rotation.x = 0.21; // ytri endinn kemur fram að brúninni, nöfin liggur dýpra: íhvolf felga
      pivot.add(spoke);
      spin.add(pivot);
    }
  }

  // ---- Nöf, miðhetta og rær ----
  const hub = new Mesh(track(new CylinderGeometry(0.2, 0.22, 0.12, 48)), alloy);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.14;
  spin.add(hub);
  const cap = new Mesh(track(new CylinderGeometry(0.085, 0.09, 0.05, 48)), alloyDark);
  cap.rotation.x = Math.PI / 2;
  cap.position.z = 0.215;
  spin.add(cap);
  const emblem = new Mesh(track(new CylinderGeometry(0.045, 0.045, 0.012, 6)), alloy); // sexkantur úr merki Partar
  emblem.rotation.x = Math.PI / 2;
  emblem.position.z = 0.244;
  spin.add(emblem);
  const nutGeo = track(new CylinderGeometry(0.024, 0.024, 0.05, 6));
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU + TAU / 10;
    const nut = new Mesh(nutGeo, steel);
    nut.rotation.x = Math.PI / 2;
    nut.position.set(Math.cos(a) * 0.14, Math.sin(a) * 0.14, 0.215);
    spin.add(nut);
  }

  // ---- Bremsudiskur með götum (snýst með hjólinu) ----
  const disc = new Mesh(track(new CylinderGeometry(0.5, 0.5, 0.045, 96)), steel);
  disc.rotation.x = Math.PI / 2;
  disc.position.z = -0.1;
  spin.add(disc);
  const holeGeo = track(new CylinderGeometry(0.014, 0.014, 0.05, 12));
  const holes = new InstancedMesh(holeGeo, holeMat, 36);
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * TAU;
    const r = k % 2 ? 0.37 : 0.43;
    dummy.position.set(Math.cos(a) * r, Math.sin(a) * r, -0.075);
    dummy.rotation.set(Math.PI / 2, 0, 0);
    dummy.updateMatrix();
    holes.setMatrixAt(k, dummy.matrix);
  }
  spin.add(holes);

  // ---- Bremsudæla (kyrr, appelsínugul) ----
  const cal = new Shape();
  const a0 = TAU * 0.07;
  const a1 = TAU * 0.2;
  cal.absarc(0, 0, 0.56, a0, a1, false);
  cal.absarc(0, 0, 0.36, a1, a0, true);
  const caliper = new Mesh(
    track(new ExtrudeGeometry(cal, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 4, curveSegments: 32 })),
    caliperMat,
  );
  caliper.position.z = -0.11;
  assembly.add(caliper);

  // ---- Snertiskuggi undir dekkinu ----
  const sc = document.createElement("canvas");
  sc.width = sc.height = 128;
  const ctx = sc.getContext("2d")!;
  const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(0,0,0,0.75)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const shadowTex = new CanvasTexture(sc);
  disposables.push(shadowTex);
  const shadow = new Mesh(
    track(new PlaneGeometry(2.6, 0.9)),
    track(new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.02;
  scene.add(shadow);

  // ---- Lýsing: hlýtt aðalljós uppi til vinstri, kalt brúnaljós að aftan ----
  scene.add(new AmbientLight(0xffffff, 0.15));
  const key = new DirectionalLight(0xfff1e6, 2.2);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rim = new DirectionalLight(0xbfd2ff, 1.4);
  rim.position.set(4, 2, -4);
  scene.add(rim);

  // Þriggja fjórðu sjónarhorn
  assembly.rotation.set(0.04, -0.55, 0);

  // ---- Stærð og hreyfing ----
  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(() => {
    resize();
    if (!running) renderer.render(scene, camera);
  });
  ro.observe(canvas);
  resize();

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e: PointerEvent) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  if (animate) window.addEventListener("pointermove", onMove, { passive: true });

  let running = false;
  let raf = 0;
  let last = 0;
  function frame(t: number) {
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    spin.rotation.z -= dt * 0.45;
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    assembly.rotation.y = -0.55 + pointer.x * 0.18 + Math.sin(t / 4000) * 0.05;
    assembly.rotation.x = 0.04 + pointer.y * 0.08;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running || !animate) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    renderOnce() {
      renderer.render(scene, camera);
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      blocks.dispose();
      holes.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
