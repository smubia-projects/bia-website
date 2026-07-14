"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { motion } from "framer-motion";
import styles from "./Admin.module.css";
import { AdminButton } from "./AdminMotion";
import { MOTION_EASE } from "@/app/components/ui/motion";

interface Props {
  imageSrc: string;
  aspectRatio: number;
  aspectLabel: string;
  onComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas export failed"));
      },
      "image/jpeg",
      0.92
    );
  });
}

export default function ImageCropper({
  imageSrc,
  aspectRatio,
  aspectLabel,
  onComplete,
  onCancel,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedArea(croppedAreaPixels);
    },
    []
  );

  async function handleConfirm() {
    if (!croppedArea) return;
    setSaving(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedArea);
      onComplete(blob);
    } catch {
      setSaving(false);
    }
  }

  return (
    <motion.div
      className={styles.cropperOverlay}
      onClick={onCancel}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={styles.cropperModal}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.28, ease: MOTION_EASE }}
      >
        <div className={styles.cropperHeader}>
          <h3 className={styles.cropperTitle}>Crop Image</h3>
          <span className={styles.cropperRatio}>{aspectLabel}</span>
        </div>

        <div className={styles.cropperContainer}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid
            style={{
              containerStyle: {
                background: "var(--pine-deep)",
              },
            }}
          />
        </div>

        <div className={styles.cropperControls}>
          <label className={styles.zoomLabel}>
            <span className={styles.zoomText}>Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className={styles.zoomSlider}
            />
            <span className={styles.zoomValue}>{zoom.toFixed(1)}x</span>
          </label>
        </div>

        <div className={styles.cropperActions}>
          <AdminButton
            type="button"
            onClick={onCancel}
            className={styles.cancelBtn}
            effect="neutral"
          >
            Cancel
          </AdminButton>
          <AdminButton
            type="button"
            onClick={handleConfirm}
            className={styles.primaryBtn}
            disabled={saving}
            effect="primary"
          >
            {saving ? "Processing..." : "Crop & Save"}
          </AdminButton>
        </div>
      </motion.div>
    </motion.div>
  );
}
