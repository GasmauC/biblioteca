import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useLibraryStore } from '../store/useLibraryStore';
import type { HighlightLine } from '../services/db';
import './PdfViewer.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfViewerProps {
  file: Blob;
  docId: string;
  scale?: number;
  page?: number;
  isHighlighting?: boolean;
  highlightColor?: string;
  highlights?: Record<number, HighlightLine[]>;
  isLiquidMode?: boolean;
  onPageChange?: (page: number, totalPages: number) => void;
  onLoadSuccess?: (totalPages: number) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ 
  file, docId, scale = 1.0, page = 1,
  isHighlighting = false, highlightColor = 'rgba(253, 224, 71, 0.5)', highlights = {}, isLiquidMode = false, onLoadSuccess
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [liquidText, setLiquidText] = useState<string>('');
  const [isLiquidLoading, setIsLiquidLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const liquidTextCache = useRef<Record<number, string>>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const currentLineRef = useRef<HighlightLine | null>(null);

  useEffect(() => {
    let currentLoadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;
    
    const loadPdf = async () => {
      if (!file) return;
      setIsPdfLoading(true);
      try {
        if (file instanceof Blob) {
          const arrayBuffer = await file.arrayBuffer();
          currentLoadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        } else if (typeof file === 'string') {
          currentLoadingTask = pdfjsLib.getDocument(file);
        } else {
          throw new Error("Contenido de archivo no soportado");
        }

        const docObj = await currentLoadingTask.promise;
        setPdfDoc(docObj);
        if (onLoadSuccess) onLoadSuccess(docObj.numPages);
        
        const currentDoc = useLibraryStore.getState().documents.find(d => d.id === docId);
        if (currentDoc && currentDoc.progress?.totalPages !== docObj.numPages) {
          useLibraryStore.getState().updateDocumentProgress(docId, {
            totalPages: docObj.numPages
          });
        }
      } catch (error) {
        console.error('Error cargando el PDF:', error);
      } finally {
        setIsPdfLoading(false);
      }
    };
    
    loadPdf();
    
    return () => {
      if (currentLoadingTask) {
        currentLoadingTask.destroy();
      }
    };
  }, [docId, file]);

  // --- Effect 1: Canvas Rendering (Only when not in Liquid Mode) ---
  useEffect(() => {
    let currentRenderTask: pdfjsLib.RenderTask | null = null;

    const renderCanvas = async () => {
      if (!pdfDoc || isLiquidMode || !canvasRef.current) return;

      try {
        setIsRendering(true);
        const pdfPage = await pdfDoc.getPage(page);
        
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = pdfPage.getViewport({ scale: scale * 1.5 * dpr });
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          context.fillStyle = 'white';
          context.fillRect(0, 0, canvas.width, canvas.height);
          
          canvas.style.width = `${viewport.width / dpr}px`;
          canvas.style.height = `${viewport.height / dpr}px`;

          if (overlayRef.current) {
            overlayRef.current.height = viewport.height;
            overlayRef.current.width = viewport.width;
            overlayRef.current.style.width = `${viewport.width / dpr}px`;
            overlayRef.current.style.height = `${viewport.height / dpr}px`;
          }

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          
          // @ts-ignore
          currentRenderTask = pdfPage.render(renderContext);
          await currentRenderTask.promise;
        }
      } catch (error: any) {
        if (error.name !== 'RenderingCancelledException') {
          console.error('Error renderizando página:', error);
        }
      } finally {
        setIsRendering(false);
      }
    };

    renderCanvas();

    return () => {
      if (currentRenderTask) {
        currentRenderTask.cancel();
      }
    };
  }, [pdfDoc, page, scale, isLiquidMode]);

  // --- Effect 2: Liquid Mode Text Extraction ---
  useEffect(() => {
    const extractText = async () => {
      if (!pdfDoc || !isLiquidMode) return;

      // Use cache to prevent re-extracting text when switching pages
      if (liquidTextCache.current[page]) {
        setLiquidText(liquidTextCache.current[page]);
        return;
      }

      setIsLiquidLoading(true);
      setLiquidText('');

      try {
        const pdfPage = await pdfDoc.getPage(page);
        const textContent = await pdfPage.getTextContent();
        
        // Yield to main thread to allow React to paint the loading spinner
        await new Promise(resolve => setTimeout(resolve, 50));

        // @ts-ignore
        const strings = textContent.items.map(item => item.str);
        
        if (strings.length === 0) {
          const fallback = "Este documento es una imagen escaneada o no contiene texto extraíble.";
          liquidTextCache.current[page] = fallback;
          setLiquidText(fallback);
          return;
        }

        let rawText = strings.join(' ');
        
        // Optimization: Fast regex to prevent catastrophic backtracking
        rawText = rawText.replace(/-\s+/g, ''); // Fix hyphenation
        rawText = rawText.replace(/\s{2,}/g, ' '); // Reduce multiple spaces
        rawText = rawText.replace(/([^.!?])\s+([a-z])/g, '$1 $2'); // Join sentences
        
        liquidTextCache.current[page] = rawText;
        setLiquidText(rawText);
      } catch (error) {
        console.error('Error extrayendo texto:', error);
        setLiquidText('Error al procesar el texto de esta página.');
      } finally {
        setIsLiquidLoading(false);
      }
    };

    extractText();
  }, [pdfDoc, page, isLiquidMode]);

  const drawHighlights = useCallback(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const pageHighlights = highlights[page] || [];
    
    const drawLine = (line: HighlightLine) => {
      if (line.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.6;
      ctx.globalCompositeOperation = 'multiply';
      
      ctx.moveTo(line.points[0].x * scale, line.points[0].y * scale);
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i].x * scale, line.points[i].y * scale);
      }
      ctx.stroke();
    };

    pageHighlights.forEach(drawLine);
    
    if (currentLineRef.current) {
      drawLine(currentLineRef.current);
    }
  }, [highlights, page, scale]);

  useEffect(() => {
    drawHighlights();
  }, [drawHighlights, isDrawing]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isHighlighting) return;
    e.preventDefault();
    const rect = overlayRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    currentLineRef.current = { color: highlightColor, points: [{ x, y }], width: 14 };
    setIsDrawing(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isHighlighting || !currentLineRef.current) return;
    e.preventDefault();
    const rect = overlayRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    currentLineRef.current.points.push({ x, y });
    drawHighlights();
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentLineRef.current) return;
    setIsDrawing(false);
    
    const newLine = currentLineRef.current;
    currentLineRef.current = null;
    
    if (newLine.points.length > 1) {
      const existing = highlights[page] || [];
      const updated = [...existing, newLine];
      useLibraryStore.getState().updateDocumentHighlights(docId, page, updated);
    } else {
      drawHighlights(); // clear dot
    }
  };

  return (
    <div className="pdf-viewer">
      {isLiquidMode ? (
        <div className="liquid-mode-container text-content" style={{ 
          padding: '20px', 
          maxWidth: '100%', 
          margin: '0 auto', 
          fontSize: `calc(1rem * ${scale})`, 
          lineHeight: '1.8',
          wordWrap: 'break-word',
          textAlign: 'left'
        }}>
          {isLiquidLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ marginBottom: '1rem' }}></div>
              <p>Optimizando lectura...</p>
            </div>
          ) : (
            <p>{liquidText}</p>
          )}
        </div>
      ) : (
        <div className="pdf-canvas-wrapper" style={{ position: 'relative', minHeight: '500px' }}>
          {(isPdfLoading || isRendering) && (
            <div className="pdf-loading-overlay">
              <div className="spinner"></div>
              <p>{isPdfLoading ? 'Abriendo documento...' : 'Renderizando página...'}</p>
            </div>
          )}
          <canvas ref={canvasRef} className="pdf-canvas shadow-premium" style={{ opacity: isRendering ? 0.6 : 1, transition: 'opacity 0.2s' }} />
          <canvas 
            ref={overlayRef} 
            className="highlight-overlay" 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ 
              pointerEvents: isHighlighting ? 'auto' : 'none',
              touchAction: isHighlighting ? 'none' : 'auto'
            }}
          />
        </div>
      )}
    </div>
  );
};
