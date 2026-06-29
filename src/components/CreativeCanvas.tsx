import React, { useEffect, useRef, useState } from 'react';
import { AppSettings, DragPosition } from '../types';

interface CreativeCanvasProps {
  text: string;
  idx: number;
  settings: AppSettings;
  perCardImage?: string;
  perCardBgColor?: string;
  perCardPos?: DragPosition;
  vividStyle?: { bg: string; text: string; cta: string };
  selectedFlagUrl?: string;
  selectedFlagHAlign?: 'left' | 'center' | 'right';
  previewScale?: number; // Optional scaling factor for responsive grid rendering
  onLoaded?: () => void;
}

// Simple text chunk interface for asterisk highlight parsing
interface TextChunk {
  text: string;
  isHighlight: boolean;
}

// Global Image Cache to prevent flickering during rapid updates
const imageCache: Record<string, HTMLImageElement> = {};

const isLightColor = (hex: string): boolean => {
  if (!hex) return false;
  if (hex.startsWith('rgba') || hex === 'transparent') return false;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length < 6) return false;
  const r = parseInt(cleanHex.slice(0, 2), 16) || 0;
  const g = parseInt(cleanHex.slice(2, 4), 16) || 0;
  const b = parseInt(cleanHex.slice(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65;
};

const getAutoTextColor = (bg: string, chosenColor: string): string => {
  if (isLightColor(bg) && isLightColor(chosenColor)) {
    return '#0f172a';
  }
  return chosenColor;
};

export const CreativeCanvas: React.FC<CreativeCanvasProps> = ({
  text,
  idx,
  settings,
  perCardImage,
  perCardBgColor,
  perCardPos,
  vividStyle,
  selectedFlagUrl,
  selectedFlagHAlign = 'center',
  previewScale = 1,
  onLoaded,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [flagLoaded, setFlagLoaded] = useState<boolean>(false);

  // Helper to parse line into normal and highlighted chunks
  const parseLineChunks = (line: string): TextChunk[] => {
    const parts = line.split('*');
    return parts.map((part, i) => ({
      text: part,
      isHighlight: i % 2 !== 0,
    }));
  };

  // Helper to strip asterisks for measurement purposes
  const stripAsterisks = (str: string): string => {
    return str.replace(/\*/g, '');
  };

  // Helper to wrap text based on max width on canvas
  const wrapTextWithHighlights = (
    ctx: CanvasRenderingContext2D,
    rawText: string,
    maxWidth: number,
    fontSpec: string
  ): string[] => {
    ctx.font = fontSpec;
    const words = rawText.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (let w of words) {
      const testLine = currentLine ? currentLine + ' ' + w : w;
      // Strip asterisks when measuring line width so we get the accurate physical width
      const cleanTestLine = stripAsterisks(testLine);
      const metrics = ctx.measureText(cleanTestLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = w;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  };

  // Draw CTA custom shapes
  const drawCTAShape = (
    ctx: CanvasRenderingContext2D,
    shape: string,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: string | null,
    stroke: string | null,
    strokeW: number
  ) => {
    ctx.beginPath();
    switch (shape) {
      case 'pill': {
        const pr = h / 2;
        ctx.moveTo(x + pr, y);
        ctx.lineTo(x + w - pr, y);
        ctx.arc(x + w - pr, y + pr, pr, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(x + pr, y + h);
        ctx.arc(x + pr, y + pr, pr, Math.PI / 2, -Math.PI / 2);
        ctx.closePath();
        break;
      }
      case 'sharp':
        ctx.rect(x, y, w, h);
        break;
      case 'soft':
        roundRectPath(ctx, x, y, w, h, Math.min(16, h * 0.25));
        break;
      case 'angled': {
        const slant = h * 0.35;
        ctx.moveTo(x + slant, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w - slant, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        break;
      }
      case 'arrow': {
        const ah = h * 0.4;
        ctx.moveTo(x, y);
        ctx.lineTo(x + w - ah, y);
        ctx.lineTo(x + w, y + h / 2);
        ctx.lineTo(x + w - ah, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        break;
      }
      case 'ribbon': {
        const notch = h * 0.3;
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x + notch, y + h / 2);
        ctx.closePath();
        break;
      }
      case 'hexagon': {
        const hx = h * 0.4;
        ctx.moveTo(x + hx, y);
        ctx.lineTo(x + w - hx, y);
        ctx.lineTo(x + w, y + h / 2);
        ctx.lineTo(x + w - hx, y + h);
        ctx.lineTo(x + hx, y + h);
        ctx.lineTo(x, y + h / 2);
        ctx.closePath();
        break;
      }
      case 'notch': {
        const nc = h * 0.2;
        ctx.moveTo(x + nc, y);
        ctx.lineTo(x + w - nc, y);
        ctx.lineTo(x + w, y + nc);
        ctx.lineTo(x + w, y + h - nc);
        ctx.lineTo(x + w - nc, y + h);
        ctx.lineTo(x + nc, y + h);
        ctx.lineTo(x, y + h - nc);
        ctx.lineTo(x, y + nc);
        ctx.closePath();
        break;
      }
      default:
        roundRectPath(ctx, x, y, w, h, r);
    }
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke && strokeW) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();
    }
  };

  const roundRectPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  };

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return `rgba(${r},${g},${b},${alpha})`;
  };

  // Async image preloader that populates global cache
  useEffect(() => {
    const bgUrl = perCardImage || (settings.bgTab === 'image' && settings.images[settings.selectedImageIndex ?? 0]?.url);
    if (settings.bgTab === 'image' && bgUrl) {
      if (imageCache[bgUrl]) {
        setImageLoaded(true);
      } else {
        setImageLoaded(false);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          imageCache[bgUrl] = img;
          setImageLoaded(true);
        };
        img.onerror = () => {
          setImageLoaded(true); // fall back gracefully
        };
        img.src = bgUrl;
      }
    } else {
      setImageLoaded(true);
    }
  }, [settings.bgTab, settings.images, settings.selectedImageIndex, perCardImage]);

  // Flag image preloader
  useEffect(() => {
    if (settings.flagEnabled && selectedFlagUrl) {
      if (imageCache[selectedFlagUrl]) {
        setFlagLoaded(true);
      } else {
        setFlagLoaded(false);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          imageCache[selectedFlagUrl] = img;
          setFlagLoaded(true);
        };
        img.onerror = () => {
          setFlagLoaded(true);
        };
        img.src = selectedFlagUrl;
      }
    } else {
      setFlagLoaded(true);
    }
  }, [settings.flagEnabled, selectedFlagUrl]);

  // Main Canvas Render Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Determine canvas design aspect ratio sizes
    let designWidth = 1080;
    let designHeight = 1080;
    if (settings.sizePreset === 'vertical') {
      designHeight = 1350;
    } else if (settings.sizePreset === 'custom') {
      designWidth = settings.customWidth || 1080;
      designHeight = settings.customHeight || 1080;
    }

    // Apply scaling factor for responsive grid display (previewScale)
    const w = Math.round(designWidth * previewScale);
    const h = Math.round(designHeight * previewScale);
    canvas.width = w;
    canvas.height = h;

    ctx.textBaseline = 'alphabetic';

    // Scale parameter to adjust font sizes and paddings proportionally
    const baseSize = 1080;
    const scale = w / baseSize;

    // Determine effective background color for text contrast calculations
    let effectiveBgColor = '#ffffff';
    if (settings.bgTab === 'image') {
      if (settings.overlayEnabled) {
        effectiveBgColor = settings.overlayColor;
      } else {
        effectiveBgColor = '#000000'; // Default to dark image
      }
    } else if (settings.bgTab === 'gradient') {
      effectiveBgColor = settings.gradC1; // Use primary gradient color
    } else {
      effectiveBgColor = vividStyle
        ? vividStyle.bg
        : perCardBgColor || settings.bgColor;
    }

    // Render background
    if (settings.bgTab === 'image') {
      const bgUrl = perCardImage || (settings.images[settings.selectedImageIndex ?? 0]?.url);
      const cachedImg = bgUrl ? imageCache[bgUrl] : null;

      if (cachedImg) {
        ctx.save();
        const zoom = (perCardPos?.zoom ?? settings.bgZoom) / 100;
        const px = (perCardPos?.x ?? settings.bgPosX) * scale;
        const py = (perCardPos?.y ?? settings.bgPosY) * scale;

        if (settings.imgFit === 'cover') {
          const scaleFactor = Math.max(w / cachedImg.width, h / cachedImg.height) * zoom;
          const sw = cachedImg.width * scaleFactor;
          const sh = cachedImg.height * scaleFactor;
          ctx.drawImage(cachedImg, (w - sw) / 2 + px, (h - sh) / 2 + py, sw, sh);
        } else {
          const scaleFactor = Math.min(w / cachedImg.width, h / cachedImg.height) * zoom;
          const sw = cachedImg.width * scaleFactor;
          const sh = cachedImg.height * scaleFactor;
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(cachedImg, (w - sw) / 2 + px, (h - sh) / 2 + py, sw, sh);
        }
        ctx.restore();
      } else {
        // Fallback smooth gradient while loading image
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, '#1e293b');
        gradient.addColorStop(1, '#0f172a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }

      // Draw overlay
      if (settings.overlayEnabled) {
        ctx.fillStyle = hexToRgba(settings.overlayColor, settings.overlayOpacity / 100);
        ctx.fillRect(0, 0, w, h);
      }
    } else if (settings.bgTab === 'gradient') {
      const angleRad = (settings.gradAngle * Math.PI) / 180;
      const grd = ctx.createLinearGradient(
        w / 2 - (Math.cos(angleRad) * w) / 2,
        h / 2 - (Math.sin(angleRad) * h) / 2,
        w / 2 + (Math.cos(angleRad) * w) / 2,
        h / 2 + (Math.sin(angleRad) * h) / 2
      );
      grd.addColorStop(0, settings.gradC1);
      grd.addColorStop(1, settings.gradC2);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
    } else {
      // Solid background (handles per-card backgrounds and vivid overrides)
      ctx.fillStyle = vividStyle
        ? vividStyle.bg
        : perCardBgColor || settings.bgColor;
      ctx.fillRect(0, 0, w, h);
    }

    // Safety padding inside canvas
    const pad = w * 0.08;
    const maxTextW = w - pad * 2;

    // Load subheadline
    if (settings.subEnabled && settings.subText) {
      const subSize = Math.round(settings.subSize * scale);
      ctx.font = `500 ${subSize}px '${settings.fontFamily}', sans-serif`;
      ctx.fillStyle = getAutoTextColor(effectiveBgColor, settings.subColor);
      ctx.textAlign = 'center';
      const subYpx = h * (settings.subY / 100);
      ctx.fillText(settings.subText, w / 2, subYpx);
    }

    // Main typography render settings
    const fs = Math.round(settings.fontSize * scale);
    const fontSpec = `${settings.fontWeight} ${fs}px '${settings.fontFamily}', sans-serif`;
    ctx.font = fontSpec;

    // Wrap headlines and process text rendering chunks
    const lines = wrapTextWithHighlights(ctx, text, maxTextW, fontSpec);
    const lh = fs * settings.lineHeight;

    // Precise visual box measurements for text block positioning
    const sampleMetrics = ctx.measureText('Mg');
    const realAscent = sampleMetrics.actualBoundingBoxAscent || fs * 0.75;
    const realDescent = sampleMetrics.actualBoundingBoxDescent || fs * 0.25;
    const realLineH = realAscent + realDescent;
    const totalBlockH = realLineH + (lines.length - 1) * lh;

    // Base position for text block
    let textBlockYStart: number;
    if (settings.vAlign === 'top') {
      textBlockYStart = pad + realAscent;
    } else if (settings.vAlign === 'bottom') {
      textBlockYStart = h - pad - totalBlockH + realAscent;
    } else {
      textBlockYStart = (h - totalBlockH) / 2 + realAscent;
    }

    // Render individual headline lines with custom asterisks highlights
    lines.forEach((line, lineIdx) => {
      const currentY = textBlockYStart + lineIdx * lh;
      const chunks = parseLineChunks(line);
      const hasHighlights = chunks.some(c => c.isHighlight && stripAsterisks(c.text).trim().length > 0);

      ctx.textAlign = settings.hAlign;

      if (!hasHighlights) {
        // Standard high-performance direct fill & stroke
        const cleanLine = stripAsterisks(line);
        drawSingleLineRaw(ctx, cleanLine, w / 2, currentY, settings, effectiveBgColor, vividStyle);
      } else {
        // Detailed chunk rendering for custom highlighted words
        // 1. Pre-measure each chunk to align correctly
        const measuredChunks = chunks.map(chunk => {
          const cleanText = stripAsterisks(chunk.text);
          ctx.font = fontSpec;
          const chunkW = ctx.measureText(cleanText).width;
          return { ...chunk, cleanText, width: chunkW };
        });

        const totalLineWidth = measuredChunks.reduce((acc, c) => acc + c.width, 0);

        // Define horizontal cursor start position depending on alignment
        let cursorX = w / 2 - totalLineWidth / 2;
        if (settings.hAlign === 'left') {
          cursorX = pad;
        } else if (settings.hAlign === 'right') {
          cursorX = w - pad - totalLineWidth;
        }

        measuredChunks.forEach(chunk => {
          if (!chunk.cleanText) return;

          ctx.font = fontSpec;
          ctx.textAlign = 'left';

          // Apply special highlighted background box style
          if (chunk.isHighlight && settings.highlightStyle === 'box') {
            ctx.save();
            ctx.fillStyle = settings.highlightColor;
            
            // Draw smooth rounded backdrop pill for the highlighted word
            const boxPaddingX = Math.round(14 * scale);
            const boxPaddingY = Math.round(6 * scale);
            const boxX = cursorX - boxPaddingX / 2;
            const boxY = currentY - realAscent - boxPaddingY;
            const boxW = chunk.width + boxPaddingX;
            const boxH = realLineH + boxPaddingY * 2;
            const radius = Math.round(8 * scale);

            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(boxX, boxY, boxW, boxH, radius);
            } else {
              ctx.rect(boxX, boxY, boxW, boxH);
            }
            ctx.fill();
            ctx.restore();

            // Render high-contrast dark text inside the highlight box
            ctx.fillStyle = '#0f172a'; // Deep charcoal for readability
            ctx.fillText(chunk.cleanText, cursorX, currentY);
          } else {
            // Apply standard text-color highlight or base text color
            ctx.save();
            const baseTxtColor = vividStyle ? vividStyle.text : settings.textColor;
            ctx.fillStyle = chunk.isHighlight 
              ? getAutoTextColor(effectiveBgColor, settings.highlightColor)
              : getAutoTextColor(effectiveBgColor, baseTxtColor);

            // Apply shadow and outline text effects
            if (settings.shadowEnabled) {
              ctx.shadowColor = settings.shadowColor;
              ctx.shadowBlur = settings.shadowBlur;
              ctx.shadowOffsetX = settings.shadowOx;
              ctx.shadowOffsetY = settings.shadowOy;
            }
            if (settings.outlineEnabled) {
              ctx.strokeStyle = settings.outlineColor;
              ctx.lineWidth = settings.outlineWidth * 2;
              ctx.lineJoin = 'round';
              ctx.strokeText(chunk.cleanText, cursorX, currentY);
            }
            ctx.fillText(chunk.cleanText, cursorX, currentY);
            ctx.restore();
          }

          cursorX += chunk.width;
        });
      }
    });

    // Draw Flag Logo
    if (settings.flagEnabled && selectedFlagUrl) {
      const cachedFlag = imageCache[selectedFlagUrl];
      if (cachedFlag) {
        ctx.save();
        const flagW = Math.round(settings.flagSize * scale);
        const flagH = Math.round(flagW * 0.67); // standard 3:2 flag ratio
        const flagYpx = h * (settings.flagY / 100);

        let flagXpx = w / 2;
        if (selectedFlagHAlign === 'left') {
          flagXpx = pad + flagW / 2;
        } else if (selectedFlagHAlign === 'right') {
          flagXpx = w - pad - flagW / 2;
        }

        const flagLeft = flagXpx - flagW / 2;
        const flagTop = flagYpx - flagH / 2;
        const flagRadius = Math.round(6 * scale);

        // Clip flag to rounded rectangle
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(flagLeft, flagTop, flagW, flagH, flagRadius);
        } else {
          ctx.rect(flagLeft, flagTop, flagW, flagH);
        }
        ctx.clip();
        ctx.drawImage(cachedFlag, flagLeft, flagTop, flagW, flagH);
        ctx.restore();
      }
    }

    // Draw Description Text
    if (settings.descEnabled && settings.descText) {
      ctx.save();
      const descSize = Math.round(settings.descSize * scale);
      ctx.font = `${settings.descWeight} ${descSize}px '${settings.fontFamily}', sans-serif`;
      
      let finalDescColor = settings.descColor;
      if (settings.descBoxEnabled && settings.descBoxOpacity > 40) {
        finalDescColor = getAutoTextColor(settings.descBoxColor, settings.descColor);
      } else {
        finalDescColor = getAutoTextColor(effectiveBgColor, settings.descColor);
      }
      ctx.fillStyle = finalDescColor;

      const descBoxPadding = Math.round(settings.descBoxPadding * scale);
      const maxDescW = w - pad * 2 - (settings.descBoxEnabled ? descBoxPadding * 2 : 0);
      const descLines = wrapTextWithHighlights(ctx, settings.descText, maxDescW, ctx.font);
      const descLH = descSize * 1.4;
      const descBlockH = descLines.length * descLH;

      // Position from bottom
      const descYpx = h * (settings.descY / 100);

      if (settings.descBoxEnabled) {
        const boxX = pad / 2;
        const boxW = w - pad;
        const boxY = descYpx - descSize - descBoxPadding;
        const boxH = descBlockH + descBoxPadding * 2;
        const boxRadius = Math.round(10 * scale);

        ctx.fillStyle = hexToRgba(settings.descBoxColor, settings.descBoxOpacity / 100);
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(boxX, boxY, boxW, boxH, boxRadius);
        } else {
          ctx.rect(boxX, boxY, boxW, boxH);
        }
        ctx.fill();

        if (settings.descBorderWidth > 0) {
          ctx.strokeStyle = settings.descBorderColor;
          ctx.lineWidth = settings.descBorderWidth * scale;
          ctx.stroke();
        }
      }

      ctx.textAlign = settings.descHAlign;
      const descXpx = settings.descHAlign === 'left' 
        ? pad + (settings.descBoxEnabled ? descBoxPadding : 0)
        : settings.descHAlign === 'right'
        ? w - pad - (settings.descBoxEnabled ? descBoxPadding : 0)
        : w / 2;

      descLines.forEach((dLine, dIdx) => {
        ctx.fillText(dLine, descXpx, descYpx + dIdx * descLH);
      });
      ctx.restore();
    }

    // Draw Call-To-Action (CTA) Button
    if (settings.ctaEnabled && settings.ctaText) {
      ctx.save();
      const ctaSize = Math.round(settings.ctaSize * scale);
      ctx.font = `${settings.ctaWeight} ${ctaSize}px '${settings.fontFamily}', sans-serif`;

      const tw = ctx.measureText(settings.ctaText).width;
      const ctaPx = Math.round(settings.ctaPx * scale);
      const ctaPy = Math.round(settings.ctaPy * scale);
      const bw = tw + ctaPx * 2;
      const bh = ctaSize + ctaPy * 2;

      const ctaYpx = h * (settings.ctaY / 100);
      const bx = w / 2 - bw / 2;
      const by = ctaYpx - bh / 2;
      const ctaRadius = Math.round(settings.ctaRadius * scale);

      const ctaBg = vividStyle ? vividStyle.cta : settings.ctaBgColor;
      const finalCtaTextColor = settings.ctaTransparent 
        ? getAutoTextColor(effectiveBgColor, settings.ctaTextColor)
        : getAutoTextColor(ctaBg, settings.ctaTextColor);

      // Render shape
      if (!settings.ctaTransparent) {
        drawCTAShape(ctx, settings.ctaShape, bx, by, bw, bh, ctaRadius, ctaBg, null, 0);
      } else {
        drawCTAShape(ctx, settings.ctaShape, bx, by, bw, bh, ctaRadius, null, finalCtaTextColor, Math.round(3 * scale));
      }

      // Fill CTA Text
      ctx.fillStyle = finalCtaTextColor;
      ctx.textAlign = 'center';
      const ctaTextY = by + ctaPy + ctaSize * 0.76;

      ctx.fillText(settings.ctaText, w / 2, ctaTextY);

      if (settings.ctaUnderline) {
        ctx.fillRect(w / 2 - tw / 2, ctaTextY + Math.round(ctaSize * 0.12), tw, Math.round(2 * scale));
      }
      ctx.restore();
    }

    if (onLoaded) {
      onLoaded();
    }
  }, [
    text,
    settings,
    perCardImage,
    perCardBgColor,
    perCardPos,
    vividStyle,
    selectedFlagUrl,
    selectedFlagHAlign,
    previewScale,
    imageLoaded,
    flagLoaded,
  ]);

  // Helper single-line raw text rendering with shadow/outline effects
  const drawSingleLineRaw = (
    ctx: CanvasRenderingContext2D,
    line: string,
    x: number,
    y: number,
    settings: AppSettings,
    effectiveBgColor: string,
    vividStyle?: { bg: string; text: string; cta: string }
  ) => {
    ctx.save();
    const baseTxtColor = vividStyle ? vividStyle.text : settings.textColor;
    ctx.fillStyle = getAutoTextColor(effectiveBgColor, baseTxtColor);

    if (settings.shadowEnabled) {
      ctx.shadowColor = settings.shadowColor;
      ctx.shadowBlur = settings.shadowBlur;
      ctx.shadowOffsetX = settings.shadowOx;
      ctx.shadowOffsetY = settings.shadowOy;
    }

    if (settings.outlineEnabled) {
      ctx.strokeStyle = settings.outlineColor;
      ctx.lineWidth = settings.outlineWidth * 2;
      ctx.lineJoin = 'round';
      ctx.strokeText(line, x, y);
    }

    ctx.fillText(line, x, y);
    ctx.restore();
  };

  return (
    <canvas
      ref={canvasRef}
      className="block max-w-full h-auto transition-transform duration-200"
      style={{
        width: '100%',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      }}
    />
  );
};
