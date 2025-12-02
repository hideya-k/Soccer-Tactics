import React, { useState, useEffect, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";

// ==========================================
// ⚙️ 設定エリア
// ==========================================

// ★ここにスプレッドシートの「CSV公開URL」を貼り付けてください！
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/xxxxx...../pub?output=csv";

// 学年ごとのカラー設定 (要望対応版)
// 1年:赤, 2年:青, 3年:黄 (基本サイクル)
// 4年(1年の合同):ピンク, 5年(2年の合同):水色
const getGradeColor = (grade) => {
  const g = parseInt(grade);
  switch (g) {
    case 1: return "#f44336"; // 1年: 赤
    case 2: return "#2196f3"; // 2年: 青
    case 3: return "#ffc107"; // 3年: 黄
    case 4: return "#e91e63"; // 4年: ピンク (赤の変種)
    case 5: return "#03a9f4"; // 5年: 水色 (青の変種)
    case 6: return "#ff9800"; // 6年(専攻科?): オレンジ (黄の変種)
    default: return "#9e9e9e"; // その他: グレー
  }
};

// ==========================================
// 🛠️ 内部ロジック
// ==========================================

const THEME = {
  bg: "#1d1d1d", panelBg: "#303030", headerBg: "#2b2b2b", text: "#cccccc", gridLine: "#3a3a3a",
};

// スタメンのデフォルト配置 (1-11人目)
const STARTER_POSITIONS = [
  { x: 10, y: 50 }, // GK
  { x: 30, y: 20 }, { x: 30, y: 80 }, { x: 30, y: 35 }, { x: 30, y: 65 }, // DF
  { x: 50, y: 50 }, { x: 50, y: 30 }, { x: 50, y: 70 }, // MF
  { x: 70, y: 40 }, { x: 70, y: 60 }, { x: 80, y: 50 }  // FW
];

// CSV解析 & 自動配置ロジック
const parseCSV = (text) => {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);
  const dataLines = lines.slice(1); // ヘッダー除去
  
  // まず全員のデータをオブジェクト化
  const allPlayers = dataLines.map((line, index) => {
    const cols = line.split(",");
    return {
      id: index,
      name: cols[0] || "未登録",
      // 背番号(cols[1])は読み捨てるか、内部データとしてだけ保持
      grade: cols[2] || 1,
      role: cols[3] || "PLY",
      x: 0, y: 0 // 後で計算
    };
  });

  // スタメンとベンチの境界
  const BENCH_START_INDEX = 11;
  const benchCount = Math.max(0, allPlayers.length - BENCH_START_INDEX);

  return allPlayers.map((p, i) => {
    if (i < BENCH_START_INDEX) {
      // --- スタメン配置 ---
      p.x = STARTER_POSITIONS[i]?.x || 50;
      p.y = STARTER_POSITIONS[i]?.y || 50;
    } else {
      // --- ベンチ配置 (均等割り) ---
      // ベンチエリア(Y:0-100)を人数+1等分して配置
      const benchIndex = i - BENCH_START_INDEX;
      const split = 100 / (benchCount + 1);
      
      p.x = 112; // ベンチエリアの横中心あたり
      p.y = split * (benchIndex + 1);
    }
    return p;
  });
};

// --- 3Dパーツ ---
const Player3D = ({ position, scale = 1 }) => {
  const x3d = (position.x - 50); 
  const z3d = (position.y - 50) * 0.7;
  const color = getGradeColor(position.grade);

  return (
    <group position={[x3d, 0, z3d]}>
      {/* 台座 */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.5 * scale, 1.5 * scale, 0.5, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* 本体 */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.5 * scale, 0.5 * scale, 3, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      
      {/* 背番号削除 → 名前のみ表示 */}
      <Text position={[0, 4.5, 0]} fontSize={1.5} color="white" anchorX="center" anchorY="middle" outlineWidth={0.1} outlineColor="#000000">
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
    const x = ((e.clientX - rect.left) / rect.width) * 120;
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
            {/* 背番号削除 → 代わりに名前を表示 */}
            <span style={{ fontSize: "9px", fontWeight: "bold", textShadow:"0 1px 2px black", width:"40px", textAlign:"center", whiteSpace:"nowrap" }}>{p.name}</span>
          </div>
        ))}
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

  const startResizing = useCallback(() => { isResizing.current = true; }, []);
  const stopResizing = useCallback(() => { isResizing.current = false; }, []);
  const resize = useCallback((e) => {
    if (isResizing.current && containerRef.current) {
      const newWidth = (e.clientX / containerRef.current.clientWidth) * 100;
      if (newWidth > 10 && newWidth < 90) setLeftWidth(newWidth);
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
        <span style={{ fontWeight:'bold', marginRight:20 }}>⚽ Tactics 3D</span>
        <span style={{ fontSize: "10px", color:"#888" }}>
          {loading ? "Loading..." : "1年(赤) 2年(青) 3年(黄) 4年(桃) 5年(水)"}
        </span>
      </header>
      
      <div style={styles.main}>
        <div style={{ ...styles.panel, width: `${leftWidth}%`, flex: "none" }}>
          <div style={styles.panelHeader}>Tactical Board (2D)</div>
          <Board2D players={players} setPlayers={setPlayers} />
        </div>
        <div onMouseDown={startResizing} style={{ width: "5px", background: "#111", cursor: "col-resize", zIndex: 100, borderLeft: "1px solid #444", borderRight: "1px solid #444" }} />
        <div style={{ ...styles.panel, flex: 1 }}>
          <div style={styles.panelHeader}>3D Simulation</div>
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
