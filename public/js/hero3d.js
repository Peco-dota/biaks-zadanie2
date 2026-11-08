import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

const canvas = document.getElementById('hero-canvas');
const heroSection = document.getElementById('hero');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 8);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(3, 5, 5);
scene.add(dirLight);

const metal = new THREE.MeshStandardMaterial({ color: 0x8892a6, metalness: 0.7, roughness: 0.35 });
const joint = new THREE.MeshStandardMaterial({ color: 0x4fa8ff, metalness: 0.4, roughness: 0.4 });

const hand = new THREE.Group();
scene.add(hand);
hand.add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 0.6), metal));

function buildDigit(baseX, baseY, segmentCount, segmentLength, rotationZ = 0) {
  const group = new THREE.Group();
  group.position.set(baseX, baseY, 0);
  group.rotation.z = rotationZ;
  const segments = [];
  let cursor = 0;
  for (let i = 0; i < segmentCount; i++) {
    const segGroup = new THREE.Group();
    segGroup.position.y = cursor;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, segmentLength, 0.35), i % 2 === 0 ? metal : joint);
    mesh.position.y = segmentLength / 2;
    segGroup.add(mesh);
    group.add(segGroup);
    segments.push(segGroup);
    cursor += segmentLength;
  }
  hand.add(group);
  return { group, segments, baseX };
}

const fingers = [
  buildDigit(-1.0, 1.4, 3, 0.7),
  buildDigit(-0.4, 1.4, 3, 0.9),
  buildDigit(0.2, 1.4, 3, 0.95),
  buildDigit(0.8, 1.4, 3, 0.85),
  buildDigit(-1.5, -0.4, 2, 0.65, Math.PI / 4),
];

function getScrollProgress() {
  const heroHeight = heroSection.offsetHeight;
  const scrollable = Math.max(1, heroHeight - window.innerHeight);
  return Math.min(1, Math.max(0, window.scrollY / scrollable));
}

function render() {
  const progress = getScrollProgress();

  hand.rotation.y = progress * Math.PI * 1.2;
  hand.rotation.x = progress * 0.3;

  fingers.forEach((finger, idx) => {
    const spread = progress * (1.2 + idx * 0.3);
    const direction = finger.baseX < 0 ? -1 : 1;
    finger.group.position.x = finger.baseX + direction * spread * 0.6;
    finger.segments.forEach((seg, segIdx) => {
      seg.rotation.z = progress * (segIdx + 1) * 0.5 * (idx % 2 === 0 ? 1 : -1);
      seg.position.z = progress * segIdx * 0.8;
    });
  });

  const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
  const fade = Math.min(1, Math.max(0, (window.scrollY + window.innerHeight - heroBottom) / 300));
  canvas.style.opacity = String(1 - fade);

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

render();
