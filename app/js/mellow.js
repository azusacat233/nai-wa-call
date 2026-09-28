// Custom model based on the user's yellow pear-shaped character reference.
// Retains the original soldier rig contract, weapon sockets and animation pivots.
import * as THREE from 'three';
import { buildGun } from './gunmodel.js';
import { MELLOW_SKIN, MELLOW_HAND } from './mellow-materials.js';
import { addTacticalKit } from './tactical-kit.js';

const sphere = new THREE.SphereGeometry(1, 20, 14);
const eyeSphere = new THREE.SphereGeometry(1, 16, 12);
const up = new THREE.Vector3(0, 1, 0);

function material(color, roughness = 0.78) { return new THREE.MeshStandardMaterial({ color, roughness }); }
function ball(parent, xyz, size, mat, geometry = sphere) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(...xyz); mesh.scale.set(...size); parent.add(mesh); return mesh;
}
function limb(parent, a, b, r, mat) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
  const mesh = ball(parent, start.clone().add(end).multiplyScalar(0.5).toArray(), [r, delta.length() / 2 + r * 0.4, r], mat);
  mesh.quaternion.setFromUnitVectors(up, delta.normalize()); return mesh;
}
const profile = [
  new THREE.Vector2(0, -0.43), new THREE.Vector2(0.29, -0.40), new THREE.Vector2(0.41, -0.29),
  new THREE.Vector2(0.46, -0.12), new THREE.Vector2(0.435, 0.12), new THREE.Vector2(0.35, 0.34),
  new THREE.Vector2(0.245, 0.55), new THREE.Vector2(0.205, 0.66)
];
const curve = new THREE.SplineCurve(profile);
const bodyGeometry = new THREE.LatheGeometry(curve.getPoints(38), 36);
bodyGeometry.scale(1, 1, 0.74);

export function buildMellow(styleName, weaponId, attachments, camo) {
  // Per-character palettes allow thermal vision to restore emissive values independently.
  const skin = MELLOW_SKIN.clone(), hand = MELLOW_HAND.clone();
  const cream = material(0xe8d6a3), green = material(0x68864a), pupil = material(0x152920, 0.25), shine = material(0xf6f0d6, 0.25);
  const ally = ['ally', 'snowA'].includes(styleName);
  const band = material(styleName === 'hvt' ? 0xcc456c : ally ? 0x3dc3cf : 0xe65b42);
  const root = new THREE.Group(); root.name = 'MellowCharacter'; root.userData.character = 'mellow';
  const hips = new THREE.Group(); hips.position.y = 0.95; root.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  const parts = { root, hips, torso };
  const body = new THREE.Mesh(bodyGeometry, skin); body.name = 'PearBody'; torso.add(body);
  ball(torso, [0, 0, -0.235], [0.335, 0.36, 0.14], cream).name = 'CreamBelly';
  const neck = new THREE.Group(); neck.position.y = 0.59; torso.add(neck); parts.neck = neck;
  parts.head = ball(neck, [0, 0.085, 0], [0.234, 0.24, 0.205], skin); parts.head.name = 'Head';
  for (const side of [-1, 1]) {
    ball(neck, [side * 0.131, 0.15, -0.17], [0.059, 0.064, 0.032], skin, eyeSphere);
    ball(neck, [side * 0.131, 0.151, -0.196], [0.047, 0.054, 0.011], green, eyeSphere);
    ball(neck, [side * 0.126, 0.15, -0.205], [0.027, 0.033, 0.006], pupil, eyeSphere);
    ball(neck, [side * 0.126 - 0.009, 0.168, -0.21], [0.006, 0.007, 0.003], shine, eyeSphere);
  }
  const smile = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.105, 0.045, -0.192), new THREE.Vector3(0, 0.023, -0.207), new THREE.Vector3(0.105, 0.045, -0.192)]);
  neck.add(new THREE.Mesh(new THREE.TubeGeometry(smile, 16, 0.0045, 5, false), hand));
  const makeLeg = side => {
    const leg = new THREE.Group(); leg.position.set(side * 0.24, -0.28, 0); hips.add(leg);
    limb(leg, [0, 0, 0], [side * 0.065, -0.29, -0.015], 0.12, skin);
    const knee = new THREE.Group(); knee.position.set(side * 0.065, -0.31, -0.015); leg.add(knee);
    limb(knee, [0, 0, 0], [side * -0.02, -0.26, -0.065], 0.07, skin);
    ball(knee, [side * -0.02, -0.29, -0.13], [0.126, 0.05, 0.18], hand);
    for (let i = 0; i < 3; i++) ball(knee, [(i - 1) * 0.058 - side * 0.02, -0.305, -0.26], [0.035, 0.032, 0.071], hand, eyeSphere);
    return { leg, knee };
  };
  parts.legL = makeLeg(-1); parts.legR = makeLeg(1);
  const gunInfo = buildGun(weaponId, attachments, camo, { low: true });
  const gun = gunInfo.group; gun.position.set(0.1, 0.24, -0.42); torso.add(gun);
  parts.gun = gun; parts.muzzle = gunInfo.muzzle;
  const grip = gun.position.clone().add(new THREE.Vector3(0, -0.035, 0.04));
  const fore = gun.position.clone().add(gunInfo.leftHand);
  for (const side of [-1, 1]) {
    const shoulder = [side * 0.35, 0.31, 0.015], elbow = [side * 0.48, 0.02, -0.06];
    const palm = side === 1 ? grip : fore;
    limb(torso, shoulder, elbow, 0.105, skin);
    limb(torso, elbow, palm.toArray(), 0.084, skin);
    ball(torso, palm.toArray(), [0.075, 0.065, 0.075], hand);
    for (let i = 0; i < 3; i++) ball(torso, [palm.x + (i-1)*0.035, palm.y-0.01, palm.z-0.058], [0.022,0.045,0.035],hand,eyeSphere);
    ball(torso, [side*0.4,0.23,0.005], [0.112,0.055,0.11],band).name='TeamArmband';
  }
  addTacticalKit(torso,neck,band);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({color:0xffc070,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));
  flash.scale.setScalar(0.45); flash.visible=false; gunInfo.muzzle.add(flash); parts.flash=flash;
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  return parts;
}
