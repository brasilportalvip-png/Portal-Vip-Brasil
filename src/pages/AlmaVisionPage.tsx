import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  Scan,
  RefreshCw,
  Eye,
  CheckCircle2,
  FileText,
  Home,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '../lib/api';

export const AlmaVisionPage: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [visionPrompt, setVisionPrompt] = useState('Analise o ambiente, identifique objetos, estado de conservação, iluminação e sugira melhorias arquitetônicas ou operacionais.');
  const [analysisResult, setAnalysisResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera access denied:', err);
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setSelectedImage(dataUrl);
    }

    // Stop stream
    const stream = video.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    setIsCameraActive(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeVision = async () => {
    if (!selectedImage) return;
    setLoading(true);
    setAnalysisResult('');

    try {
      const res = await apiRequest<{ analysis: string }>('/api/alma/vision', {
        method: 'POST',
        body: {
          imageBase64: selectedImage,
          prompt: visionPrompt
        }
      });
      setAnalysisResult(res.analysis);
    } catch (err: any) {
      setAnalysisResult(`Falha na análise visual: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-emerald-950 via-[#0A1329] to-slate-900 border border-emerald-500/30 relative overflow-hidden shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-lg shadow-emerald-500/20">
            <Camera size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">ALMA Vision & Inspection</h2>
            <p className="text-xs text-slate-300">
              Visão computacional e raciocínio multimodal espacial para inspeção de ambientes, OCR e segurança.
            </p>
          </div>
        </div>
      </div>

      {/* Câmera / Upload Zone */}
      <div className="p-6 rounded-3xl bg-[#090E1F] border border-slate-800 shadow-xl space-y-4">
        {isCameraActive ? (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <button
              onClick={capturePhoto}
              className="absolute bottom-4 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-2xl"
            >
              <Scan size={16} />
              <span>Capturar Quadro</span>
            </button>
          </div>
        ) : selectedImage ? (
          <div className="relative rounded-2xl overflow-hidden bg-black/50 border border-slate-800 max-h-96 flex items-center justify-center">
            <img src={selectedImage} alt="Inspeção" className="max-h-96 w-auto object-contain rounded-2xl" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-slate-300 hover:text-white"
            >
              Trocar Imagem
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={startCamera}
              className="p-8 rounded-2xl border-2 border-dashed border-slate-700 hover:border-emerald-400 bg-slate-950/60 hover:bg-slate-900 flex flex-col items-center justify-center text-center transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Camera size={24} />
              </div>
              <h4 className="text-sm font-bold text-white">Usar Câmera em Tempo Real</h4>
              <p className="text-xs text-slate-400 mt-1">Capture uma foto do cômodo, objeto ou documento</p>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-8 rounded-2xl border-2 border-dashed border-slate-700 hover:border-cyan-400 bg-slate-950/60 hover:bg-slate-900 flex flex-col items-center justify-center text-center transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload size={24} />
              </div>
              <h4 className="text-sm font-bold text-white">Carregar Imagem do Dispositivo</h4>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, WebP de até 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </button>
          </div>
        )}

        {/* Prompt de Inspeção */}
        {selectedImage && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-slate-400 font-medium">Diretriz para o Alma Vision:</label>
              <textarea
                value={visionPrompt}
                onChange={(e) => setVisionPrompt(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-2xl p-3.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 h-20 resize-none"
              />
            </div>

            <button
              onClick={handleAnalyzeVision}
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Alma Vision processando imagem multimodal...</span>
                </>
              ) : (
                <>
                  <Scan size={16} />
                  <span>Executar Inspeção Multimodal</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Resultado */}
        {analysisResult && (
          <div className="p-5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 text-xs text-slate-200 leading-relaxed space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs border-b border-slate-800 pb-2">
              <CheckCircle2 size={16} />
              <span>Laudo do Alma Vision</span>
            </div>
            <div className="whitespace-pre-wrap font-sans">
              {analysisResult}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
