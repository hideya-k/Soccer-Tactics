import React, { useState, useEffect, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";

// ==========================================
// ⚙️ 設定エリア
// ==========================================

// ★ここにスプレッドシートの「CSV公開URL」を貼り付けてください！
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRJ5qTo4Ee4Z7pfMgrnT1E0Y78tV4uOIL5iTY350b8bAMfB_Km3tZEClo9jt7d-LaqSSQwREGrA8ZVC/pub?output=csv";

// 学年ごとのカラー設定 (高専対応 1-5年)
const getGradeColor = (grade) => {
  const g = parseInt(grade);
  switch (g) {
    case 1: return "#2196f3"; // 1年: 青
    case 2: return "#ffc107"; // 2年: 黄
    case 3: return "#f44336"; // 3年: 赤
    case 4: return "#4caf50"; // 4年: 緑 (New!)
    case 5: return "#9c27b0"; // 5年: 紫 (New!)
    default: return "#9e9e9e"; // その他: グレー
  }
};

// ==========================================
// 🛠️ 内部ロジック
// ==========================================

const THEME = {
  bg: "#1d1d1d", panelBg: "#303030", headerBg: "#2b2b2b", text: "#cccccc", gridLine: "#3a3a3a",
};

// デフォルト配置（シート読み込み失敗時や初回用）
const DEFAULT_POSITIONS = [
  // スタメン
  { x: 10, y: 50 }, 
  { x: 30, y: 20 }, { x: 30, y: 80 }, { x: 30, y: 35 }, { x: 30, y: 65 }, 
  { x: 50, y: 50 }, { x: 50, y: 30 }, { x: 50, y: 70 }, 
  { x: 70, y: 40 }, { x: 70, y: 60 }, { x: 80, y: 50 }, 
  // ベンチ
  { x: 105, y: 10 }, { x: 105, y: 25 }, { x: 105, y: 40 }, { x: 105, y: 55 },
  { x: 105, y: 70 }, { x: 105, y: 85 }
];

// CSV解析
const parseCSV = (text) => {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);
  const dataLines = lines.slice(1); // ヘッダー除去
  
  return dataLines.map((line, index) => {
    const cols = line.split(",");
    let posX = 105; 
    let posY = 10 + (index - 11) * 15; 

    if (index < 11) {
      posX = DEFAULT_POSITIONS[index]?.x || 50;
      posY = DEFAULT_POSITIONS[index]?.y || 50;
    }

    return {
      id: index,
      name: cols[0] || "未登録",
      number: cols[1] || "?",
      grade: cols[2] || 1,
      role: cols[3] || "PLY",
      x: posX,
      y: posY
    };
  });
};

// --- 3Dパーツ ---
const Player3D = ({ position, scale = 1 }) => {
  const x3d = (position.x - 50); 
  const z3d = (position.y - 50) * 0.7;
  const color = getGradeColor(position.grade);

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
      <Text position={[0, 4, 0]} fontSize={1.5} color="white" anchorX="center" anchorY="middle" outlineWidth={0.1} outlineColor="#000000">
        {position.number}
      </Text>
      <Text position={[0, 5.5, 0]} fontSize={1.2} color="white" anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="#000000">
        {position.name}
      </Text>
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
        <gridHelper args={[200, 40, 0x444444, 0x333333]} position={[0, 0.01, 0]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 50, 10]} intensity={1.5} castShadow />
        
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
          <planeGeometry args={[100, 70]} />
          <meshStandardMaterial color="#2e8b57" roughness={0.9} opacity={0.8} />
        </mesh>
        
        <FieldLines3D />
        
        {players.map((p) => ( <Player3D key={p.id} position={p} /> ))}
        
        {/* カメラ操作 (makeDefaultをつけることで操作の競合を防ぎます) */}
        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
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
    const x = ((e.clientX - rect.left) / rect.width) * 120; // ベンチエリア分考慮
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPlayers((prev) => prev.map((p) => (p.id === draggingId ? { ...p, x: x, y: y } : p)));
  };

  return (
    <div style={{...styles.board2dContainer}} onMouseMove={handleMouseMove} onMouseUp={() => setDraggingId(null)} onMouseLeave={() => setDraggingId(null)}>
      <div ref={boardRef} style={{ width: "70%", aspectRatio: "100/70", position: "relative", border: "2px solid #555", marginRight: "20%" }}>
        {/* コートライン */}
        <div style={{ position: "absolute", top: "50%", width: "100%", borderTop: "1px solid #555" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: "20%", paddingBottom: "20%", border: "1px solid #555", borderRadius: "50%", transform: "translate(-50%, -50%)" }} />
        
        {/* ベンチエリア */}
        <div style={{ position: "absolute", right: "-25%", top: 0, width: "20%", height: "100%", border: "1px dashed #444", backgroundColor: "rgba(0,0,0,0.1)", display: "flex", justifyContent: "center" }}>
          <span style={{ color: "#666", fontSize: "10px", marginTop: "5px" }}>BENCH</span>
        </div>

        {/* 選手 */}
        {players.map((p) => (
          <div key={p.id} onMouseDown={() => setDraggingId(p.id)} style={{
              left: `${p.x}%`, top: `${p.y}%`, position: "absolute", width: "24px", height: "24px", borderRadius: "50%",
              background: getGradeColor(p.grade), transform: "translate(-50%, -50%)", cursor: "grab", border: "2px solid #fff",
              boxShadow: "0 2px 4px rgba(0,0,0,0.5)", zIndex: 10, display: "flex", flexDirection:"column", justifyContent: "center", alignItems: "center", color: "white", userSelect: "none"
            }}>
            <span style={{ fontSize: "10px", fontWeight: "bold" }}>{p.number}</span>
            <span style={{ fontSize: "8px", position:"absolute", bottom:"-15px", width:"40px", textAlign:"center", textShadow:"0 1px 2px black", pointerEvents: "none" }}>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- メインアプリ (リサイズ機能付き) ---
export default function App() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 画面分割の比率 (左側の幅%)
  const [leftWidth, setLeftWidth] = useState(50);
  const containerRef = useRef(null);
  const isResizing = useRef(false);

  // シート読み込み
  useEffect(() => {
    fetch(SHEET_URL)
      .then(response => response.text())
      .then(text => {
        const data = parseCSV(text);
        if (data.length > 0) setPlayers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // リサイズ処理
  const startResizing = useCallback(() => { isResizing.current = true; }, []);
  const stopResizing = useCallback(() => { isResizing.current = false; }, []);
  const resize = useCallback((e) => {
    if (isResizing.current && containerRef.current) {
      const newWidth = (e.clientX / containerRef.current.clientWidth) * 100;
      // 10%〜90%の範囲に制限
      if (newWidth > 10 && newWidth < 90) {
        setLeftWidth(newWidth);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <div ref={containerRef} style={{...styles.container}}>
      <header style={styles.header}>
        <span style={{ fontWeight:'bold', marginRight:20 }}>⚽ Tactics 3D (KOSEN Ver.)</span>
        <span style={{ fontSize: "10px", color:"#888" }}>
          {loading ? "Loading..." : "Color: 1年(青) 2年(黄) 3年(赤) 4年(緑) 5年(紫)"}
        </span>
      </header>
      
      <div style={styles.main}>
        {/* 左パネル (2D) */}
        <div style={{ ...styles.panel, width: `${leftWidth}%`, flex: "none" }}>
          <div style={styles.panelHeader}>Tactical Board (2D)</div>
          <Board2D players={players} setPlayers={setPlayers} />
        </div>

        {/* リサイズ用ハンドル (ドラッグする棒) */}
        <div 
          onMouseDown={startResizing}
          style={{
            width: "5px", background: "#111", cursor: "col-resize", zIndex: 100,
            borderLeft: "1px solid #444", borderRight: "1px solid #444"
          }}
        />

        {/* 右パネル (3D) */}
        <div style={{ ...styles.panel, flex: 1 }}>
          <div style={styles.panelHeader}>3D Simulation (右ドラッグで移動 / ホイールで拡大)</div>
          <Scene3D players={players} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", width: "100vw", height: "100vh", background: THEME.bg, color: THEME.text, fontFamily: "'Segoe UI', sans-serif", overflow: "hidden" },
  header: { height: "30px", background: THEME.headerBg, borderBottom: "1px solid #111", display: "flex", alignItems: "center", padding: "0 10px", fontSize: "12px", userSelect: "none" },
  main: { display: "flex", flex: 1, height: "calc(100vh - 30px)" },
  panel: { background: THEME.panelBg, position: "relative", display: "flex", flexDirection: "column", overflow: "hidden" },
  panelHeader: { padding: "5px 10px", background: "rgba(0,0,0,0.2)", fontSize: "11px", color: "#aaa", borderBottom: "1px solid #222", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  board2dContainer: { flex: 1, position: "relative", backgroundImage: `linear-gradient(${THEME.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${THEME.gridLine} 1px, transparent 1px)`, backgroundSize: "20px 20px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
};
