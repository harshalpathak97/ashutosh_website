'use client'

import { useRef, useEffect, useLayoutEffect, useMemo, useState, memo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text, Billboard, RoundedBox, Environment, Lightformer, Sparkles, useTexture } from '@react-three/drei'
import { EffectComposer, Bloom, SMAA, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Zone } from '../GamePortfolio'
import { WORK } from '../content'

export interface TouchInput { x: number; y: number }

interface Props {
  onZoneChange: (zone: Zone) => void
  onCoinCollect: (total: number) => void
  onScooterToggle: (isOn: boolean) => void
  onFirstMove: () => void
  onRingCollect: (total: number) => void
  onBoostActivate: () => void
  touchInputRef?: React.MutableRefObject<TouchInput>
  scooterTriggerRef?: React.MutableRefObject<boolean>
  jumpTriggerRef?: React.MutableRefObject<boolean>
  teleportTargetRef?: React.MutableRefObject<Exclude<Zone, null> | null>
  cinematicRef?: React.MutableRefObject<boolean>
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  grass: '#b2d68c', tuft: '#86b566', plaza: '#f3e9d6', plazaEdge: '#dcc9a8', path: '#e8d9bf',
  navy: '#1f3566', navyDeep: '#15254a', orange: '#ff8a1f', teal: '#14a3b8', cream: '#fbf5ea',
  wood: '#9a6a44', woodDark: '#6b4529', skin: '#eeb58f', hair: '#2b1a0e', gold: '#ffc83d',
  leaf: '#4f9a4f', trunk: '#7a5335', metal: '#b8c0cc', fog: '#d4e9f0',
}
const FONT = '/fonts/Urbanist-900.ttf'
const FONT_BOLD = '/fonts/Urbanist-700.ttf'

// ─── Tuning (units per second) ───────────────────────────────────────────────
const WALK_SPEED = 4.2
const SCOOTER_SPEED = 10
const BOOST_SPEED = 20
const BOOST_TIME = 1.6
const JUMP_VELOCITY = 9
const GRAVITY = 32
const HOP_TIME = 1.0
const BOUNDARY = 24
const PLAYER_RADIUS = 0.35
const PLAZA_Y = 0.12

const ZONE_CENTERS: Record<string, THREE.Vector3> = {
  home:    new THREE.Vector3(0, 0, 0),
  about:   new THREE.Vector3(-12, 0, -10),
  work:    new THREE.Vector3(12, 0, -10),
  contact: new THREE.Vector3(0, 0, 14),
  play:    new THREE.Vector3(0, 0, -19),
}
const ZONE_RADIUS = 5.5
const PLAZA_RADIUS: Record<string, number> = { home: 5.2, about: 4.8, work: 4.8, contact: 4.8, play: 5.5 }
const LANDING_OFFSET = new THREE.Vector3(0, 0, 3)

const PATHS: [[number, number], [number, number]][] = [
  [[0, 0], [-12, -10]], [[0, 0], [12, -10]], [[0, 0], [0, 14]],
  [[0, 0], [0, -19]], [[-12, -10], [0, -19]], [[12, -10], [0, -19]],
]

const COIN_DATA: { pos: [number, number, number]; label: string }[] = [
  { pos: [-4, 0, -1], label: 'SEO' },       { pos: [4, 0, -1], label: 'SEM' },
  { pos: [-7, 0, -5], label: 'CRO' },       { pos: [7, 0, -5], label: 'PPC' },
  { pos: [-1.5, 0, 7.5], label: 'Email' },  { pos: [1.5, 0, 8.5], label: 'Social' },
  { pos: [-10.5, 0, -6], label: 'Analytics' }, { pos: [10.5, 0, -6], label: 'Content' },
]

// Rings are only collectible on scooter — placed along the play zone path
const RING_DATA: { pos: [number, number, number]; color: string }[] = [
  { pos: [-2.8, 0, -14.8], color: '#ff8a1f' }, { pos: [2.8, 0, -14.8], color: '#4a90e2' },
  { pos: [0, 0, -18.5], color: '#e84393' },    { pos: [-3.2, 0, -21.5], color: '#2ecc71' },
  { pos: [3.2, 0, -21.5], color: '#a855f7' },
]

const BOOST_PADS: [number, number, number][] = [[-1.8, 0, -14.5], [1.8, 0, -14.5]]
const POND: [number, number, number] = [-10, 8, 2.4] // x, z, radius

const TREE_POSITIONS: { pos: [number, number, number]; scale: number }[] = [
  { pos: [-8, 0, -3], scale: 1.1 },   { pos: [-6, 0, -7], scale: 0.9 },   { pos: [-4, 0, 7], scale: 1.0 },
  { pos: [4, 0, -3], scale: 1.2 },    { pos: [8, 0, 5], scale: 0.95 },    { pos: [6, 0, -9], scale: 1.05 },
  { pos: [3, 0, 11], scale: 0.9 },    { pos: [-20, 0, -14], scale: 1.2 }, { pos: [20, 0, -14], scale: 1.1 },
  { pos: [-20, 0, 4], scale: 1.0 },   { pos: [20, 0, 4], scale: 0.9 },    { pos: [-20, 0, 17], scale: 1.15 },
  { pos: [20, 0, 17], scale: 1.0 },   { pos: [-11, 0, 18], scale: 0.95 }, { pos: [11, 0, 18], scale: 1.05 },
  { pos: [-17, 0, -7], scale: 1.0 },  { pos: [-16, 0, -17], scale: 1.2 }, { pos: [17, 0, -9], scale: 0.9 },
  { pos: [16, 0, -17], scale: 1.1 },  { pos: [-7, 0, 4], scale: 0.85 },   { pos: [7, 0, 4], scale: 0.9 },
  { pos: [-13, 0, 2], scale: 1.1 },   { pos: [13, 0, 2], scale: 1.05 },   { pos: [-18, 0, 9], scale: 0.9 },
  { pos: [18, 0, 9], scale: 1.0 },    { pos: [-7, 0, -15], scale: 1.0 },  { pos: [7, 0, -15], scale: 0.95 },
  { pos: [-11, 0, -22], scale: 1.1 }, { pos: [11, 0, -22], scale: 1.05 }, { pos: [-20, 0, -22], scale: 1.15 },
  { pos: [20, 0, -22], scale: 1.0 },
]

// Solid things the player bumps into (x, z, radius), world space
const COLLIDERS: [number, number, number][] = [
  ...TREE_POSITIONS.map(({ pos, scale }) => [pos[0], pos[2], 0.3 * scale] as [number, number, number]),
  [-12, -11.6, 2.3],                 // about building
  [-2.1, -3.2, 0.35], [2.1, -3.2, 0.35], // home arch posts
  [-14.6, -8.8, 0.45],               // portrait easel
  [-2.6, 14, 0.35],                  // mailbox
  [9.5, -11.6, 0.3], [11.15, -12.5, 0.3], [12.85, -12.5, 0.3], [14.5, -11.6, 0.3], // work frames
  [-1.1, 0.8, 0.15], [1.1, 0.8, 0.15], // home lamps
  [-5.2, -19.5, 1.4], [5.2, -19.5, 1.4], // bleachers
  [POND[0], POND[1], POND[2] - 0.2],     // pond
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const damp = THREE.MathUtils.damp
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function distToSegment(px: number, pz: number, [ax, az]: [number, number], [bx, bz]: [number, number]) {
  const dx = bx - ax, dz = bz - az
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz))
}

function isOpenGround(x: number, z: number, margin: number) {
  for (const c of Object.values(ZONE_CENTERS)) if (Math.hypot(x - c.x, z - c.z) < 5.6 + margin) return false
  for (const [a, b] of PATHS) if (distToSegment(x, z, a, b) < 0.9 + margin) return false
  for (const { pos } of TREE_POSITIONS) if (Math.hypot(x - pos[0], z - pos[2]) < 0.7) return false
  if (Math.hypot(x - POND[0], z - POND[1]) < POND[2] + 0.6 + margin) return false
  return true
}

function Label({ children, size = 0.2, color = '#ffffff', bold = false, ...rest }: {
  children: React.ReactNode; size?: number; color?: string; bold?: boolean
  position?: [number, number, number]; rotation?: [number, number, number]; maxWidth?: number
}) {
  return (
    <Text font={bold ? FONT_BOLD : FONT} fontSize={size} color={color} anchorX="center" anchorY="middle" {...rest}>
      {children}
    </Text>
  )
}

// ─── Instanced scenery ───────────────────────────────────────────────────────
type Item = { x: number; z: number; s: number; r: number; tint: number; color?: string }

// Shared wind clock for every swaying material
const windUniform = { value: 0 }

// Bends vertices sideways proportional to their height; phase varies per instance
function addWind(shader: THREE.Shader, strength: number, base: number) {
  shader.uniforms.uTime = windUniform
  shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    #ifdef USE_INSTANCING
      float phase = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;
    #else
      float phase = 0.0;
    #endif
    float bend = max(position.y + ${base.toFixed(3)}, 0.0) * ${strength.toFixed(3)};
    transformed.x += sin(uTime * 1.3 + phase) * bend;
    transformed.z += cos(uTime * 1.1 + phase * 1.3) * bend * 0.6;`,
  )
}

function InstancedPart({ items, geometry, color, y, jitter = 0, flat = false, shadow = true, wind = 0, windBase = 0.8 }: {
  items: Item[]; geometry: THREE.BufferGeometry; color: string; y: number
  jitter?: number; flat?: boolean; shadow?: boolean; wind?: number; windBase?: number
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    items.forEach((it, i) => {
      o.position.set(it.x, y * it.s, it.z)
      o.rotation.set(0, it.r, 0)
      o.scale.setScalar(it.s)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      c.set(it.color ?? color).offsetHSL(0, 0, it.tint * jitter)
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items, y, color, jitter])
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, items.length]} castShadow={shadow} receiveShadow>
      <meshStandardMaterial
        color="#ffffff"
        flatShading={flat}
        roughness={0.85}
        onBeforeCompile={wind ? (sh) => addWind(sh, wind, windBase) : undefined}
        customProgramCacheKey={wind ? () => `wind${wind}-${windBase}` : undefined}
      />
    </instancedMesh>
  )
}

function Scenery() {
  const geo = useMemo(() => ({
    trunk: new THREE.CylinderGeometry(0.12, 0.2, 1.2, 6),
    cone1: new THREE.ConeGeometry(1.1, 1.6, 7),
    cone2: new THREE.ConeGeometry(0.82, 1.3, 7),
    cone3: new THREE.ConeGeometry(0.52, 1.0, 7),
    blob: new THREE.IcosahedronGeometry(1.05, 0),
    blobTop: new THREE.IcosahedronGeometry(0.68, 0),
    bush: new THREE.IcosahedronGeometry(0.5, 0),
    tuft: new THREE.ConeGeometry(0.07, 0.32, 3),
    flower: new THREE.SphereGeometry(0.08, 6, 5),
  }), [])

  const { pines, rounds, bushes, tufts, flowers } = useMemo(() => {
    const rand = mulberry32(7)
    const trees = TREE_POSITIONS.map(({ pos, scale }) => ({
      x: pos[0], z: pos[2], s: scale, r: rand() * Math.PI * 2, tint: rand() * 2 - 1,
    }))
    const scatter = (count: number, margin: number, sMin: number, sMax: number, colors?: string[]) => {
      const out: Item[] = []
      for (let tries = 0; out.length < count && tries < count * 20; tries++) {
        const x = (rand() * 2 - 1) * 30, z = (rand() * 2 - 1) * 30
        if (!isOpenGround(x, z, margin)) continue
        out.push({
          x, z, s: sMin + rand() * (sMax - sMin), r: rand() * Math.PI * 2, tint: rand() * 2 - 1,
          color: colors?.[Math.floor(rand() * colors.length)],
        })
      }
      return out
    }
    return {
      pines: trees.filter((_, i) => i % 3 !== 0),
      rounds: trees.filter((_, i) => i % 3 === 0),
      bushes: scatter(26, 0.4, 0.7, 1.25),
      tufts: scatter(650, 0, 0.7, 1.4),
      flowers: scatter(110, 0.2, 0.8, 1.2, ['#ff6b9d', '#ffd23f', '#ffffff', '#a78bfa', '#ff8a1f']),
    }
  }, [])

  return (
    <group>
      <InstancedPart items={pines} geometry={geo.trunk} color={C.trunk} y={0.6} />
      <InstancedPart items={pines} geometry={geo.cone1} color={C.leaf} y={1.7} jitter={0.05} flat wind={0.03} />
      <InstancedPart items={pines} geometry={geo.cone2} color="#5aa653" y={2.5} jitter={0.05} flat wind={0.035} />
      <InstancedPart items={pines} geometry={geo.cone3} color="#66b35c" y={3.2} jitter={0.05} flat wind={0.04} />
      <InstancedPart items={rounds} geometry={geo.trunk} color={C.trunk} y={0.6} />
      <InstancedPart items={rounds} geometry={geo.blob} color="#62ad55" y={1.9} jitter={0.06} flat wind={0.03} />
      <InstancedPart items={rounds} geometry={geo.blobTop} color="#74bd62" y={2.75} jitter={0.06} flat wind={0.035} />
      <InstancedPart items={bushes} geometry={geo.bush} color="#5da853" y={0.3} jitter={0.06} flat wind={0.03} />
      <InstancedPart items={tufts} geometry={geo.tuft} color={C.tuft} y={0.14} jitter={0.06} shadow={false} wind={0.3} windBase={0.16} />
      <InstancedPart items={flowers} geometry={geo.flower} color="#ffffff" y={0.16} shadow={false} />
    </group>
  )
}

// ─── Ground, plazas, paths ───────────────────────────────────────────────────
function Plaza({ position, radius = 4.8, color = C.plaza }: { position: [number, number, number]; radius?: number; color?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, PLAZA_Y / 2, 0]} receiveShadow>
        <cylinderGeometry args={[radius, radius + 0.08, PLAZA_Y, 64]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <cylinderGeometry args={[radius + 0.35, radius + 0.45, 0.08, 64]} />
        <meshStandardMaterial color={C.plazaEdge} roughness={0.95} />
      </mesh>
    </group>
  )
}

function Path({ from, to, width = 1.3 }: { from: [number, number]; to: [number, number]; width?: number }) {
  const dx = to[0] - from[0], dz = to[1] - from[1]
  return (
    <mesh
      position={[(from[0] + to[0]) / 2, 0.03, (from[1] + to[1]) / 2]}
      rotation={[0, Math.atan2(dx, dz), 0]}
      receiveShadow
    >
      <boxGeometry args={[width, 0.06, Math.hypot(dx, dz)]} />
      <meshStandardMaterial color={C.path} roughness={0.95} />
    </mesh>
  )
}

function ZoneGlow({ radius = 4.8, color = C.orange }: { radius?: number; color?: string }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (ref.current) (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(state.clock.elapsedTime * 1.6) * 0.15
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, PLAZA_Y + 0.005, 0]}>
      <ringGeometry args={[radius - 0.55, radius - 0.4, 72]} />
      <meshBasicMaterial color={color} transparent opacity={0.35} toneMapped={false} />
    </mesh>
  )
}

function Sign({ position, text, color = C.orange, width = 1.3 }: {
  position: [number, number, number]; text: string; color?: string; width?: number
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 1.9, 8]} />
        <meshStandardMaterial color={C.wood} roughness={0.9} />
      </mesh>
      <RoundedBox args={[width, 0.5, 0.12]} radius={0.05} smoothness={3} position={[0, 2.0, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.55} />
      </RoundedBox>
      <Label position={[0, 2.0, 0.07]} size={0.2}>{text}</Label>
    </group>
  )
}

// ─── Collectibles ─────────────────────────────────────────────────────────────
function Coin({ position, label, collected }: { position: [number, number, number]; label: string; collected: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const spinRef = useRef<THREE.Group>(null)
  const pop = useRef(0)

  useFrame((state, dt) => {
    const g = groupRef.current, s = spinRef.current
    if (!g || !s) return
    const t = state.clock.elapsedTime
    if (collected) {
      pop.current = Math.min(1, pop.current + dt / 0.45)
      const e = pop.current
      g.position.y = 0.8 + e * 1.4
      s.rotation.y += dt * 20
      g.scale.setScalar((1 + e * 0.7) * (1 - e))
      g.visible = e < 1
    } else {
      g.position.y = 0.8 + Math.sin(t * 2.2 + position[0]) * 0.12
      s.rotation.y = t * 1.8
    }
  })

  return (
    <group ref={groupRef} position={[position[0], 0.8, position[2]]}>
      <group ref={spinRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.26, 0.08, 28]} />
          <meshStandardMaterial color={C.gold} emissive="#ff9d00" emissiveIntensity={0.35} metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh>
          <torusGeometry args={[0.19, 0.025, 8, 28]} />
          <meshStandardMaterial color="#ffe28a" metalness={0.7} roughness={0.2} />
        </mesh>
      </group>
      <Billboard position={[0, 0.5, 0]}>
        <Label size={0.16} color={C.navy} bold>{label}</Label>
      </Billboard>
    </group>
  )
}

function Ring({ position, color, collected }: { position: [number, number, number]; color: string; collected: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const pop = useRef(0)

  useFrame((state, dt) => {
    const g = groupRef.current
    if (!g) return
    if (collected) {
      pop.current = Math.min(1, pop.current + dt / 0.6)
      const e = pop.current
      g.scale.setScalar((1 + e * 0.8) * (1 - e))
      g.position.y = 1.1 + e * 1.5
      g.visible = e < 1
    } else {
      // Gentle bob — no Y-rotation so hoop always faces Z (jump-through direction)
      g.position.y = 1.1 + Math.sin(state.clock.elapsedTime * 1.6 + position[0]) * 0.06
    }
  })

  return (
    <group ref={groupRef} position={[position[0], 1.1, position[2]]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.82, 0.1, 16, 48]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} roughness={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.08 + PLAZA_Y, 0]}>
        <circleGeometry args={[0.75, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} />
      </mesh>
      <Billboard position={[0, -0.75, 0]}>
        <Label size={0.17} color={color}>JUMP</Label>
      </Billboard>
    </group>
  )
}

function BoostPad({ position }: { position: [number, number, number] }) {
  const padRef = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (padRef.current)
      (padRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 4.5) * 0.3
  })
  return (
    <group position={position}>
      <mesh ref={padRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, PLAZA_Y + 0.01, 0]} receiveShadow>
        <planeGeometry args={[1.5, 0.95]} />
        <meshStandardMaterial color={C.orange} emissive="#ff5500" emissiveIntensity={0.5} />
      </mesh>
      {[-0.65, 0.65].map((rz) => (
        <mesh key={rz} rotation={[-Math.PI / 2, 0, rz]} position={[rz < 0 ? 0.28 : -0.28, PLAZA_Y + 0.015, -0.05]}>
          <planeGeometry args={[0.11, 0.5]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      <Billboard position={[0, 0.7, 0]}>
        <Label size={0.16} color={C.orange}>BOOST</Label>
      </Billboard>
    </group>
  )
}

// ─── Play-zone props ─────────────────────────────────────────────────────────
function Ramp({ position, mirrorX = false }: { position: [number, number, number]; mirrorX?: boolean }) {
  const sign = mirrorX ? -1 : 1
  return (
    <group position={position}>
      <RoundedBox args={[2.1, 0.32, 0.95]} radius={0.06} position={[0, 0.16 + PLAZA_Y, sign * 0.2]} castShadow receiveShadow>
        <meshStandardMaterial color="#8a7a68" roughness={0.85} />
      </RoundedBox>
      <mesh position={[0, 0.34 + PLAZA_Y, sign * 0.52]} rotation={[sign * -0.52, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.1, 0.08, 1.5]} />
        <meshStandardMaterial color="#b3a594" roughness={0.7} />
      </mesh>
      {[-0.94, 0.94].map((x) => (
        <mesh key={x} position={[x, 0.36 + PLAZA_Y, sign * 0.52]} rotation={[sign * -0.52, 0, 0]} castShadow>
          <boxGeometry args={[0.1, 0.1, 1.5]} />
          <meshStandardMaterial color={C.orange} roughness={0.45} />
        </mesh>
      ))}
    </group>
  )
}

function SlalomCone({ position, alt = false }: { position: [number, number, number]; alt?: boolean }) {
  return (
    <group position={[position[0], PLAZA_Y, position[2]]}>
      <mesh position={[0, 0.33, 0]} castShadow>
        <coneGeometry args={[0.18, 0.66, 16]} />
        <meshStandardMaterial color={alt ? '#f2f2f2' : C.orange} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.135, 0.15, 0.08, 16]} />
        <meshStandardMaterial color={alt ? C.orange : '#ffffff'} roughness={0.5} />
      </mesh>
      <RoundedBox args={[0.42, 0.04, 0.42]} radius={0.015} position={[0, 0.02, 0]}>
        <meshStandardMaterial color="#444a55" roughness={0.9} />
      </RoundedBox>
    </group>
  )
}

function Bleachers({ position, rotY = 0 }: { position: [number, number, number]; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {[0, 1, 2].map((row) => (
        <RoundedBox key={row} args={[3.2, 0.16, 0.52]} radius={0.05} position={[0, row * 0.28 + 0.14, -row * 0.4 + 0.4]} castShadow receiveShadow>
          <meshStandardMaterial color={['#e9e2d6', '#d7cdbd', '#c7bba8'][row]} roughness={0.8} />
        </RoundedBox>
      ))}
      <RoundedBox args={[3.2, 1.3, 0.12]} radius={0.05} position={[0, 0.6, -0.8]} castShadow>
        <meshStandardMaterial color={C.teal} roughness={0.7} />
      </RoundedBox>
      {[-1.5, 1.5].map((x) => (
        <RoundedBox key={x} args={[0.12, 0.92, 1.65]} radius={0.04} position={[x, 0.44, -0.18]} castShadow>
          <meshStandardMaterial color={C.navy} roughness={0.8} />
        </RoundedBox>
      ))}
    </group>
  )
}

// ─── Zones ────────────────────────────────────────────────────────────────────
function Lamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.09, 1.2, 10]} />
        <meshStandardMaterial color={C.navy} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.16, 16, 12]} />
        <meshStandardMaterial color="#fff1c9" emissive="#ffb347" emissiveIntensity={1.4} />
      </mesh>
    </group>
  )
}

function Bench({ position, rotY = 0 }: { position: [number, number, number]; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <RoundedBox args={[1.4, 0.1, 0.46]} radius={0.03} position={[0, 0.42, 0]} castShadow>
        <meshStandardMaterial color={C.wood} roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[1.4, 0.4, 0.08]} radius={0.03} position={[0, 0.78, -0.2]} castShadow>
        <meshStandardMaterial color={C.wood} roughness={0.8} />
      </RoundedBox>
      {[-0.56, 0.56].map((x) => (
        <mesh key={x} position={[x, 0.22, 0]} castShadow>
          <boxGeometry args={[0.08, 0.44, 0.4]} />
          <meshStandardMaterial color={C.navy} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

function HomeZone() {
  return (
    <group>
      <Plaza position={[0, 0, 0]} radius={5.2} />
      <group position={[0, PLAZA_Y, -3.2]}>
        {[-2.1, 2.1].map((x) => (
          <RoundedBox key={x} args={[0.5, 3.8, 0.5]} radius={0.08} position={[x, 1.9, 0]} castShadow>
            <meshStandardMaterial color={C.navy} roughness={0.5} />
          </RoundedBox>
        ))}
        <RoundedBox args={[5.3, 0.62, 0.55]} radius={0.1} position={[0, 3.95, 0]} castShadow>
          <meshStandardMaterial color={C.navy} roughness={0.5} />
        </RoundedBox>
        <mesh position={[0, 3.58, 0]}>
          <boxGeometry args={[5.1, 0.08, 0.57]} />
          <meshStandardMaterial color={C.orange} emissive={C.orange} emissiveIntensity={0.3} />
        </mesh>
        <Label position={[0, 4.0, 0.29]} size={0.32}>ASHUTOSH PATHAK</Label>
        <Label position={[0, 3.75, 0.29]} size={0.11} color="#ffc38a" bold>PHARMA & HEALTHCARE MARKETING</Label>
      </group>
      <Lamp position={[-1.1, PLAZA_Y, 0.8]} />
      <Lamp position={[1.1, PLAZA_Y, 0.8]} />
      <Bench position={[3.3, PLAZA_Y, 1.5]} rotY={-0.9} />
    </group>
  )
}

function AboutZone() {
  const portrait = useTexture('/ashutosh.jpg')
  portrait.colorSpace = THREE.SRGBColorSpace

  return (
    <group position={[-12, 0, -10]}>
      <Plaza position={[0, 0, 0]} />
      <ZoneGlow />
      <group position={[0, PLAZA_Y, -1.6]}>
        {/* Studio building */}
        <RoundedBox args={[4.2, 3.6, 3.2]} radius={0.12} smoothness={3} position={[0, 1.8, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={C.cream} roughness={0.75} />
        </RoundedBox>
        <mesh position={[0, 4.35, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.762]} castShadow>
          <coneGeometry args={[3.1, 1.5, 4]} />
          <meshStandardMaterial color={C.navy} roughness={0.6} flatShading />
        </mesh>
        {/* Door */}
        <RoundedBox args={[0.95, 1.6, 0.1]} radius={0.04} position={[0, 0.8, 1.6]} castShadow>
          <meshStandardMaterial color={C.navy} roughness={0.5} />
        </RoundedBox>
        <mesh position={[0.32, 0.8, 1.67]}>
          <sphereGeometry args={[0.05, 10, 8]} />
          <meshStandardMaterial color={C.gold} metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Warm lit windows */}
        {[-1.4, 1.4].map((x) => (
          <group key={x} position={[x, 2.0, 1.6]}>
            <RoundedBox args={[1.05, 1.05, 0.08]} radius={0.03}>
              <meshStandardMaterial color="#ffffff" roughness={0.6} />
            </RoundedBox>
            <mesh position={[0, 0, 0.045]}>
              <planeGeometry args={[0.9, 0.9]} />
              <meshStandardMaterial color="#ffe2a8" emissive="#ffb866" emissiveIntensity={0.9} />
            </mesh>
            <mesh position={[0, 0, 0.05]}>
              <planeGeometry args={[0.05, 0.9]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
      </group>
      {/* Portrait on an easel */}
      <group position={[-2.6, PLAZA_Y, 1.2]} rotation={[0, 0.5, 0]}>
        {[-0.35, 0.35].map((x) => (
          <mesh key={x} position={[x, 0.75, -0.08]} rotation={[-0.12, 0, 0]} castShadow>
            <boxGeometry args={[0.06, 1.6, 0.06]} />
            <meshStandardMaterial color={C.woodDark} roughness={0.9} />
          </mesh>
        ))}
        <RoundedBox args={[1.25, 1.25, 0.08]} radius={0.03} position={[0, 1.35, 0]} rotation={[-0.12, 0, 0]} castShadow>
          <meshStandardMaterial color={C.orange} roughness={0.6} />
        </RoundedBox>
        <mesh position={[0, 1.355, 0.05]} rotation={[-0.12, 0, 0]}>
          <planeGeometry args={[1.08, 1.08]} />
          <meshStandardMaterial map={portrait} roughness={0.8} />
        </mesh>
      </group>
      <Sign position={[3.2, PLAZA_Y, 1.8]} text="ABOUT" />
    </group>
  )
}

function WorkZone() {
  const screens = useRef<(THREE.Mesh | null)[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    screens.current.forEach((m, i) => {
      if (m) (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.45 + Math.sin(t * 1.5 + i * 1.3) * 0.12
    })
  })

  const layout: [number, number, number][] = [[-2.5, -1.6, 0.45], [-0.85, -2.5, 0.15], [0.85, -2.5, -0.15], [2.5, -1.6, -0.45]]

  return (
    <group position={[12, 0, -10]}>
      <Plaza position={[0, 0, 0]} />
      <ZoneGlow />
      {WORK.cases.slice(0, 4).map((c, i) => {
        const [x, z, ry] = layout[i]
        return (
          <group key={c.title} position={[x, PLAZA_Y, z]} rotation={[0, ry, 0]}>
            <mesh position={[0, 0.7, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.06, 1.4, 10]} />
              <meshStandardMaterial color={C.navy} roughness={0.4} metalness={0.2} />
            </mesh>
            <RoundedBox args={[1.6, 1.15, 0.12]} radius={0.06} position={[0, 1.85, 0]} castShadow>
              <meshStandardMaterial color={C.navyDeep} roughness={0.4} />
            </RoundedBox>
            <mesh ref={(m) => { screens.current[i] = m }} position={[0, 1.85, 0.065]}>
              <planeGeometry args={[1.44, 0.99]} />
              <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.45} />
            </mesh>
            <Label position={[0, 2.12, 0.08]} size={0.09} color="#c9d6ff" bold>{`CASE 0${i + 1}`}</Label>
            <Label position={[0, 1.8, 0.08]} size={0.15} maxWidth={1.3}>{c.title.toUpperCase()}</Label>
          </group>
        )
      })}
      <Sign position={[-3.8, PLAZA_Y, 1.8]} text="WORK" />
    </group>
  )
}

function ContactZone() {
  const padRef = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (padRef.current) (padRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55 + Math.sin(state.clock.elapsedTime * 2) * 0.2
  })
  return (
    <group position={[0, 0, 14]}>
      <Plaza position={[0, 0, 0]} />
      <ZoneGlow />
      {/* "Let's talk" pad */}
      <mesh ref={padRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, PLAZA_Y + 0.01, 0]}>
        <circleGeometry args={[1.6, 48]} />
        <meshStandardMaterial color={C.orange} emissive={C.orange} emissiveIntensity={0.55} />
      </mesh>
      <Label position={[0, PLAZA_Y + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} size={0.34}>LET&apos;S TALK</Label>
      {/* Mailbox */}
      <group position={[-2.6, PLAZA_Y, 0]}>
        <mesh position={[0, 0.9, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 1.8, 10]} />
          <meshStandardMaterial color={C.navy} roughness={0.5} />
        </mesh>
        <RoundedBox args={[0.7, 0.55, 0.5]} radius={0.12} position={[0, 2.0, 0]} castShadow>
          <meshStandardMaterial color={C.navy} roughness={0.4} />
        </RoundedBox>
        <mesh position={[0.37, 2.15, 0]}>
          <boxGeometry args={[0.04, 0.34, 0.04]} />
          <meshStandardMaterial color={C.orange} />
        </mesh>
        <mesh position={[0.37, 2.3, 0.12]}>
          <boxGeometry args={[0.04, 0.16, 0.22]} />
          <meshStandardMaterial color={C.orange} emissive={C.orange} emissiveIntensity={0.3} />
        </mesh>
      </group>
      <Bench position={[2.6, PLAZA_Y, -0.6]} rotY={-0.5} />
      <Sign position={[0, PLAZA_Y, 3.4]} text="CONTACT" width={1.5} />
    </group>
  )
}

function PlayZone() {
  const flagRef = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (flagRef.current) flagRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2.5) * 0.22
  })

  return (
    <group position={[0, 0, -19]}>
      <Plaza position={[0, 0, 0]} radius={5.5} color="#dcebf2" />
      <ZoneGlow radius={5.5} color={C.teal} />
      {[-1.5, 0, 1.5].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, PLAZA_Y + 0.004, 0]}>
          <planeGeometry args={[0.08, 9.5]} />
          <meshBasicMaterial color={C.teal} transparent opacity={0.25} />
        </mesh>
      ))}
      <Sign position={[0, PLAZA_Y, 4.5]} text="PLAY ZONE" color={C.teal} width={2.0} />
      {[[4.6, C.teal, -0.48], [-4.6, C.orange, 0.48]].map(([x, color, fx], i) => (
        <group key={i} position={[x as number, PLAZA_Y, 0.5]}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.055, 3.0, 8]} />
            <meshStandardMaterial color={C.metal} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh ref={i === 0 ? flagRef : undefined} position={[fx as number, 2.7, 0.06]} castShadow>
            <boxGeometry args={[0.95, 0.55, 0.04]} />
            <meshStandardMaterial color={color as string} roughness={0.5} />
          </mesh>
        </group>
      ))}
      <Ramp position={[-2.2, 0, 0.8]} />
      <Ramp position={[2.2, 0, 0.8]} mirrorX />
      {([[-1.7, 0, 2.3], [1.7, 0, 1.4], [-1.7, 0, 0.3], [1.7, 0, -0.8], [-1.7, 0, -1.9], [1.7, 0, -3.0]] as [number, number, number][])
        .map((pos, i) => <SlalomCone key={i} position={pos} alt={i % 2 === 1} />)}
      <Bleachers position={[-5.2, 0, -0.5]} rotY={Math.PI / 2} />
      <Bleachers position={[5.2, 0, -0.5]} rotY={-Math.PI / 2} />
      {/* world (-1.8,0,-14.5) = local (-1.8,0,4.5) */}
      <BoostPad position={[-1.8, 0, 4.5]} />
      <BoostPad position={[1.8, 0, 4.5]} />
    </group>
  )
}

function FloatingLabel({ position, text, color = C.navy }: { position: [number, number, number]; text: string; color?: string }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (ref.current) ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.2 + position[0]) * 0.12
  })
  return (
    <group ref={ref} position={position}>
      <Billboard>
        <RoundedBox args={[text.length * 0.2 + 0.7, 0.55, 0.1]} radius={0.2} smoothness={4}>
          <meshStandardMaterial color={color} roughness={0.5} />
        </RoundedBox>
        <Label position={[0, 0, 0.06]} size={0.22}>{text}</Label>
      </Billboard>
    </group>
  )
}

// ─── Atmosphere: sky, hills, clouds, pond, sparkles ──────────────────────────
function SkyDome() {
  const uniforms = useMemo(() => ({
    top: { value: new THREE.Color('#7fbde6') },
    horizon: { value: new THREE.Color(C.fog) },
  }), [])
  return (
    <mesh scale={160} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 16]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={`varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
        fragmentShader={`uniform vec3 top; uniform vec3 horizon; varying vec3 vPos;
          void main() { float h = smoothstep(0.0, 0.55, normalize(vPos).y); gl_FragColor = vec4(mix(horizon, top, h), 1.0);
          #include <colorspace_fragment>
          }`}
      />
    </mesh>
  )
}

// Soft, mottled grass so the ground isn't one flat colour. Vertex colours rather than a
// canvas texture: Chrome dithers canvas gradients, which showed up as a dimpled pattern.
function Ground() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(300, 300, 150, 150)
    g.rotateX(-Math.PI / 2)
    const rand = mulberry32(3)
    const waves = Array.from({ length: 4 }, (_, i) => ({
      fx: (0.05 + rand() * 0.08) * (i + 1), fz: (0.05 + rand() * 0.08) * (i + 1),
      px: rand() * 6.28, pz: rand() * 6.28, amp: 0.07 / (i + 1),
    }))
    const base = new THREE.Color(C.grass)
    const light = new THREE.Color('#d2eca4')
    const dark = new THREE.Color('#86b866')
    const c = new THREE.Color()
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i)
      let n = 0
      for (const w of waves) n += Math.sin(x * w.fx + w.px) * Math.cos(z * w.fz + w.pz) * w.amp
      c.copy(base).lerp(n > 0 ? light : dark, Math.min(1, Math.abs(n) * 3.5))
      colors.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [])
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  )
}

function Hills() {
  const items = useMemo(() => {
    const rand = mulberry32(11)
    const out: Item[] = []
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2 + rand() * 0.15
      const d = 88 + rand() * 12
      out.push({ x: Math.sin(a) * d, z: Math.cos(a) * d, s: 6 + rand() * 6, r: rand() * Math.PI, tint: rand() * 2 - 1 })
    }
    return out
  }, [])
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 1)
    g.scale(1.8, 0.42, 1.8)
    return g
  }, [])
  return <InstancedPart items={items} geometry={geo} color="#8fbf6e" y={0} jitter={0.07} flat shadow={false} />
}

const CLOUDS: { pos: [number, number, number]; scale: number; speed: number }[] = [
  { pos: [-30, 18, -48], scale: 2.4, speed: 0.35 }, { pos: [12, 22, -58], scale: 3.0, speed: 0.25 },
  { pos: [50, 17, -24], scale: 2.2, speed: 0.4 },   { pos: [-52, 20, 10], scale: 2.6, speed: 0.3 },
  { pos: [40, 21, 40], scale: 2.4, speed: 0.33 },   { pos: [-20, 24, 55], scale: 3.2, speed: 0.2 },
]

function Clouds() {
  const refs = useRef<(THREE.Group | null)[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    refs.current.forEach((g, i) => {
      if (!g) return
      const c = CLOUDS[i]
      g.position.x = ((c.pos[0] + t * c.speed + 70) % 140) - 70
    })
  })
  const puffs: [number, number, number, number][] = [[0, 0, 0, 1.4], [1.5, -0.2, 0.3, 1.1], [-1.4, -0.3, -0.2, 1.0], [0.4, 0.6, -0.3, 0.9]]
  return (
    <>
      {CLOUDS.map((c, i) => (
        <group key={i} ref={(g) => { refs.current[i] = g }} position={c.pos} scale={c.scale}>
          {puffs.map(([x, y, z, r], j) => (
            <mesh key={j} position={[x, y, z]}>
              <icosahedronGeometry args={[r, 1]} />
              <meshStandardMaterial color="#ffffff" emissive="#eaf4ff" emissiveIntensity={0.35} roughness={1} flatShading />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

function Pond() {
  const [x, z, r] = POND
  const stones = useMemo(() => {
    const rand = mulberry32(21)
    return Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * Math.PI * 2
      return { x: x + Math.sin(a) * (r + 0.1), z: z + Math.cos(a) * (r + 0.1), s: 0.22 + rand() * 0.18, r: rand() * 6, tint: rand() * 2 - 1 }
    })
  }, [x, z, r])
  const stoneGeo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), [])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, z]} receiveShadow>
        <circleGeometry args={[r, 48]} />
        <meshStandardMaterial color="#5fb3d4" roughness={0.08} metalness={0.2} envMapIntensity={1.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.025, z]}>
        <ringGeometry args={[r - 0.35, r + 0.05, 48]} />
        <meshStandardMaterial color="#8fd0e6" roughness={0.3} />
      </mesh>
      <InstancedPart items={stones} geometry={stoneGeo} color="#c9c2b6" y={0.05} jitter={0.08} flat />
      {[[-0.7, 0.4, 0.32], [0.6, -0.5, 0.26], [0.2, 0.9, 0.22]].map(([dx, dz, s], i) => (
        <group key={i} position={[x + dx, 0.045, z + dz]}>
          <mesh rotation={[-Math.PI / 2, 0, i]}>
            <circleGeometry args={[s, 16, 0.5, Math.PI * 1.8]} />
            <meshStandardMaterial color="#4f9a4f" roughness={0.6} side={THREE.DoubleSide} />
          </mesh>
          {i === 0 && (
            <mesh position={[0.05, 0.05, 0]}>
              <sphereGeometry args={[0.07, 10, 8]} />
              <meshStandardMaterial color="#ff9ec4" emissive="#ff6fa5" emissiveIntensity={0.3} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

function ZoneSparkles() {
  return (
    <>
      <Sparkles position={[-12, 2, -10]} scale={[8, 3, 8]} count={24} size={3} speed={0.3} color="#ffd9a0" />
      <Sparkles position={[12, 2, -10]} scale={[8, 3, 8]} count={24} size={3} speed={0.3} color="#cfd8ff" />
      <Sparkles position={[0, 1.6, 14]} scale={[7, 2.5, 7]} count={24} size={3.5} speed={0.35} color="#ffc38a" />
      <Sparkles position={[0, 2, -19]} scale={[9, 3, 9]} count={30} size={3} speed={0.4} color="#9ff0ff" />
    </>
  )
}

// Desktop post-processing: glow on emissives + vignette, with cheap SMAA antialiasing.
// (SSAO was tried and dropped: banding on the big flat ground and ~2x frame cost.)
// When the frame rate struggles only bloom is dropped: removing the composer itself
// would switch render targets and force every material to recompile (a visible freeze).
export function Effects({ full }: { full: boolean }) {
  return (
    <EffectComposer multisampling={0}>
      {full ? <Bloom luminanceThreshold={1.1} luminanceSmoothing={0.2} intensity={0.55} mipmapBlur /> : <></>}
      <SMAA />
      <Vignette offset={0.3} darkness={0.28} />
    </EffectComposer>
  )
}

// ─── Player ───────────────────────────────────────────────────────────────────
function Limb({ size, color, position }: { size: [number, number, number]; color: string; position: [number, number, number] }) {
  return (
    <RoundedBox args={size} radius={Math.min(...size) * 0.35} smoothness={3} position={position} castShadow>
      <meshStandardMaterial color={color} roughness={0.55} />
    </RoundedBox>
  )
}

// ─── Main scene ───────────────────────────────────────────────────────────────
function GameScene({
  onZoneChange, onCoinCollect, onScooterToggle, onFirstMove, onRingCollect, onBoostActivate,
  touchInputRef, scooterTriggerRef, jumpTriggerRef, teleportTargetRef, cinematicRef,
}: Props) {
  const { camera, size, scene } = useThree()

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = size.width < size.height ? 68 : 50
    cam.updateProjectionMatrix()
  }, [camera, size.width, size.height])

  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  // ?debug exposes read-only game state on window.__game for end-to-end tests
  const debug = useMemo(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug'), [])

  // Scene refs
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const playerGroupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const characterRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)
  const eyesRef = useRef<THREE.Group>(null)
  const torsoRef = useRef<THREE.Group>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const leftLegRef = useRef<THREE.Group>(null)
  const rightLegRef = useRef<THREE.Group>(null)
  const scooterRef = useRef<THREE.Group>(null)
  const wheelFRef = useRef<THREE.Group>(null)
  const wheelBRef = useRef<THREE.Group>(null)
  const shadowRef = useRef<THREE.Mesh>(null)

  // Game state (refs = no re-render)
  const pos = useRef(new THREE.Vector3(0, 0, 4.5))
  const vel = useRef(new THREE.Vector2())
  const yaw = useRef(0)
  const roll = useRef(0)
  const squash = useRef(0)
  const walkPhase = useRef(0)
  const groundY = useRef(0)
  const keys = useRef({ up: false, down: false, left: false, right: false })
  const activeZoneRef = useRef<Zone>(null)
  const camOffset = useRef(new THREE.Vector3(0, 12, 14))
  const camLook = useRef(new THREE.Vector3(0, 1, 0))
  const isOnScooterRef = useRef(false)
  const hasMovedRef = useRef(false)
  const collectedRef = useRef(new Set<number>())
  const collectedRingsRef = useRef(new Set<number>())
  const boostLeft = useRef(0)
  const jump = useRef({ vy: 0, y: 0 })
  const hop = useRef<{ from: THREE.Vector3; to: THREE.Vector3; t: number } | null>(null)

  const [, forceRender] = useState(0)

  useEffect(() => {
    const toggleScooter = () => {
      isOnScooterRef.current = !isOnScooterRef.current
      onScooterToggle(isOnScooterRef.current)
      if (scooterRef.current) scooterRef.current.visible = isOnScooterRef.current
    }
    const onDown = (e: KeyboardEvent) => {
      if (cinematicRef?.current) return
      if (['ArrowUp', 'w', 'W'].includes(e.key))    { keys.current.up = true; e.preventDefault() }
      if (['ArrowDown', 's', 'S'].includes(e.key))  { keys.current.down = true; e.preventDefault() }
      if (['ArrowLeft', 'a', 'A'].includes(e.key))  { keys.current.left = true; e.preventDefault() }
      if (['ArrowRight', 'd', 'D'].includes(e.key)) { keys.current.right = true; e.preventDefault() }
      if ((e.key === 'e' || e.key === 'E') && !e.repeat) toggleScooter()
      if (e.code === 'Space') {
        e.preventDefault()
        if (isOnScooterRef.current && jump.current.y === 0 && !hop.current) jump.current.vy = JUMP_VELOCITY
      }
    }
    const onUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'w', 'W'].includes(e.key))    keys.current.up = false
      if (['ArrowDown', 's', 'S'].includes(e.key))  keys.current.down = false
      if (['ArrowLeft', 'a', 'A'].includes(e.key))  keys.current.left = false
      if (['ArrowRight', 'd', 'D'].includes(e.key)) keys.current.right = false
    }
    const onBlur = () => { keys.current = { up: false, down: false, left: false, right: false } }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [onScooterToggle, cinematicRef])

  useFrame((state, rawDt) => {
    // Clamp so a stalled tab doesn't teleport the player; 1/20 keeps real speed down to 20 fps
    const dt = Math.min(rawDt, 1 / 20)
    const t = state.clock.elapsedTime
    const cinematic = cinematicRef?.current ?? false
    windUniform.value = t

    // Mobile scooter toggle / jump
    if (scooterTriggerRef?.current) {
      scooterTriggerRef.current = false
      isOnScooterRef.current = !isOnScooterRef.current
      onScooterToggle(isOnScooterRef.current)
      if (scooterRef.current) scooterRef.current.visible = isOnScooterRef.current
    }
    if (jumpTriggerRef?.current) {
      jumpTriggerRef.current = false
      if (isOnScooterRef.current && jump.current.y === 0 && !hop.current) jump.current.vy = JUMP_VELOCITY
    }

    // Nav-bar teleport — hop in an arc to the requested zone
    if (teleportTargetRef?.current) {
      const target = ZONE_CENTERS[teleportTargetRef.current].clone().add(LANDING_OFFSET)
      teleportTargetRef.current = null
      vel.current.set(0, 0)
      jump.current = { vy: 0, y: 0 }
      if (reducedMotion) pos.current.copy(target)
      else hop.current = { from: pos.current.clone(), to: target, t: 0 }
    }

    const onScooter = isOnScooterRef.current

    // ── Input → velocity (with inertia) ────────────────────────────────────
    const k = keys.current
    const touch = touchInputRef?.current
    let ix = (k.right ? 1 : 0) - (k.left ? 1 : 0) + (touch?.x ?? 0)
    let iz = (k.down ? 1 : 0) - (k.up ? 1 : 0) + (touch?.y ?? 0)
    const len = Math.hypot(ix, iz)
    if (len > 1) { ix /= len; iz /= len }
    if (cinematic || hop.current) { ix = 0; iz = 0 }
    if ((ix || iz) && !hasMovedRef.current) { hasMovedRef.current = true; onFirstMove() }

    if (boostLeft.current > 0) boostLeft.current -= dt
    const maxSpeed = onScooter ? (boostLeft.current > 0 ? BOOST_SPEED : SCOOTER_SPEED) : WALK_SPEED
    const accel = onScooter ? 3.5 : 12
    vel.current.x = damp(vel.current.x, ix * maxSpeed, accel, dt)
    vel.current.y = damp(vel.current.y, iz * maxSpeed, accel, dt)
    const speed = vel.current.length()

    // ── Position ──────────────────────────────────────────────────────────
    let lift = 0
    if (hop.current) {
      const h = hop.current
      h.t = Math.min(1, h.t + dt / HOP_TIME)
      const e = easeInOut(h.t)
      const dir = h.to.clone().sub(h.from)
      pos.current.lerpVectors(h.from, h.to, e)
      lift = Math.sin(Math.PI * e) * Math.min(6, dir.length() * 0.25)
      if (dir.lengthSq() > 0.01) yaw.current += wrapAngle(Math.atan2(dir.x, dir.z) - yaw.current) * (1 - Math.exp(-10 * dt))
      if (h.t >= 1) { hop.current = null; squash.current = 1 }
    } else {
      pos.current.x = THREE.MathUtils.clamp(pos.current.x + vel.current.x * dt, -BOUNDARY, BOUNDARY)
      pos.current.z = THREE.MathUtils.clamp(pos.current.z + vel.current.y * dt, -BOUNDARY, BOUNDARY)
      // Push out of solid objects and cancel velocity into them
      for (const [cx, cz, r] of COLLIDERS) {
        const dx = pos.current.x - cx, dz = pos.current.z - cz
        const minD = r + PLAYER_RADIUS
        const d2 = dx * dx + dz * dz
        if (d2 < minD * minD && d2 > 1e-6) {
          const d = Math.sqrt(d2), nx = dx / d, nz = dz / d
          pos.current.x = cx + nx * minD
          pos.current.z = cz + nz * minD
          const into = vel.current.x * nx + vel.current.y * nz
          if (into < 0) { vel.current.x -= into * nx; vel.current.y -= into * nz }
        }
      }
    }

    // ── Jump physics ──────────────────────────────────────────────────────
    if (jump.current.vy !== 0 || jump.current.y > 0) {
      jump.current.vy -= GRAVITY * dt
      jump.current.y = Math.max(0, jump.current.y + jump.current.vy * dt)
      if (jump.current.y === 0) { jump.current.vy = 0; squash.current = 1 }
    }

    // ── Facing, lean, squash ──────────────────────────────────────────────
    let yawRate = 0
    if (speed > 0.3 && !hop.current) {
      const diff = wrapAngle(Math.atan2(vel.current.x, vel.current.y) - yaw.current)
      const step = diff * (1 - Math.exp(-12 * dt))
      yaw.current += step
      yawRate = step / dt
    }
    roll.current = damp(roll.current, onScooter ? THREE.MathUtils.clamp(-yawRate * 0.08, -0.35, 0.35) : 0, 8, dt)
    squash.current = damp(squash.current, 0, 9, dt)

    // Lift everything onto plazas when standing on one
    let groundTarget = 0
    for (const [id, c] of Object.entries(ZONE_CENTERS)) {
      if (Math.hypot(pos.current.x - c.x, pos.current.z - c.z) < PLAZA_RADIUS[id] + 0.2) { groundTarget = PLAZA_Y; break }
    }
    groundY.current = damp(groundY.current, groundTarget, 20, dt)

    const pg = playerGroupRef.current
    if (pg) {
      pg.position.set(pos.current.x, groundY.current + jump.current.y + lift, pos.current.z)
      pg.rotation.y = yaw.current
    }
    if (bodyRef.current) {
      bodyRef.current.rotation.z = roll.current
      const s = squash.current
      bodyRef.current.scale.set(1 + 0.12 * s, 1 - 0.18 * s, 1 + 0.12 * s)
    }
    if (shadowRef.current) {
      shadowRef.current.position.y = 0.02 - jump.current.y - lift
      shadowRef.current.scale.setScalar(1 / (1 + (jump.current.y + lift) * 0.3))
    }
    if (characterRef.current) characterRef.current.position.y = damp(characterRef.current.position.y, onScooter ? 0.3 : 0, 10, dt)

    // ── Character animation ───────────────────────────────────────────────
    const setRot = (g: THREE.Group | null, x: number, z = 0, lambda = 14) => {
      if (!g) return
      g.rotation.x = damp(g.rotation.x, x, lambda, dt)
      g.rotation.z = damp(g.rotation.z, z, lambda, dt)
    }
    if (onScooter) {
      setRot(leftArmRef.current, -0.7); setRot(rightArmRef.current, -0.7)
      setRot(leftLegRef.current, 0.25, -0.12); setRot(rightLegRef.current, 0.25, 0.12)
      const spin = (speed * dt) / 0.2
      if (wheelFRef.current) wheelFRef.current.rotation.x += spin
      if (wheelBRef.current) wheelBRef.current.rotation.x += spin
    } else if (hop.current) {
      setRot(leftArmRef.current, -2.6, -0.3); setRot(rightArmRef.current, -2.6, 0.3)
      setRot(leftLegRef.current, 0.4); setRot(rightLegRef.current, -0.2)
    } else {
      // Walk cycle driven by distance travelled so feet don't skate
      walkPhase.current += speed * dt * 2.6
      const amp = 0.6 * Math.min(1, speed / WALK_SPEED)
      const swing = Math.sin(walkPhase.current) * amp
      setRot(leftArmRef.current, swing * 0.8); setRot(rightArmRef.current, -swing * 0.8)
      setRot(leftLegRef.current, -swing); setRot(rightLegRef.current, swing)
      if (headRef.current) headRef.current.position.y = 1.62 + Math.abs(Math.sin(walkPhase.current)) * 0.04 * (amp / 0.6)
    }
    if (!reducedMotion) {
      if (torsoRef.current) torsoRef.current.scale.y = 1 + Math.sin(t * 2.4) * 0.015
      if (eyesRef.current) eyesRef.current.scale.y = (t % 3.7) < 0.12 ? 0.15 : 1
    }

    // ── Zone detection ────────────────────────────────────────────────────
    let nearest: Zone = null
    let nearestDist = Infinity
    for (const [id, c] of Object.entries(ZONE_CENTERS)) {
      const dist = Math.hypot(pos.current.x - c.x, pos.current.z - c.z)
      if (dist < ZONE_RADIUS && dist < nearestDist) { nearestDist = dist; nearest = id as Zone }
    }
    if (!hop.current && nearest !== activeZoneRef.current) { activeZoneRef.current = nearest; onZoneChange(nearest) }

    // ── Coins (not while hopping across the map via nav/tour) ─────────────
    if (!hop.current) COIN_DATA.forEach(({ pos: p }, i) => {
      if (collectedRef.current.has(i)) return
      if ((pos.current.x - p[0]) ** 2 + (pos.current.z - p[2]) ** 2 < 1.2) {
        collectedRef.current.add(i)
        forceRender((n) => n + 1)
        onCoinCollect(collectedRef.current.size)
      }
    })

    // ── Rings (scooter + jump required) ───────────────────────────────────
    if (onScooter && jump.current.y > 0.25 && !hop.current) {
      RING_DATA.forEach(({ pos: p }, i) => {
        if (collectedRingsRef.current.has(i)) return
        if ((pos.current.x - p[0]) ** 2 + (pos.current.z - p[2]) ** 2 < 2.25) {
          collectedRingsRef.current.add(i)
          forceRender((n) => n + 1)
          onRingCollect(collectedRingsRef.current.size)
        }
      })
    }

    // ── Boost pads (scooter only) ─────────────────────────────────────────
    if (onScooter && boostLeft.current <= 0 && !hop.current) {
      for (const p of BOOST_PADS) {
        if ((pos.current.x - p[0]) ** 2 + (pos.current.z - p[2]) ** 2 < 2.25) {
          boostLeft.current = BOOST_TIME
          onBoostActivate()
          break
        }
      }
    }

    // ── Camera ────────────────────────────────────────────────────────────
    const portrait = state.size.width < state.size.height
    if (cinematic) {
      const a = reducedMotion ? 0 : t * 0.07
      camera.position.x = damp(camera.position.x, Math.sin(a) * 28, 1.5, dt)
      camera.position.y = damp(camera.position.y, portrait ? 26 : 18, 1.5, dt)
      camera.position.z = damp(camera.position.z, -3 + Math.cos(a) * 28, 1.5, dt)
      camLook.current.set(0, 0, -3)
    } else {
      const offY = onScooter ? (portrait ? 16 : 14) : (portrait ? 14 : 12)
      const offZ = onScooter ? (portrait ? 22 : 17) : (portrait ? 18 : 14)
      camOffset.current.y = damp(camOffset.current.y, offY, 2.5, dt)
      camOffset.current.z = damp(camOffset.current.z, offZ, 2.5, dt)
      const ahead = reducedMotion ? 0 : 0.35
      const lambda = hop.current ? 5 : 3.5
      camera.position.x = damp(camera.position.x, pos.current.x + vel.current.x * ahead, lambda, dt)
      camera.position.y = damp(camera.position.y, camOffset.current.y, lambda, dt)
      camera.position.z = damp(camera.position.z, pos.current.z + camOffset.current.z + vel.current.y * ahead, lambda, dt)
      const lx = pos.current.x + vel.current.x * ahead, lz = pos.current.z + vel.current.y * ahead
      camLook.current.x = damp(camLook.current.x, lx, 6, dt)
      camLook.current.y = damp(camLook.current.y, 1, 6, dt)
      camLook.current.z = damp(camLook.current.z, lz, 6, dt)
    }
    camera.lookAt(camLook.current)

    if (debug) {
      const w = window as unknown as { __game?: Record<string, unknown> }
      const frames = ((w.__game?.frames as number) ?? 0) + 1
      ;(w as unknown as { __scene: THREE.Scene }).__scene = scene
      w.__game = {
        x: pos.current.x, z: pos.current.z, y: jump.current.y + lift, speed, yaw: yaw.current,
        zone: activeZoneRef.current, scooter: onScooter, hopping: !!hop.current, cinematic,
        coins: collectedRef.current.size, rings: collectedRingsRef.current.size, frames,
      }
    }

    // Sun follows the player so a tight shadow frustum stays sharp
    const sun = sunRef.current
    if (sun) {
      const fx = cinematic ? 0 : pos.current.x, fz = cinematic ? -3 : pos.current.z
      sun.position.set(fx + 12, 22, fz + 9)
      sun.target.position.set(fx, 0, fz)
      sun.target.updateMatrixWorld()
    }
  })

  const shadowExtent = size.width < size.height ? 26 : 20

  return (
    <>
      <color attach="background" args={[C.fog]} />
      <fog attach="fog" args={[C.fog, 42, 120]} />

      {/* ── Lighting ─────────────────────────────────────────────────────── */}
      <hemisphereLight args={['#fff4e2', '#6f9a58', 1.1]} />
      <directionalLight
        ref={sunRef}
        color="#fff0d8"
        intensity={2.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
      />
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.2} position={[0, 6, -8]} scale={[12, 5, 1]} />
        <Lightformer intensity={0.7} color="#ffd9b0" position={[-6, 2, 2]} rotation-y={Math.PI / 2} scale={[12, 3, 1]} />
        <Lightformer intensity={0.5} color="#cfe6ff" position={[6, 2, 2]} rotation-y={-Math.PI / 2} scale={[12, 3, 1]} />
      </Environment>

      {/* ── Ground ───────────────────────────────────────────────────────── */}
      <SkyDome />
      <Ground />
      <Hills />
      <Clouds />
      <Pond />
      <ZoneSparkles />
      {PATHS.map(([a, b], i) => <Path key={i} from={a} to={b} />)}

      <HomeZone />
      <AboutZone />
      <WorkZone />
      <ContactZone />
      <PlayZone />
      <Scenery />

      <FloatingLabel position={[-12, 6.4, -10]} text="ABOUT" />
      <FloatingLabel position={[12, 6.4, -10]} text="WORK" />
      <FloatingLabel position={[0, 6.4, -19]} text="PLAY ZONE" color={C.teal} />

      {COIN_DATA.map((coin, i) => (
        <Coin key={i} position={coin.pos} label={coin.label} collected={collectedRef.current.has(i)} />
      ))}
      {RING_DATA.map((ring, i) => (
        <Ring key={i} position={[ring.pos[0], PLAZA_Y, ring.pos[2]]} color={ring.color} collected={collectedRingsRef.current.has(i)} />
      ))}

      {/* ── Player ───────────────────────────────────────────────────────── */}
      <group ref={playerGroupRef} position={[0, 0, 4.5]}>
        <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <circleGeometry args={[0.42, 24]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.16} depthWrite={false} />
        </mesh>

        <group ref={bodyRef}>
          <group ref={characterRef}>
            {/* Head */}
            <group ref={headRef} position={[0, 1.62, 0]}>
              <Limb size={[0.46, 0.46, 0.42]} color={C.skin} position={[0, 0, 0]} />
              <Limb size={[0.5, 0.16, 0.46]} color={C.hair} position={[0, 0.22, -0.02]} />
              <Limb size={[0.5, 0.3, 0.12]} color={C.hair} position={[0, 0.08, -0.2]} />
              <group ref={eyesRef} position={[0, 0.03, 0.215]}>
                {[-0.1, 0.1].map((x) => (
                  <mesh key={x} position={[x, 0, 0]}>
                    <sphereGeometry args={[0.04, 12, 10]} />
                    <meshBasicMaterial color={C.navyDeep} />
                  </mesh>
                ))}
              </group>
              <mesh position={[0, -0.1, 0.212]}>
                <boxGeometry args={[0.1, 0.022, 0.01]} />
                <meshBasicMaterial color="#b8624a" />
              </mesh>
            </group>

            {/* Torso */}
            <group ref={torsoRef} position={[0, 1.0, 0]}>
              <Limb size={[0.54, 0.6, 0.34]} color={C.navy} position={[0, 0, 0]} />
              <mesh position={[0, 0.1, 0.172]}>
                <planeGeometry args={[0.2, 0.07]} />
                <meshBasicMaterial color={C.orange} />
              </mesh>
            </group>

            {/* Arms */}
            {[[-1, leftArmRef], [1, rightArmRef]].map(([side, ref]) => (
              <group key={side as number} ref={ref as React.RefObject<THREE.Group>} position={[(side as number) * 0.36, 1.25, 0]}>
                <Limb size={[0.18, 0.3, 0.2]} color={C.orange} position={[0, -0.13, 0]} />
                <Limb size={[0.15, 0.3, 0.16]} color={C.skin} position={[0, -0.4, 0.01]} />
              </group>
            ))}

            {/* Legs */}
            {[[-1, leftLegRef], [1, rightLegRef]].map(([side, ref]) => (
              <group key={side as number} ref={ref as React.RefObject<THREE.Group>} position={[(side as number) * 0.14, 0.7, 0]}>
                <Limb size={[0.21, 0.52, 0.26]} color="#2a4a8c" position={[0, -0.28, 0]} />
                <Limb size={[0.22, 0.12, 0.34]} color="#1c1c24" position={[0, -0.62, 0.05]} />
              </group>
            ))}
          </group>

          {/* ── Scooter ─────────────────────────────────────────────────── */}
          <group ref={scooterRef} visible={false}>
            <RoundedBox args={[0.44, 0.08, 0.95]} radius={0.03} position={[0, 0.2, 0]} castShadow>
              <meshStandardMaterial color={C.navy} roughness={0.4} metalness={0.3} />
            </RoundedBox>
            <RoundedBox args={[0.42, 0.22, 0.46]} radius={0.08} position={[0, 0.33, 0.12]} castShadow>
              <meshStandardMaterial color={C.orange} roughness={0.3} metalness={0.2} />
            </RoundedBox>
            <group position={[0, 0.26, 0.44]} rotation={[-0.18, 0, 0]}>
              <mesh position={[0, 0.44, 0]} castShadow>
                <cylinderGeometry args={[0.04, 0.055, 0.88, 10]} />
                <meshStandardMaterial color={C.metal} metalness={0.65} roughness={0.25} />
              </mesh>
              <mesh position={[0, 0.9, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.03, 0.03, 0.62, 10]} />
                <meshStandardMaterial color={C.metal} metalness={0.7} roughness={0.2} />
              </mesh>
              {[-0.32, 0.32].map((x) => (
                <mesh key={x} position={[x, 0.9, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[0.046, 0.046, 0.12, 10]} />
                  <meshStandardMaterial color={C.navyDeep} roughness={0.7} />
                </mesh>
              ))}
              <mesh position={[0, 0.62, 0.07]}>
                <sphereGeometry args={[0.06, 12, 10]} />
                <meshStandardMaterial color="#fffce0" emissive="#ffffaa" emissiveIntensity={2} />
              </mesh>
            </group>
            {[[0.46, wheelFRef], [-0.48, wheelBRef]].map(([z, ref]) => (
              <group key={z as number} ref={ref as React.RefObject<THREE.Group>} position={[0, 0.2, z as number]}>
                <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
                  <torusGeometry args={[0.15, 0.06, 10, 24]} />
                  <meshStandardMaterial color="#23232e" roughness={0.8} />
                </mesh>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.1, 0.1, 0.08, 12]} />
                  <meshStandardMaterial color={C.metal} metalness={0.7} roughness={0.2} />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      </group>
    </>
  )
}

// Memoised: HUD/toast state changes in the parent shouldn't re-render the whole world
export default memo(GameScene)
