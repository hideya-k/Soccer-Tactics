import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Line, Sphere, Cylinder } from "@react-three/drei";
import * as THREE from "three";

// ==========================================
// ⚙️ 設定エリア
// ==========================================

// ★スプレッドシートURL (CSV)
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRJ5qTo4Ee4Z7pfMgrnT1E0Y78tV4uOIL5iTY350b8bAMfB_Km3tZEClo9jt7d-LaqSSQwREGrA8ZVC/pub?output=csv";

// カラー設定 (学年 + ボール)
const getGradeColor = (grade) => {
  if (grade === "ball") return "#ffffff"; // ボールは白
  const g = parseInt(grade);
  switch (g) {
    case 1: return "#f44336"; // 1年: 赤
    case 2: return "#2196f3"; // 2年: 青
    case 3: return "#ffc107"; // 3年: 黄
    case 4: return "#e91e63"; // 4年: ピンク
    case 5: return "#03a9f4"; // 5年: 水色
    default: return "#9e9e9e"; // その他
  }
};

// ==========================================
// 🛠️ 内部ロジック
// ==========================================

const THEME = {
  bg: "#1d1d1d", panelBg: "#303030", headerBg: "#2b2b2b", text: "#cccccc", gridLine: "#3a3a3a",
};

// スタメン初期位置
const STARTER_POSITIONS = [
  { x: 10, y: 50 }, // GK
  { x: 30, y: 20 }, { x: 30, y: 80 }, { x: 30, y: 35 }, { x: 30, y: 65 }, // DF
  { x: 50, y: 50 }, { x: 50, y: 30 }, { x: 50, y: 70 }, // MF
  { x: 70, y: 40 }, { x: 70, y: 60 }, { x: 80, y: 50 }  // FW
];

// CSV解析 & 配置ロジック
const parseCSV = (text) => {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);
  const dataLines = lines.slice(1);
  
  const players = dataLines.map((line, index) => {
    const cols = line.split(",");
    return {
      id: index, // 数値ID (0始まり)
      name: cols[0] || "未登録",
      grade: cols[2] || 1,
      x: 0, y: 0
    };
  });

  const BENCH_START_INDEX = 11;
  
  // 配置計算
  players.forEach((p, i) => {
    if (i < BENCH_START_INDEX) {
      // スタメン配置
      p.x = STARTER_POSITIONS[i]?.x || 50;
      p.y = STARTER_POSITIONS[i]?.y || 50;
    } else {
      // ベンチ配置 (4列グリッド)
      const benchIndex = i - BENCH_START_INDEX;
      const col = benchIndex % 4;
      const row = Math.floor(benchIndex / 4);
      
      p.x = 105 + col * 7; // 横間隔
      p.y = 15 + row * 15;  // 縦間隔
    }
  });

  // ボールを追加
  players.push({
    id: "ball", name: "", grade: "ball", x: 50, y: 50
  });

  return players;
};

// --- 3Dパーツ: ゴール ---
const Goal3D = ({ position, rotation }) => {
  const material = new THREE.MeshStandardMaterial({ color: "white", roughness: 0.5 });
  const postRadius = 0.3;
  return (
    <group position={position} rotation={rotation}>
      {/* ポストとバー */}
      <mesh position={[0, 4, -7]} material={material}><cylinderGeometry args={[postRadius, postRadius, 14]} /></mesh> // 上
      <mesh position={[-7, 2, 0]} material={material}><cylinderGeometry args={[postRadius, postRadius, 4]} /></mesh> // 左
      <mesh position={[7, 2, 0]} material={material}><cylinderGeometry args={[postRadius, postRadius, 4]} /></mesh> // 右
      {/* 後ろの支え (簡易) */}
      <mesh position={[-7, 2, -3]} rotation={[Math.PI/4,0,0]} material={material}><cylinderGeometry args={[postRadius/2, postRadius/2, 5]} /></mesh>
      <mesh position={[7, 2, -3]} rotation={[Math.PI/4,0,0]} material={material}><cylinderGeometry args={[postRadius/2, postRadius/2, 5]} /></mesh>
    </group>
  );
};

// --- 3Dパーツ: プレイヤー/ボール ---
const Object3D = ({ data, scale = 1 }) => {
  const x3d = (data.x - 50); 
  const z3d = (data.y - 50) * 0.7;
  const color = getGradeColor(data.grade);
  const isBall = data.grade === "ball";

  return (
    <group position={[x3d, isBall ? 0.75 : 0, z3d]}>
      {isBall ? (
        // ボール
        <Sphere args={[0.75 * scale, 32, 32]} castShadow>
          <meshStandardMaterial color="white" roughness={0.4} metalness={0.1} />
        </Sphere>
      ) : (
        // プレイヤーコマ
        <>
          <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.5 * scale, 1.5 * scale, 0.5, 32]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.5 * scale, 0.5 * scale, 3, 16]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
          <Text position={[0, 4.5, 0]} fontSize={1.5} color="white" anchorX="center" anchorY="middle" outlineWidth={0.1} outlineColor="#000000">
            {data.name}
          </Text>
        </>
      )}
    </group>
  );
};

// --- 3Dシーン ---
const Scene3D = ({ players }) => {
  // フィールドライン定義
  const lineProps = { color: "white", lineWidth: 1, opacity: 0.6, transparent: true };
  const fieldPoints = [[-50, 0.05, -35], [50, 0.05, -35], [50, 0.05, 35], [-50, 0.05, 35], [-50, 0.05, -35]];
  const centerLine = [[0, 0.05, -35], [0, 0.05, 35]];
  const goalAreaLeft = [[-50, 0.05, -10], [-44, 0.05, -10], [-44, 0.05, 10], [-50, 0.05, 10]];
  const goalAreaRight = [[50, 0.05, -10], [44, 0.05, -10], [44, 0.05, 10], [50, 0.05, 10]];

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas shadows camera={{ position: [0, 70, 60], fov: 40 }}>
        <color attach="background" args={['#252525']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[20, 50, 20]} intensity={1.5} castShadow />
        
        {/* 芝生 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
          <planeGeometry args={[120, 90]} />
          <meshStandardMaterial color="#2e8b57" roughness={0.9} />
        </mesh>
        
        {/* ライン */}
        <group position={[0, 0.06, 0]}>
          <Line points={fieldPoints} {...lineProps} />
          <Line points={centerLine} {...lineProps} />
          <Line points={goalAreaLeft} {...lineProps} />
          <Line points={goalAreaRight} {...lineProps} />
          {/* センターサークル */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[9, 9.3, 64]} />
            <meshBasicMaterial color="white" opacity={0.6} transparent side={THREE.DoubleSide} />
          </mesh>
        </group>

        {/* ゴール */}
        <Goal3D position={[-50, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <Goal3D position={[50, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />

        {/* プレイヤー&ボール */}
        {players.map((p) => ( <Object3D key={p.id} data={p} /> ))}
        <OrbitControls makeDefault enableDamping dampingFactor={0.1} minPolarAngle={0} maxPolarAngle={Math.PI/2.2} />
      </Canvas>
    </div>
  );
};

// --- 2Dボード ---
const Board2D = ({ players, setPlayers }) => {
  const boardRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);

  // ドラッグ処理 (【重要】draggingId === null で判定するよう修正)
  const handleMouseMove = (e) => {
    if (draggingId === null || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    // マウス位置を相対座標(%)に変換
    const x = ((e.clientX - rect.left) / rect.width) * 135; // ベンチエリア込みの幅
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPlayers((prev) => prev.map((p) => (p.id === draggingId ? { ...p, x, y } : p)));
  };

  const stopDragging = () => setDraggingId(null);

  return (
    <div style={{...styles.board2dContainer}} onMouseMove={handleMouseMove} onMouseUp={stopDragging} onMouseLeave={stopDragging}>
      <div ref={boardRef} style={{ width: "70%", aspectRatio: "100/70", position: "relative", border: "2px solid #eee", marginRight: "25%", backgroundColor: "#2e8b57", boxSizing: "border-box" }}>
        
        {/* --- 2Dライン装飾 --- */}
        {/* センターライン */}
        <div style={{ position: "absolute", top: 0, left: "50%", width: "1px", height: "100%", background: "rgba(255,255,255,0.6)" }} />
        {/* センターサークル */}
        <div style={{ position: "absolute", top: "50%", left: "50%", width: "18%", paddingBottom: "18%", border: "1px solid rgba(255,255,255,0.6)", borderRadius: "50%", transform: "translate(-50%, -50%)" }} />
        {/* ゴールエリア */}
        <div style={{ position: "absolute", top: "30%", left: 0, width: "8%", height: "40%", border: "1px solid rgba(255,255,255,0.6)", borderLeft: "none" }} />
        <div style={{ position: "absolute", top: "30%", right: 0, width: "8%", height: "40%", border: "1px solid rgba(255,255,255,0.6)", borderRight: "none" }} />

        {/* ベンチエリア */}
        <div style={{ position: "absolute", right: "-35%", top: 0, width: "30%", height: "100%", borderLeft: "2px dashed #555", backgroundColor: "#222", boxSizing:"border-box" }}>
          <div style={{ color: "#888", fontSize: "10px", textAlign: "center", padding:"5px" }}>BENCH</div>
        </div>

        {/* --- プレイヤー & ボール --- */}
        {players.map((p) => {
          const isBall = p.grade === "ball";
          const isDragging = draggingId === p.id;
          return (
            <div key={p.id} onMouseDown={() => setDraggingId(p.id)} style={{
                left: `${p.x}%`, top: `${p.y}%`,
                position: "absolute",
                width: isBall ? "16px" : "24px", height: isBall ? "16px" : "24px",
                borderRadius: "50%",
                background: getGradeColor(p.grade),
                transform: "translate(-50%, -50%)", // 中心を座標に合わせる
                cursor: isDragging ? "grabbing" : "grab",
                border: isBall ? "2px solid #ccc" : "2px solid #fff",
                boxShadow: isDragging ? "0 5px 10px rgba(0,0,0,0.5)" : "0 2px 4px rgba(0,0,0,0.5)",
                zIndex: isDragging ? 100 : 10,
                display: "flex", justifyContent: "center", alignItems: "center",
                userSelect: "none", transition: isDragging ? "none" : "box-shadow 0.1s"
              }}>
              {!isBall && (
                <span style={{ fontSize: "9px", fontWeight: "bold", textShadow:"0 1px 2px black", position:"absolute", bottom:"-16px", width:"60px", textAlign:"center", whiteSpace:"nowrap", color:"white", pointerEvents:"none" }}>
                  {p.name}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- メインアプリ ---
export default function App() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leftWidth, setLeftWidth] = useState(50);
  const containerRef = useRef(null);
  const isResizing = useRef(false);

  useEffect(() => {
    fetch(SHEET_URL)
      .then(r => r.text()).then(t => {
        setPlayers(parseCSV(t)); setLoading(false);
      })
      .catch(e => { console.error(e); setLoading(false); });
  }, []);

  const startResize = useCallback(() => { isResizing.current = true; }, []);
  const stopResize = useCallback(() => { isResizing.current = false; }, []);
  const doResize = useCallback((e) => {
    if (isResizing.current && containerRef.current) {
      const newW = (e.clientX / containerRef.current.clientWidth) * 100;
      if (newW > 20 && newW < 80) setLeftWidth(newW);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", doResize);
    window.addEventListener("mouseup", stopResize);
    return () => { window.removeEventListener("mousemove", doResize); window.removeEventListener("mouseup", stopResize); };
  }, [doResize, stopResize]);

  return (
    <div ref={containerRef} style={styles.container}>
      <header style={styles.header}>
        <span style={{ fontWeight:'bold', marginRight:20 }}>⚽ Tactics 3D (Pro Ver.)</span>
        <span style={{ fontSize: "10px", color:"#aaa" }}>
          {loading ? "Loading..." : "赤:1年 青:2年 黄:3年 桃:4年 水:5年 | 白:ボール"}
        </span>
      </header>
      <div style={styles.main}>
        <div style={{ ...styles.panel, width: `${leftWidth}%` }}>
          <div style={styles.panelHeader}>2D Board</div>
          <Board2D players={players} setPlayers={setPlayers} />
        </div>
        <div onMouseDown={startResize} style={styles.resizer} />
        <div style={{ ...styles.panel, flex: 1 }}>
          <div style={styles.panelHeader}>3D View</div>
          <Scene3D players={players} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", width: "100vw", height: "100vh", background: THEME.bg, color: THEME.text, fontFamily: "'Segoe UI', sans-serif", overflow: "hidden" },
  header: { height: "30px", background: THEME.headerBg, borderBottom: "1px solid #111", display: "flex", alignItems: "center", padding: "0 10px", fontSize: "12px", userSelect: "none" },
  main: { display: "flex", flex: 1, height: "calc(100vh - 30px)", position: "relative" },
  panel: { background: THEME.panelBg, display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" },
  panelHeader: { padding: "5px 10px", background: "rgba(0,0,0,0.3)", fontSize: "11px", color: "#aaa", borderBottom: "1px solid #222" },
  board2dContainer: { flex: 1, position: "relative", background: "#222", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  resizer: { width: "5px", background: "#1a1a1a", cursor: "col-resize", zIndex: 10, borderLeft: "1px solid #333", borderRight: "1px solid #333" }
};
