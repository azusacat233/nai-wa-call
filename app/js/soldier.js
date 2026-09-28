// 士兵模型与动画
import * as THREE from 'three';
import { mat } from './materials.js';
import { buildGun } from './gunmodel.js';
import { textTexture } from './textures.js';
import { buildMellow } from './mellow.js';

export const STYLES = {
  ally: { fab: 'fab_ally', vest: 0x5e5440, helmet: 0x5a513d, head: 'helmet', nvg: true, face: 'skin' },
  enemy: { fab: 'fab_enemy', vest: 0x262626, helmet: 0x1e1e1e, head: 'helmet', face: 'balaclava' },
  insurgent: { fab: 'fab_snowB', vest: 0x4a4032, helmet: 0x8a7560, head: 'shemagh', face: 'skinDark' },
  snowA: { fab: 'fab_snowA', vest: 0xc9ced3, helmet: 0xd5d9de, head: 'helmet', nvg: true, face: 'skin' },
  snowB: { fab: 'fab_snowB', vest: 0x3a3a30, helmet: 0x2d2d26, head: 'beanie', face: 'balaclava' },
  urbanB: { fab: 'fab_urbanB', vest: 0x2a1a1a, helmet: 0x201515, head: 'helmet', face: 'balaclava' },
  hvt: { fab: 'fab_enemy', vest: 0x3a2e22, helmet: 0x7a1e1e, head: 'beret', face: 'skinDark' },
};

const vestMats = {};
function vestMat(c) {
  if (!vestMats[c]) vestMats[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
  return vestMats[c];
}

function capsule(r, len, m) {
  const g = new THREE.CapsuleGeometry(r, len, 4, 10);
  return new THREE.Mesh(g, m);
}

export function createSoldierModel(styleName, weaponId, attachments = {}, camo = 'none') {
  return buildMellow(styleName, weaponId, attachments, camo);
}

export function setFlashTexture(t) { flashTex = t; }
let flashTex = null;
export function applyFlashTex(parts) { if (flashTex) { parts.flash.material.map = flashTex; parts.flash.material.needsUpdate = true; } }

export function makeNameTag(text, color) {
  const t = textTexture(text, { color, size: 54, w: 256, h: 64 });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(1.2, 0.3, 1); s.position.y = 2.15; s.renderOrder = 10;
  return s;
}

// 动画状态机
export function animateSoldier(p, s, dt) {
  // s: {speed, phase, crouch(0..1), pitch, dead, deadT, recoil}
  if (s.dead) {
    const k = Math.min(1, s.deadT / 0.55);
    const e = 1 - Math.pow(1 - k, 3);
    p.root.rotation.x = e * (Math.PI / 2) * s.fallDir;
    p.root.rotation.z = e * s.fallRoll;
    p.hips.position.y = 0.95 - e * 0.75;
    p.legL.leg.rotation.x = e * 0.3; p.legR.leg.rotation.x = -e * 0.2;
    p.torso.rotation.x = 0;
    return;
  }
  const c = s.crouch;
  const moving = s.speed > 0.3;
  const sw = moving ? Math.sin(s.phase) : 0;
  const amp = Math.min(1, s.speed / 5) * (1 - c * 0.5);
  const baseThigh = c * 1.25, baseKnee = -c * 1.7;
  p.legL.leg.rotation.x = baseThigh + sw * 0.55 * amp;
  p.legR.leg.rotation.x = baseThigh - sw * 0.55 * amp;
  p.legL.knee.rotation.x = baseKnee - Math.max(0, -Math.cos(s.phase)) * 0.9 * amp;
  p.legR.knee.rotation.x = baseKnee - Math.max(0, Math.cos(s.phase)) * 0.9 * amp;
  p.hips.position.y = 0.95 - c * 0.36 + (moving ? Math.abs(Math.cos(s.phase)) * 0.04 * amp : 0);
  p.torso.rotation.x = s.pitch * 0.8 - c * 0.1 + (s.recoil || 0) * 0.12;
  p.torso.rotation.y = moving ? sw * 0.06 : 0;
  p.neck.rotation.x = s.pitch * 0.2;
}
