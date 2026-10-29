"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import styles from "../cms.module.css";

interface Props {
  imageSrc: string;
  aspectRatio: number;
  aspectLabel: string;
  onComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

/** Longest edge of an exported crop; keeps uploads under the action body limit. */
const MAX_EDGE = 1920;

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

async function getCroppedImg(imageSrc: string, crop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const scale = Math.min(1, MAX_EDGE / Math.max(crop.width, crop.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(crop.width * scale);
  canvas.height = Math.round(crop.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))), "image/jpeg", 0.88);
  });
}

export default function ImageCropper({ imageSrc, aspectRatio, aspectLabel, onComplete, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  async function confirm() {
    if (!area) return;
    setSaving(true);
    try {
      onComplete(await getCroppedImg(imageSrc, area));
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Crop image" onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h3 className={styles.h2}>Crop image</h3>
          <span className={styles.monoLabel}>{aspectLabel}</span>
        </div>
        <div className={styles.cropArea}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid
          />
        </div>
        <div className={styles.modalFoot}>
          <span className={styles.hint}>Zoom</span>
          <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" />
          <button type="button" className={styles.pill} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={styles.btn} onClick={confirm} disabled={saving}>
            {saving ? "Processing…" : "Crop and use"}
          </button>
        </div>
      </div>
    </div>
  );
}
