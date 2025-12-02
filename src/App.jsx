import React, { useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";

// --- デザイン設定 ---
const THEME = {
  bg: "#1d1d1d",
  panelBg: "#303030",
  headerBg: "#2b2b2b",
  text: "#cccccc",
  accent: "#ff9800",
  gridLine: "#3a3a3a",
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    width: "100vw",
    height: "100vh",
    background: THEME.bg,
    color: THEME.text,
    fontFamily: "'Segoe UI', sans-serif",
    overflow: "hidden",
  },
  header: {
    height: "30px",
    background: THEME.headerBg,
    borderBottom: "1px solid #111",
    display: "flex",
    alignItems: "center",
    padding: "0 10px",
    fontSize: "12px",
    userSelect: "none",
  },
  menuItem: { marginRight: "15px", cursor: "pointer" },
  main: { display: "flex", flex: 1, height: "calc(100vh - 30px)" },
  panel: {
    flex: 1,
    borderRight: "1px solid #111",
    background: THEME.panelBg,
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  panelHeader: {
    padding: "5px 10px",
    background: "rgba(0,0,0,0.2)",
    fontSize: "11px",
    color: "#aaa",
    borderBottom: "1px solid #222",
  },
  board2dContainer: {
    flex: 1,
    position: "relative",
    backgroundImage: `linear-gradient(${THEME.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${THEME.gridLine} 1px, transparent 1px)`,
    backgroundSize: "20px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
};

// --- データ ---
const createTeam = (team, color, startId, side) => {
  const players = [];
  // GK
  players.push({ id: startId, number: 1, team, x: side === 'left' ? 5 : 95, y: 50, color, role: 'GK' });
  // DF
  for (let i = 0; i < 4; i++) {
    players.push({ id: startId + 1 + i, number: 2 + i, team, x: side === 'left' ? 20 : 80, y: 20 + i * 20, color, role: 'DF' });
  }
  // MF
  for (let i = 0; i < 4; i++) {
    players.push({ id: startId + 5 + i, number: 6 + i, team, x: side === 'left' ? 45 : 55, y: 20 + i * 20, color, role: 'MF' });
  }
  // FW
  for (let i = 0; i < 2; i++) {
    players.push({ id: startId + 9 + i, number: 10 + i, team, x: side === 'left' ? 60 : 40, y: 35 + i * 30, color, role: 'FW' });
  }
  return players;
};

const INITIAL_PLAYERS = [
  ...createTeam('home', '#ff9800', 1, 'left'),
  ...createTeam('away', '#2196f3', 12, 'right'),
  { id: 99, number: null, team: "ball", x: 50, y: 50, color: "#ffffff", scale: 0.5 }
];

// --- 3Dパーツ ---
const Player3D = ({ position, color, number, scale = 1 }) => {
  const x3d = (position.x - 50); 
  const z3d = (position.y - 50) * 0.7;

  return (
    <group position={[x3d, 0, z3d]}>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.5 * scale, 1.5 * scale, 0.5, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.5 * scale, 0.5 * scale, 3, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {number && (
        <Text position={[0, 3.5, 0]} fontSize={2} color="white" anchorX="center" anchorY="middle" outlineWidth={0.1} outlineColor="#000000">
          {number}
        </Text>
      )}
    </group>
  );
};

const FieldLines3D = () => {
  const lineProps = { color: "white", lineWidth: 1, opacity: 0.4, transparent: true };
  const borderPoints = [[-50, 0.05, -35], [50, 0.05, -35], [50, 0.05, 35], [-50, 0.05, 35], [-50, 0.05, -35]];
  const centerLinePoints = [[0, 0.05, -35], [0, 0.05, 35]];

  return (
    <group>
      <Line points={borderPoints} {...lineProps} />
      <Line points={centerLinePoints} {...lineProps} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[9, 9.2, 64]} />
        <meshBasicMaterial color="white" opacity={0.4} transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

const Scene3D = ({ players }) => {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas shadows camera={{ position: [0, 60, 50], fov: 45 }}>
        <color attach="background" args={['#252525']} />
        <gridHelper args={[150, 30, 0x444444, 0x333333]} position={[0, 0.01, 0]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 50, 10]} intensity={1.5} castShadow />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
          <planeGeometry args={[100, 70]} />
          <meshStandardMaterial color="#2e8b57" roughness={0.9} opacity={0.8} transparent={false} />
        </mesh>
        <FieldLines3D />
        {players.map((p) => (
          <Player3D key={p.id} position={p} color={p.color} number={p.number} scale={p.scale} />
        ))}
        <OrbitControls enableDamping dampingFactor={0.05} />
      </Canvas>
    </div>
  );
};

// --- 2Dパーツ ---
const Board2D = ({ players, setPlayers }) => {
  const boardRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);

  const handleMouseMove = (e) => {
    if (!draggingId || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPlayers((prev) =>
      prev.map((p) => (p.id === draggingId ? { ...p, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : p))
    );
  };

  return (
    <div style={styles.board2dContainer} onMouseMove={handleMouseMove} onMouseUp={() => setDraggingId(null)} onMouseLeave={() => setDraggingId(null)}>
      <div ref={boardRef} style={{ width: "80%", aspectRatio: "100/70", position: "relative", border: "2px solid #555", boxShadow: "0 5px 15px rgba(0,0,0,0.5)" }}>
        <div style={{ position: "absolute", top: "50%", width: "100%", borderTop: "1px solid #555" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: "20%", paddingBottom: "20%", border: "1px solid #555", borderRadius: "50%", transform: "translate(-50%, -50%)" }} />
        {players.map((p) => (
          <div key={p.id} onMouseDown={() => setDraggingId(p.id)} style={{ left: `${p.x}%`, top: `${p.y}%`, position: "absolute", width: "20px", height: "20px", borderRadius: "50%", background: p.color, transform: "translate(-50%, -50%)", cursor: "grab", border: "2px solid #fff", boxShadow: "0 2px 4px rgba(0,0,0,0.5)", zIndex: 10, display: "flex", justifyContent: "center", alignItems: "center", color: "white", fontSize: "10px", fontWeight: "bold", userSelect: "none" }}>
            {p.number}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- メイン ---
export default function App() {
  const [players, setPlayers] = useState(INITIAL_PLAYERS);
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <span style={{ fontWeight:'bold', marginRight:20 }}>⚽ Tactics 3D</span>
      </header>
      <div style={styles.main}>
        <div style={styles.panel}>
          <div style={styles.panelHeader}>Top Orthographic (Tactical Board)</div>
          <Board2D players={players} setPlayers={setPlayers} />
        </div>
        <div style={styles.panel}>
          <div style={styles.panelHeader}>User Perspective (3D Simulation)</div>
          <Scene3D players={players} />
        </div>
      </div>
    </div>
  );
}
