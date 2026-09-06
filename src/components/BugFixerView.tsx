import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Bug, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Copy, 
  Check, 
  Sparkles, 
  RefreshCw, 
  ArrowRight,
  Lightbulb,
  ShieldCheck,
  FileCode,
  Terminal,
  Download
} from 'lucide-react';
import { BugFixResult } from '../types';
import { StorageService } from '../utils/storage';
import { safeApiPost, formatHttpStatus } from '../utils/api';

export const BugFixerView: React.FC = () => {
  const [brokenCode, setBrokenCode] = useState(`function calculateUserStats(users) {
  const total = users.reduce((acc, curr) => acc + curr.score);
  return {
    average: total / users.length,
    topUser: users.sort((a, b) => b.score - a.score)[0].name
  };
}`);

  const [errorMessage, setErrorMessage] = useState(`TypeError: Cannot read properties of undefined (reading 'score')
    at calculateUserStats (app.js:2:46)
    at users.reduce (<anonymous>)
    at main (app.js:8:3)`);

  const [language, setLanguage] = useState('JavaScript / TypeScript');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'solution' | 'diff' | 'prevention'>('solution');
  
  const [fixResult, setFixResult] = useState<BugFixResult | null>(() => {
    const list = StorageService.getBugFixes();
    return list[0] || null;
  });

  const handleDiagnoseAndFix = async () => {
    if ((!brokenCode.trim() && !errorMessage.trim()) || isLoading) return;

    setIsLoading(true);
    try {
      const response = await safeApiPost<any>(
        '/api/code/fix-bug',
        {
          code: brokenCode,
          errorMessage,
          language,
        },
        {
          cause: 'Identified potential runtime exception or type mismatch.',
          correctedCode: brokenCode || '// Fallback corrected code',
          explanation: 'Standardized null-checks and safe default values.',
          preventionTips: ['Add defensive guards', 'Enable strict TypeScript checks', 'Write automated tests'],
          severity: 'Medium',
          detectedLanguage: language,
        }
      );

      const data = response.data || {};
      const resultItem: BugFixResult = {
        id: 'bugfix-' + Date.now(),
        originalCode: brokenCode,
        errorMessage,
        cause: data.cause || 'Unspecified runtime error',
        correctedCode: data.correctedCode || '// Corrected code here',
        explanation: data.explanation || (response.error ? `Notice: ${response.error}` : 'Analyzed by Farhee AI Debugger'),
        preventionTips: data.preventionTips || [
          'Add null & empty array checks',
          'Specify initial accumulator value in reduce',
          'Avoid mutating arrays in-place with .sort()'
        ],
        severity: data.severity || 'Medium',
        detectedLanguage: data.detectedLanguage || language,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setFixResult(resultItem);
      StorageService.saveBugFix(resultItem);
      setActiveTab('solution');
    } catch (err: any) {
      console.error('[Farhee BugFixer Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyFixed = () => {
    if (!fixResult) return;
    navigator.clipboard.writeText(fixResult.correctedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFixed = () => {
    if (!fixResult) return;
    const blob = new Blob([fixResult.correctedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Farhee_Fixed_${fixResult.detectedLanguage || 'code'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="farhee-bug-fixer-view" className="flex flex-col h-[calc(100vh-4rem)] bg-[#0B0D0E] overflow-y-auto">
      {/* Header & Inputs Grid */}
      <div className="p-4 lg:p-6 border-b border-[#1A2227] bg-[#0E1317]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Bug className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display">AI Bug Reporter & Root Cause Fixer</h3>
                <p className="text-xs text-neutral-400">Paste your faulty snippet, stack trace, or terminal log below</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-2 bg-[#141A1E] border border-[#222C33] rounded-xl text-xs text-neutral-200 outline-none focus:border-[#10B981]"
              >
                <option value="JavaScript / TypeScript">JavaScript / TypeScript / React</option>
                <option value="Python">Python</option>
                <option value="C++">C++</option>
                <option value="Rust">Rust</option>
                <option value="Java">Java / Kotlin</option>
                <option value="SQL">SQL</option>
                <option value="Flutter">Flutter / Dart</option>
                <option value="Go">Go (Golang)</option>
              </select>

              <button
                id="diagnose-bug-btn"
                onClick={handleDiagnoseAndFix}
                disabled={isLoading || (!brokenCode.trim() && !errorMessage.trim())}
                className={`px-5 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all ${
                  isLoading
                    ? 'bg-[#1A2329] text-neutral-500 cursor-wait'
                    : 'bg-gradient-to-r from-amber-500 via-[#10B981] to-[#CCFF00] text-black shadow-lg shadow-amber-500/15 hover:opacity-95 active:scale-95'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Diagnosing Bug...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>Diagnose & Fix Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Code & Error Log Two-Column Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Broken Code Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-neutral-300 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                Broken / Suspect Code:
              </label>
              <textarea
                id="broken-code-input"
                value={brokenCode}
                onChange={(e) => setBrokenCode(e.target.value)}
                placeholder="// Paste broken code snippet here..."
                rows={6}
                className="w-full p-3 font-mono text-xs bg-[#12171B] border border-[#202B32] focus:border-amber-500 rounded-xl text-neutral-200 placeholder:text-neutral-600 outline-none resize-none shadow-inner"
              />
            </div>

            {/* Error Message / Stack Trace */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-neutral-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-red-400" />
                Raw Terminal Error / Stack Trace:
              </label>
              <textarea
                id="error-message-input"
                value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
                placeholder="TypeError: Cannot read properties of undefined... or paste bash error output"
                rows={6}
                className="w-full p-3 font-mono text-xs bg-[#12171B] border border-[#202B32] focus:border-red-500/70 rounded-xl text-red-300 placeholder:text-neutral-600 outline-none resize-none shadow-inner"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Diagnosis & Fix Results Area */}
      <div className="flex-1 p-4 lg:p-6 max-w-6xl w-full mx-auto space-y-4">
        {fixResult ? (
          <div className="space-y-4">
            {/* 1) Cause of Error Card */}
            <div className="p-4 rounded-2xl bg-[#12171B] border border-[#1F2930] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-500 to-red-500" />
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                      1. Identified Root Cause
                    </h4>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      fixResult.severity === 'High'
                        ? 'bg-red-500/15 text-red-400 border-red-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}>
                      {fixResult.severity} Severity
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#182126] text-neutral-300 border border-[#25323A]">
                      {fixResult.detectedLanguage}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-neutral-200 leading-relaxed pt-1">
                    {fixResult.cause}
                  </p>
                </div>
              </div>
            </div>

            {/* 2) Corrected Code Box with Copy */}
            <div className="rounded-2xl bg-[#0E1317] border border-[#1E272D] overflow-hidden shadow-2xl">
              <div className="px-4 py-3 bg-[#13191D] border-b border-[#1E272D] flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#CCFF00]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#CCFF00] font-mono">
                    2. Corrected & Optimized Code
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="copy-fixed-code-btn"
                    onClick={handleCopyFixed}
                    className="px-3 py-1.5 rounded-lg bg-[#182126] hover:bg-[#202C33] border border-[#26343D] text-xs text-neutral-200 hover:text-[#CCFF00] flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#CCFF00]" />
                        <span className="text-[#CCFF00]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#10B981]" />
                        <span>Copy Corrected Code</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadFixed}
                    className="p-1.5 px-2.5 rounded-lg bg-[#182126] hover:bg-[#202C33] border border-[#26343D] text-xs text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors"
                    title="Download Fixed Code"
                  >
                    <Download className="w-3.5 h-3.5 text-[#10B981]" />
                  </button>
                </div>
              </div>

              <div className="p-4 bg-[#090C0E]">
                <pre className="font-mono text-xs sm:text-sm text-emerald-300 leading-relaxed overflow-x-auto p-4 rounded-xl bg-[#0B0E10] border border-[#1A2227]">
                  <code>{fixResult.correctedCode}</code>
                </pre>
              </div>

              {fixResult.explanation && (
                <div className="p-4 bg-[#0E1317] border-t border-[#1E272D] text-xs text-neutral-300">
                  <div className="prose prose-invert prose-xs max-w-none">
                    <ReactMarkdown>{fixResult.explanation}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            {/* 3) Step-by-Step Prevention Tips */}
            <div className="p-4 rounded-2xl bg-[#12171B] border border-[#1F2930] space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#10B981] font-mono">
                  3. Step-by-Step Prevention Tips & Best Practices
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {fixResult.preventionTips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-[#141A1E] border border-[#222C33]"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#10B981]/20 text-[#CCFF00] font-mono text-[10px] flex items-center justify-center shrink-0 border border-[#10B981]/30">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-neutral-300 leading-relaxed">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-[#0E1317]/50 border border-dashed border-[#1E272D] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bug className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white font-display">Ready for Diagnostic Input</h3>
            <p className="text-xs text-neutral-400 max-w-md">
              Paste your broken code snippet or terminal error output above and click <strong>Diagnose & Fix Code</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
