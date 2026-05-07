import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import "./App.css";
import {
  FilesetResolver,
  HandLandmarker,
} from "@mediapipe/tasks-vision";

export default function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const [dot, setDot] = useState(null);
  const [level, setLevel] = useState(0);

  const [showWin, setShowWin] = useState(false);

  const handRef = useRef(null);
  const lastPoint = useRef(null);
  const smoothPoint = useRef(null);
  const prevRawPoint = useRef(null);
  const velocityRef = useRef({ x: 0, y: 0 });

  const pathRef = useRef([]);

  // 🎮 LEVEL PATTERNS
  const levels = [
  // 1. Horizontal line
  [{ x: 50, y: 200 }, { x: 450, y: 200 }],

  // 2. Vertical line
  [{ x: 250, y: 50 }, { x: 250, y: 350 }],

  // 3. Diagonal /
  [{ x: 50, y: 350 }, { x: 450, y: 50 }],

  // 4. Diagonal \
  [{ x: 50, y: 50 }, { x: 450, y: 350 }],

  // 5. Square
  [
    { x: 100, y: 100 },
    { x: 400, y: 100 },
    { x: 400, y: 300 },
    { x: 100, y: 300 },
    { x: 100, y: 100 },
  ],

  // 6. Triangle
  [
    { x: 250, y: 80 },
    { x: 80, y: 320 },
    { x: 420, y: 320 },
    { x: 250, y: 80 },
  ],

  // 7. Zigzag
  [
    { x: 50, y: 100 },
    { x: 150, y: 300 },
    { x: 250, y: 100 },
    { x: 350, y: 300 },
    { x: 450, y: 100 },
  ],

  // 8. Circle (approx)
  [
    { x: 250, y: 80 },
    { x: 350, y: 150 },
    { x: 350, y: 250 },
    { x: 250, y: 320 },
    { x: 150, y: 250 },
    { x: 150, y: 150 },
    { x: 250, y: 80 },
  ],

  // 9. Plus +
  [
    { x: 250, y: 50 },
    { x: 250, y: 350 },
    { x: 250, y: 200 },
    { x: 50, y: 200 },
    { x: 450, y: 200 },
  ],

  // 10. X shape
  [
    { x: 50, y: 50 },
    { x: 450, y: 350 },
    { x: 250, y: 200 },
    { x: 50, y: 350 },
    { x: 450, y: 50 },
  ],

  // 11. Diamond
  [
    { x: 250, y: 50 },
    { x: 400, y: 200 },
    { x: 250, y: 350 },
    { x: 100, y: 200 },
    { x: 250, y: 50 },
  ],

  // 12. House shape
  [
    { x: 100, y: 200 },
    { x: 250, y: 80 },
    { x: 400, y: 200 },
    { x: 400, y: 350 },
    { x: 100, y: 350 },
    { x: 100, y: 200 },
  ],

  // 13. Wave
  [
    { x: 50, y: 200 },
    { x: 100, y: 150 },
    { x: 150, y: 250 },
    { x: 200, y: 150 },
    { x: 250, y: 250 },
    { x: 300, y: 150 },
    { x: 350, y: 250 },
    { x: 400, y: 150 },
    { x: 450, y: 200 },
  ],

  // 14. Letter L
  [
    { x: 150, y: 50 },
    { x: 150, y: 350 },
    { x: 350, y: 350 },
  ],

  // 15. Letter T
  [
    { x: 50, y: 80 },
    { x: 450, y: 80 },
    { x: 250, y: 80 },
    { x: 250, y: 350 },
  ],

  // 16. Arrow →
  [
    { x: 100, y: 200 },
    { x: 350, y: 200 },
    { x: 300, y: 150 },
    { x: 350, y: 200 },
    { x: 300, y: 250 },
  ],

  // 17. Arrow ←
  [
    { x: 400, y: 200 },
    { x: 150, y: 200 },
    { x: 200, y: 150 },
    { x: 150, y: 200 },
    { x: 200, y: 250 },
  ],

  // 18. Infinity (∞)
  [
    { x: 150, y: 200 },
    { x: 250, y: 100 },
    { x: 350, y: 200 },
    { x: 250, y: 300 },
    { x: 150, y: 200 },
    { x: 250, y: 100 },
  ],

  // 19. Heart (simple)
  [
    { x: 250, y: 300 },
    { x: 100, y: 180 },
    { x: 180, y: 80 },
    { x: 250, y: 150 },
    { x: 320, y: 80 },
    { x: 400, y: 180 },
    { x: 250, y: 300 },
  ],

  // 20. Star
  [
    { x: 250, y: 50 },
    { x: 300, y: 200 },
    { x: 450, y: 200 },
    { x: 320, y: 280 },
    { x: 370, y: 430 },
    { x: 250, y: 340 },
    { x: 130, y: 430 },
    { x: 180, y: 280 },
    { x: 50, y: 200 },
    { x: 200, y: 200 },
    { x: 250, y: 50 },
  ],
];

  useEffect(() => {
    const setupCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const dpr = window.devicePixelRatio || 1;
      canvas.width = 500 * dpr;
      canvas.height = 400 * dpr;
      canvas.style.width = "500px";
      canvas.style.height = "400px";

      ctx.scale(dpr, dpr);
    };

    const drawPattern = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const pattern = levels[level];
      if (!pattern) return;

      ctx.strokeStyle = "#9CA3AF";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(pattern[0].x, pattern[0].y);

      for (let i = 1; i < pattern.length; i++) {
        ctx.lineTo(pattern[i].x, pattern[i].y);
      }

      ctx.stroke();
    };

    const loadModel = async () => {
      setupCanvas();

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      handRef.current =
        await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          },
          numHands: 1,
          runningMode: "VIDEO",
        });

      const loop = () => {
        runDetection();
        requestAnimationFrame(loop);
      };
      loop();
    };

    const runDetection = async () => {
      const video = webcamRef.current?.video;
      const canvas = canvasRef.current;

      if (
        video &&
        video.readyState === 4 &&
        handRef.current &&
        canvas
      ) {
        const results =
          handRef.current.detectForVideo(
            video,
            performance.now()
          );

        if (results.landmarks?.length > 0) {
          const finger = results.landmarks[0][8];

          const width = video.clientWidth;
          const height = video.clientHeight;

          let rawX = finger.x * width;
          let rawY = finger.y * height;

          rawX = width - rawX;

          if (prevRawPoint.current) {
            velocityRef.current.x =
              rawX - prevRawPoint.current.x;
            velocityRef.current.y =
              rawY - prevRawPoint.current.y;
          }

          prevRawPoint.current = { x: rawX, y: rawY };

          const speed = Math.sqrt(
            velocityRef.current.x ** 2 +
              velocityRef.current.y ** 2
          );

          const alpha = speed > 10 ? 0.25 : 0.12;

          if (!smoothPoint.current) {
            smoothPoint.current = { x: rawX, y: rawY };
          } else {
            smoothPoint.current.x +=
              (rawX - smoothPoint.current.x) * alpha;
            smoothPoint.current.y +=
              (rawY - smoothPoint.current.y) * alpha;
          }

          let x = smoothPoint.current.x;
          let y = smoothPoint.current.y;

          x += velocityRef.current.x * 0.15;
          y += velocityRef.current.y * 0.15;

          setDot({ x, y });
          drawLine(x, y, speed);
        } else {
          lastPoint.current = null;
          smoothPoint.current = null;
          prevRawPoint.current = null;
        }
      }
    };

    const drawLine = (x, y, speed) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      ctx.strokeStyle = "#111827";
      ctx.lineWidth = Math.max(1, 2.2 - speed * 0.03);
      ctx.lineCap = "round";

      pathRef.current.push({ x, y });

      if (!lastPoint.current) {
        lastPoint.current = { x, y };
        return;
      }

      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();

      lastPoint.current = { x, y };
    };

    loadModel();

    setTimeout(drawPattern, 500);
  }, [level]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    lastPoint.current = null;
    smoothPoint.current = null;
    prevRawPoint.current = null;
    pathRef.current = [];

    // redraw pattern
    const pattern = levels[level];
    if (!pattern) return;

    ctx.strokeStyle = "#9CA3AF";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(pattern[0].x, pattern[0].y);

    for (let i = 1; i < pattern.length; i++) {
      ctx.lineTo(pattern[i].x, pattern[i].y);
    }

    ctx.stroke();
  };

  const checkMatch = () => {
    const userPath = pathRef.current;
    const pattern = levels[level];

    if (!pattern || userPath.length < 10) return false;

    let score = 0;

    pattern.forEach((p) => {
      const close = userPath.some(
        (u) =>
          Math.abs(u.x - p.x) < 40 &&
          Math.abs(u.y - p.y) < 40
      );
      if (close) score++;
    });

    return score / pattern.length > 0.7;
  };

  const handleSubmit = () => {
  const success = checkMatch();

  if (success) {
    setShowWin(true);

    setTimeout(() => {
      setShowWin(false);

      setLevel((l) => {
        if (l + 1 >= levels.length) {
          alert("🎉 You completed all levels!");
          return 0;
        }
        return l + 1;
      });

      clearCanvas();
    }, 1500);
  } else {
    alert("❌ Try Again!");
    clearCanvas();
  }
};

  return (
    <div className="app">
      <h1 className="title">GestureDraw Game</h1>
      <h2>Level {level + 1}</h2>

      <div className="container">
        {/* Webcam */}
        <div className="card webcam-box">
          <Webcam
            ref={webcamRef}
            mirrored={true}
            audio={false}
          />

          {dot && (
            <div
              className="dot"
              style={{
                left: dot.x - 6,
                top: dot.y - 6,
              }}
            />
          )}
        </div>

        {/* Canvas */}
        <div className="card">
          <canvas ref={canvasRef} />

          <div className="buttons">
            <button onClick={clearCanvas}>Clear</button>
            <button onClick={handleSubmit}>
              Submit
            </button>
          </div>
        </div>
      </div>
      {showWin && (
  <div className="win-overlay">
    <div className="win-box">
      <h1>✅ Level Complete!</h1>
      <p>Next level loading...</p>
    </div>
  </div>
)}
    </div>
  );
}