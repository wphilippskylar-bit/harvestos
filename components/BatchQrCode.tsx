"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

// Renders (and lets you print/download) a QR code that encodes a direct link to this batch's
// "quick log" page — see app/(app)/batches/[id]/quick. Stick the printed code on a tray or rack;
// scanning it with any phone camera opens straight to a mobile-first log-entry screen for that
// exact batch, skipping the normal nav. Still sits behind the app's login — scanning it just
// deep-links in, it doesn't bypass auth.
export default function BatchQrCode({ batchId, batchLabel, onClose }: { batchId: string; batchLabel: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const target = `${window.location.origin}/batches/${batchId}/quick`;
    setUrl(target);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, target, { width: 240, margin: 1 }, (err) => {
        if (err) setError("Couldn't generate the QR code — try again.");
      });
    }
  }, [batchId]);

  function download() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `${batchLabel}-qr.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  function print() {
    const dataUrl = canvasRef.current?.toDataURL("image/png");
    if (!dataUrl) return;
    const win = window.open("", "_blank", "width=400,height=500");
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>${batchLabel} — QR label</title></head>
        <body style="text-align:center; font-family: sans-serif; padding: 20px;">
          <img src="${dataUrl}" style="width:220px;height:220px;" />
          <div style="font-weight:600; margin-top:8px; font-size:14px;">${batchLabel}</div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative card p-5 w-full max-w-xs text-center space-y-3">
        <h3 className="font-semibold text-stone-800">{batchLabel} — QR tag</h3>
        <p className="text-xs text-stone-500">
          Scan with any phone camera to jump straight to this batch's quick-log page.
        </p>
        <div className="flex justify-center">
          <canvas ref={canvasRef} />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {url && <p className="text-[11px] text-stone-400 break-all">{url}</p>}
        <div className="flex gap-2 justify-center pt-1">
          <button className="btn-secondary !py-1.5 text-sm" onClick={download}>Download</button>
          <button className="btn-secondary !py-1.5 text-sm" onClick={print}>Print</button>
          <button className="btn-primary !py-1.5 text-sm" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
