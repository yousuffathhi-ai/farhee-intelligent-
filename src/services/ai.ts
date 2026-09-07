/**
 * Farhee Intelligent Direct Client-side Gemini AI Service
 * Built with @google/generative-ai for direct client-side AI inference.
 * Eliminates reliance on internal Express / Node server endpoints (/api/chat)
 * that cause HTTP 404 errors on static deployments (such as Vercel, Netlify, GitHub Pages).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { safeApiPost } from '../utils/api';

/**
 * 1. Dynamic Environment Variable Fallback:
 * Checks ALL possible key names in the exact requested order:
 * - process.env.GEMINI_API_KEY
 * - process.env.VITE_AI_API_KEY
 * - process.env.REACT_APP_AI_API_KEY
 * - process.env.AI_API_KEY
 * - import.meta.env.VITE_AI_API_KEY
 * - import.meta.env.VITE_GEMINI_API_KEY
 */
export function getActiveApiKey(): string {
  // 1. process.env.GEMINI_API_KEY
  try {
    const k = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined;
    if (k && typeof k === 'string' && k.trim().length > 0) return k.trim();
  } catch {}

  // 2. process.env.VITE_AI_API_KEY
  try {
    const k = typeof process !== 'undefined' && process.env ? process.env.VITE_AI_API_KEY : undefined;
    if (k && typeof k === 'string' && k.trim().length > 0) return k.trim();
  } catch {}

  // 3. process.env.REACT_APP_AI_API_KEY
  try {
    const k = typeof process !== 'undefined' && process.env ? process.env.REACT_APP_AI_API_KEY : undefined;
    if (k && typeof k === 'string' && k.trim().length > 0) return k.trim();
  } catch {}

  // 4. process.env.AI_API_KEY
  try {
    const k = typeof process !== 'undefined' && process.env ? process.env.AI_API_KEY : undefined;
    if (k && typeof k === 'string' && k.trim().length > 0) return k.trim();
  } catch {}

  // 5. import.meta.env.VITE_AI_API_KEY
  try {
    const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : null;
    const k = metaEnv?.VITE_AI_API_KEY;
    if (k && typeof k === 'string' && k.trim().length > 0) return k.trim();
  } catch {}

  // 6. import.meta.env.VITE_GEMINI_API_KEY
  try {
    const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : null;
    const k = metaEnv?.VITE_GEMINI_API_KEY;
    if (k && typeof k === 'string' && k.trim().length > 0) return k.trim();
  } catch {}

  // 7. Global process / window.process runtime fallback
  try {
    const globalObj = (typeof window !== 'undefined' && (window as any).process?.env) ||
                      (typeof globalThis !== 'undefined' && (globalThis as any).process?.env);
    if (globalObj) {
      if (globalObj.GEMINI_API_KEY) return String(globalObj.GEMINI_API_KEY).trim();
      if (globalObj.VITE_AI_API_KEY) return String(globalObj.VITE_AI_API_KEY).trim();
      if (globalObj.REACT_APP_AI_API_KEY) return String(globalObj.REACT_APP_AI_API_KEY).trim();
      if (globalObj.AI_API_KEY) return String(globalObj.AI_API_KEY).trim();
    }
  } catch {}

  // 8. LocalStorage user-provided key fallback
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('farhee_gemini_api_key') || localStorage.getItem('farhee_api_key');
      if (stored && stored.trim().length > 0) return stored.trim();
    }
  } catch {}

  return '';
}

// Backward-compatible alias
export const getClientApiKey = getActiveApiKey;

export function hasClientApiKey(): boolean {
  const key = getActiveApiKey();
  return Boolean(key && key.length > 5);
}

// Lazy client cache
let genAIInstance: GoogleGenerativeAI | null = null;
let currentKeyCached = '';

function getGenAI(): GoogleGenerativeAI {
  const key = getActiveApiKey();
  if (!genAIInstance || currentKeyCached !== key) {
    genAIInstance = new GoogleGenerativeAI(key || 'MISSING_KEY');
    currentKeyCached = key;
  }
  return genAIInstance;
}

const DEFAULT_SYSTEM_INSTRUCTION = `You are "Farhee Intelligent", a multi-functional modern AI assistant crafted with precision by PGV Creation (Batticaloa, Sri Lanka).
Your capabilities include full-stack coding, intelligent bug fixing, presentation architecture, music synthesis, and creative reasoning.
Formatting guidelines:
- Use clean Markdown with structured headings, lists, and clear code blocks.
- Provide practical, production-ready solutions.
- Maintain an insightful, encouraging, and sophisticated tone.
- Proudly acknowledge your heritage as Farhee Intelligent engineered by PGV Creation when asked.`;

/**
 * Modern candidate models in priority order.
 * Models are tested for availability so the application automatically adapts
 * to current API versions without 404 errors.
 */
const ACTIVE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
];

/**
 * Central Direct Gemini Inference Engine
 * 2. Remove Forced Mock Fallback:
 * If an API key exists, this function executes real Gemini AI generation.
 * If errors occur, it logs and throws the actual API response error directly
 * to allow direct diagnosis of connection issues.
 */
export async function executeGeminiDirect(options: {
  contents: string | Array<{ role: string; parts: Array<{ text: string }> }>;
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
  topP?: number;
}): Promise<{ text: string; modelUsed: string }> {
  const apiKey = getActiveApiKey();
  if (!apiKey) {
    throw new Error('No API key configured.');
  }

  const genAI = getGenAI();
  let lastError: any = null;

  for (const modelName of ACTIVE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: options.systemInstruction,
        generationConfig: {
          responseMimeType: options.responseMimeType,
          temperature: options.temperature ?? 0.7,
          topP: options.topP ?? 0.95,
        },
      });

      let text = '';
      if (typeof options.contents === 'string') {
        const res = await model.generateContent(options.contents);
        text = res.response.text();
      } else {
        // Multi-turn chat
        const history = options.contents.slice(0, -1);
        const lastPart = options.contents[options.contents.length - 1];
        const lastMsg = lastPart?.parts?.[0]?.text || 'Hello';
        const chat = model.startChat({
          history,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            topP: options.topP ?? 0.95,
          },
        });
        const res = await chat.sendMessage(lastMsg);
        text = res.response.text();
      }

      if (text && text.trim().length > 0) {
        return { text: text.trim(), modelUsed: modelName };
      }
    } catch (err: any) {
      lastError = err;
      const errStr = String(err?.message || err);
      console.warn(`[Farhee Gemini Router] Model '${modelName}' unavailable: ${errStr.slice(0, 120)}`);

      // If credentials or permissions are invalid, trying another model won't help; throw immediately
      if (
        errStr.includes('API_KEY_INVALID') ||
        errStr.includes('401') ||
        errStr.includes('unauthorized') ||
        errStr.includes('API key not valid')
      ) {
        console.error('[Gemini API Authentication Error]:', err);
        throw new Error(`Gemini Authentication Error (401): ${err?.message || errStr}`);
      }
      if (errStr.includes('PERMISSION_DENIED') || errStr.includes('403')) {
        console.error('[Gemini API Permission Denied]:', err);
        throw new Error(`Gemini Permission Denied (403): ${err?.message || errStr}`);
      }
      if (errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('429')) {
        console.error('[Gemini API Quota Exceeded]:', err);
        throw new Error(`Gemini Rate Limit / Quota Exceeded (429): ${err?.message || errStr}`);
      }
    }
  }

  // If all candidate models failed, throw the actual error so connection issues can be diagnosed
  console.error('[Gemini API Call Failed]:', lastError);
  throw new Error(lastError?.message || 'Gemini API call failed across all candidate models.');
}

/**
 * Direct Client Chat Generation using real Gemini AI
 */
export async function generateChatReply(
  messages: Array<{ role: string; content: string }>,
  systemPrompt?: string
): Promise<{ reply: string; isFallback: boolean; errorStatus?: string; modelUsed?: string }> {
  const apiKey = getActiveApiKey();

  // If client API key is present: PERFORM REAL GEMINI AI GENERATION.
  // Do NOT fall back to local mock responses. Throw the actual error if it fails.
  if (apiKey) {
    try {
      const geminiContents = messages.map((m) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const result = await executeGeminiDirect({
        contents: geminiContents,
        systemInstruction: systemPrompt || DEFAULT_SYSTEM_INSTRUCTION,
      });

      return {
        reply: result.text,
        isFallback: false,
        modelUsed: result.modelUsed,
      };
    } catch (apiErr: any) {
      console.error('[Gemini Direct Chat Exception]:', apiErr);
      // Re-throw so the caller/UI displays the exact diagnosis error and never masks it with mock data
      throw apiErr;
    }
  }

  // If NO API key is found anywhere in the environment:
  // Check optional server proxy or return offline notice
  try {
    const res = await safeApiPost<{ reply?: string; mockMode?: boolean; error?: string }>(
      '/api/chat',
      { messages, systemPrompt }
    );
    if (res.ok && res.data?.reply && !res.data?.mockMode) {
      return {
        reply: res.data.reply,
        isFallback: false,
      };
    }
  } catch {
    // server unreachable
  }

  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  return {
    reply: getSmartOfflineReply(lastUserMsg),
    isFallback: true,
    errorStatus: 'Offline Mode: No API key detected. Please configure GEMINI_API_KEY or VITE_AI_API_KEY.',
  };
}

/**
 * Direct Client Code Generation using real Gemini AI
 */
export async function generateCodeWithGemini(
  prompt: string,
  language: string = 'React',
  framework: string = 'Tailwind CSS'
): Promise<any> {
  const apiKey = getActiveApiKey();

  if (apiKey) {
    try {
      const systemInstruction = `You are the specialized Code Generation Engine of Farhee Intelligent, crafted by PGV Creation.
Generate modern, production-grade, highly structured code based on the user's prompt.
Target language: ${language}.
Framework/Styling: ${framework}.

You MUST return a clean JSON object with this exact structure:
{
  "title": "Brief title of the component/script",
  "language": "${language}",
  "code": "The primary clean, fully implemented code string without markdown backticks wrapping the whole JSON",
  "previewHtml": "If this is HTML/JS/CSS or React-renderable web code, provide a self-contained single-page HTML snippet with CDN styles/scripts (like Tailwind or React CDN) that can run directly inside an iframe sandbox preview. Otherwise empty string.",
  "explanation": "Markdown description of how this code works and architectural choices.",
  "features": ["Key feature 1", "Key feature 2", "Key feature 3"],
  "dependencies": ["lucide-react", "clsx", "tailwind-merge"]
}`;

      const res = await executeGeminiDirect({
        contents: `Generate code for: ${prompt}`,
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2,
      });

      const parsed = JSON.parse(res.text);
      parsed.isFallback = false;
      parsed.modelUsed = res.modelUsed;
      return parsed;
    } catch (err) {
      console.error('[Gemini Direct CodeGen Exception]:', err);
      throw err;
    }
  }

  // Offline fallback only when NO key exists
  return {
    title: `${language} ${prompt.slice(0, 30)}`,
    language,
    code: `// ${language} Component: ${prompt}\n// Generated by Farhee Intelligent Engine (PGV Creation)\n\nimport React, { useState } from 'react';\n\nexport default function App() {\n  const [active, setActive] = useState(false);\n\n  return (\n    <div className="p-8 rounded-2xl bg-[#0E1317] border border-[#1E272D] text-white shadow-2xl">\n      <h2 className="text-xl font-bold text-[#10B981] mb-3">${prompt}</h2>\n      <p className="text-sm text-neutral-300 mb-4">Production-grade architecture optimized with ${framework}.</p>\n      <button \n        onClick={() => setActive(!active)}\n        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#CCFF00] text-black font-bold text-xs shadow-lg"\n      >\n        {active ? 'Active State' : 'Interact Now'}\n      </button>\n    </div>\n  );\n}`,
    previewHtml: `<div style="font-family:sans-serif;padding:32px;background:#0E1317;color:white;border-radius:16px;border:1px solid #1E272D;"><h2 style="color:#10B981;margin-bottom:8px;">${prompt}</h2><p style="color:#94a3b8;font-size:14px;">Rendered via Farhee Intelligent Engine</p><button style="background:linear-gradient(to right,#10B981,#CCFF00);color:#000;border:none;padding:8px 16px;border-radius:8px;font-weight:bold;cursor:pointer;margin-top:12px;">Interactive Sandbox</button></div>`,
    explanation: `Structured implementation of "${prompt}" using modern ${language} patterns and ${framework} utility styling.`,
    features: ['Component modularity', 'TypeScript typing', 'Fluid transitions', 'Accessible layout'],
    dependencies: ['lucide-react', 'clsx', 'tailwind-merge'],
    isFallback: true,
  };
}

/**
 * Direct Client Bug Diagnosis & Fixer using real Gemini AI
 */
export async function fixBugWithGemini(code: string, errorMessage: string, language: string = 'auto'): Promise<any> {
  const apiKey = getActiveApiKey();

  if (apiKey) {
    try {
      const systemInstruction = `You are Farhee Intelligent's expert AI Bug Reporter & Code Fixer by PGV Creation.
Analyze the provided code and/or raw terminal error logs.
You MUST output a valid JSON with:
1) "cause": Clear, precise root-cause analysis explaining why the error occurred.
2) "correctedCode": The complete, corrected version of the code with clean formatting.
3) "explanation": Detailed line-by-line explanation of changes made.
4) "preventionTips": Array of 3-5 actionable bullet points on how to prevent this bug in the future.
5) "severity": "High" | "Medium" | "Low"
6) "detectedLanguage": The detected programming language.`;

      const prompt = `BUG REPORT:\n${code ? `CODE:\n${code}\n` : ''}${errorMessage ? `ERROR:\n${errorMessage}\n` : ''}`;
      const res = await executeGeminiDirect({
        contents: prompt,
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1,
      });

      const parsed = JSON.parse(res.text);
      parsed.isFallback = false;
      parsed.modelUsed = res.modelUsed;
      return parsed;
    } catch (err) {
      console.error('[Gemini Direct BugFix Exception]:', err);
      throw err;
    }
  }

  // Offline fallback only when NO key exists
  return {
    cause: errorMessage ? `Diagnostic: ${errorMessage.slice(0, 100)}` : 'Potential syntax or runtime issue identified.',
    correctedCode: code ? code.replace(/==(?!=)/g, '===') : '// Corrected code snippet',
    explanation: 'Applied strict equality checks and defensive guards against null/undefined exceptions.',
    preventionTips: ['Use strict TypeScript checks', 'Write automated tests', 'Add null-safety guards'],
    severity: 'Medium',
    detectedLanguage: language,
    isFallback: true,
  };
}

/**
 * Direct Client Voice Mode Conversation using real Gemini AI
 */
export async function generateVoiceReplyDirect(
  messages: Array<{ role: string; content: string }>,
  userSpeech: string
): Promise<string> {
  const apiKey = getActiveApiKey();

  if (apiKey) {
    try {
      const systemInstruction = `You are Farhee Voice Agent, an ultra-responsive, intelligent, and natural conversational voice AI crafted by PGV Creation (Batticaloa, Sri Lanka).
Your replies will be SPOKEN ALOUD directly to the user in a live hands-free voice conversation.
Guidelines:
1. Keep replies concise, engaging, warm, and natural (1 to 3 spoken sentences per turn).
2. Avoid markdown formatting, asterisks, bullet points, or code blocks.
3. If asked about your creator or heritage, mention Farhee Intelligent by PGV Creation from Batticaloa, Sri Lanka.`;

      const geminiContents = messages.map((m) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      if (userSpeech) {
        geminiContents.push({ role: 'user', parts: [{ text: userSpeech }] });
      }

      const res = await executeGeminiDirect({
        contents: geminiContents,
        systemInstruction,
        temperature: 0.7,
      });

      return res.text;
    } catch (err) {
      console.error('[Gemini Direct Voice Exception]:', err);
      throw err;
    }
  }

  return userSpeech
    ? `I heard you say: "${userSpeech}". I am Farhee Intelligent by PGV Creation in Batticaloa. How can I assist you further?`
    : 'I am Farhee Voice Agent by PGV Creation. How can I help you today?';
}

/**
 * Direct Client Presentation Generator using real Gemini AI
 */
export async function generatePresentationWithGemini(
  topic: string,
  slideCount: number = 6,
  theme: string = 'emerald',
  tone: string = 'Professional'
): Promise<any> {
  const apiKey = getActiveApiKey();

  if (apiKey) {
    try {
      const systemInstruction = `You are Farhee Intelligent's PowerPoint & Deck Presentation Architect by PGV Creation (Batticaloa, Sri Lanka).
Generate a comprehensive, high-impact slide deck outline based on the requested topic.
Return ONLY a valid JSON object with:
{
  "title": "Presentation Title",
  "subtitle": "Informative Subtitle",
  "theme": "${theme}",
  "aspectRatio": "16:9",
  "author": "Farhee Intelligent (PGV Creation)",
  "slides": [
    {
      "slideNumber": 1,
      "layout": "title",
      "title": "Title",
      "subtitle": "Subtitle",
      "bulletPoints": [],
      "tag": "Introduction",
      "notes": "Speaker notes"
    },
    {
      "slideNumber": 2,
      "layout": "content",
      "title": "Slide 2 Heading",
      "subtitle": "Takeaway context",
      "bulletPoints": ["Point 1", "Point 2", "Point 3"],
      "metrics": [{ "label": "Metric", "value": "100%", "detail": "Detail" }],
      "tag": "Section",
      "notes": "Speaker notes"
    }
  ]
}`;

      const res = await executeGeminiDirect({
        contents: `Create presentation outline for: "${topic}". Slide count: ${slideCount}, Tone: ${tone}`,
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.3,
      });

      const parsed = JSON.parse(res.text);
      parsed.isFallback = false;
      parsed.modelUsed = res.modelUsed;
      return parsed;
    } catch (err) {
      console.error('[Gemini Direct Presentation Exception]:', err);
      throw err;
    }
  }

  // Offline fallback only when NO key exists
  return {
    title: topic,
    subtitle: 'Strategic Presentation & Technical Roadmap',
    theme,
    slides: [
      {
        slideNumber: 1,
        layout: 'title',
        title: topic,
        subtitle: 'Comprehensive Strategic Overview',
        bulletPoints: [],
        tag: 'Intro',
        notes: 'Opening remarks',
      },
      {
        slideNumber: 2,
        layout: 'content',
        title: 'Executive Vision & Core Objectives',
        subtitle: 'Key strategic pillars',
        bulletPoints: ['Modern digital transformation', 'Scalable offline-ready architecture', 'Rapid execution milestones'],
        metrics: [{ label: 'Efficiency', value: '+140%', detail: 'Gain' }],
        tag: 'Strategy',
        notes: 'Strategic context',
      },
    ],
    isFallback: true,
  };
}

/**
 * Direct Client Music Synthesizer Blueprint using real Gemini AI
 */
export async function generateMusicWithGemini(
  prompt: string,
  genre: string = 'Cyberpunk Beats',
  tempo: number = 120
): Promise<any> {
  const apiKey = getActiveApiKey();

  if (apiKey) {
    try {
      const systemInstruction = `You are Farhee Intelligent's Music & Audio Synthesizer AI created by PGV Creation (Batticaloa, Sri Lanka).
Generate a rich, structured composition blueprint based on the prompt.
Return JSON with:
{
  "title": "Track Title",
  "genre": "${genre}",
  "bpm": ${tempo || 120},
  "key": "C Minor",
  "mood": "Atmospheric",
  "structure": ["Intro", "Pulse", "Drop", "Outro"],
  "synthBlueprint": {
    "bassType": "sub-saw",
    "leadType": "neon-supersaw",
    "drumPattern": "cyber-electro",
    "chordProgression": ["Cm", "Ab", "Fm", "G7"],
    "melodyNotes": ["C4", "Eb4", "G4", "Bb4"],
    "bassNotes": ["C2", "Ab1", "F1", "G1"]
  },
  "aiLyrics": "Synthetic rhythms crafted by PGV Creation...",
  "audioCraftPrompt": "${genre}, ${prompt}, electronic synth"
}`;

      const res = await executeGeminiDirect({
        contents: `Generate music blueprint for: ${prompt}. Genre: ${genre}, BPM: ${tempo}`,
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.7,
      });

      const parsed = JSON.parse(res.text);
      parsed.isFallback = false;
      parsed.modelUsed = res.modelUsed;
      return parsed;
    } catch (err) {
      console.error('[Gemini Direct Music Exception]:', err);
      throw err;
    }
  }

  // Offline fallback only when NO key exists
  return {
    title: `Farhee ${genre} Suite`,
    genre,
    bpm: tempo || 120,
    key: 'C Minor',
    mood: 'Futuristic & Atmospheric',
    structure: ['Intro', 'Pulse', 'Drop', 'Outro'],
    synthBlueprint: {
      bassType: 'sub-saw',
      leadType: 'neon-supersaw',
      drumPattern: 'cyber-electro',
      chordProgression: ['Cm', 'Ab', 'Fm', 'G7'],
      melodyNotes: ['C4', 'Eb4', 'G4', 'Bb4'],
      bassNotes: ['C2', 'Ab1', 'F1', 'G1'],
    },
    aiLyrics: 'Farhee Intelligent soundwaves pulsing through Batticaloa night,\nCrafted by PGV Creation.',
    audioCraftPrompt: `${genre}, ${prompt}, electronic synthesizer`,
    isFallback: true,
  };
}

/**
 * Direct Client Image Prompt Enhancement & Generator
 */
export async function generateImageWithGemini(
  prompt: string,
  style: string = 'Cinematic',
  aspectRatio: string = '1:1',
  seed?: number
): Promise<any> {
  const currentSeed = seed || Math.floor(Math.random() * 1000000);
  let width = 1024;
  let height = 1024;
  if (aspectRatio === '16:9') {
    width = 1280;
    height = 720;
  } else if (aspectRatio === '9:16') {
    width = 720;
    height = 1280;
  }

  const styleKeywords: Record<string, string> = {
    Realistic: 'photorealistic, hyper-detailed 8k photography, natural lighting, sharp focus',
    Anime: 'modern anime aesthetic, vibrant studio ghibli style, cel shading, highly detailed line art',
    '3D Render': 'octane render 3D, unreal engine 5, ray-traced lighting, ultra clean geometry',
    Cyberpunk: 'cyberpunk futuristic theme, neon lime and emerald liquid glow, obsidian dark atmosphere',
    Cinematic: 'dramatic cinematic movie still, rich depth of field, 8k resolution, atmospheric mood',
    DigitalArt: 'digital concept art, intricate brushstrokes, atmospheric fantasy trending',
  };

  let enhancedPrompt = `${prompt}, ${styleKeywords[style] || styleKeywords.Cinematic}`;
  const apiKey = getActiveApiKey();

  if (apiKey) {
    try {
      const res = await executeGeminiDirect({
        contents: `Enhance this image prompt for a text-to-image generator in ${style} style: "${prompt}". Return ONLY the final enhanced prompt in plain text.`,
        temperature: 0.7,
      });
      if (res.text && res.text.trim()) {
        enhancedPrompt = res.text.trim();
      }
    } catch (err) {
      console.warn('[Direct Image Enhance Notice]:', err);
    }
  }

  const encoded = encodeURIComponent(`${enhancedPrompt}, high quality, clean composition`);
  const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${currentSeed}&model=flux&nologo=true`;

  return {
    imageUrl,
    originalPrompt: prompt,
    enhancedPrompt,
    style,
    aspectRatio,
    seed: currentSeed,
    width,
    height,
  };
}

function getSmartOfflineReply(userPrompt: string): string {
  const q = userPrompt.toLowerCase();

  if (q.includes('who are you') || q.includes('creator') || q.includes('pgv') || q.includes('batticaloa')) {
    return `### 🌟 About Farhee Intelligent\n\nI am **Farhee Intelligent**, an advanced multi-functional AI assistant crafted with precision by **PGV Creation** from **Batticaloa, Sri Lanka**.\n\n#### Core Capabilities:\n- 🎙️ **Voice-to-Text & Live Voice Conversation Mode**\n- 📊 **PowerPoint Presentation Architect** (PPTX, PDF, Excel & DOCX)\n- 💻 **AI Code Generation & Live Sandbox Preview**\n- 🐞 **Automated Bug Diagnosis & Code Repair**\n- 🎨 **High-Definition AI Image Generation**\n- 🎵 **Procedural Audio & Music Synthesizer**\n- ☁️ **Google Firebase Cloud Sync**`;
  }

  if (q.includes('code') || q.includes('react') || q.includes('javascript') || q.includes('typescript')) {
    return `### 💻 React Component Blueprint\n\n\`\`\`tsx\nimport React, { useState } from 'react';\n\nexport const SmartWidget: React.FC = () => {\n  const [count, setCount] = useState(0);\n  return (\n    <div className="p-6 rounded-2xl bg-[#0E1317] border border-[#1E272D] text-white">\n      <h3 className="text-lg font-bold text-[#10B981]">Farhee Component</h3>\n      <p className="text-sm text-neutral-400 mt-1">Interactive state counter: {count}</p>\n      <button \n        onClick={() => setCount(c => c + 1)}\n        className="mt-4 px-4 py-2 rounded-xl bg-[#10B981] text-black font-bold text-xs"\n      >\n        Increment Count\n      </button>\n    </div>\n  );\n};\n\`\`\``;
  }

  return `### 🤖 Farhee Intelligent\n\nI received your query: **"${userPrompt}"**.\n\n*Farhee Intelligent is currently operating in offline mode. To activate live Gemini AI generation on your deployment, configure \`GEMINI_API_KEY\` or \`VITE_AI_API_KEY\` in your Environment Variables settings.*`;
}
