"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/modal";

type Mode = "idle" | "camera" | "crop";
type Facing = "user" | "environment";

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

/** Capteurs filmés en paysage : le navigateur signale la rotation à appliquer pour un rendu droit. */
function rotated(angle: number | undefined): boolean {
  return angle === 90 || angle === 270;
}

function errorName(err: unknown): string {
  return err instanceof DOMException ? err.name : "";
}

/** Le refus du navigateur n'a presque jamais la même cause : chacune a sa parade. */
function cameraErrorMessage(err: unknown): string {
  const importHint = "Vous pouvez aussi utiliser « Ajouter une photo ».";
  switch (errorName(err)) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return `Accès à la caméra refusé. Touchez le cadenas de la barre d'adresse › Permissions › Caméra › Autoriser, rechargez la page et retentez. ${importHint}`;
    case "NotFoundError":
    case "DevicesNotFoundError":
      return `Aucun appareil photo n'est disponible pour ce navigateur. ${importHint}`;
    case "NotReadableError":
    case "TrackStartError":
      return `La caméra est occupée par une autre application ou un autre onglet. Fermez-la puis retentez. ${importHint}`;
    case "OverconstrainedError":
      return `L'appareil photo demandé ne fournit pas ce format. Choisissez « Appareil par défaut » puis retentez. ${importHint}`;
    case "SecurityError":
      return "Ce navigateur bloque l'appareil photo dans cette fenêtre (navigateur intégré d'une application). Ouvrez le lien dans Chrome ou Safari.";
    default:
      return `Impossible d'accéder à la caméra${err instanceof Error ? ` (${err.name})` : ""}. Vérifiez l'autorisation du navigateur ou importez une photo.`;
  }
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
  const streamRef = useRef<MediaStream | null>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [raw, setRaw] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.15);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>("user");
  const [aspect, setAspect] = useState(4 / 5);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState<string | null>(null);
  const rotationRef = useRef(0);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /** Le lecteur n'est monté qu'avec le portail : le flux se branche quand les deux existent. */
  useEffect(() => {
    if (!videoEl || !stream) return;
    videoEl.srcObject = stream;
    void videoEl.play().catch(() => undefined);
    const track = stream.getVideoTracks()[0];
    // rotationAngle est renvoyé par les caméras de téléphone, absent du typage MediaTrackSettings.
    const settings = track?.getSettings?.() as (MediaTrackSettings & { rotationAngle?: number }) | undefined;
    rotationRef.current = settings?.rotationAngle ?? 0;
    if (settings?.width && settings?.height) {
      setAspect(rotated(rotationRef.current) ? settings.height / settings.width : settings.width / settings.height);
      if (settings.facingMode === "user" || settings.facingMode === "environment") {
        setFacing(settings.facingMode);
      }
    }
    void navigator.mediaDevices
      .enumerateDevices()
      .then((all) => setCameras(all.filter((d) => d.kind === "videoinput")))
      .catch(() => setCameras([]));
  }, [stream, videoEl]);

  async function openCamera(next: { facing?: Facing; deviceId?: string | null } = {}) {
    setError(null);
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Ce navigateur ne donne pas accès à l'appareil photo. Ouvrez le lien dans Chrome ou Safari, ou utilisez « Ajouter une photo ».",
      );
      return;
    }
    const useFacing = next.facing ?? facing;
    const useId = next.deviceId !== undefined ? next.deviceId : cameraId;
    const video: MediaTrackConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 960 },
    };
    if (useId) video.deviceId = { exact: useId };
    else video.facingMode = useFacing;
    try {
      let media: MediaStream;
      try {
        media = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      } catch (first) {
        // Idéaux refusés ou appareil disparu entre-temps : on retente avec la caméra telle qu'elle est.
        const name = errorName(first);
        const recoverable = name === "OverconstrainedError" || (useId && name === "NotFoundError");
        if (!recoverable) throw first;
        setCameraId(null);
        media = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = media;
      setStream(media);
      setFacing(useFacing);
      setMode("camera");
    } catch (err) {
      setError(cameraErrorMessage(err));
    }
  }

  function captureFrame() {
    const video = videoEl;
    if (!video || !video.videoWidth) {
      setError("L'image n'est pas encore prête, patientez une seconde.");
      return;
    }
    const angle = rotationRef.current;
    const flip = rotated(angle);
    const canvas = document.createElement("canvas");
    canvas.width = flip ? video.videoHeight : video.videoWidth;
    canvas.height = flip ? video.videoWidth : video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2);
    const data = canvas.toDataURL("image/jpeg", 0.92);
    setRaw(data);
    setZoom(1.2);
    setOffset({ x: 0, y: 0 });
    setMode("crop");
    stopCamera();
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
        <button type="button" className="btn btn-primary" onClick={() => void openCamera()}>
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
        <Modal
          className="camera-modal"
          title="Prise de photo d'identité"
          footer={
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  stopCamera();
                  setMode("idle");
                }}
              >
                Annuler
              </button>
              <button type="button" className="btn btn-primary" onClick={captureFrame}>
                Capturer
              </button>
            </>
          }
        >
          <p className="muted">
            Placez le visage dans le cadre pointillé, regard vers l'objectif, fond dégagé.
          </p>
          <div
            className="camera-frame"
            style={{ aspectRatio: String(aspect), maxWidth: `calc(62vh * ${aspect})` }}
          >
            <video
              ref={setVideoEl}
              autoPlay
              playsInline
              muted
              className={facing === "user" ? "mirror" : undefined}
              onLoadedMetadata={(event) => {
                const el = event.currentTarget;
                if (el.videoWidth && el.videoHeight) {
                  setAspect(
                    rotated(rotationRef.current) ? el.videoHeight / el.videoWidth : el.videoWidth / el.videoHeight,
                  );
                }
              }}
            />
            <div className={aspect < 4 / 5 ? "camera-guide fit-width" : "camera-guide"} />
          </div>
          <div className="camera-controls">
            {cameras.length > 1 ? (
              <select
                className="camera-select"
                aria-label="Choisir l'appareil photo"
                value={cameraId ?? ""}
                onChange={(event) => {
                  const id = event.target.value || null;
                  setCameraId(id);
                  void openCamera({ deviceId: id });
                }}
              >
                <option value="">Appareil par défaut</option>
                {cameras.map((device, index) => (
                  <option key={device.deviceId || index} value={device.deviceId}>
                    {device.label || `Caméra ${index + 1}`}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setCameraId(null);
                void openCamera({ facing: facing === "user" ? "environment" : "user", deviceId: null });
              }}
            >
              {facing === "user" ? "Caméra arrière" : "Caméra avant"}
            </button>
          </div>
        </Modal>
      ) : null}

      {mode === "crop" && raw ? (
        <Modal
          className="crop-modal"
          title="Recadrer la photo"
          footer={
            <>
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
              <button type="button" className="btn btn-ghost" onClick={() => void openCamera()}>
                Reprendre
              </button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void confirmCrop()}>
                {busy ? "Traitement…" : "Valider la photo"}
              </button>
            </>
          }
        >
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
        </Modal>
      ) : null}
    </div>
  );
}
