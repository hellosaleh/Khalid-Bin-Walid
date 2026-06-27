import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import {
  Sparkles,
  Settings,
  Layers,
  Download,
  Search,
  Image,
  FileText,
  Check,
  Trash2,
  Plus,
  RefreshCw,
  LayoutGrid,
  Maximize2,
  ChevronDown,
  Type,
  MapPin,
  RotateCcw,
  FileDown,
  X,
  ArrowLeft,
  ArrowRight,
  Upload,
  Link,
  Move,
  Eye
} from 'lucide-react';

import { AppSettings, CanvasSizePreset, CtaShape, AlignHorizontal, AlignVertical } from './types';
import { CreativeCanvas } from './components/CreativeCanvas';
import { LiveMockupView } from './components/LiveMockupView';
import {
  UNSPLASH_KEY,
  DEFAULT_AD_COPIES,
  COUNTRIES_LIST,
  PALETTE_VIVID,
  PALETTE_BOLD,
  PALETTE_LIGHT,
  VIVID_COMBOS,
  STYLE_TEMPLATES
} from './data';

export default function App() {
  // 1. Core State
  const [adCopies, setAdCopies] = useState<string[]>(() => {
    const saved = localStorage.getItem('ad_copies');
    return saved ? JSON.parse(saved) : DEFAULT_AD_COPIES;
  });

  const [globalSettings, setGlobalSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('ad_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      sizePreset: 'square',
      customWidth: 1080,
      customHeight: 1350,
      bgTab: 'gradient',
      bgColor: '#1e1b4b',
      gradC1: '#6366f1',
      gradC2: '#1e1b4b',
      gradAngle: 135,
      images: [],
      selectedImageIndex: undefined,
      imgFit: 'cover',
      overlayEnabled: true,
      overlayColor: '#000000',
      overlayOpacity: 55,
      bgZoom: 100,
      bgPosX: 0,
      bgPosY: 0,
      subEnabled: true,
      subText: 'AD COPY VARIATION',
      subSize: 36,
      subColor: '#cbd5e1',
      subY: 15,
      fontFamily: 'Poppins',
      fontWeight: '700',
      fontSize: 90,
      lineHeight: 1.25,
      textColor: '#ffffff',
      highlightColor: '#facc15',
      highlightStyle: 'text',
      hAlign: 'center',
      vAlign: 'middle',
      descEnabled: false,
      descText: 'Apply in less than 2 minutes online',
      descSize: 30,
      descColor: '#e2e8f0',
      descWeight: '400',
      descY: 65,
      descHAlign: 'center',
      descBoxEnabled: false,
      descBoxColor: '#1e293b',
      descBoxOpacity: 80,
      descBoxPadding: 20,
      descBorderWidth: 0,
      descBorderColor: '#e2e8f0',
      ctaEnabled: true,
      ctaText: 'Apply Now',
      ctaShape: 'pill',
      ctaY: 82,
      ctaWeight: '700',
      ctaRadius: 32,
      ctaPx: 64,
      ctaPy: 16,
      ctaSize: 36,
      ctaTextColor: '#0f172a',
      ctaBgColor: '#facc15',
      ctaTransparent: false,
      ctaUnderline: false,
      flagEnabled: false,
      flagCountryCode: 'de',
      flagCountryName: 'Germany',
      flagSize: 80,
      flagY: 15,
      flagHAlign: 'left',
      outlineEnabled: false,
      outlineWidth: 4,
      outlineColor: '#000000',
      shadowEnabled: true,
      shadowColor: '#000000',
      shadowBlur: 8,
      shadowOx: 4,
      shadowOy: 4
    };
  });

  // Edit scope: 'global' | 'single'
  const [editScope, setEditScope] = useState<'global' | 'single'>('global');

  // Active edit design index
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);

  // Per-card AppSettings overrides
  const [perCardSettings, setPerCardSettings] = useState<Record<number, Partial<AppSettings>>>(() => {
    const saved = localStorage.getItem('ad_per_card_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  // Virtual settings memo
  const settings = useMemo(() => {
    if (editScope === 'single' && activeEditIndex !== null) {
      return { ...globalSettings, ...(perCardSettings[activeEditIndex] || {}) };
    }
    return globalSettings;
  }, [globalSettings, editScope, activeEditIndex, perCardSettings]);

  // Virtual setSettings interceptor
  const setSettings = useCallback((
    updater: AppSettings | ((prev: AppSettings) => AppSettings)
  ) => {
    if (editScope === 'single' && activeEditIndex !== null) {
      setPerCardSettings(prev => {
        const currentOverrides = prev[activeEditIndex] || {};
        const currentMerged = { ...globalSettings, ...currentOverrides };
        const nextMerged = typeof updater === 'function' ? updater(currentMerged) : updater;
        
        // Compute delta against globalSettings
        const diff: Partial<AppSettings> = {};
        (Object.keys(globalSettings) as Array<keyof AppSettings>).forEach(key => {
          if (JSON.stringify(nextMerged[key]) !== JSON.stringify(globalSettings[key])) {
            diff[key] = nextMerged[key] as any;
          }
        });
        
        return {
          ...prev,
          [activeEditIndex]: diff
        };
      });
    } else {
      setGlobalSettings(updater);
    }
  }, [editScope, activeEditIndex, globalSettings]);

  // Persistent States
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
  const [perCardImages, setPerCardImages] = useState<Record<number, string>>({});
  const [perCardBgColors, setPerCardBgColors] = useState<Record<number, string>>({});
  const [perCardPos, setPerCardPos] = useState<Record<number, { x: number; y: number; zoom: number }>>({});
  const [vividStylePerLine, setVividStylePerLine] = useState<Record<number, { bg: string; text: string; cta: string }>>({});
  
  // UI Panel & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'selected' | 'customImg'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'live'>('grid');
  const [activeTab, setActiveTab] = useState<'solid' | 'gradient' | 'image'>('gradient');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    canvas: true,
    bg: true,
    typo: true,
    effects: false,
    subhl: false,
    desc: false,
    cta: false,
    flag: false,
    sheets: false
  });

  // Search/Autocomplete flags
  const [flagQuery, setFlagQuery] = useState('');
  const [flagResults, setFlagResults] = useState<{ name: string; code: string }[]>([]);

  // Drag Panning Tool State
  const [dragToolActive, setDragToolActive] = useState(false);
  const [panningCardIndex, setPanningCardIndex] = useState<number | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Lightbox / Immersive Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Bulk downloader states
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [bulkBgProgress, setBulkBgProgress] = useState<{ current: number; total: number; status: string } | null>(null);

  // Auto-save copies and settings
  useEffect(() => {
    localStorage.setItem('ad_copies', JSON.stringify(adCopies));
  }, [adCopies]);

  useEffect(() => {
    localStorage.setItem('ad_settings', JSON.stringify(globalSettings));
  }, [globalSettings]);

  useEffect(() => {
    localStorage.setItem('ad_per_card_settings', JSON.stringify(perCardSettings));
  }, [perCardSettings]);

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') navigateLightbox(1);
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, adCopies]);

  const navigateLightbox = (direction: number) => {
    if (lightboxIndex === null) return;
    const nextIdx = lightboxIndex + direction;
    if (nextIdx >= 0 && nextIdx < adCopies.length) {
      setLightboxIndex(nextIdx);
    }
  };

  // 2. Custom Methods
  const handleCopyChange = (val: string) => {
    const lines = val.split('\n');
    setAdCopies(lines);
  };

  const convertCase = (type: 'upper' | 'lower' | 'title' | 'sentence') => {
    const converted = adCopies.map(line => {
      if (!line.trim()) return line;
      switch (type) {
        case 'upper':
          return line.toUpperCase();
        case 'lower':
          return line.toLowerCase();
        case 'title':
          return line.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
        case 'sentence':
          const clean = line.toLowerCase();
          return clean.charAt(0).toUpperCase() + clean.slice(1);
        default:
          return line;
      }
    });
    setAdCopies(converted);
  };

  const handleSelectCard = (idx: number, e: React.MouseEvent) => {
    // If the drag panning tool is active, do not select cards
    if (dragToolActive) return;

    if (editScope === 'single') {
      setActiveEditIndex(idx);
      return;
    }

    const newSet = new Set(selectedCards);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setSelectedCards(newSet);
  };

  const selectAll = () => {
    if (selectedCards.size === adCopies.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(adCopies.map((_, i) => i)));
    }
  };

  // Vivid auto styling per variation card
  const applyVividAutoStyle = () => {
    const overrides: Record<number, { bg: string; text: string; cta: string }> = {};
    adCopies.forEach((_, i) => {
      overrides[i] = VIVID_COMBOS[i % VIVID_COMBOS.length];
    });
    setVividStylePerLine(overrides);
  };

  const clearVividAutoStyle = () => {
    setVividStylePerLine({});
  };

  // Color Per Card randomizer
  const assignRandomColorsPerCard = () => {
    const palette = [...PALETTE_VIVID, ...PALETTE_BOLD];
    const randomized: Record<number, string> = {};
    adCopies.forEach((_, i) => {
      randomized[i] = palette[Math.floor(Math.random() * palette.length)];
    });
    setPerCardBgColors(randomized);
    setVividStylePerLine({}); // Clear vivid
  };

  // Country Flag System
  const searchCountryFlags = (query: string) => {
    setFlagQuery(query);
    if (!query.trim()) {
      setFlagResults([]);
      return;
    }
    const filtered = COUNTRIES_LIST.filter(c =>
      c.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
    setFlagResults(filtered);
  };

  const selectFlag = (code: string, name: string) => {
    setSettings(prev => ({
      ...prev,
      flagEnabled: true,
      flagCountryCode: code,
      flagCountryName: name
    }));
    setFlagQuery('');
    setFlagResults([]);
  };

  const clearFlag = () => {
    setSettings(prev => ({ ...prev, flagEnabled: false, flagCountryCode: '', flagCountryName: '' }));
  };

  // Sync Google Sheets URL (CSV Export)
  const syncGoogleSheet = async (url: string) => {
    if (!url.trim()) return;
    const sheetIdMatch = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      alert('Ungültige Google Sheets URL.');
      return;
    }
    const sheetId = sheetIdMatch[1];
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    try {
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error();
      const text = await res.text();
      const lines = text
        .split('\n')
        .map(line => line.replace(/"/g, '').trim())
        .filter(Boolean);
      const copies = lines.map(l => l.split(',')[0]).filter(Boolean);
      setAdCopies(copies);
    } catch (e) {
      alert('Sync fehlgeschlagen. Stelle sicher, dass die Tabelle auf "Jeder, der den Link hat, darf ansehen" freigegeben ist.');
    }
  };

  // Load CSV File directly
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const lines = text
        .split('\n')
        .map(line => line.replace(/"/g, '').trim())
        .filter(Boolean);
      const copies = lines.map(l => l.split(',')[0]).filter(Boolean);
      setAdCopies(copies);
    };
    reader.readAsText(file);
  };

  // Image upload handling
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.map((file: File) => ({
      url: URL.createObjectURL(file),
      name: file.name
    }));

    setSettings(prev => {
      const updatedImages = [...prev.images, ...newImages];
      return {
        ...prev,
        images: updatedImages,
        selectedImageIndex: prev.selectedImageIndex ?? 0
      };
    });
  };

  const deleteUploadedImage = (idx: number) => {
    setSettings(prev => {
      const updated = prev.images.filter((_, i) => i !== idx);
      let nextIndex = prev.selectedImageIndex;
      if (nextIndex === idx) nextIndex = updated.length > 0 ? 0 : undefined;
      else if (nextIndex && nextIndex > idx) nextIndex--;
      return {
        ...prev,
        images: updated,
        selectedImageIndex: nextIndex
      };
    });
  };

  // Distribute uploaded images sequentially across all copy variations
  const distributeUploadedImages = () => {
    if (settings.images.length === 0) return;
    const distributed: Record<number, string> = {};
    adCopies.forEach((_, i) => {
      const img = settings.images[i % settings.images.length];
      distributed[i] = img.url;
    });
    setPerCardImages(distributed);
  };

  // Direct Assign image to currently highlighted card selection
  const assignImageToCard = (cardIdx: number, imgUrl: string) => {
    setPerCardImages(prev => ({
      ...prev,
      [cardIdx]: imgUrl
    }));
  };

  // Clear per card image overrides
  const clearPerCardImages = () => {
    setPerCardImages({});
    setPerCardBgColors({});
    setPerCardPos({});
  };

  // Unsplash Autocomplete Fetch Helper
  const fetchFromUnsplashQuery = async (query: string): Promise<string | null> => {
    const cleanWord = query
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .split(' ')
      .filter(w => w.length > 2 && !['and', 'the', 'for', 'with', 'jobs', 'work'].includes(w.toLowerCase()))
      .slice(0, 2)
      .join(' ');

    const searchTerm = cleanWord || 'abstract gradient';
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&per_page=1&orientation=squarish`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
      );
      const data = await res.json();
      if (data?.results?.length > 0) {
        return data.results[0].urls.regular;
      }
    } catch (e) {}

    // Fallback search to LoremFlickr keyword
    return `https://loremflickr.com/1080/1080/${encodeURIComponent(searchTerm || 'business')}`;
  };

  // Auto matching keyword background image generator for ALL variation cards
  const generateAutoBackgroundsForAll = async () => {
    setBulkBgProgress({ current: 0, total: adCopies.length, status: 'Initializing auto templates...' });
    
    // Switch to image background tab & force dark overlay for high text contrast
    setActiveTab('image');
    setSettings(prev => ({ ...prev, bgTab: 'image', overlayEnabled: true, overlayOpacity: 55 }));

    const distributed: Record<number, string> = {};
    const newlyAddedImages: { url: string; name: string }[] = [];

    // Process variations in batches of 3 to prevent API rate limits
    const batchSize = 3;
    for (let i = 0; i < adCopies.length; i += batchSize) {
      const currentBatch = adCopies.slice(i, i + batchSize);
      
      await Promise.all(
        currentBatch.map(async (line, subIdx) => {
          const absoluteIndex = i + subIdx;
          setBulkBgProgress(prev =>
            prev ? { ...prev, current: absoluteIndex, status: `Searching visuals for: "${line.slice(0, 24)}..."` } : null
          );

          const imgUrl = await fetchFromUnsplashQuery(line);
          if (imgUrl) {
            distributed[absoluteIndex] = imgUrl;
            newlyAddedImages.push({ url: imgUrl, name: line });
          }
        })
      );

      if (i + batchSize < adCopies.length) {
        await new Promise(r => setTimeout(r, 200)); // small batch delay
      }
    }

    setPerCardImages(prev => ({ ...prev, ...distributed }));
    setSettings(prev => ({
      ...prev,
      images: [...prev.images, ...newlyAddedImages],
      selectedImageIndex: prev.selectedImageIndex ?? 0
    }));

    setBulkBgProgress(null);
  };

  // Subject Area / Face Centering algorithm
  const autoDetectSubjectArea = async (idx: number) => {
    const bgUrl = perCardImages[idx] || settings.images[settings.selectedImageIndex ?? 0]?.url;
    if (!bgUrl) return;

    // Set position override
    setPerCardPos(prev => ({
      ...prev,
      [idx]: {
        x: 0,
        y: -120, // push up slightly assuming face lies in top quadrant
        zoom: 115
      }
    }));
  };

  // Handle Drag Panning Background Move
  const handleDragStart = (idx: number, e: React.MouseEvent) => {
    if (!dragToolActive) return;
    e.preventDefault();
    setPanningCardIndex(idx);

    const cp = perCardPos[idx] || { x: settings.bgPosX, y: settings.bgPosY, zoom: settings.bgZoom };
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: cp.x,
      posY: cp.y
    };
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (panningCardIndex === null) return;
    const idx = panningCardIndex;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const currentZoom = perCardPos[idx]?.zoom ?? settings.bgZoom;

    // Update coordinates in perCardPos
    setPerCardPos(prev => ({
      ...prev,
      [idx]: {
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
        zoom: currentZoom
      }
    }));
  };

  const handleDragEnd = () => {
    setPanningCardIndex(null);
  };

  // 3. Batch ZIP exporter
  const batchZipDownload = async () => {
    const indicesToDownload = selectedCards.size > 0 
      ? Array.from(selectedCards) 
      : adCopies.map((_, i) => i);

    setExportProgress(1);
    const zip = new JSZip();

    try {
      for (let i = 0; i < indicesToDownload.length; i++) {
        const idx = indicesToDownload[i];
        const text = adCopies[idx];
        setExportProgress(Math.round(((i + 1) / indicesToDownload.length) * 100));

        // Use card-specific settings
        const settings = { ...globalSettings, ...(perCardSettings[idx] || {}) };

        // Get offscreen canvas or render temporarily
        const canvas = document.createElement('canvas');
        let width = 1080;
        let height = 1080;
        if (settings.sizePreset === 'vertical') {
          height = 1350;
        } else if (settings.sizePreset === 'custom') {
          width = settings.customWidth || 1080;
          height = settings.customHeight || 1080;
        }

        // Draw full-scale canvas
        await triggerOffscreenRender(canvas, text, idx, width, height);
        
        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];
        
        // Clean name
        const cleanName = text.replace(/[*#<>:"/\\|?*]/g, '').trim().slice(0, 40) || `Creative_${idx + 1}`;
        zip.file(`${cleanName}.png`, base64Data, { base64: true });
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.download = `Creative-Studio-Pack-${Date.now()}.zip`;
      link.href = URL.createObjectURL(blob);
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setExportProgress(null);
    }
  };

  // Quick helper to draw on dynamic offscreen canvas for export
  const triggerOffscreenRender = async (
    canvas: HTMLCanvasElement,
    text: string,
    idx: number,
    w: number,
    h: number
  ) => {
    // Shadow standard settings with card-specific overrides
    const settings = { ...globalSettings, ...(perCardSettings[idx] || {}) };

    // We instantiate an internal CreativeCanvas and call its render function manually
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = w;
    canvas.height = h;

    // Set font family loading
    ctx.textBaseline = 'alphabetic';
    const scale = w / 1080;

    // Render background
    const bgUrl = perCardImages[idx] || (settings.bgTab === 'image' && settings.images[settings.selectedImageIndex ?? 0]?.url);
    if (settings.bgTab === 'image' && bgUrl) {
      // Since it's fully exported, let's load it synchronously if possible, or wait
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = bgUrl;
      await new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      if (img.complete && img.naturalWidth > 0) {
        ctx.save();
        const cp = perCardPos[idx] || { x: settings.bgPosX, y: settings.bgPosY, zoom: settings.bgZoom };
        const zoom = cp.zoom / 100;
        const px = cp.x * scale;
        const py = cp.y * scale;

        if (settings.imgFit === 'cover') {
          const scaleFactor = Math.max(w / img.width, h / img.height) * zoom;
          const sw = img.width * scaleFactor;
          const sh = img.height * scaleFactor;
          ctx.drawImage(img, (w - sw) / 2 + px, (h - sh) / 2 + py, sw, sh);
        } else {
          const scaleFactor = Math.min(w / img.width, h / img.height) * zoom;
          const sw = img.width * scaleFactor;
          const sh = img.height * scaleFactor;
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, (w - sw) / 2 + px, (h - sh) / 2 + py, sw, sh);
        }
        ctx.restore();
      }

      if (settings.overlayEnabled) {
        const hex = settings.overlayColor;
        const r = parseInt(hex.slice(1, 3), 16) || 0;
        const g = parseInt(hex.slice(3, 5), 16) || 0;
        const b = parseInt(hex.slice(5, 7), 16) || 0;
        ctx.fillStyle = `rgba(${r},${g},${b},${settings.overlayOpacity / 100})`;
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
      ctx.fillStyle = vividStylePerLine[idx]
        ? vividStylePerLine[idx].bg
        : perCardBgColors[idx] || settings.bgColor;
      ctx.fillRect(0, 0, w, h);
    }

    // Subheadline
    if (settings.subEnabled && settings.subText) {
      const subSize = Math.round(settings.subSize * scale);
      ctx.font = `500 ${subSize}px '${settings.fontFamily}', sans-serif`;
      ctx.fillStyle = settings.subColor;
      ctx.textAlign = 'center';
      ctx.fillText(settings.subText, w / 2, h * (settings.subY / 100));
    }

    // Headline
    const fs = Math.round(settings.fontSize * scale);
    const fontSpec = `${settings.fontWeight} ${fs}px '${settings.fontFamily}', sans-serif`;
    ctx.font = fontSpec;

    // Simple wrap
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    const maxTextW = w - (w * 0.08) * 2;

    for (let word of words) {
      const test = currentLine ? currentLine + ' ' + word : word;
      const cleanTest = test.replace(/\*/g, '');
      ctx.font = fontSpec;
      if (ctx.measureText(cleanTest).width > maxTextW && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lh = fs * settings.lineHeight;
    const sampleMetrics = ctx.measureText('Mg');
    const realAscent = sampleMetrics.actualBoundingBoxAscent || fs * 0.75;
    const realDescent = sampleMetrics.actualBoundingBoxDescent || fs * 0.25;
    const realLineH = realAscent + realDescent;
    const totalBlockH = realLineH + (lines.length - 1) * lh;

    let textBlockYStart = (h - totalBlockH) / 2 + realAscent;
    if (settings.vAlign === 'top') textBlockYStart = w * 0.08 + realAscent;
    if (settings.vAlign === 'bottom') textBlockYStart = h - w * 0.08 - totalBlockH + realAscent;

    lines.forEach((line, lineIdx) => {
      const currentY = textBlockYStart + lineIdx * lh;
      const parts = line.split('*');
      const chunks = parts.map((part, pI) => ({ text: part, isHighlight: pI % 2 !== 0 }));
      const hasHighlights = chunks.some(c => c.isHighlight && c.text.trim().length > 0);

      ctx.textAlign = settings.hAlign;

      if (!hasHighlights) {
        ctx.fillStyle = vividStylePerLine[idx] ? vividStylePerLine[idx].text : settings.textColor;
        if (settings.shadowEnabled) {
          ctx.shadowColor = settings.shadowColor;
          ctx.shadowBlur = settings.shadowBlur;
          ctx.shadowOffsetX = settings.shadowOx;
          ctx.shadowOffsetY = settings.shadowOy;
        }
        if (settings.outlineEnabled) {
          ctx.strokeStyle = settings.outlineColor;
          ctx.lineWidth = settings.outlineWidth * 2;
          ctx.strokeText(line, w / 2, currentY);
        }
        ctx.fillText(line, w / 2, currentY);
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      } else {
        // inline highlight drawing in export (simplified width measurement and cursor movement)
        const measured = chunks.map(ch => {
          ctx.font = fontSpec;
          return { ...ch, width: ctx.measureText(ch.text).width };
        });
        const totalW = measured.reduce((acc, c) => acc + c.width, 0);
        let curX = w / 2 - totalW / 2;
        if (settings.hAlign === 'left') curX = w * 0.08;
        if (settings.hAlign === 'right') curX = w - w * 0.08 - totalW;

        measured.forEach(ch => {
          if (!ch.text) return;
          ctx.font = fontSpec;
          ctx.textAlign = 'left';

          if (ch.isHighlight && settings.highlightStyle === 'box') {
            ctx.fillStyle = settings.highlightColor;
            const bPadX = Math.round(14 * scale);
            const bPadY = Math.round(6 * scale);
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(curX - bPadX / 2, currentY - realAscent - bPadY, ch.width + bPadX, realLineH + bPadY * 2, Math.round(8 * scale));
            } else {
              ctx.rect(curX - bPadX / 2, currentY - realAscent - bPadY, ch.width + bPadX, realLineH + bPadY * 2);
            }
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.fillText(ch.text, curX, currentY);
          } else {
            ctx.fillStyle = ch.isHighlight ? settings.highlightColor : (vividStylePerLine[idx] ? vividStylePerLine[idx].text : settings.textColor);
            ctx.fillText(ch.text, curX, currentY);
          }
          curX += ch.width;
        });
      }
    });

    // Flag / Logo
    if (settings.flagEnabled && settings.flagCountryCode) {
      const flagUrl = `https://flagcdn.com/w160/${settings.flagCountryCode}.png`;
      const flagImg = new Image();
      flagImg.crossOrigin = 'anonymous';
      flagImg.src = flagUrl;
      await new Promise(r => { flagImg.onload = r; flagImg.onerror = r; });

      if (flagImg.complete) {
        ctx.save();
        const fW = Math.round(settings.flagSize * scale);
        const fH = Math.round(fW * 0.67);
        const fY = h * (settings.flagY / 100);
        let fX = w / 2;
        if (settings.flagHAlign === 'left') fX = w * 0.08 + fW / 2;
        if (settings.flagHAlign === 'right') fX = w - w * 0.08 - fW / 2;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(fX - fW / 2, fY - fH / 2, fW, fH, Math.round(6 * scale));
        } else {
          ctx.rect(fX - fW / 2, fY - fH / 2, fW, fH);
        }
        ctx.clip();
        ctx.drawImage(flagImg, fX - fW / 2, fY - fH / 2, fW, fH);
        ctx.restore();
      }
    }

    // Description text
    if (settings.descEnabled && settings.descText) {
      const dSize = Math.round(settings.descSize * scale);
      ctx.font = `${settings.descWeight} ${dSize}px '${settings.fontFamily}', sans-serif`;
      ctx.fillStyle = settings.descColor;
      ctx.textAlign = settings.descHAlign;
      const dX = settings.descHAlign === 'left' ? w * 0.08 : (settings.descHAlign === 'right' ? w - w * 0.08 : w / 2);
      ctx.fillText(settings.descText, dX, h * (settings.descY / 100));
    }

    // CTA Button
    if (settings.ctaEnabled && settings.ctaText) {
      const cSize = Math.round(settings.ctaSize * scale);
      ctx.font = `${settings.ctaWeight} ${cSize}px '${settings.fontFamily}', sans-serif`;
      const tW = ctx.measureText(settings.ctaText).width;
      const cPx = Math.round(settings.ctaPx * scale);
      const cPy = Math.round(settings.ctaPy * scale);
      const bW = tW + cPx * 2;
      const bH = cSize + cPy * 2;
      const bX = w / 2 - bW / 2;
      const bY = h * (settings.ctaY / 100) - bH / 2;
      const cRad = Math.round(settings.ctaRadius * scale);

      ctx.fillStyle = vividStylePerLine[idx] ? vividStylePerLine[idx].cta : settings.ctaBgColor;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(bX, bY, bW, bH, cRad);
      } else {
        ctx.rect(bX, bY, bW, bH);
      }
      ctx.fill();

      ctx.fillStyle = settings.ctaTextColor;
      ctx.textAlign = 'center';
      ctx.fillText(settings.ctaText, w / 2, bY + cPy + cSize * 0.76);
    }
  };

  // Filter and search copies
  const filteredCopies = adCopies
    .map((copy, originalIndex) => ({ copy, originalIndex }))
    .filter(({ copy, originalIndex }) => {
      const matchesSearch = copy.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterMode === 'selected') {
        return selectedCards.has(originalIndex);
      }
      if (filterMode === 'customImg') {
        return !!perCardImages[originalIndex];
      }
      return true;
    });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0c0c14] font-sans text-white antialiased selection:bg-indigo-500/30 selection:text-white relative">
      
      {/* Background Mesh Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[60%] rounded-full bg-indigo-600/25 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/15 blur-[120px]"></div>
        <div className="absolute top-[30%] right-[10%] w-[30%] h-[40%] rounded-full bg-blue-500/10 blur-[100px]"></div>
      </div>

      {/* SIDEBAR */}
      <aside className="relative z-10 flex w-96 flex-col border-r border-white/10 backdrop-blur-xl bg-white/5 shadow-2xl">
        <div className="flex items-center gap-3 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 px-6 py-4.5 text-white border-b border-white/10">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
          </div>
          <div>
            <h1 className="text-md font-bold tracking-tight">Ad Creative Studio</h1>
            <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Bulk Generator v2</p>
          </div>
        </div>

        {/* Collapsible Sidebar Sections */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Section: Edit Scope Controller */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md p-4 space-y-3.5">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">Style Scope Mode</span>
            </div>
            
            <p className="text-[11px] text-white/50 leading-relaxed font-semibold">
              Apply changes to <strong className="text-white/90">all designs</strong> simultaneously, or fine-tune style settings on a <strong className="text-white/90">single active card</strong>.
            </p>

            <div className="grid grid-cols-2 gap-1.5 p-0.5 rounded-lg bg-slate-950/40 border border-white/10">
              <button
                onClick={() => setEditScope('global')}
                className={`rounded-md py-2 text-xs font-extrabold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  editScope === 'global'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <span>🌍 Global</span>
                <span className="text-[8px] opacity-75 font-bold uppercase tracking-widest">All Cards</span>
              </button>
              <button
                onClick={() => {
                  setEditScope('single');
                  if (activeEditIndex === null) {
                    setActiveEditIndex(0);
                  }
                }}
                className={`rounded-md py-2 text-xs font-extrabold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  editScope === 'single'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <span>🎯 Per-Design</span>
                <span className="text-[8px] opacity-75 font-bold uppercase tracking-widest">Single Card</span>
              </button>
            </div>

            {editScope === 'single' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 pt-1"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Select Active Target Card:</label>
                  <select
                    value={activeEditIndex ?? 0}
                    onChange={(e) => setActiveEditIndex(parseInt(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {adCopies.map((copy, i) => (
                      <option key={i} value={i} className="bg-slate-950 text-white font-bold">
                        Design #{i + 1}: {copy.replace(/\*/g, '').slice(0, 28).trim()}...
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 flex items-start gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0 mt-1"></div>
                  <p className="text-[10px] text-white/70 font-bold leading-relaxed">
                    Style changes below will now target <span className="text-amber-400 font-extrabold">Design #{ (activeEditIndex ?? 0) + 1 }</span> only. Other cards remain unaffected.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      if (activeEditIndex !== null) {
                        setPerCardSettings(prev => {
                          const updated = { ...prev };
                          delete updated[activeEditIndex];
                          return updated;
                        });
                      }
                    }}
                    className="w-full rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 text-[10px] font-black tracking-wider uppercase py-2 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Revert to Global Style
                  </button>
                  {Object.keys(perCardSettings).length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to clear all design-specific style overrides?')) {
                          setPerCardSettings({});
                        }
                      }}
                      className="w-full text-[9px] font-bold text-white/40 hover:text-white/60 text-center transition-all underline cursor-pointer"
                    >
                      Clear All Card Overrides ({Object.keys(perCardSettings).length})
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Section: Size & Layout Presets */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
            <button
              onClick={() => toggleSection('canvas')}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-white/80 hover:bg-white/10 rounded-xl transition-colors"
            >
              <span className="flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-indigo-400" /> 🗂 Canvas & Size</span>
              <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${openSections.canvas ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {openSections.canvas && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-4 pb-4 space-y-3"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {(['square', 'vertical', 'custom'] as CanvasSizePreset[]).map(preset => (
                      <button
                        key={preset}
                        onClick={() => setSettings(prev => ({ ...prev, sizePreset: preset }))}
                        className={`rounded-lg py-2 text-xs font-bold transition-all border ${
                          settings.sizePreset === preset
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                        }`}
                      >
                        {preset === 'square' && 'Square'}
                        {preset === 'vertical' && 'Vertical'}
                        {preset === 'custom' && 'Custom'}
                      </button>
                    ))}
                  </div>

                  {settings.sizePreset === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Width (px)</label>
                        <input
                          type="number"
                          value={settings.customWidth}
                          onChange={e => setSettings(prev => ({ ...prev, customWidth: parseInt(e.target.value) || 1080 }))}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Height (px)</label>
                        <input
                          type="number"
                          value={settings.customHeight}
                          onChange={e => setSettings(prev => ({ ...prev, customHeight: parseInt(e.target.value) || 1350 }))}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Templates Grid */}
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-[10px] font-bold text-white/40 uppercase block mb-2 tracking-wider">Style Templates</span>
                    <div className="grid grid-cols-2 gap-2">
                      {STYLE_TEMPLATES.map(tmpl => (
                        <button
                          key={tmpl.name}
                          onClick={() => setSettings(prev => ({ ...prev, ...tmpl.settings }))}
                          className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/80 hover:border-indigo-400 hover:bg-white/10 transition-colors text-left truncate"
                        >
                          ⚡ {tmpl.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section: Background Engine */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
            <button
              onClick={() => toggleSection('bg')}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-white/80 hover:bg-white/10 rounded-xl transition-colors"
            >
              <span className="flex items-center gap-2"><Image className="h-4 w-4 text-emerald-400" /> 🎨 Background Studio</span>
              <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${openSections.bg ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {openSections.bg && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-4 pb-4 space-y-4"
                >
                  <div className="flex rounded-lg bg-white/5 border border-white/10 p-0.5">
                    {(['solid', 'gradient', 'image'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => {
                          setActiveTab(tab);
                          setSettings(prev => ({ ...prev, bgTab: tab }));
                        }}
                        className={`flex-1 rounded-md py-1.5 text-xs font-bold capitalize transition-all ${
                          activeTab === tab ? 'bg-white text-indigo-950 shadow-md' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* SOLID COLOR CONTROLLERS */}
                  {activeTab === 'solid' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.bgColor}
                          onChange={e => setSettings(prev => ({ ...prev, bgColor: e.target.value }))}
                          className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                        />
                        <input
                          type="text"
                          value={settings.bgColor}
                          onChange={e => setSettings(prev => ({ ...prev, bgColor: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 uppercase font-mono text-white"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-white/40 uppercase block mb-1.5 tracking-wider">Color Palettes</span>
                        <div className="flex flex-wrap gap-1.5">
                          {PALETTE_VIVID.slice(0, 8).map(c => (
                            <button
                              key={c}
                              onClick={() => setSettings(prev => ({ ...prev, bgColor: c }))}
                              className="h-6 w-6 rounded-md shadow-sm border border-black/10 shrink-0 transition-transform hover:scale-110"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={assignRandomColorsPerCard}
                          className="rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 text-xs font-extrabold py-2 border border-indigo-500/30"
                        >
                          🎨 Color Per Card
                        </button>
                        <button
                          onClick={() => setSettings(prev => ({ ...prev, bgColor: '#' + Math.floor(Math.random()*16777215).toString(16) }))}
                          className="rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-xs font-extrabold py-2 border border-white/10"
                        >
                          🎲 Randomizer
                        </button>
                      </div>
                    </div>
                  )}

                  {/* GRADIENT COLOR CONTROLLERS */}
                  {activeTab === 'gradient' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Color A</label>
                          <div className="flex items-center gap-1.5 mt-1">
                            <input
                              type="color"
                              value={settings.gradC1}
                              onChange={e => setSettings(prev => ({ ...prev, gradC1: e.target.value }))}
                              className="h-8 w-8 cursor-pointer rounded-md border border-white/10 bg-transparent"
                            />
                            <input
                              type="text"
                              value={settings.gradC1}
                              onChange={e => setSettings(prev => ({ ...prev, gradC1: e.target.value }))}
                              className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold uppercase font-mono text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Color B</label>
                          <div className="flex items-center gap-1.5 mt-1">
                            <input
                              type="color"
                              value={settings.gradC2}
                              onChange={e => setSettings(prev => ({ ...prev, gradC2: e.target.value }))}
                              className="h-8 w-8 cursor-pointer rounded-md border border-white/10 bg-transparent"
                            />
                            <input
                              type="text"
                              value={settings.gradC2}
                              onChange={e => setSettings(prev => ({ ...prev, gradC2: e.target.value }))}
                              className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold uppercase font-mono text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-white/60">
                          <span>GRADIENT ANGLE</span>
                          <span>{settings.gradAngle}°</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={settings.gradAngle}
                          onChange={e => setSettings(prev => ({ ...prev, gradAngle: parseInt(e.target.value) }))}
                          className="w-full h-1 mt-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* IMAGE CONTROLLERS */}
                  {activeTab === 'image' && (
                    <div className="space-y-4">
                      {/* Image Upload Area */}
                      <div>
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-white/25 rounded-xl py-4 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors group">
                          <Upload className="h-5 w-5 text-white/40 group-hover:text-indigo-400 transition-colors" />
                          <span className="text-xs font-bold text-white/60 mt-1">Upload Images</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Bulk Intelligent Match Button */}
                      <button
                        onClick={generateAutoBackgroundsForAll}
                        className="w-full bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white rounded-lg py-2 text-xs font-extrabold shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Sparkles className="h-4 w-4 text-amber-300 animate-spin" />
                        AI Auto Background (All Cards)
                      </button>

                      {/* Uploaded Images Thumbnails */}
                      {settings.images.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-white/40 uppercase block mb-1.5 tracking-wider">Asset Gallery</span>
                          <div className="flex flex-wrap gap-2">
                            {settings.images.map((img, i) => (
                              <div key={i} className="relative group shrink-0">
                                <img
                                  src={img.url}
                                  onClick={() => setSettings(prev => ({ ...prev, selectedImageIndex: i }))}
                                  className={`h-11 w-11 rounded-md object-cover cursor-pointer border-2 transition-all ${
                                    settings.selectedImageIndex === i ? 'border-indigo-500 scale-105' : 'border-white/10'
                                  }`}
                                />
                                <button
                                  onClick={() => deleteUploadedImage(i)}
                                  className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={distributeUploadedImages}
                              className="flex-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 text-[10px] font-extrabold py-1.5"
                            >
                              🔄 Distribute Sequence
                            </button>
                            <button
                              onClick={clearPerCardImages}
                              className="rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/20 px-3 py-1.5 text-[10px] font-bold"
                            >
                              Clear Override
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Image Settings */}
                      <div className="pt-2 border-t border-white/10 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Image Overlay Filter</span>
                          <input
                            type="checkbox"
                            checked={settings.overlayEnabled}
                            onChange={e => setSettings(prev => ({ ...prev, overlayEnabled: e.target.checked }))}
                            className="rounded border-white/10 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer bg-white/5"
                          />
                        </div>

                        {settings.overlayEnabled && (
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={settings.overlayColor}
                                onChange={e => setSettings(prev => ({ ...prev, overlayColor: e.target.value }))}
                                className="h-8 w-8 cursor-pointer rounded-md border border-white/10 bg-transparent shrink-0"
                              />
                              <input
                                type="text"
                                value={settings.overlayColor}
                                onChange={e => setSettings(prev => ({ ...prev, overlayColor: e.target.value }))}
                                className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold font-mono uppercase text-white focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <div className="flex justify-between text-[11px] font-bold text-white/60">
                                <span>OVERLAY OPACITY</span>
                                <span>{settings.overlayOpacity}%</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={settings.overlayOpacity}
                                onChange={e => setSettings(prev => ({ ...prev, overlayOpacity: parseInt(e.target.value) }))}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Scaling, panning alignment */}
                      <div className="pt-2 border-t border-white/10 space-y-3">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Scale & Position Overrides</span>
                        <div>
                          <div className="flex justify-between text-[11px] font-bold text-white/60">
                            <span>ZOOM OFFSET</span>
                            <span>{settings.bgZoom}%</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="300"
                            value={settings.bgZoom}
                            onChange={e => setSettings(prev => ({ ...prev, bgZoom: parseInt(e.target.value) }))}
                            className="w-full h-1 mt-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Offset X</span>
                            <input
                              type="number"
                              value={settings.bgPosX}
                              onChange={e => setSettings(prev => ({ ...prev, bgPosX: parseInt(e.target.value) || 0 }))}
                              className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-white"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Offset Y</span>
                            <input
                              type="number"
                              value={settings.bgPosY}
                              onChange={e => setSettings(prev => ({ ...prev, bgPosY: parseInt(e.target.value) || 0 }))}
                              className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-white"
                            />
                          </div>
                        </div>

                        {/* Interactive Drag Panning Toggle */}
                        <div className="flex items-center justify-between bg-amber-500/10 rounded-lg p-2 border border-amber-500/25">
                          <div className="flex items-center gap-1.5">
                            <Move className="h-4 w-4 text-amber-400 animate-bounce" />
                            <span className="text-[11px] font-extrabold text-amber-200">Background Drag Tool</span>
                          </div>
                          <button
                            onClick={() => setDragToolActive(!dragToolActive)}
                            className={`rounded px-3 py-1 text-[10px] font-black tracking-wider uppercase transition-colors ${
                              dragToolActive ? 'bg-amber-500 text-slate-900 shadow-lg' : 'bg-white/5 hover:bg-white/10 text-amber-200 border border-amber-500/20'
                            }`}
                          >
                            {dragToolActive ? 'ON' : 'OFF'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section: Main Headlines & Copies */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
            <button
              onClick={() => toggleSection('typo')}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-white/80 hover:bg-white/10 rounded-xl transition-colors"
            >
              <span className="flex items-center gap-2"><Type className="h-4 w-4 text-amber-400" /> ✍️ Text &amp; Copies</span>
              <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${openSections.typo ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {openSections.typo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-4 pb-4 space-y-3.5"
                >
                  <button
                    onClick={applyVividAutoStyle}
                    className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-lg py-2.5 text-xs font-black shadow-lg shadow-amber-400/20 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Sparkles className="h-4 w-4 text-slate-950" />
                    VIVID AUTO-STYLE (INSTANT)
                  </button>

                  <div>
                    <label className="text-[10px] font-bold text-white/40 uppercase block mb-1 tracking-wider">Ad copies (One per line)</label>
                    <textarea
                      value={adCopies.join('\n')}
                      onChange={e => handleCopyChange(e.target.value)}
                      rows={6}
                      spellCheck={false}
                      className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-white placeholder-white/30"
                      placeholder="School Counselor Jobs For Beginners&#10;Work From Home Call Centers"
                    />
                  </div>

                  {/* Case Converter shortcuts */}
                  <div>
                    <span className="text-[10px] font-bold text-white/40 uppercase block mb-1 tracking-wider">Case Converter</span>
                    <div className="grid grid-cols-2 gap-1">
                      <button onClick={() => convertCase('upper')} className="rounded bg-white/5 border border-white/10 py-1 text-[10px] font-bold text-white/80 hover:bg-white/10">AA UPPER</button>
                      <button onClick={() => convertCase('lower')} className="rounded bg-white/5 border border-white/10 py-1 text-[10px] font-bold text-white/80 hover:bg-white/10">aa lower</button>
                      <button onClick={() => convertCase('title')} className="rounded bg-white/5 border border-white/10 py-1 text-[10px] font-bold text-white/80 hover:bg-white/10">Aa Title</button>
                      <button onClick={() => convertCase('sentence')} className="rounded bg-white/5 border border-white/10 py-1 text-[10px] font-bold text-white/80 hover:bg-white/10">Aa Sentence</button>
                    </div>
                  </div>

                  {/* Font controls */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                    <div>
                      <span className="text-[10px] font-bold text-white/40 uppercase block tracking-wider">Font Family</span>
                      <select
                        value={settings.fontFamily}
                        onChange={e => setSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
                        className="w-full rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-xs font-bold text-white mt-1"
                      >
                        <option className="bg-slate-900 text-white">Poppins</option>
                        <option className="bg-slate-900 text-white">Montserrat</option>
                        <option className="bg-slate-900 text-white">League Spartan</option>
                        <option className="bg-slate-900 text-white">Roboto</option>
                        <option className="bg-slate-900 text-white">Open Sans</option>
                        <option className="bg-slate-900 text-white">Lato</option>
                        <option className="bg-slate-900 text-white">Space Grotesk</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-white/40 uppercase block tracking-wider">Font Weight</span>
                      <select
                        value={settings.fontWeight}
                        onChange={e => setSettings(prev => ({ ...prev, fontWeight: e.target.value }))}
                        className="w-full rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-xs font-bold text-white mt-1"
                      >
                        <option value="300" className="bg-slate-900 text-white">Light</option>
                        <option value="400" className="bg-slate-900 text-white">Regular</option>
                        <option value="600" className="bg-slate-900 text-white">Medium</option>
                        <option value="700" className="bg-slate-900 text-white">Bold</option>
                        <option value="800" className="bg-slate-900 text-white">ExtraBold</option>
                        <option value="900" className="bg-slate-900 text-white">Black</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-white/60">
                      <span>FONT SIZE</span>
                      <span>{settings.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="180"
                      value={settings.fontSize}
                      onChange={e => setSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                      className="w-full h-1 mt-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Highlights enclosed in asterisks styling */}
                  <div className="pt-2 border-t border-white/10 space-y-2.5">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase block tracking-wider font-mono">Highlight Asterisks *styles*</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSettings(prev => ({ ...prev, highlightStyle: 'text' }))}
                        className={`rounded-lg py-1.5 text-xs font-bold transition-all border ${
                          settings.highlightStyle === 'text'
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                        }`}
                      >
                        Marker Text Color
                      </button>
                      <button
                        onClick={() => setSettings(prev => ({ ...prev, highlightStyle: 'box' }))}
                        className={`rounded-lg py-1.5 text-xs font-bold transition-all border ${
                          settings.highlightStyle === 'box'
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                        }`}
                      >
                        Backdrop Highlight Box
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={settings.highlightColor}
                          onChange={e => setSettings(prev => ({ ...prev, highlightColor: e.target.value }))}
                          className="h-8 w-8 cursor-pointer rounded-md border border-white/10 bg-transparent"
                        />
                        <span className="text-xs font-semibold uppercase font-mono text-white/80">{settings.highlightColor}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-white/40">Base Text:</span>
                        <input
                          type="color"
                          value={settings.textColor}
                          onChange={e => setSettings(prev => ({ ...prev, textColor: e.target.value }))}
                          className="h-8 w-8 cursor-pointer rounded-md border border-white/10 bg-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Alignment */}
                  <div className="pt-1.5 border-t border-white/10">
                    <span className="text-[10px] font-bold text-white/40 uppercase block mb-1.5 tracking-wider">Alignment Options</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[9px] font-bold text-white/40 block uppercase tracking-wider">Horizontal</span>
                        <div className="flex rounded bg-white/5 border border-white/10 p-0.5 mt-1">
                          {(['left', 'center', 'right'] as AlignHorizontal[]).map(align => (
                            <button
                              key={align}
                              onClick={() => setSettings(prev => ({ ...prev, hAlign: align }))}
                              className={`flex-1 rounded py-1 text-[10px] font-extrabold capitalize ${
                                settings.hAlign === align ? 'bg-white text-indigo-950 shadow-md' : 'text-white/60 hover:text-white'
                              }`}
                            >
                              {align}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-white/40 block uppercase tracking-wider">Vertical</span>
                        <div className="flex rounded bg-white/5 border border-white/10 p-0.5 mt-1">
                          {(['top', 'middle', 'bottom'] as AlignVertical[]).map(align => (
                            <button
                              key={align}
                              onClick={() => setSettings(prev => ({ ...prev, vAlign: align }))}
                              className={`flex-1 rounded py-1 text-[10px] font-extrabold capitalize ${
                                settings.vAlign === align ? 'bg-white text-indigo-950 shadow-md' : 'text-white/60 hover:text-white'
                              }`}
                            >
                              {align === 'middle' ? 'mid' : align}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section: Subheadlines */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
            <button
              onClick={() => toggleSection('subhl')}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-white/80 hover:bg-white/10 rounded-xl transition-colors"
            >
              <span className="flex items-center gap-2"><Layers className="h-4 w-4 text-violet-400" /> 💬 Sub-Headline</span>
              <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${openSections.subhl ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {openSections.subhl && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-4 pb-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white/80">Enable Sub-Headline</span>
                    <input
                      type="checkbox"
                      checked={settings.subEnabled}
                      onChange={e => setSettings(prev => ({ ...prev, subEnabled: e.target.checked }))}
                      className="rounded border-white/10 text-indigo-600 h-4 w-4 cursor-pointer bg-white/5"
                    />
                  </div>

                  {settings.subEnabled && (
                    <>
                      <input
                        type="text"
                        value={settings.subText}
                        onChange={e => setSettings(prev => ({ ...prev, subText: e.target.value }))}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-white"
                        placeholder="SUBHEADLINE TEXT"
                      />
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Text Color</span>
                          <input
                            type="color"
                            value={settings.subColor}
                            onChange={e => setSettings(prev => ({ ...prev, subColor: e.target.value }))}
                            className="h-8 w-full mt-1 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Size (px)</span>
                          <input
                            type="number"
                            value={settings.subSize}
                            onChange={e => setSettings(prev => ({ ...prev, subSize: parseInt(e.target.value) || 30 }))}
                            className="w-full rounded-lg border border-white/10 bg-white/5 mt-1 px-3 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-white/60">
                          <span>VERTICAL POSITION (Y)</span>
                          <span>{settings.subY}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={settings.subY}
                          onChange={e => setSettings(prev => ({ ...prev, subY: parseInt(e.target.value) }))}
                          className="w-full h-1 mt-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section: Description */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
            <button
              onClick={() => toggleSection('desc')}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-white/80 hover:bg-white/10 rounded-xl transition-colors"
            >
              <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-400" /> 📋 Description Text</span>
              <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${openSections.desc ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {openSections.desc && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-4 pb-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white/80">Enable Description Block</span>
                    <input
                      type="checkbox"
                      checked={settings.descEnabled}
                      onChange={e => setSettings(prev => ({ ...prev, descEnabled: e.target.checked }))}
                      className="rounded border-white/10 text-indigo-600 h-4 w-4 cursor-pointer bg-white/5"
                    />
                  </div>

                  {settings.descEnabled && (
                    <>
                      <textarea
                        value={settings.descText}
                        onChange={e => setSettings(prev => ({ ...prev, descText: e.target.value }))}
                        className="w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-white placeholder-white/30"
                        placeholder="Description subtext copy..."
                        rows={2}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Text Color</span>
                          <input
                            type="color"
                            value={settings.descColor}
                            onChange={e => setSettings(prev => ({ ...prev, descColor: e.target.value }))}
                            className="h-8 w-full mt-1 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Size (px)</span>
                          <input
                            type="number"
                            value={settings.descSize}
                            onChange={e => setSettings(prev => ({ ...prev, descSize: parseInt(e.target.value) || 30 }))}
                            className="w-full rounded-lg border border-white/10 bg-white/5 mt-1 px-3 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-white/10">
                        <span className="text-[11px] font-bold text-white/80">Show Background Card</span>
                        <input
                          type="checkbox"
                          checked={settings.descBoxEnabled}
                          onChange={e => setSettings(prev => ({ ...prev, descBoxEnabled: e.target.checked }))}
                          className="rounded border-white/10 text-indigo-600 h-4 w-4 cursor-pointer bg-white/5"
                        />
                      </div>

                      {settings.descBoxEnabled && (
                        <div className="bg-white/5 border border-white/10 p-2.5 rounded-lg space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Card Color</span>
                              <input
                                type="color"
                                value={settings.descBoxColor}
                                onChange={e => setSettings(prev => ({ ...prev, descBoxColor: e.target.value }))}
                                className="h-8 w-full mt-1 cursor-pointer rounded border border-white/10 bg-transparent"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Opacity</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={settings.descBoxOpacity}
                                onChange={e => setSettings(prev => ({ ...prev, descBoxOpacity: parseInt(e.target.value) || 80 }))}
                                className="w-full rounded border border-white/10 bg-white/5 mt-1 px-2 py-1 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-white/60">
                          <span>VERTICAL POSITION (Y)</span>
                          <span>{settings.descY}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={settings.descY}
                          onChange={e => setSettings(prev => ({ ...prev, descY: parseInt(e.target.value) }))}
                          className="w-full h-1 mt-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section: CTA Button */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
            <button
              onClick={() => toggleSection('cta')}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-white/80 hover:bg-white/10 rounded-xl transition-colors"
            >
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-400" /> 🔘 CTA Button Builder</span>
              <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${openSections.cta ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {openSections.cta && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-4 pb-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white/80">Enable CTA Button</span>
                    <input
                      type="checkbox"
                      checked={settings.ctaEnabled}
                      onChange={e => setSettings(prev => ({ ...prev, ctaEnabled: e.target.checked }))}
                      className="rounded border-white/10 text-indigo-600 h-4 w-4 cursor-pointer bg-white/5"
                    />
                  </div>

                  {settings.ctaEnabled && (
                    <>
                      <input
                        type="text"
                        value={settings.ctaText}
                        onChange={e => setSettings(prev => ({ ...prev, ctaText: e.target.value }))}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-white"
                        placeholder="Apply Now"
                      />

                      <div className="grid grid-cols-4 gap-1 pt-1.5">
                        {(['pill', 'soft', 'sharp', 'angled'] as CtaShape[]).map(sh => (
                          <button
                            key={sh}
                            onClick={() => setSettings(prev => ({ ...prev, ctaShape: sh }))}
                            className={`rounded border py-1.5 text-[10px] font-bold capitalize transition-all ${
                              settings.ctaShape === sh
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                                : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                            }`}
                          >
                            {sh}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Text Color</span>
                          <input
                            type="color"
                            value={settings.ctaTextColor}
                            onChange={e => setSettings(prev => ({ ...prev, ctaTextColor: e.target.value }))}
                            className="h-8 w-full mt-1 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Button BG</span>
                          <input
                            type="color"
                            value={settings.ctaBgColor}
                            onChange={e => setSettings(prev => ({ ...prev, ctaBgColor: e.target.value }))}
                            className="h-8 w-full mt-1 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Padding X</span>
                          <input
                            type="number"
                            value={settings.ctaPx}
                            onChange={e => setSettings(prev => ({ ...prev, ctaPx: parseInt(e.target.value) || 40 }))}
                            className="w-full rounded border border-white/10 bg-white/5 mt-0.5 px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Padding Y</span>
                          <input
                            type="number"
                            value={settings.ctaPy}
                            onChange={e => setSettings(prev => ({ ...prev, ctaPy: parseInt(e.target.value) || 16 }))}
                            className="w-full rounded border border-white/10 bg-white/5 mt-0.5 px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-white/60">
                          <span>VERTICAL POSITION (Y)</span>
                          <span>{settings.ctaY}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={settings.ctaY}
                          onChange={e => setSettings(prev => ({ ...prev, ctaY: parseInt(e.target.value) }))}
                          className="w-full h-1 mt-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section: Flag Logo Suggestion */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
            <button
              onClick={() => toggleSection('flag')}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-white/80 hover:bg-white/10 rounded-xl transition-colors"
            >
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-rose-400" /> 🏳️ Flag &amp; Geo-Branding</span>
              <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${openSections.flag ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {openSections.flag && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-4 pb-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white/80">Show Country Flag Badge</span>
                    <input
                      type="checkbox"
                      checked={settings.flagEnabled}
                      onChange={e => setSettings(prev => ({ ...prev, flagEnabled: e.target.checked }))}
                      className="rounded border-white/10 text-indigo-600 h-4 w-4 cursor-pointer bg-white/5"
                    />
                  </div>

                  {settings.flagEnabled && (
                    <>
                      <div className="relative">
                        <input
                          type="text"
                          value={flagQuery}
                          onChange={e => searchCountryFlags(e.target.value)}
                          placeholder="Search Country (Germany, USA, Canada...)"
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-white placeholder-white/30"
                        />
                        {flagResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-lg border border-white/10 bg-slate-900 shadow-xl py-1">
                            {flagResults.map(country => (
                              <button
                                key={country.code}
                                onClick={() => selectFlag(country.code, country.name)}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-bold text-white/80 hover:bg-white/10"
                              >
                                <img
                                  src={`https://flagcdn.com/w160/${country.code}.png`}
                                  className="h-3.5 w-5 object-cover rounded shadow-sm border border-white/10"
                                />
                                <span>{country.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {settings.flagCountryCode && (
                        <div className="flex items-center justify-between rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={`https://flagcdn.com/w160/${settings.flagCountryCode}.png`}
                              className="h-6 w-9 object-cover rounded shadow border border-white/10"
                            />
                            <span className="text-xs font-extrabold text-indigo-200">{settings.flagCountryName}</span>
                          </div>
                          <button
                            onClick={clearFlag}
                            className="rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 p-1 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Flag Width (px)</span>
                          <input
                            type="number"
                            value={settings.flagSize}
                            onChange={e => setSettings(prev => ({ ...prev, flagSize: parseInt(e.target.value) || 80 }))}
                            className="w-full rounded border border-white/10 bg-white/5 mt-1 px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Horizontal</span>
                          <div className="flex rounded bg-white/5 border border-white/10 p-0.5 mt-1">
                            {(['left', 'center', 'right'] as AlignHorizontal[]).map(align => (
                              <button
                                key={align}
                                onClick={() => setSettings(prev => ({ ...prev, flagHAlign: align }))}
                                className={`flex-1 rounded py-1 text-[9px] font-extrabold capitalize transition-colors ${
                                  settings.flagHAlign === align ? 'bg-white text-indigo-950 shadow-md' : 'text-white/60 hover:text-white'
                                }`}
                              >
                                {align}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-white/60">
                          <span>VERTICAL POSITION (Y)</span>
                          <span>{settings.flagY}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={settings.flagY}
                          onChange={e => setSettings(prev => ({ ...prev, flagY: parseInt(e.target.value) }))}
                          className="w-full h-1 mt-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section: Outline & Text Shadows */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
            <button
              onClick={() => toggleSection('effects')}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-white/80 hover:bg-white/10 rounded-xl transition-colors"
            >
              <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-emerald-400" /> ✨ Outline &amp; Shadow</span>
              <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${openSections.effects ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {openSections.effects && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-4 pb-4 space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white/80">Enable Outline Edge</span>
                    <input
                      type="checkbox"
                      checked={settings.outlineEnabled}
                      onChange={e => setSettings(prev => ({ ...prev, outlineEnabled: e.target.checked }))}
                      className="rounded border-white/10 text-indigo-600 h-4 w-4 cursor-pointer bg-white/5"
                    />
                  </div>

                  {settings.outlineEnabled && (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Outline Color</span>
                          <input
                            type="color"
                            value={settings.outlineColor}
                            onChange={e => setSettings(prev => ({ ...prev, outlineColor: e.target.value }))}
                            className="h-8 w-full mt-1 cursor-pointer rounded border border-white/10 bg-transparent"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Thickness</span>
                          <input
                            type="number"
                            value={settings.outlineWidth}
                            onChange={e => setSettings(prev => ({ ...prev, outlineWidth: parseInt(e.target.value) || 2 }))}
                            className="w-full rounded border border-white/10 bg-white/5 mt-1 px-3 py-1 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white/80">Enable Soft Shadow</span>
                    <input
                      type="checkbox"
                      checked={settings.shadowEnabled}
                      onChange={e => setSettings(prev => ({ ...prev, shadowEnabled: e.target.checked }))}
                      className="rounded border-white/10 text-indigo-600 h-4 w-4 cursor-pointer bg-white/5"
                    />
                  </div>

                  {settings.shadowEnabled && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <span className="text-[9px] font-bold text-white/40 uppercase block tracking-wider">Color</span>
                          <input
                            type="color"
                            value={settings.shadowColor}
                            onChange={e => setSettings(prev => ({ ...prev, shadowColor: e.target.value }))}
                            className="h-8 w-full mt-1 cursor-pointer rounded border border-white/10 bg-transparent"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-white/40 uppercase block tracking-wider font-mono">Blur Offset</span>
                          <input
                            type="number"
                            value={settings.shadowBlur}
                            onChange={e => setSettings(prev => ({ ...prev, shadowBlur: parseInt(e.target.value) || 8 }))}
                            className="w-20 rounded border border-white/10 bg-white/5 mt-1 px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section: Import CSV / Sheet sync */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
            <button
              onClick={() => toggleSection('sheets')}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-white/80 hover:bg-white/10 rounded-xl transition-colors"
            >
              <span className="flex items-center gap-2"><FileDown className="h-4 w-4 text-indigo-400" /> 📊 CSV / Sheet Sync</span>
              <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${openSections.sheets ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {openSections.sheets && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-4 pb-4 space-y-3"
                >
                  <p className="text-[11px] text-white/60 leading-relaxed font-semibold">
                    Paste your shared Google Spreadsheet URL below to dynamically pull rows:
                  </p>

                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      onKeyDown={e => {
                        if (e.key === 'Enter') syncGoogleSheet((e.target as HTMLInputElement).value);
                      }}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-white placeholder-white/30"
                    />
                    <span className="text-[10px] text-indigo-400 font-extrabold uppercase block select-none">
                      Press [Enter] to Sync Sheet ⚡
                    </span>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <span className="text-[10px] font-bold text-white/40 uppercase block mb-1 tracking-wider">Local CSV drag &amp; drop</span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      className="w-full text-xs font-semibold text-white/50 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-extrabold file:bg-white/10 file:text-white hover:file:bg-white/20 border border-white/10 rounded-lg p-1.5 cursor-pointer"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER TOPBAR */}
        <header className="bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between shadow-lg backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex rounded-full bg-indigo-500/10 border border-indigo-500/20 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded-full px-4 py-1.5 flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-md font-bold' : 'text-white/60 hover:text-white'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Grid View
              </button>
              <button
                onClick={() => setViewMode('live')}
                className={`rounded-full px-4 py-1.5 flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'live' ? 'bg-indigo-600 text-white shadow-md font-bold' : 'text-white/60 hover:text-white'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Live Site View
              </button>
            </div>

            <h2 className="text-sm font-bold text-white/80 block bg-white/5 border border-white/10 rounded-full px-4.5 py-1 backdrop-blur-sm">
              🚀 Generated Creatives: <strong className="text-indigo-400">{adCopies.length} Variations</strong>
            </h2>

            {/* Filter mode */}
            {viewMode === 'grid' && (
              <div className="flex rounded-lg bg-white/5 border border-white/10 p-0.5 text-xs font-semibold">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`rounded-md px-3 py-1 transition-all ${
                    filterMode === 'all' ? 'bg-white text-slate-900 shadow-md font-bold' : 'text-white/60 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterMode('selected')}
                  className={`rounded-md px-3 py-1 transition-all ${
                    filterMode === 'selected' ? 'bg-white text-slate-900 shadow-md font-bold' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Selected ({selectedCards.size})
                </button>
                <button
                  onClick={() => setFilterMode('customImg')}
                  className={`rounded-md px-3 py-1 transition-all ${
                    filterMode === 'customImg' ? 'bg-white text-slate-900 shadow-md font-bold' : 'text-white/60 hover:text-white'
                  }`}
                >
                  With Custom BG
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {viewMode === 'grid' && (
              <>
                {/* Search Copies */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search headlines..."
                    className="w-64 rounded-full border border-white/10 bg-white/5 pl-9 pr-4 py-1.5 text-xs font-semibold text-white placeholder-white/30 focus:bg-white/10 focus:border-indigo-400 focus:outline-none transition-all"
                  />
                </div>

                <button
                  onClick={selectAll}
                  className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-4.5 py-2 text-xs font-bold text-white/80 shadow-md transition-all cursor-pointer"
                >
                  ⊙ Select All
                </button>

                <button
                  onClick={batchZipDownload}
                  className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-5 py-2.5 shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  Export ZIP Pack
                </button>
              </>
            )}
          </div>
        </header>

        {/* PROGRESS OVERLAYS (BULK BG & EXPORTS) */}
        {bulkBgProgress && (
          <div className="bg-gradient-to-r from-emerald-500/90 to-indigo-600/90 backdrop-blur px-6 py-2.5 text-white flex items-center justify-between text-xs font-bold border-b border-white/10">
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-amber-300" />
              {bulkBgProgress.status}
            </span>
            <span>
              {bulkBgProgress.current} / {bulkBgProgress.total} Variations Finished
            </span>
          </div>
        )}

        {exportProgress && (
          <div className="bg-indigo-600/90 backdrop-blur px-6 py-2.5 text-white flex items-center justify-between text-xs font-bold border-b border-white/10">
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Zipping images and creating base64 archives...
            </span>
            <span>{exportProgress}% complete</span>
          </div>
        )}

        {/* DRAG-PANNING OVERHEAD BANNER */}
        {dragToolActive && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 backdrop-blur-md px-6 py-2.5 text-amber-200 flex items-center justify-between text-xs font-extrabold shadow-lg shrink-0">
            <span className="flex items-center gap-2 animate-pulse">
              <Move className="h-4 w-4 shrink-0 text-amber-400" />
              Drag Tool is ACTIVE: Click and slide background images directly inside any card canvas to shift positioning!
            </span>
            <button
              onClick={() => setDragToolActive(false)}
              className="bg-amber-500 text-slate-950 text-[10px] font-black rounded px-3 py-1.5 shadow-lg hover:bg-amber-400 transition-all cursor-pointer"
            >
              EXIT PAN TOOL
            </button>
          </div>
        )}

        {/* DYNAMIC GRID VIEWPORT */}
        <div className="flex-1 overflow-y-auto p-6 bg-transparent">
          {viewMode === 'live' ? (
            <LiveMockupView
              adCopies={adCopies}
              settings={settings}
              perCardImages={perCardImages}
              perCardBgColors={perCardBgColors}
              perCardPos={perCardPos}
              vividStylePerLine={vividStylePerLine}
              perCardSettings={perCardSettings}
            />
          ) : filteredCopies.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="h-14 w-14 bg-white/5 text-indigo-400 rounded-full flex items-center justify-center border border-white/10 mb-4 shadow-lg">
                <LayoutGrid className="h-7 w-7" />
              </div>
              <h3 className="text-base font-extrabold text-white">No matching variations</h3>
              <p className="text-xs text-white/50 font-semibold mt-1">
                Try clearing your search query or enabling/disabling your custom filter toggles in the header to view your templates.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 align-content-start pb-12">
              {filteredCopies.map(({ copy, originalIndex }) => (
                <motion.div
                  key={originalIndex}
                  layoutId={`card-${originalIndex}`}
                  className={`relative rounded-2xl p-0 cursor-pointer overflow-hidden group transition-all duration-200 border bg-white/5 backdrop-blur-md ${
                    editScope === 'single' && activeEditIndex === originalIndex
                      ? 'border-amber-400 ring-4 ring-amber-400/30 shadow-2xl scale-[1.02]'
                      : selectedCards.has(originalIndex)
                      ? 'border-indigo-500 ring-4 ring-indigo-500/20 shadow-2xl scale-[1.01]'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/10 hover:shadow-xl'
                  }`}
                  onClick={(e) => handleSelectCard(originalIndex, e)}
                  onMouseMove={handleDragMove}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                >
                  {/* Select check circle badge */}
                  <div 
                    className={`absolute top-3.5 left-3.5 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all z-20 shadow-lg ${
                      selectedCards.has(originalIndex)
                        ? 'bg-indigo-600 border-indigo-400 text-white scale-110'
                        : 'bg-white/10 border-white/30 text-transparent hover:bg-white/20'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const newSet = new Set(selectedCards);
                      if (newSet.has(originalIndex)) {
                        newSet.delete(originalIndex);
                      } else {
                        newSet.add(originalIndex);
                      }
                      setSelectedCards(newSet);
                    }}
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>

                  {/* Indicator badges */}
                  <div className="absolute top-3.5 right-3.5 flex flex-col items-end gap-1.5 z-20">
                    {perCardSettings[originalIndex] && Object.keys(perCardSettings[originalIndex]).length > 0 && (
                      <span className="bg-emerald-500/90 text-white font-mono font-black text-[9px] px-2.5 py-0.8 rounded-full shadow backdrop-blur-sm tracking-wider uppercase flex items-center gap-0.5 animate-pulse">
                        🎨 Edited
                      </span>
                    )}
                    {perCardImages[originalIndex] && (
                      <span className="bg-indigo-600/90 text-white font-mono font-bold text-[9px] px-2.5 py-0.8 rounded-full shadow backdrop-blur-sm tracking-wider uppercase">
                        📌 Custom BG
                      </span>
                    )}
                    {vividStylePerLine[originalIndex] && (
                      <span className="bg-amber-400/95 text-slate-900 font-mono font-bold text-[9px] px-2.5 py-0.8 rounded-full shadow tracking-wider uppercase">
                        ⚡ Vivid
                      </span>
                    )}
                  </div>

                  {/* High Quality Canvas Wrapper */}
                  <div
                    className={`relative overflow-hidden shrink-0 ${dragToolActive ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    onMouseDown={(e) => handleDragStart(originalIndex, e)}
                  >
                    {(() => {
                      const cardSettings = { ...globalSettings, ...(perCardSettings[originalIndex] || {}) };
                      return (
                        <CreativeCanvas
                          text={copy}
                          idx={originalIndex}
                          settings={cardSettings}
                          perCardImage={perCardImages[originalIndex]}
                          perCardBgColor={perCardBgColors[originalIndex]}
                          perCardPos={perCardPos[originalIndex]}
                          vividStyle={vividStylePerLine[originalIndex]}
                          selectedFlagUrl={cardSettings.flagEnabled ? `https://flagcdn.com/w160/${cardSettings.flagCountryCode}.png` : undefined}
                          selectedFlagHAlign={cardSettings.flagHAlign}
                          previewScale={0.3} // compressed scale for performance in grid
                        />
                      );
                    })()}

                    {/* Drag overlay hint */}
                    {dragToolActive && (
                      <div className="absolute inset-0 bg-amber-500/10 pointer-events-none flex items-center justify-center">
                        <div className="bg-slate-900/80 text-white font-extrabold text-[9px] tracking-wider uppercase rounded-md px-2.5 py-1.5 flex items-center gap-1 shadow-md">
                          <Move className="h-3.5 w-3.5 text-amber-400 shrink-0" /> Slide to Align
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Labels */}
                  <div className="p-3 bg-white/5 border-t border-white/10 flex items-center justify-between backdrop-blur-md">
                    <p className="text-[11px] font-bold text-white/90 truncate flex-1 pr-3">
                      {copy.replace(/\*/g, '')}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          autoDetectSubjectArea(originalIndex);
                        }}
                        title="Autofocus Subject Centroid"
                        className="p-1 text-white/40 hover:text-indigo-400 rounded hover:bg-white/10 transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxIndex(originalIndex);
                        }}
                        className="p-1 text-white/40 hover:text-indigo-400 rounded hover:bg-white/10 transition-colors"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* IMMERSIVE LIGHTBOX LIGHTBOX */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0c0c14]/95 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-xl"
            onClick={() => setLightboxIndex(null)}
          >
            <div className="w-full max-w-4xl flex items-center justify-between text-white mb-4">
              <div className="flex items-center gap-3">
                <span className="bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase backdrop-blur-sm">
                  Preview #{lightboxIndex + 1}
                </span>
                <h3 className="text-sm font-black text-white">
                  {adCopies[lightboxIndex]?.replace(/\*/g, '')}
                </h3>
              </div>
              <button
                onClick={() => setLightboxIndex(null)}
                className="h-10 w-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Immersive Canvas stage */}
            <div className="flex-1 w-full max-w-2xl flex items-center justify-center relative">
              {/* Prev button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox(-1);
                }}
                disabled={lightboxIndex === 0}
                className="absolute left-0 h-12 w-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-20 text-white flex items-center justify-center transition-colors z-20 cursor-pointer"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>

              <div className="w-full max-h-[75vh] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
                {(() => {
                  const cardSettings = { ...globalSettings, ...(perCardSettings[lightboxIndex] || {}) };
                  return (
                    <CreativeCanvas
                      text={adCopies[lightboxIndex] || ''}
                      idx={lightboxIndex}
                      settings={cardSettings}
                      perCardImage={perCardImages[lightboxIndex]}
                      perCardBgColor={perCardBgColors[lightboxIndex]}
                      perCardPos={perCardPos[lightboxIndex]}
                      vividStyle={vividStylePerLine[lightboxIndex]}
                      selectedFlagUrl={cardSettings.flagEnabled ? `https://flagcdn.com/w160/${cardSettings.flagCountryCode}.png` : undefined}
                      selectedFlagHAlign={cardSettings.flagHAlign}
                      previewScale={0.7} // high resolution preview scale
                    />
                  );
                })()}
              </div>

              {/* Next button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox(1);
                }}
                disabled={lightboxIndex === adCopies.length - 1}
                className="absolute right-0 h-12 w-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-20 text-white flex items-center justify-center transition-colors z-20 cursor-pointer"
              >
                <ArrowRight className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-white/40 font-mono tracking-wide">
              <span>Use Left/Right arrow keys to navigate variations. Press Escape to exit.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
