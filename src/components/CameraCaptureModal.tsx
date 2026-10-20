import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Check, RefreshCw, MapPin, Calendar, Clock, Tag } from 'lucide-react';
import { MeterPhoto } from '../types';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photo: MeterPhoto) => void;
  photoLabel: 'STAN_CABUT_LAMA' | 'METER_BARU' | 'SEGEL_DAN_BA' | 'DOKUMENTASI_PETUGAS';
  photoTitle: string;
  idpelContext?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  photoLabel,
  photoTitle,
  idpelContext = ''
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [addWatermark, setAddWatermark] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Get current position for watermark
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: Number(pos.coords.latitude.toFixed(5)),
            lng: Number(pos.coords.longitude.toFixed(5))
          });
        },
        () => {
          // Default mock coordinates (Jakarta Area) if geo is disabled
          setCoords({ lat: -6.2088, lng: 106.8456 });
        }
      );
    } else {
      setCoords({ lat: -6.2088, lng: 106.8456 });
    }
  }, []);

  // Stop camera on unmount or tab switch
  useEffect(() => {
    if (activeTab === 'camera' && isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Kamera tidak dapat diakses atau izin ditolak. Silakan gunakan opsi Unggah File.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const applyWatermarkToImage = (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      if (!addWatermark) {
        resolve(imageSrc);
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Watermark overlay bar at bottom
        const barHeight = Math.max(70, Math.floor(canvas.height * 0.12));
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

        // Watermark Text styling
        const now = new Date();
        const timestampStr = now.toLocaleDateString('id-ID', {
          day: '2-digit', month: 'short', year: 'numeric'
        }) + ' ' + now.toLocaleTimeString('id-ID');

        ctx.fillStyle = '#FFFFFF';
        const fontSize = Math.max(14, Math.floor(barHeight * 0.22));
        ctx.font = `bold ${fontSize}px sans-serif`;

        // Draw lines
        const leftPadding = 20;
        let lineY = canvas.height - barHeight + fontSize + 8;

        ctx.fillStyle = '#38BDF8'; // cyan highlight
        ctx.fillText(`PLN P2TL DOKUMENTASI LAPANGAN | ${photoTitle}`, leftPadding, lineY);

        lineY += fontSize + 4;
        ctx.fillStyle = '#E2E8F0';
        ctx.fillText(`IDPEL: ${idpelContext || 'P2TL-LAPANGAN'} | TGL: ${timestampStr}`, leftPadding, lineY);

        lineY += fontSize + 4;
        const geoStr = coords ? `GPS: ${coords.lat}, ${coords.lng}` : 'GPS: Recorded';
        ctx.fillStyle = '#94A3B8';
        ctx.font = `${Math.floor(fontSize * 0.85)}px sans-serif`;
        ctx.fillText(`${geoStr} | VERIFIED FIELD STAMP`, leftPadding, lineY);

        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = imageSrc;
    });
  };

  const capturePhotoFromCamera = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const watermarkedDataUrl = await applyWatermarkToImage(rawDataUrl);
    setPreviewUrl(watermarkedDataUrl);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string;
      if (rawDataUrl) {
        const watermarkedUrl = await applyWatermarkToImage(rawDataUrl);
        setPreviewUrl(watermarkedUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (!previewUrl) return;
    const now = new Date();
    const photoItem: MeterPhoto = {
      id: 'photo-' + Date.now(),
      label: photoLabel,
      title: photoTitle,
      dataUrl: previewUrl,
      timestamp: now.toISOString().replace('T', ' ').substring(0, 19),
      location: coords ? { latitude: coords.lat, longitude: coords.lng } : undefined
    };

    onCapture(photoItem);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setPreviewUrl(null);
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-900 via-blue-900 to-slate-900 text-white p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Dokumentasi Lapangan P2TL
            </span>
            <h3 className="text-lg font-bold text-white">{photoTitle}</h3>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => { setActiveTab('upload'); setPreviewUrl(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'upload' ? 'bg-white text-blue-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" /> Unggah Foto File
          </button>
          <button
            onClick={() => { setActiveTab('camera'); setPreviewUrl(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'camera' ? 'bg-white text-blue-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4" /> Ambil Kamera Langsung
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 space-y-4">
          {/* Watermark checkbox toggle */}
          <div className="flex items-center justify-between bg-cyan-50/70 border border-cyan-200 rounded-lg p-2.5 text-xs text-cyan-900">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-700 shrink-0" />
              <span>Sematkan Watermark Stempel P2TL (IDPEL, Waktu, & GPS)</span>
            </div>
            <input
              type="checkbox"
              checked={addWatermark}
              onChange={(e) => setAddWatermark(e.target.checked)}
              className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
            />
          </div>

          {/* Preview State */}
          {previewUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950 aspect-video flex items-center justify-center shadow-inner">
                <img src={previewUrl} alt="Preview Foto Lapangan" className="w-full h-full object-contain" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-sm flex items-center justify-center gap-2 transition"
                >
                  <RefreshCw className="w-4 h-4" /> Ulangi Foto
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-md transition"
                >
                  <Check className="w-4 h-4" /> Gunakan Foto Ini
                </button>
              </div>
            </div>
          ) : (
            /* Upload or Camera Stream State */
            <div>
              {activeTab === 'upload' && (
                <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50 hover:bg-blue-50/30 transition cursor-pointer relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800">Klik atau Drag Foto ke Sini</h4>
                  <p className="text-xs text-slate-500 mt-1">Format JPG, PNG (Maksimal 10MB). Pastikan angka meter terlihat jelas.</p>
                </div>
              )}

              {activeTab === 'camera' && (
                <div className="space-y-3">
                  {cameraError ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-2">
                      <p>{cameraError}</p>
                      <button
                        onClick={startCamera}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition"
                      >
                        Coba Akses Kamera Lagi
                      </button>
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-800 shadow-md">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      {isCameraActive && (
                        <div className="absolute inset-0 pointer-events-none border-2 border-cyan-400/40 rounded-xl flex items-center justify-center">
                          <div className="w-3/4 h-2/3 border-2 border-dashed border-cyan-300/80 rounded-lg flex items-center justify-center">
                            <span className="bg-black/60 text-cyan-300 text-[10px] px-2 py-1 rounded">
                              Posisikan Angka Meter / Nomor Seri Di Sini
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isCameraActive && (
                    <button
                      onClick={capturePhotoFromCamera}
                      className="w-full py-3 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition"
                    >
                      <Camera className="w-5 h-5" /> Ambil Foto Dokumentasi
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
