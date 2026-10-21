"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "idle" | "camera" | "crop";

type Props = {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function cropToIdPhoto(
  source: string,
  offsetX: number,
  offsetY: number,
  zoom: number,
): Promise<string> {
  const img = await loadImage(source);
  const outW = 360;
  const outH = 450;
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");

  const imgRatio = img.width / img.height;
  const boxRatio = outW / outH;
  let dw: number;
  let dh: number;
  if (imgRatio > boxRatio) {
    dh = outH * zoom;
    dw = dh * imgRatio;
  } else {
    dw = outW * zoom;
    dh = dw / imgRatio;
  }
  const dx = (outW - dw) / 2 + offsetX * outW;
  const dy = (outH - dh) / 2 + offsetY * outH;
  ctx.fillStyle = "#e6e6e6";
  ctx.fillRect(0, 0, outW, outH);
  ctx.drawImage(img, dx, dy, dw, dh);
  return canvas.toDataURL("image/jpeg", 0.88);
}

export function PhotoCapture({ value, onChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [raw, setRaw] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.15);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 900 }, height: { ideal: 1200 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setMode("camera");
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setError("Impossible d'accéder à la caméra. Vérifiez l'autorisation du navigateur ou importez une photo.");
    }
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const data = canvas.toDataURL("image/jpeg", 0.92);
    setRaw(data);
    setZoom(1.2);
    setOffset({ x: 0, y: 0 });
    setMode("crop");
    void stopCamera();
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    const ok = ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type);
    if (!ok) {
      setError("Formats acceptés : JPG, JPEG, PNG et WebP.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setRaw(String(reader.result));
      setZoom(1.15);
      setOffset({ x: 0, y: 0 });
      setMode("crop");
    };
    reader.readAsDataURL(file);
  }

  async function confirmCrop() {
    if (!raw) return;
    setBusy(true);
    try {
      const cropped = await cropToIdPhoto(raw, offset.x, offset.y, zoom);
      onChange(cropped);
      setMode("idle");
      setRaw(null);
    } catch {
      setError("Le recadrage a échoué. Réessayez avec une autre image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="photo-capture">
      <div className="photo-preview-lg">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Photo d'identité" />
        ) : (
          <div className="photo-empty">
            <span>Aucune photo</span>
            <small>Zone d&apos;identité 25 × 30 mm</small>
          </div>
        )}
      </div>

      <div className="photo-actions">
        <button type="button" className="btn btn-primary" onClick={() => void startCamera()}>
          Prendre une photo
        </button>
        <label className="btn btn-ghost">
          Ajouter une photo
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            hidden
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
        {value ? (
          <button type="button" className="btn btn-danger-ghost" onClick={() => onChange(null)}>
            Retirer
          </button>
        ) : null}
      </div>
      {error ? <p className="field-error">{error}</p> : null}

      {mode === "camera" ? (
        <div className="modal-backdrop">
          <div className="modal camera-modal">
            <h3>Prise de photo d&apos;identité</h3>
            <p className="muted">Placez le visage au centre, regard vers l&apos;objectif, fond dégagé.</p>
            <div className="camera-frame">
              <video ref={videoRef} autoPlay playsInline muted />
              <div className="camera-guide" />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  void stopCamera();
                  setMode("idle");
                }}
              >
                Annuler
              </button>
              <button type="button" className="btn btn-primary" onClick={captureFrame}>
                Capturer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mode === "crop" && raw ? (
        <div className="modal-backdrop">
          <div className="modal crop-modal">
            <h3>Recadrer la photo</h3>
            <p className="muted">Glissez pour centrer le visage. Conservez les proportions, sans déformation.</p>
            <div
              className="crop-stage"
              onPointerDown={(e) => {
                setDragging(true);
                dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!dragging) return;
                const dx = (e.clientX - dragStart.current.x) / 220;
                const dy = (e.clientY - dragStart.current.y) / 275;
                setOffset({
                  x: Math.max(-0.45, Math.min(0.45, dragStart.current.ox + dx)),
                  y: Math.max(-0.45, Math.min(0.45, dragStart.current.oy + dy)),
                });
              }}
              onPointerUp={() => setDragging(false)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={raw}
                alt="Recadrage"
                style={{
                  transform: `translate(${offset.x * 100}%, ${offset.y * 100}%) scale(${zoom})`,
                }}
              />
            </div>
            <label className="zoom-label">
              Zoom
              <input
                type="range"
                min={1}
                max={2.4}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setMode("idle");
                  setRaw(null);
                }}
              >
                Annuler
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => void startCamera()}>
                Reprendre
              </button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void confirmCrop()}>
                {busy ? "Traitement…" : "Valider la photo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
