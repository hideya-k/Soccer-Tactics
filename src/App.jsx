import React, { useState, useEffect, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Line, Sphere } from "@react-three/drei";
import * as THREE from "three";

// ==========================================
// ⚙️ 設定エリア
// ==========================================

// ★スプレッドシートURL (CSV)
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRJ5qTo4Ee4Z7pfMgrnT1E0Y78tV4uOIL5iTY350b8bAMfB_Km3tZEClo9jt7d-LaqSSQwREGrA8ZVC/pub?output=csv";

// カラー設定
const getGradeColor = (grade) => {
  if (grade === "ball") return "#ffffff";
  const g = parseInt(grade);
  switch (g) {
    case 1: return "#f44336"; // 1年: 赤
    case 2: return "#2196f3"; // 2年: 青
    case 3: return "#ffc107"; // 3年: 黄
    case 4: return "#e91e63"; // 4年: ピンク
    case 5: return "#03a9f4"; // 5年: 水色
    default: return "#9e9e9e";
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

// CSV解析
const parseCSV = (text) => {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);
  const dataLines = lines.slice(1);
  
  const players = dataLines.map((line, index) => {
    const cols = line.split(",");
    return {
      id: index,
      name: cols[0] || "未登録",
      grade: cols[2] || 1,
      x: 0, y: 0
    };
  });

  const BENCH_START_INDEX = 11;
  
  players.forEach((p, i) => {
    if (i < BENCH_START_INDEX) {
      p.x = STARTER_POSITIONS[i]?.x || 50;
      p.y = STARTER_POSITIONS[i]?.y || 50;
    } else {
      // ベンチ配置 (4列)
      // 枠線が消えるので、ピッチのすぐ右隣(103%あたり)から配置
      const benchIndex = i - BENCH_START_INDEX;
      const col = benchIndex % 4;
      const row = Math.floor(benchIndex / 4);
      p.x = 103 + col * 7; 
      p.y = 15 + row * 15;
    }
  });

  players.push({ id: "ball", name: "", grade: "ball", x: 50, y: 50 });

  return players;
};

// --- 3Dパーツ ---
const GoalFrame3D = ({ position, rotation }) => {
  const w = 7; const h = 2.4; const d = 2;
  const points = [
    [w, 0, 0], [w, h, 0], [-w, h, 0], [-w, 0, 0],
    [-w, h, 0], [-w, 0, -d], [w, 0, -d], [w, h, 0]
  ];
  return (
    <group position={position} rotation={rotation}>
      <Line points={points} color="white" lineWidth={2} />
    </group>
  );
};

const Object3D = ({ data }) => {
  const x3d = (data.x - 50); 
  const z3d = (data.y - 50) * 0.7;
  const color = getGradeColor(data.grade);
  const isBall = data.grade === "ball";

  return (
    <group position={[x3d, isBall ? 0.4 : 0, z3d]}>
      {isBall ? (
        <Sphere args={[0.4, 32, 32]} castShadow>
          <meshStandardMaterial color="white" roughness={0.4} />
        </Sphere>
      ) : (
        <>
          <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.5, 1.5, 0.5, 32]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.5, 3, 16]} />
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

const Scene3D = ({ players }) => {
  const lineProps = { color: "white", lineWidth: 1, opacity: 0.6, transparent: true };
  const fieldPoints = [[-50, 0.05, -35], [50, 0.05, -35], [50, 0.05, 35], [-50, 0.05, 35], [-50, 0.05, -35]];
  const centerLine = [[0, 0.05, -35], [0, 0.05, 35]];
  const penAreaLeft = [[-50, 0.05, -14], [-36, 0.05, -14], [-36, 0.05, 14], [-50, 0.05, 14]];
  const penAreaRight = [[50, 0.05, -14], [36, 0.05, -14], [36, 0.05, 14], [50, 0.05, 14]];
  const goalAreaLeft = [[-50, 0.05, -6], [-45, 0.05, -6], [-45, 0.05, 6], [-50, 0.05, 6]];
  const goalAreaRight = [[50, 0.05, -6], [45, 0.05, -6], [45, 0.05, 6], [50, 0.05, 6]];

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas shadows camera={{ position: [0, 70, 60], fov: 40 }}>
        <color attach="background" args={['#252525']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[20, 50, 20]} intensity={1.5} castShadow />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
          <planeGeometry args={[130, 100]} />
          <meshStandardMaterial color="#2e8b57" roughness={0.9} />
        </mesh>
        <group position={[0, 0.06, 0]}>
          <Line points={fieldPoints} {...lineProps} />
          <Line points={centerLine} {...lineProps} />
          <Line points={penAreaLeft} {...lineProps} />
          <Line points={penAreaRight} {...lineProps} />
          <Line points={goalAreaLeft} {...lineProps} />
          <Line points={goalAreaRight} {...lineProps} />
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[9, 9.3, 64]} />
            <meshBasicMaterial color="white" opacity={0.6} transparent side={THREE.DoubleSide} />
          </mesh>
        </group>
        <GoalFrame3D position={[-50, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <GoalFrame3D position={[50, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        {players.map((p) => ( <Object3D key={p.id} data={p} /> ))}
        <OrbitControls makeDefault enableDamping dampingFactor={0.1} minPolarAngle={0} maxPolarAngle={Math.PI/2.2} />
      </Canvas>
    </div>
  );
};

// --- 2Dボード ---
const Board2D = ({ players, setPlayers, scale, setScale }) => {
  const boardRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);

  const handleWheel = (e) => {
    const delta = -e.deltaY * 0.001; 
    setScale(prev => Math.min(Math.max(0.5, prev + delta), 2.5)); 
  };

  const handleMouseMove = (e) => {
    if (draggingId === null || !boardRef.current) return;
    
    // 【重要】getBoundingClientRect()は、拡大縮小後の「現在の見た目のサイズ」を返します
    const rect = boardRef.current.getBoundingClientRect();
    
    // マウスの位置と、要素の左上との差分
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 比率計算: rect.width が「見た目の100%」なので、これで割れば正確な%が出る
    // 前回の 135倍 を廃止し、純粋な 100倍 に戻しました。
    // これでマウスとアイコンの位置が 1:1 に同期します。
    const x = (mouseX / rect.width) * 100; 
    const y = (mouseY / rect.height) * 100;

    setPlayers((prev) => prev.map((p) => (p.id === draggingId ? { ...p, x, y } : p)));
  };

  const stopDragging = () => setDraggingId(null);

  return (
    <div 
      style={{...styles.board2dContainer, overflow: "hidden" }} 
      onMouseMove={handleMouseMove} 
      onMouseUp={stopDragging} 
      onMouseLeave={stopDragging}
      onWheel={handleWheel}
    >
      <div style={{ 
        width: "100%", height: "100%", 
        display: "flex", justifyContent:"center", alignItems:"center",
        transform: `scale(${scale})`, 
        transformOrigin: "center center",
        transition: "transform 0.1s ease-out"
      }}>
        {/* ピッチ (ここが座標の基準 0-100%) */}
        <div ref={boardRef} style={{ width: "70%", aspectRatio: "105/68", position: "relative", border: "2px solid #eee", marginRight: "25%", backgroundColor: "#2e8b57", boxSizing: "border-box" }}>
          
          {/* ライン類 */}
          <div style={{ position: "absolute", top: 0, left: "50%", width: "1px", height: "100%", background: "rgba(255,255,255,0.5)" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", width: "18%", paddingBottom: "18%", border: "1px solid rgba(255,255,255,0.5)", borderRadius: "50%", transform: "translate(-50%, -50%)" }} />
          <div style={{ position: "absolute", top: "20%", left: 0, width: "16%", height: "60%", border: "1px solid rgba(255,255,255,0.5)", borderLeft: "none" }} />
          <div style={{ position: "absolute", top: "20%", right: 0, width: "16%", height: "60%", border: "1px solid rgba(255,255,255,0.5)", borderRight: "none" }} />
          <div style={{ position: "absolute", top: "36%", left: 0, width: "6%", height: "28%", border: "1px solid rgba(255,255,255,0.5)", borderLeft: "none" }} />
          <div style={{ position: "absolute", top: "36%", right: 0, width: "6%", height: "28%", border: "1px solid rgba(255,255,255,0.5)", borderRight: "none" }} />
          <div style={{ position: "absolute", top: "44%", left: "-2px", width: "0", height: "12%", borderLeft: "4px solid #fff" }} />
          <div style={{ position: "absolute", top: "44%", right: "-2px", width: "0", height: "12%", borderRight: "4px solid #fff" }} />

          {/* ベンチエリア (枠線・背景削除、文字のみ) */}
          <div style={{ position: "absolute", left: "100%", top: 0, width: "30%", height: "100%" }}>
            <div style={{ color: "#666", fontSize: "10px", textAlign: "center", padding:"5px" }}>BENCH</div>
          </div>

          {/* プレイヤー */}
          {players.map((p) => {
            const isBall = p.grade === "ball";
            const isDragging = draggingId === p.id;
            return (
              <div key={p.id} onMouseDown={() => setDraggingId(p.id)} style={{
                  left: `${p.x}%`, top: `${p.y}%`,
                  position: "absolute",
                  width: isBall ? "16px" : "26px", height: isBall ? "16px" : "26px",
                  borderRadius: "50%",
                  background: getGradeColor(p.grade),
                  transform: "translate(-50%, -50%)",
                  cursor: isDragging ? "grabbing" : "grab",
                  border: isBall ? "2px solid #ccc" : "2px solid #fff",
                  boxShadow: isDragging ? "0 5px 15px rgba(0,0,0,0.5)" : "0 2px 4px rgba(0,0,0,0.5)",
                  zIndex: isDragging ? 100 : 10,
                  display: "flex", justifyContent: "center", alignItems: "center",
                  transition: isDragging ? "none" : "all 0.1s"
                }}>
                {!isBall && (
                  <span style={{ fontSize: "10px", fontWeight: "bold", textShadow:"0 1px 2px black", position:"absolute", bottom:"-18px", width:"80px", textAlign:"center", whiteSpace:"nowrap", color:"white", pointerEvents:"none" }}>
                    {p.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- メインアプリ ---
export default function App() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leftWidth, setLeftWidth] = useState(50);
  const [zoomScale, setZoomScale] = useState(1.0);
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
        <span style={{ fontSize: "10px", color:"#aaa", marginRight: "auto" }}>
          {loading ? "Loading..." : "赤:1年 青:2年 黄:3年 桃:4年 水:5年 | 白:ボール"}
        </span>
        <button onClick={() => setZoomScale(1.0)} style={styles.resetBtn}>Reset Zoom</button>
      </header>
      <div style={styles.main}>
        <div style={{ ...styles.panel, width: `${leftWidth}%` }}>
          <div style={styles.panelHeader}>2D Board (Wheel to Zoom)</div>
          <Board2D players={players} setPlayers={setPlayers} scale={zoomScale} setScale={setZoomScale} />
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
  resizer: { width: "5px", background: "#1a1a1a", cursor: "col-resize", zIndex: 10, borderLeft: "1px solid #333", borderRight: "1px solid #333" },
  resetBtn: { background: "#444", border: "1px solid #666", color: "#ccc", fontSize: "10px", padding: "2px 8px", cursor: "pointer", borderRadius: "4px" }
};
