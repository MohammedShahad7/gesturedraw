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

  const handRef = useRef(null);
  const lastPoint = useRef(null);
  const smoothPoint = useRef(null);

  useEffect(() => {
    let interval;

    const loadModel = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      handRef.current =
        await HandLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            },
            numHands: 1,
            runningMode: "VIDEO",
          }
        );

      interval = setInterval(runDetection, 20);
    };

    const runDetection = async () => {
  const video = webcamRef.current?.video;

  if (video && video.readyState === 4 && handRef.current) {
    const results = handRef.current.detectForVideo(
      video,
      performance.now()
    );

    if (results.landmarks && results.landmarks.length > 0) {
      const finger = results.landmarks[0][8];

      // REAL DISPLAY SIZE (IMPORTANT FIX)
      const width = video.clientWidth;
      const height = video.clientHeight;

      // Convert coordinates properly
      let x = finger.x * width;
      let y = finger.y * height;

      // FIX MIRROR (because mirrored=true)
      x = width - x;

      // Smooth movement
      if (!smoothPoint.current) {
        smoothPoint.current = { x, y };
      } else {
        smoothPoint.current.x =
          smoothPoint.current.x * 0.7 + x * 0.3;

        smoothPoint.current.y =
          smoothPoint.current.y * 0.7 + y * 0.3;
      }

      x = smoothPoint.current.x;
      y = smoothPoint.current.y;

      setDot({ x, y });
      drawLine(x, y);
    } else {
      lastPoint.current = null;
      smoothPoint.current = null;
    }
  }
};

    const drawLine = (x, y) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      ctx.strokeStyle = "black";
      ctx.lineWidth = 4;   // smaller thickness
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (lastPoint.current) {
        ctx.beginPath();
        ctx.moveTo(
          lastPoint.current.x,
          lastPoint.current.y
        );
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      lastPoint.current = { x, y };
    };

    loadModel();

    return () => clearInterval(interval);
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    lastPoint.current = null;
    smoothPoint.current = null;
  };

  return (
  <div className="app">
    <h1 className="title">GestureDraw</h1>

    <div className="container">
      
      {/* Camera */}
      <div className="card webcam-box">
        <Webcam
          ref={webcamRef}
          audio={false}
          mirrored={true}
          width={500}
          height={400}
          videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: "user",
          }}
        />

        {dot && (
          <div
            className="dot"
            style={{
              left: dot.x - 8,
              top: dot.y - 8,
            }}
          />
        )}
      </div>

      {/* Canvas */}
      <div className="card">
        <canvas
          ref={canvasRef}
          width={500}
          height={400}
        />

        <button onClick={clearCanvas}>
          Clear
        </button>
      </div>

    </div>
  </div>
);
}