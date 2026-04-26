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
  
  const [isDrawing, setIsDrawing] = useState(false);
  const currentLineRef = useRef<HighlightLine | null>(null);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        if (onLoadSuccess) onLoadSuccess(doc.numPages);
        
        // Ensure total pages is captured
        useLibraryStore.getState().updateDocumentProgress(docId, {
          totalPages: doc.numPages
        });
      } catch (error) {
        console.error('Error cargando el PDF:', error);
      }
    };
    loadPdf();
  }, [file]);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current || isRendering) return;

      try {
        setIsRendering(true);
        const pdfPage = await pdfDoc.getPage(page);
        if (isLiquidMode) {
          const textContent = await pdfPage.getTextContent();
          // @ts-ignore
          const strings = textContent.items.map(item => item.str);
          
          // Smart text reflow: Join strings, fixing broken newlines
          let rawText = strings.join(' ');
          // Regex to fix hyphenated words broken across lines
          rawText = rawText.replace(/-\s+/g, '');
          // Regex to join sentences broken abruptly (heuristic: if a line doesn't end with punctuation, join it)
          rawText = rawText.replace(/([^\.\!\?\:\;])\s+(?=[a-z])/g, '$1 ');
          
          setLiquidText(rawText);
        } else {
          // Ajustamos la escala base para que 1.0 sea legible
          const viewport = pdfPage.getViewport({ scale: scale * 1.5 });
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');

          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (overlayRef.current) {
              overlayRef.current.height = viewport.height;
              overlayRef.current.width = viewport.width;
            }

            const renderContext = {
              canvasContext: context,
              viewport: viewport,
            };
            // @ts-ignore
            await pdfPage.render(renderContext).promise;
            drawHighlights();
          }
        }
      } catch (error) {
        console.error('Error renderizando página:', error);
      } finally {
        setIsRendering(false);
      }
    };

    renderPage();
  }, [pdfDoc, page, scale, isLiquidMode]);

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
          <p>{liquidText || 'Cargando texto...'}</p>
        </div>
      ) : (
        <div className="pdf-canvas-wrapper" style={{ position: 'relative' }}>
          <canvas ref={canvasRef} className="pdf-canvas shadow-premium" />
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
