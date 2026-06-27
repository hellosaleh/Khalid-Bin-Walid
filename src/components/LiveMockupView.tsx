import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Newspaper,
  MessageSquare,
  ShoppingBag,
  Globe,
  Sparkles,
  Check,
  Eye,
  ArrowRight,
  Heart,
  MessageCircle,
  Send,
  MoreHorizontal
} from 'lucide-react';
import { AppSettings, DragPosition } from '../types';
import { CreativeCanvas } from './CreativeCanvas';

interface LiveMockupViewProps {
  adCopies: string[];
  settings: AppSettings;
  perCardImages: Record<number, string>;
  perCardBgColors: Record<number, string>;
  perCardPos: Record<number, DragPosition>;
  vividStylePerLine: Record<number, { bg: string; text: string; cta: string }>;
  perCardSettings?: Record<number, Partial<AppSettings>>;
}

type MockupPlacement = 'blog' | 'social' | 'ecommerce' | 'search';
type MockupDevice = 'desktop' | 'tablet' | 'mobile';

export const LiveMockupView: React.FC<LiveMockupViewProps> = ({
  adCopies,
  settings: globalSettings,
  perCardImages,
  perCardBgColors,
  perCardPos,
  vividStylePerLine,
  perCardSettings,
}) => {
  const [placement, setPlacement] = useState<MockupPlacement>('blog');
  const [device, setDevice] = useState<MockupDevice>('desktop');
  const [activeIdx, setActiveIdx] = useState<number>(0);

  // If active index is out of bounds due to deletion, fall back to 0
  const safeActiveIdx = activeIdx < adCopies.length ? activeIdx : 0;

  const getCardSettings = (idx: number) => {
    return { ...globalSettings, ...(perCardSettings?.[idx] || {}) };
  };

  const settings = getCardSettings(safeActiveIdx);
  const currentText = adCopies[safeActiveIdx] || '';

  // Get active configurations
  const currentPerImage = perCardImages[safeActiveIdx];
  const currentPerBgColor = perCardBgColors[safeActiveIdx];
  const currentPerPos = perCardPos[safeActiveIdx];
  const currentVivid = vividStylePerLine[safeActiveIdx];

  const handleSelectAd = (idx: number) => {
    setActiveIdx(idx);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-6" id="live-mockup-container">
      
      {/* LEFT COLUMN: AD VARIATION SELECTOR */}
      <div className="w-full lg:w-80 bg-white/5 border border-white/10 rounded-2xl flex flex-col overflow-hidden backdrop-blur-md shrink-0">
        <div className="p-4 border-b border-white/10 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10">
          <h3 className="text-xs font-black uppercase tracking-widest text-indigo-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Live Preview Target
          </h3>
          <p className="text-[11px] text-white/50 mt-1 font-semibold">
            Choose which variation to inject into the live mockup site:
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {adCopies.map((copy, idx) => {
            const isActive = idx === safeActiveIdx;
            const stripped = copy.replace(/\*/g, '');
            return (
              <button
                key={idx}
                onClick={() => handleSelectAd(idx)}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex flex-col gap-2 relative overflow-hidden group cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600/20 border-indigo-500/50 shadow-lg shadow-indigo-500/5'
                    : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
                }`}
              >
                {/* Active check indicator */}
                {isActive && (
                  <div className="absolute top-2.5 right-2.5 bg-indigo-500 text-white p-0.5 rounded-full shadow">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black tracking-wide uppercase px-2 py-0.5 rounded ${
                    isActive ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/60'
                  }`}>
                    #{idx + 1}
                  </span>
                  
                  {/* Status Badges */}
                  <div className="flex gap-1">
                    {perCardImages[idx] && (
                      <span className="text-[8px] font-bold bg-indigo-950 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-500/30">
                        IMG
                      </span>
                    )}
                    {vividStylePerLine[idx] && (
                      <span className="text-[8px] font-bold bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded">
                        VIVID
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  {/* Small Canvas Thumbnail */}
                  <div className="w-12 h-12 rounded bg-slate-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative">
                    <div className="scale-[0.11] origin-center absolute w-[1080px] h-[1080px] flex items-center justify-center pointer-events-none">
                      {(() => {
                        const cs = getCardSettings(idx);
                        return (
                          <CreativeCanvas
                            text={copy}
                            idx={idx}
                            settings={cs}
                            perCardImage={perCardImages[idx]}
                            perCardBgColor={perCardBgColors[idx]}
                            perCardPos={perCardPos[idx]}
                            vividStyle={vividStylePerLine[idx]}
                            selectedFlagUrl={cs.flagEnabled ? `https://flagcdn.com/w160/${cs.flagCountryCode}.png` : undefined}
                            selectedFlagHAlign={cs.flagHAlign}
                            previewScale={1}
                          />
                        );
                      })()}
                    </div>
                  </div>

                  <p className={`text-xs font-semibold line-clamp-2 pr-4 leading-relaxed ${
                    isActive ? 'text-white font-bold' : 'text-white/60 group-hover:text-white/90'
                  }`}>
                    {stripped}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 gap-4" id="live-mockup-viewport">
        
        {/* SUB-TOOLBAR */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
          {/* PLACEMENT TABS */}
          <div className="flex flex-wrap gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1 w-full sm:w-auto">
            <button
              onClick={() => setPlacement('blog')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                placement === 'blog'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Newspaper className="h-3.5 w-3.5" />
              Blog/News
            </button>
            <button
              onClick={() => setPlacement('social')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                placement === 'social'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Social Feed
            </button>
            <button
              onClick={() => setPlacement('ecommerce')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                placement === 'ecommerce'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              E-Commerce
            </button>
            <button
              onClick={() => setPlacement('search')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                placement === 'search'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              Google Search
            </button>
          </div>

          {/* DEVICE SWITCHER */}
          <div className="flex gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1 w-full sm:w-auto">
            <button
              onClick={() => setDevice('desktop')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                device === 'desktop'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title="Desktop View (Grid Canvas)"
            >
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Desktop</span>
            </button>
            <button
              onClick={() => setDevice('tablet')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                device === 'tablet'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title="Tablet View"
            >
              <Tablet className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Tablet</span>
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                device === 'mobile'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title="Mobile Device Feed"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Mobile</span>
            </button>
          </div>
        </div>

        {/* CONTAINER VIEWPORT WITH DEVICE FRAME */}
        <div className="flex-1 bg-slate-950/40 border border-white/10 rounded-2xl p-6 overflow-y-auto flex justify-center items-start shadow-inner relative">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={`${placement}-${device}-${safeActiveIdx}`}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.25 }}
              className={`w-full bg-[#12121e] rounded-xl overflow-hidden shadow-2xl border border-white/5 flex flex-col transition-all duration-300 ${
                device === 'desktop'
                  ? 'max-w-5xl'
                  : device === 'tablet'
                  ? 'max-w-2xl'
                  : 'max-w-sm'
              }`}
            >
              {/* Web Browser / Phone Header Frame Bar */}
              <div className="bg-slate-900 px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                </div>
                
                {/* Mock Address Bar */}
                <div className="bg-slate-950 border border-white/5 rounded-md px-4 py-1 text-[10px] font-mono text-white/40 w-1/2 text-center truncate shadow-inner">
                  {placement === 'blog' && 'https://www.vanguardjournal.com/tech/generative-design'}
                  {placement === 'social' && 'https://instagram.com/p/Cg71H98f21'}
                  {placement === 'ecommerce' && 'https://www.auraliving.store/furniture'}
                  {placement === 'search' && 'https://www.google.com/search?q=creative+bulk_generator'}
                </div>

                <div className="text-[10px] font-bold text-white/30 tracking-wider">
                  {device === 'desktop' && '1080px (Fluid)'}
                  {device === 'tablet' && '768px (Tablet)'}
                  {device === 'mobile' && '375px (Mobile)'}
                </div>
              </div>

              {/* MOCK SITES GRAPHICS */}
              <div className="flex-1 overflow-y-auto max-h-[500px] text-slate-800 bg-slate-50 relative">

                {/* --- 1. NEWSPAPER / BLOG PLACEMENT --- */}
                {placement === 'blog' && (
                  <div className="p-6 font-serif">
                    {/* Website Header Banner Slot */}
                    <div className="mb-6 bg-slate-100 border border-slate-200 p-2 rounded flex flex-col items-center justify-center">
                      <span className="text-[8px] font-bold font-sans text-slate-400 tracking-widest uppercase mb-1">
                        ADVERTISEMENT (Leaderboard Header)
                      </span>
                      <div className="w-full max-w-lg overflow-hidden flex justify-center">
                        <div className="w-80">
                          <CreativeCanvas
                            text={currentText}
                            idx={safeActiveIdx}
                            settings={settings}
                            perCardImage={currentPerImage}
                            perCardBgColor={currentPerBgColor}
                            perCardPos={currentPerPos}
                            vividStyle={currentVivid}
                            selectedFlagUrl={settings.flagEnabled ? `https://flagcdn.com/w160/${settings.flagCountryCode}.png` : undefined}
                            selectedFlagHAlign={settings.flagHAlign}
                            previewScale={0.25}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Blog Name Branding */}
                    <div className="border-b border-double border-slate-400 pb-3 mb-6 flex justify-between items-end font-sans">
                      <span className="text-xl font-black tracking-tighter">VANGUARD JOURNAL</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:inline">
                        Saturday Edition · Tech Trends
                      </span>
                    </div>

                    {/* Blog Main Article Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Left Article text */}
                      <div className="md:col-span-2 space-y-4">
                        <span className="font-sans font-extrabold text-xs text-indigo-600 tracking-wider uppercase block">
                          ARTIFICIAL INTELLIGENCE
                        </span>
                        <h1 className="text-2xl font-black text-slate-900 leading-tight">
                          The Paradigm Shift in Display Banner Marketing Automation
                        </h1>
                        <p className="text-sm text-slate-500 leading-relaxed italic">
                          By Sarah Jenkins · Senior Design Architect at Antigravity Systems
                        </p>
                        
                        <div className="w-full h-40 bg-slate-200 rounded-lg overflow-hidden relative flex items-center justify-center">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10"></div>
                          <div className="absolute bottom-3 left-3 z-20 font-sans text-white text-xs font-bold bg-slate-900/80 rounded px-2 py-1">
                            Featured Analysis
                          </div>
                          <img 
                            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop" 
                            className="w-full h-full object-cover"
                            alt="Abstraction Art"
                          />
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed">
                          Marketing pipelines have traditionally hit bottlenecks inside display ad creation. Launching a single campaign previously required teams of static asset artists, copywriters, and local project planners working over multiple weeks to resize, adapt, and refine.
                        </p>

                        {/* IN-ARTICLE BANNER PLACE */}
                        <div className="my-6 bg-slate-100/80 border border-slate-200 p-3 rounded-xl flex flex-col items-center">
                          <span className="text-[8px] font-bold font-sans text-slate-400 tracking-widest uppercase mb-2">
                            SPONSORED CAMPAIGN (In-Article Inline)
                          </span>
                          <div className="w-full max-w-sm overflow-hidden flex justify-center">
                            <div className="w-72">
                              <CreativeCanvas
                                text={currentText}
                                idx={safeActiveIdx}
                                settings={settings}
                                perCardImage={currentPerImage}
                                perCardBgColor={currentPerBgColor}
                                perCardPos={currentPerPos}
                                vividStyle={currentVivid}
                                selectedFlagUrl={settings.flagEnabled ? `https://flagcdn.com/w160/${settings.flagCountryCode}.png` : undefined}
                                selectedFlagHAlign={settings.flagHAlign}
                                previewScale={0.27}
                              />
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed">
                          Today, automated bulk generators like Ad Creative Studio bypass standard workflows. High-performance rendering canvases assemble layouts directly in the browser, injecting varying copy alternatives dynamically to produce dozens of beautiful variations in minutes.
                        </p>
                      </div>

                      {/* Right Sidebar (Hidden on mobile) */}
                      <div className="border-t pt-6 md:border-t-0 md:pt-0 md:border-l md:pl-6 space-y-6 font-sans">
                        <div className="bg-slate-100 p-4 rounded-xl">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-2">
                            About Vanguard
                          </h4>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Analyses of deep technology paradigms, branding structures, and visual software engineering.
                          </p>
                        </div>

                        {/* SIDEBAR NATIVE BANNER SLOT */}
                        <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl flex flex-col items-center justify-center">
                          <span className="text-[8px] font-bold text-slate-400 tracking-widest uppercase mb-2">
                            SPONSORED (Sidebar Banner)
                          </span>
                          <div className="w-full overflow-hidden flex justify-center">
                            <div className="w-[100%]">
                              <CreativeCanvas
                                text={currentText}
                                idx={safeActiveIdx}
                                settings={settings}
                                perCardImage={currentPerImage}
                                perCardBgColor={currentPerBgColor}
                                perCardPos={currentPerPos}
                                vividStyle={currentVivid}
                                selectedFlagUrl={settings.flagEnabled ? `https://flagcdn.com/w160/${settings.flagCountryCode}.png` : undefined}
                                selectedFlagHAlign={settings.flagHAlign}
                                previewScale={0.32}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-1">
                            Latest Posts
                          </h4>
                          <div className="text-xs">
                            <a href="#" className="font-bold text-slate-900 hover:text-indigo-600 block">
                              1. Deciphering HSL Gradient Color Theory
                            </a>
                            <span className="text-[10px] text-slate-400">12 mins ago</span>
                          </div>
                          <div className="text-xs">
                            <a href="#" className="font-bold text-slate-900 hover:text-indigo-600 block">
                              2. Building Custom Canvas Generators
                            </a>
                            <span className="text-[10px] text-slate-400">2 hours ago</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* --- 2. SOCIAL MEDIA FEED PLACEMENT --- */}
                {placement === 'social' && (
                  <div className="p-4 bg-slate-100 font-sans flex justify-center">
                    <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      {/* Post Header */}
                      <div className="p-3 flex items-center justify-between border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-rose-500 to-indigo-500 p-0.5 shadow-md">
                            <div className="w-full h-full rounded-full bg-white p-0.5">
                              <div className="w-full h-full rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-black">
                                AD
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-black text-slate-900">yourbrand.studio</span>
                              <Check className="h-3 w-3 bg-blue-500 text-white rounded-full p-0.2" />
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Sponsored</span>
                          </div>
                        </div>
                        <button className="text-slate-400 hover:text-slate-700">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Large Social Post Ad Canvas */}
                      <div className="w-full bg-slate-950 overflow-hidden flex items-center justify-center relative select-none">
                        <div className="w-[100%] max-w-full">
                          <CreativeCanvas
                            text={currentText}
                            idx={safeActiveIdx}
                            settings={settings}
                            perCardImage={currentPerImage}
                            perCardBgColor={currentPerBgColor}
                            perCardPos={currentPerPos}
                            vividStyle={currentVivid}
                            selectedFlagUrl={settings.flagEnabled ? `https://flagcdn.com/w160/${settings.flagCountryCode}.png` : undefined}
                            selectedFlagHAlign={settings.flagHAlign}
                            previewScale={0.42}
                          />
                        </div>
                      </div>

                      {/* Sponsored Action Call-To-Action Button Row */}
                      <div className="px-3 py-2.5 bg-indigo-50/70 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest block">
                            {settings.ctaText || 'Learn More'}
                          </span>
                          <span className="text-[9px] text-indigo-600 font-semibold block">yourbrand.studio</span>
                        </div>
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] px-4 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition-all cursor-pointer">
                          <span>{settings.ctaText || 'Apply Now'}</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Interaction Actions */}
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-slate-700">
                            <Heart className="h-5 w-5 hover:text-rose-500 cursor-pointer" />
                            <MessageCircle className="h-5 w-5 hover:text-indigo-500 cursor-pointer" />
                            <Send className="h-5 w-5 hover:text-emerald-500 cursor-pointer" />
                          </div>
                        </div>

                        <p className="text-xs font-black text-slate-800">
                          Liked by design_curator and 1,482 others
                        </p>

                        <p className="text-xs text-slate-700 leading-relaxed">
                          <span className="font-extrabold text-slate-900 mr-1.5">yourbrand.studio</span>
                          {settings.descText || 'Create high-converting ad variations in seconds.'}
                        </p>

                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 block">
                          2 hours ago
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* --- 3. E-COMMERCE PLACEMENT --- */}
                {placement === 'ecommerce' && (
                  <div className="bg-white font-sans">
                    {/* Header bar */}
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-black tracking-widest text-slate-900">AURA LIVING</span>
                      <div className="flex gap-4 text-xs font-bold text-slate-500">
                        <span>New</span>
                        <span>Workspace</span>
                        <span>Lamps</span>
                        <span>Cart (0)</span>
                      </div>
                    </div>

                    {/* HERO WORKSPACE - FEATURING THE CREATIVE AD BANNER */}
                    <div className="p-6 bg-gradient-to-tr from-slate-50 to-indigo-50/30 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      <div className="space-y-4">
                        <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full uppercase tracking-wider inline-block">
                          MID-YEAR CAMPAIGN FEATURE
                        </span>
                        <h2 className="text-2xl font-black text-slate-900 leading-tight">
                          Modern Serenity for Your Creative Process
                        </h2>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Explore custom crafted lighting, ergonomic seating accessories, and stationery organizers designed by specialists to empower daily workflows.
                        </p>
                        <div className="pt-2">
                          <button className="bg-slate-950 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow hover:bg-slate-900 flex items-center gap-1.5 cursor-pointer">
                            Browse Collection <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Large Display Banner representing the ad */}
                      <div className="w-full bg-white p-2 rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex items-center justify-center">
                        <div className="w-[100%]">
                          <CreativeCanvas
                            text={currentText}
                            idx={safeActiveIdx}
                            settings={settings}
                            perCardImage={currentPerImage}
                            perCardBgColor={currentPerBgColor}
                            perCardPos={currentPerPos}
                            vividStyle={currentVivid}
                            selectedFlagUrl={settings.flagEnabled ? `https://flagcdn.com/w160/${settings.flagCountryCode}.png` : undefined}
                            selectedFlagHAlign={settings.flagHAlign}
                            previewScale={0.38}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Products Grid */}
                    <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { name: 'Silt Ceramic Table Lamp', price: '$129', img: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=150&auto=format&fit=crop' },
                        { name: 'Driftwood Floating Planter', price: '$45', img: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=150&auto=format&fit=crop' },
                        { name: 'Ergonomic Desk Wedge', price: '$85', img: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=150&auto=format&fit=crop' },
                        { name: 'Amber Glass Oil Diffuser', price: '$35', img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=150&auto=format&fit=crop' },
                      ].map((prod, pIdx) => (
                        <div key={pIdx} className="space-y-2">
                          <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                            <img src={prod.img} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{prod.name}</h4>
                            <span className="text-xs font-semibold text-slate-400">{prod.price}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* --- 4. GOOGLE SPONSORED SEARCH PLACEMENT --- */}
                {placement === 'search' && (
                  <div className="p-6 bg-white font-sans text-slate-800">
                    {/* Google search top branding */}
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b">
                      <span className="text-lg font-black tracking-tight text-blue-600">
                        G<span className="text-red-500">o</span><span className="text-yellow-500">o</span>g<span className="text-green-500">l</span>e
                      </span>
                      <div className="flex-1 max-w-md bg-slate-100 border rounded-full px-4 py-1.5 text-xs text-slate-600 flex items-center justify-between">
                        <span>best marketing ad variation builder online</span>
                        <div className="w-4 h-4 bg-slate-400 rounded-full"></div>
                      </div>
                    </div>

                    <div className="max-w-2xl space-y-6">
                      
                      {/* SPONSORED GOOGLE RESULT PLACEMENT */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                              Sponsored
                            </span>
                            <span className="text-xs text-slate-500 font-semibold">https://www.yourbrand.ai</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                          <div className="space-y-1.5 flex-1">
                            <h3 className="text-sm font-bold text-blue-800 hover:underline cursor-pointer">
                              {currentText.replace(/\*/g, '')}
                            </h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {settings.descText || 'Create high-converting ad copies in seconds.'} Generative ad workspace with customizable presets, flag logo integration, soft outlines, and instant downloads.
                            </p>
                            <div className="flex gap-4 text-[11px] font-bold text-indigo-600 pt-1">
                              <span>★ 4.9 Rating</span>
                              <span>· 30-Day Free Trial</span>
                              <span>· Setup in 2 mins</span>
                            </div>
                          </div>

                          {/* Search Display Ad Thumbnail Preview */}
                          <div className="w-24 h-24 bg-slate-900 border border-slate-200 rounded-lg overflow-hidden shrink-0 flex items-center justify-center relative shadow">
                            <div className="scale-[0.22] origin-center absolute w-[1080px] h-[1080px] flex items-center justify-center pointer-events-none">
                              <CreativeCanvas
                                text={currentText}
                                idx={safeActiveIdx}
                                settings={settings}
                                perCardImage={currentPerImage}
                                perCardBgColor={currentPerBgColor}
                                perCardPos={currentPerPos}
                                vividStyle={currentVivid}
                                selectedFlagUrl={settings.flagEnabled ? `https://flagcdn.com/w160/${settings.flagCountryCode}.png` : undefined}
                                selectedFlagHAlign={settings.flagHAlign}
                                previewScale={1}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Organic results */}
                      <div className="space-y-1 pl-2">
                        <span className="text-xs text-slate-500">https://www.marketinghub.org/generators</span>
                        <h3 className="text-sm font-bold text-blue-700 hover:underline cursor-pointer">
                          10 Best Display Banner Tools to Generate Ad Layouts in 2026
                        </h3>
                        <p className="text-xs text-slate-600">
                          A curated review of the top high-performance tools enabling bulk variations downloads. Analysis covers responsive grid scaling, canvas performance, and outline options.
                        </p>
                      </div>

                      <div className="space-y-1 pl-2">
                        <span className="text-xs text-slate-500 font-semibold">https://www.designerweekly.com/typography-guides</span>
                        <h3 className="text-sm font-bold text-blue-700 hover:underline cursor-pointer">
                          How to Pair Fonts for Extreme Display Contrast
                        </h3>
                        <p className="text-xs text-slate-600">
                          Understanding line heights, highlight styles, and shadow blurs to build readable outdoor billboards or mobile native advertisements.
                        </p>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </AnimatePresence>

        </div>

      </div>

    </div>
  );
};
