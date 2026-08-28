import React, { useState, useEffect } from 'react';
import { 
  Presentation, 
  Sparkles, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  FileCode, 
  Plus, 
  Trash2, 
  Layers, 
  Play, 
  Edit3, 
  ChevronLeft, 
  ChevronRight, 
  Palette, 
  Copy, 
  Check, 
  Cloud, 
  CloudCheck,
  Maximize2,
  RefreshCw,
  Sliders,
  Share2
} from 'lucide-react';
import { PresentationProject, SlideItem } from '../types';
import { StorageService } from '../utils/storage';
import { ExporterService } from '../utils/exporter';
import { auth, CloudStoreService } from '../utils/firebase';
import { User } from 'firebase/auth';

const THEMES = [
  { id: 'emerald', label: 'Farhee Emerald', bg: '#0B0D0E', card: '#12171B', accent: '#10B981', secondary: '#CCFF00' },
  { id: 'cyberpunk', label: 'Cyberpunk Neon', bg: '#080A0C', card: '#101418', accent: '#CCFF00', secondary: '#06B6D4' },
  { id: 'corporate', label: 'Corporate Clean', bg: '#F8FAFC', card: '#FFFFFF', accent: '#0284C7', secondary: '#0F172A', light: true },
  { id: 'midnight', label: 'Midnight Indigo', bg: '#030712', card: '#0F172A', accent: '#6366F1', secondary: '#A855F7' },
  { id: 'minimal', label: 'Minimalist Mono', bg: '#FFFFFF', card: '#F4F4F5', accent: '#18181B', secondary: '#71717A', light: true },
];

export const PresentationView: React.FC = () => {
  const [topic, setTopic] = useState('AI Revolution in Sri Lanka: Building Next-Generation Software Ecosystems');
  const [slideCount, setSlideCount] = useState(6);
  const [selectedTheme, setSelectedTheme] = useState<'emerald' | 'cyberpunk' | 'corporate' | 'midnight' | 'minimal'>('emerald');
  const [tone, setTone] = useState('Executive & Visionary');
  const [isLoading, setIsLoading] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);

  // Active Presentation Project
  const [project, setProject] = useState<PresentationProject>(() => {
    const list = StorageService.getPresentations();
    if (list.length > 0) return list[0];
    return {
      id: 'pres-default-1',
      title: 'AI Revolution in Sri Lanka',
      subtitle: 'Architecting Future-Ready Digital Ecosystems with Farhee Intelligent',
      theme: 'emerald',
      aspectRatio: '16:9',
      author: 'PGV Creation (Batticaloa, Sri Lanka)',
      createdAt: 'Just now',
      updatedAt: 'Just now',
      slides: [
        {
          id: 's1',
          slideNumber: 1,
          layout: 'title',
          title: 'AI Revolution in Sri Lanka',
          subtitle: 'Architecting Future-Ready Digital Ecosystems with Farhee Intelligent',
          bulletPoints: [],
          tag: 'Keynote Introduction',
          notes: 'Welcome dignitaries, engineers, and visionaries to our innovation showcase.',
        },
        {
          id: 's2',
          slideNumber: 2,
          layout: 'content',
          title: 'The Regional Tech Landscape',
          subtitle: 'Batticaloa & Colombo as emerging regional AI hubs',
          bulletPoints: [
            'Growing talent pool of software engineers and autonomous agents specialists.',
            'High-bandwidth digital infrastructure enabling cloud-native intelligence platforms.',
            'Opportunity to leapfrog legacy ERP systems directly into generative workflows.',
          ],
          metrics: [
            { label: 'Talent Growth', value: '+68%', detail: 'Annual tech graduates' },
            { label: 'Cloud Adoption', value: '4.2x', detail: 'Accelerated enterprise shift' },
          ],
          tag: 'Market Dynamics',
          notes: 'Focus on regional human capital and technological leapfrogging.',
        },
        {
          id: 's3',
          slideNumber: 3,
          layout: 'content',
          title: 'Core Architectural Pillars',
          subtitle: 'Engineering speed, security, and multi-modal intelligence',
          bulletPoints: [
            'Sub-second inference pipelines with server-side LLM orchestrators.',
            'Full PWA offline capabilities with instant local synchronization.',
            'Multi-format export engine: Instant PPTX, PDF, Excel, and Word DOCX outputs.',
          ],
          metrics: [
            { label: 'Response Latency', value: '< 450ms', detail: 'Real-time response time' },
            { label: 'Cross-Platform', value: '100%', detail: 'Web, Android & iOS' },
          ],
          tag: 'System Design',
          notes: 'Emphasize architectural reliability and enterprise multi-device support.',
        },
        {
          id: 's4',
          slideNumber: 4,
          layout: 'content',
          title: 'Strategic Roadmap & Future Outlook',
          subtitle: 'Empowering students, developers, and enterprises across the island',
          bulletPoints: [
            'Phase 1: Open-access AI utilities and multi-language code synthesis.',
            'Phase 2: Enterprise data connectors and localized multi-lingual AI models.',
            'Phase 3: Nationwide innovation challenges powered by PGV Creation.',
          ],
          tag: 'Roadmap',
          notes: 'Conclude with an inspiring call to action for all stakeholders.',
        },
      ],
    };
  });

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  const handleGeneratePresentation = async () => {
    if (!topic.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/presentation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          slideCount,
          theme: selectedTheme,
          tone,
        }),
      });

      const data = await res.json();
      const newProject: PresentationProject = {
        id: 'pres-' + Date.now(),
        title: data.title || topic,
        subtitle: data.subtitle || 'Generated by Farhee Intelligent',
        theme: selectedTheme,
        aspectRatio: '16:9',
        author: currentUser ? (currentUser.displayName || currentUser.email || 'Farhee User') : 'PGV Creation',
        slides: data.slides && data.slides.length > 0 ? data.slides.map((s: any, idx: number) => ({
          id: 'slide-' + (idx + 1),
          slideNumber: idx + 1,
          layout: s.layout || (idx === 0 ? 'title' : 'content'),
          title: s.title || `Slide ${idx + 1}`,
          subtitle: s.subtitle || '',
          bulletPoints: s.bulletPoints || [],
          notes: s.notes || '',
          tag: s.tag || `Section ${idx + 1}`,
          metrics: s.metrics || [],
        })) : project.slides,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setProject(newProject);
      setCurrentSlideIndex(0);
      StorageService.savePresentation(newProject);

      if (currentUser) {
        await CloudStoreService.savePresentation(currentUser.uid, newProject);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate presentation deck. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Exporters
  const handleExportPPTX = async () => {
    setExportingFormat('pptx');
    try {
      await ExporterService.exportToPPTX(project);
    } catch (err) {
      console.error(err);
      alert('Failed to export PowerPoint presentation.');
    } finally {
      setExportingFormat(null);
    }
  };

  const handleExportPDF = () => {
    setExportingFormat('pdf');
    try {
      const sections = project.slides.map(s => ({
        heading: s.title,
        content: s.subtitle,
        bullets: s.bulletPoints,
      }));
      ExporterService.exportToPDF(project.title, project.subtitle, sections);
    } catch (err) {
      console.error(err);
      alert('Failed to export PDF.');
    } finally {
      setExportingFormat(null);
    }
  };

  const handleExportExcel = () => {
    setExportingFormat('xlsx');
    try {
      ExporterService.exportToExcel(project.title, project.slides);
    } catch (err) {
      console.error(err);
      alert('Failed to export Excel spreadsheet.');
    } finally {
      setExportingFormat(null);
    }
  };

  const handleExportDocx = async () => {
    setExportingFormat('docx');
    try {
      await ExporterService.exportToDocx(project.title, project.subtitle, project.slides);
    } catch (err) {
      console.error(err);
      alert('Failed to export Word DOCX document.');
    } finally {
      setExportingFormat(null);
    }
  };

  // Slide navigation & editing
  const currentSlide = project.slides[currentSlideIndex] || project.slides[0];

  const handleUpdateSlideTitle = (newTitle: string) => {
    const updated = [...project.slides];
    updated[currentSlideIndex] = { ...updated[currentSlideIndex], title: newTitle };
    const newProj = { ...project, slides: updated, updatedAt: 'Just now' };
    setProject(newProj);
    StorageService.savePresentation(newProj);
  };

  const handleUpdateSlideSubtitle = (newSub: string) => {
    const updated = [...project.slides];
    updated[currentSlideIndex] = { ...updated[currentSlideIndex], subtitle: newSub };
    const newProj = { ...project, slides: updated, updatedAt: 'Just now' };
    setProject(newProj);
    StorageService.savePresentation(newProj);
  };

  const handleAddBulletPoint = () => {
    const updated = [...project.slides];
    const currentBullets = updated[currentSlideIndex].bulletPoints || [];
    updated[currentSlideIndex] = {
      ...updated[currentSlideIndex],
      bulletPoints: [...currentBullets, 'New strategic bullet point'],
    };
    const newProj = { ...project, slides: updated, updatedAt: 'Just now' };
    setProject(newProj);
    StorageService.savePresentation(newProj);
  };

  const handleUpdateBulletPoint = (bIdx: number, val: string) => {
    const updated = [...project.slides];
    const currentBullets = [...(updated[currentSlideIndex].bulletPoints || [])];
    currentBullets[bIdx] = val;
    updated[currentSlideIndex] = { ...updated[currentSlideIndex], bulletPoints: currentBullets };
    const newProj = { ...project, slides: updated, updatedAt: 'Just now' };
    setProject(newProj);
    StorageService.savePresentation(newProj);
  };

  const handleDeleteBulletPoint = (bIdx: number) => {
    const updated = [...project.slides];
    const currentBullets = (updated[currentSlideIndex].bulletPoints || []).filter((_, i) => i !== bIdx);
    updated[currentSlideIndex] = { ...updated[currentSlideIndex], bulletPoints: currentBullets };
    const newProj = { ...project, slides: updated, updatedAt: 'Just now' };
    setProject(newProj);
    StorageService.savePresentation(newProj);
  };

  const handleAddNewSlide = () => {
    const newSlide: SlideItem = {
      id: 'slide-' + (project.slides.length + 1),
      slideNumber: project.slides.length + 1,
      layout: 'content',
      title: 'New Slide Heading',
      subtitle: 'Add clear contextual subtitle',
      bulletPoints: ['First key takeaway', 'Second supporting insight'],
      tag: 'Section ' + (project.slides.length + 1),
      notes: '',
    };
    const updated = [...project.slides, newSlide];
    const newProj = { ...project, slides: updated };
    setProject(newProj);
    setCurrentSlideIndex(updated.length - 1);
    StorageService.savePresentation(newProj);
  };

  const handleDeleteCurrentSlide = () => {
    if (project.slides.length <= 1) return;
    const updated = project.slides
      .filter((_, i) => i !== currentSlideIndex)
      .map((s, idx) => ({ ...s, slideNumber: idx + 1 }));
    const newProj = { ...project, slides: updated };
    setProject(newProj);
    setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
    StorageService.savePresentation(newProj);
  };

  const currentThemeObj = THEMES.find(t => t.id === project.theme) || THEMES[0];

  return (
    <div id="farhee-presentation-view" className="flex flex-col h-[calc(100vh-4rem)] bg-[#0B0D0E] overflow-y-auto">
      {/* Top Generator Control Center */}
      <div className="p-4 lg:p-6 border-b border-[#1A2227] bg-[#0E1317]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#10B981] to-[#CCFF00] p-0.5 flex items-center justify-center shadow-lg shadow-[#10B981]/20">
                <div className="w-full h-full bg-[#0B0D0E] rounded-[10px] flex items-center justify-center">
                  <Presentation className="w-5 h-5 text-[#CCFF00]" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  Farhee PowerPoint Presentation Architect
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#CCFF00] border border-[#10B981]/40">
                    PPTX • PDF • Excel • DOCX
                  </span>
                </h3>
                <p className="text-xs text-neutral-400">
                  Generate professional executive decks and export in multiple formats with one click
                </p>
              </div>
            </div>

            {/* Quick Export Hub buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                id="export-pptx-btn"
                onClick={handleExportPPTX}
                disabled={exportingFormat !== null}
                className="px-3 py-2 rounded-xl bg-[#E15738]/20 hover:bg-[#E15738]/30 border border-[#E15738]/40 text-[#FFA07A] text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                title="Download Microsoft PowerPoint (.pptx)"
              >
                <Presentation className="w-3.5 h-3.5 text-[#E15738]" />
                <span>Export PPTX</span>
              </button>

              <button
                id="export-pdf-btn"
                onClick={handleExportPDF}
                disabled={exportingFormat !== null}
                className="px-3 py-2 rounded-xl bg-[#EF4444]/20 hover:bg-[#EF4444]/30 border border-[#EF4444]/40 text-red-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                title="Download Print-ready PDF Document"
              >
                <FileText className="w-3.5 h-3.5 text-red-400" />
                <span>PDF</span>
              </button>

              <button
                id="export-excel-btn"
                onClick={handleExportExcel}
                disabled={exportingFormat !== null}
                className="px-3 py-2 rounded-xl bg-[#107C41]/20 hover:bg-[#107C41]/30 border border-[#107C41]/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                title="Download Excel Outline & Metrics Sheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Excel</span>
              </button>

              <button
                id="export-docx-btn"
                onClick={handleExportDocx}
                disabled={exportingFormat !== null}
                className="px-3 py-2 rounded-xl bg-[#2B579A]/20 hover:bg-[#2B579A]/30 border border-[#2B579A]/40 text-blue-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                title="Download Microsoft Word Document (.docx)"
              >
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
                <span>DOCX</span>
              </button>
            </div>
          </div>

          {/* Prompt, Slide Count & Generate */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                id="presentation-topic-input"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGeneratePresentation()}
                placeholder="Enter presentation topic, pitch deck goal, or lecture outline..."
                className="w-full pl-4 pr-10 py-3 bg-[#12171B] border border-[#202B32] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] rounded-2xl text-sm text-neutral-100 placeholder:text-neutral-500 outline-none transition-all shadow-inner"
              />
              <button
                onClick={() => setTopic('')}
                className="absolute right-3 top-3.5 text-neutral-500 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2">
              <select
                value={slideCount}
                onChange={(e) => setSlideCount(Number(e.target.value))}
                className="px-3 py-3 bg-[#12171B] border border-[#202B32] rounded-2xl text-xs text-neutral-200 outline-none focus:border-[#10B981]"
              >
                <option value={4}>4 Slides (Quick Pitch)</option>
                <option value={6}>6 Slides (Standard Deck)</option>
                <option value={8}>8 Slides (Detailed Plan)</option>
                <option value={10}>10 Slides (Master Class)</option>
              </select>

              <button
                id="generate-presentation-btn"
                onClick={handleGeneratePresentation}
                disabled={isLoading || !topic.trim()}
                className={`px-5 py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  isLoading
                    ? 'bg-[#1A2329] text-neutral-500 cursor-wait'
                    : 'bg-gradient-to-r from-[#10B981] via-[#059669] to-[#CCFF00] text-black shadow-lg shadow-[#10B981]/25 hover:opacity-95 active:scale-95'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Architecting Deck...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>Generate Presentation</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Theme & Style selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="font-mono text-neutral-400 uppercase text-[11px] flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-[#CCFF00]" /> Deck Palette:
            </span>
            {THEMES.map((th) => (
              <button
                key={th.id}
                onClick={() => {
                  setSelectedTheme(th.id as any);
                  const updatedProj = { ...project, theme: th.id as any };
                  setProject(updatedProj);
                  StorageService.savePresentation(updatedProj);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  project.theme === th.id
                    ? 'bg-[#10B981]/20 border-[#10B981] text-[#CCFF00] shadow-md shadow-[#10B981]/20'
                    : 'bg-[#141A1E] border-[#222C33] text-neutral-400 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: th.accent }} />
                <span>{th.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Presentation Stage & Interactive Slide Editor */}
      <div className="flex-1 p-4 lg:p-6 max-w-6xl w-full mx-auto flex flex-col space-y-4">
        {/* Slide Carousel Thumbnails & Navigation Bar */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#0E1317] border border-[#1E272D]">
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none flex-1">
            {project.slides.map((s, idx) => (
              <button
                key={s.id || idx}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all border shrink-0 flex items-center gap-1.5 ${
                  currentSlideIndex === idx
                    ? 'bg-[#10B981]/25 border-[#10B981] text-[#CCFF00] shadow-md'
                    : 'bg-[#141A1E] border-[#202B32] text-neutral-400 hover:text-white'
                }`}
              >
                <span className="w-4 h-4 rounded bg-black/40 flex items-center justify-center text-[10px]">
                  {idx + 1}
                </span>
                <span className="max-w-[120px] truncate">{s.title || `Slide ${idx + 1}`}</span>
              </button>
            ))}

            <button
              onClick={handleAddNewSlide}
              className="p-1.5 px-2.5 rounded-xl bg-[#141A1E] hover:bg-[#1D262C] border border-[#202B32] text-[#10B981] hover:text-[#CCFF00] text-xs font-semibold flex items-center gap-1 shrink-0"
              title="Add New Slide"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Slide</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
              disabled={currentSlideIndex === 0}
              className="p-2 rounded-xl bg-[#141A1E] border border-[#202B32] text-neutral-300 hover:text-white disabled:opacity-30"
              title="Previous Slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono text-neutral-400 px-1">
              {currentSlideIndex + 1} / {project.slides.length}
            </span>

            <button
              onClick={() => setCurrentSlideIndex(Math.min(project.slides.length - 1, currentSlideIndex + 1))}
              disabled={currentSlideIndex === project.slides.length - 1}
              className="p-2 rounded-xl bg-[#141A1E] border border-[#202B32] text-neutral-300 hover:text-white disabled:opacity-30"
              title="Next Slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleDeleteCurrentSlide}
              disabled={project.slides.length <= 1}
              className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 disabled:opacity-30 ml-1"
              title="Delete Slide"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Presentation Screen Canvas (16:9 Aspect Ratio Container) */}
        <div
          className={`w-full rounded-3xl overflow-hidden shadow-2xl border border-[#1E272D] flex flex-col justify-between transition-all duration-300 relative ${
            currentThemeObj.light ? 'text-neutral-900' : 'text-neutral-100'
          }`}
          style={{
            backgroundColor: currentThemeObj.bg,
            minHeight: '440px',
          }}
        >
          {/* Slide decorative accent line */}
          <div
            className="w-full h-1.5"
            style={{ backgroundColor: currentThemeObj.accent }}
          />

          {/* Slide Content Area */}
          <div className="p-6 md:p-10 flex-1 flex flex-col justify-between space-y-6">
            {/* Top tag & Author meta */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span
                className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase border"
                style={{
                  color: currentThemeObj.accent,
                  borderColor: `${currentThemeObj.accent}40`,
                  backgroundColor: `${currentThemeObj.accent}15`,
                }}
              >
                {currentSlide.tag || `Slide ${currentSlideIndex + 1}`}
              </span>

              <span className="text-neutral-500 text-[11px]">
                {project.author || 'Farhee Intelligent (PGV Creation)'}
              </span>
            </div>

            {/* Title & Subtitle Edit fields */}
            <div className="space-y-2">
              <input
                type="text"
                value={currentSlide.title}
                onChange={(e) => handleUpdateSlideTitle(e.target.value)}
                className={`w-full text-2xl md:text-3xl font-extrabold font-display bg-transparent outline-none border-b border-transparent hover:border-neutral-700 focus:border-[#10B981] pb-1 transition-all ${
                  currentThemeObj.light ? 'text-neutral-900' : 'text-white'
                }`}
                placeholder="Slide Title..."
              />

              <input
                type="text"
                value={currentSlide.subtitle || ''}
                onChange={(e) => handleUpdateSlideSubtitle(e.target.value)}
                className="w-full text-sm md:text-base font-medium text-neutral-400 bg-transparent outline-none border-b border-transparent hover:border-neutral-700 focus:border-[#10B981] pb-1 transition-all"
                placeholder="Slide Subtitle / Contextual Pitch..."
              />
            </div>

            {/* Bullet Points with Live Editing */}
            <div className="space-y-3 flex-1">
              {(currentSlide.bulletPoints || []).map((bp, bIdx) => (
                <div
                  key={bIdx}
                  className="flex items-start gap-3 group p-2 rounded-xl transition-colors hover:bg-white/5"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full mt-2 shrink-0 shadow-sm"
                    style={{ backgroundColor: currentThemeObj.secondary || currentThemeObj.accent }}
                  />
                  <input
                    type="text"
                    value={bp}
                    onChange={(e) => handleUpdateBulletPoint(bIdx, e.target.value)}
                    className={`flex-1 bg-transparent text-sm md:text-base leading-relaxed outline-none border-b border-transparent hover:border-neutral-700 focus:border-[#10B981] ${
                      currentThemeObj.light ? 'text-neutral-800' : 'text-neutral-200'
                    }`}
                  />
                  <button
                    onClick={() => handleDeleteBulletPoint(bIdx)}
                    className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 text-xs transition-opacity p-1"
                    title="Remove Bullet"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button
                onClick={handleAddBulletPoint}
                className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-neutral-700 hover:border-[#10B981] text-neutral-400 hover:text-[#CCFF00] transition-colors mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Bullet Point</span>
              </button>
            </div>

            {/* Metrics cards if applicable */}
            {currentSlide.metrics && currentSlide.metrics.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {currentSlide.metrics.map((m, mIdx) => (
                  <div
                    key={mIdx}
                    className="p-3.5 rounded-2xl border"
                    style={{
                      backgroundColor: currentThemeObj.card,
                      borderColor: `${currentThemeObj.accent}30`,
                    }}
                  >
                    <div
                      className="text-xl md:text-2xl font-extrabold font-mono"
                      style={{ color: currentThemeObj.accent }}
                    >
                      {m.value}
                    </div>
                    <div className="text-xs font-semibold text-neutral-300 mt-0.5">{m.label}</div>
                    {m.detail && <div className="text-[10px] text-neutral-500 mt-0.5">{m.detail}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Slide Footer */}
            <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono pt-4 border-t border-neutral-800/40">
              <span>Farhee Intelligent Deck • PGV Creation</span>
              <span>Slide {currentSlideIndex + 1} of {project.slides.length}</span>
            </div>
          </div>
        </div>

        {/* Speaker Notes Box */}
        <div className="p-4 rounded-2xl bg-[#0E1317] border border-[#1E272D] space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Edit3 className="w-3.5 h-3.5 text-[#CCFF00]" /> Speaker Notes & Keynote Talking Points:
            </span>
            <span>Slide {currentSlideIndex + 1}</span>
          </div>
          <textarea
            value={currentSlide.notes || ''}
            onChange={(e) => {
              const updated = [...project.slides];
              updated[currentSlideIndex] = { ...updated[currentSlideIndex], notes: e.target.value };
              const newProj = { ...project, slides: updated };
              setProject(newProj);
              StorageService.savePresentation(newProj);
            }}
            placeholder="Add presentation talking points, transition cues, or speech lines..."
            rows={2}
            className="w-full p-3 font-mono text-xs bg-[#12171B] border border-[#202B32] focus:border-[#10B981] rounded-xl text-neutral-200 placeholder:text-neutral-600 outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
};
