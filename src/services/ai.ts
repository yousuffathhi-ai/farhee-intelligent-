/**
 * Farhee Intelligent Direct Client-side Gemini AI Service
 * Built with @google/generative-ai for direct browser-to-API inference.
 * Eliminates reliance on internal Express / Node server endpoints (/api/chat)
 * that cause HTTP 404 errors on static deployments (such as Vercel, Netlify, GitHub Pages).
 * 
 * NOTE: Client-side Gemini API key usage is enabled per deployment specification.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { safeApiPost } from '../utils/api';

// Retrieve API Key checking all standard Vite and process environment variables
export function getClientApiKey(): string {
  // 1. Check Vite standard client variables
  try {
    const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : null;
    if (metaEnv) {
      if (metaEnv.VITE_AI_API_KEY) return String(metaEnv.VITE_AI_API_KEY).trim();
      if (metaEnv.VITE_GEMINI_API_KEY) return String(metaEnv.VITE_GEMINI_API_KEY).trim();
    }
  } catch {
    // ignore
  }

  // 2. Check process.env (injected via vite define or node environment)
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.GEMINI_API_KEY) return String(process.env.GEMINI_API_KEY).trim();
      if (process.env.VITE_AI_API_KEY) return String(process.env.VITE_AI_API_KEY).trim();
      if (process.env.AI_API_KEY) return String(process.env.AI_API_KEY).trim();
    }
  } catch {
    // ignore
  }

  // 3. Check localStorage cache if user set a custom key in browser
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('farhee_gemini_api_key') || localStorage.getItem('farhee_api_key');
      if (stored) return stored.trim();
    }
  } catch {
    // ignore
  }

  return '';
}

export function hasClientApiKey(): boolean {
  const key = getClientApiKey();
  return Boolean(key && key.length > 5);
}

// Lazy client cache
let genAIInstance: GoogleGenerativeAI | null = null;
let currentKeyCached = '';

function getGenAI(): GoogleGenerativeAI {
  const key = getClientApiKey();
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
 * Direct Client Chat Generation using @google/generative-ai
 * Model: "gemini-1.5-flash" with graceful fallback
 */
export async function generateChatReply(
  messages: Array<{ role: string; content: string }>,
  systemPrompt?: string
): Promise<{ reply: string; isFallback: boolean; errorStatus?: string; modelUsed?: string }> {
  const apiKey = getClientApiKey();

  // If client API key is present, ALWAYS call Gemini directly to prevent HTTP 404 or mock fallback
  if (apiKey) {
    try {
      const genAI = getGenAI();
      const modelName = 'gemini-1.5-flash';
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt || DEFAULT_SYSTEM_INSTRUCTION,
      });

      // Format previous history for Gemini SDK
      // Gemini expects role: 'user' | 'model'
      const history = messages.slice(0, -1).map((m) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const lastMessage = messages[messages.length - 1]?.content || 'Hello';

      const chat = model.startChat({
        history,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
        },
      });

      const result = await chat.sendMessage(lastMessage);
      const text = result.response.text();

      if (text && text.trim().length > 0) {
        return {
          reply: text,
          isFallback: false,
          modelUsed: modelName,
        };
      }
    } catch (clientErr: any) {
      console.warn('[Farhee Direct Client AI Warning]:', clientErr);
      const errString = String(clientErr?.message || clientErr);

      // If error is a rate limit or quota error, try gemini-2.5-flash or gemini-1.5-pro directly
      if (errString.includes('404') || errString.includes('not found') || errString.includes('quota') || errString.includes('429')) {
        try {
          const genAI = getGenAI();
          const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const lastMsg = messages[messages.length - 1]?.content || 'Hello';
          const res = await fallbackModel.generateContent(lastMsg);
          const t = res.response.text();
          if (t) {
            return { reply: t, isFallback: false, modelUsed: 'gemini-2.5-flash' };
          }
        } catch {
          // continue to secondary handling
        }
      }

      // If client call threw an error despite key being present, provide informative error without 404
      return {
        reply: `### ⚠️ AI Processing Notice\n\nDirect Gemini inference encountered a temporary issue: **${clientErr?.message || 'Inference error'}**.\n\nPlease verify your API key permissions and quota, or try your query again.`,
        isFallback: true,
        errorStatus: clientErr?.message,
      };
    }
  }

  // If no client API key found in browser bundle, try proxy /api/chat if available
  try {
    const res = await safeApiPost<{ reply?: string; fallbackReply?: string; mockMode?: boolean; error?: string }>(
      '/api/chat',
      {
        messages,
        systemPrompt,
      }
    );

    if (res.ok && res.data?.reply && !res.data?.mockMode) {
      return {
        reply: res.data.reply,
        isFallback: false,
      };
    }

    if (res.data?.reply) {
      return {
        reply: res.data.reply,
        isFallback: res.isMockOrFallback || Boolean(res.data?.mockMode),
        errorStatus: res.error,
      };
    }
  } catch {
    // server unreachable
  }

  // Offline context-aware fallback when completely disconnected and no key provided
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const fallbackText = getSmartOfflineReply(lastUserMsg);

  return {
    reply: fallbackText,
    isFallback: true,
    errorStatus: 'Running in offline mode (Add VITE_AI_API_KEY in Vercel to activate live Gemini).',
  };
}

/**
 * Direct Client Code Generation using @google/generative-ai
 */
export async function generateCodeWithGemini(
  prompt: string,
  language: string = 'React',
  framework: string = 'Tailwind CSS'
): Promise<any> {
  const apiKey = getClientApiKey();

  if (apiKey) {
    try {
      const genAI = getGenAI();
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
        systemInstruction: `You are the specialized Code Generation Engine of Farhee Intelligent, crafted by PGV Creation.
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
}`,
      });

      const result = await model.generateContent(`Generate code for: ${prompt}`);
      const text = result.response.text();
      const parsed = JSON.parse(text);
      parsed.isFallback = false;
      return parsed;
    } catch (err) {
      console.warn('[Direct Client CodeGen Warning]:', err);
    }
  }

  // Fallback to /api/code/generate
  try {
    const res = await safeApiPost('/api/code/generate', { prompt, language, framework });
    if (res.data && res.data.code) {
      return res.data;
    }
  } catch {
    // ignore
  }

  // Safe client default code object
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
 * Direct Client Bug Diagnosis & Fixer using @google/generative-ai
 */
export async function fixBugWithGemini(code: string, errorMessage: string, language: string = 'auto'): Promise<any> {
  const apiKey = getClientApiKey();

  if (apiKey) {
    try {
      const genAI = getGenAI();
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
        systemInstruction: `You are Farhee Intelligent's expert AI Bug Reporter & Code Fixer by PGV Creation.
Analyze the provided code and/or raw terminal error logs.
You MUST output a valid JSON with:
1) "cause": Clear, precise root-cause analysis explaining why the error occurred.
2) "correctedCode": The complete, corrected version of the code with clean formatting.
3) "explanation": Detailed line-by-line explanation of changes made.
4) "preventionTips": Array of 3-5 actionable bullet points on how to prevent this bug in the future.
5) "severity": "High" | "Medium" | "Low"
6) "detectedLanguage": The detected programming language.`,
      });

      const prompt = `BUG REPORT:\n${code ? `CODE:\n${code}\n` : ''}${errorMessage ? `ERROR:\n${errorMessage}\n` : ''}`;
      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(result.response.text());
      parsed.isFallback = false;
      return parsed;
    } catch (err) {
      console.warn('[Direct Client BugFix Warning]:', err);
    }
  }

  // Fallback to /api/code/fix-bug
  try {
    const res = await safeApiPost('/api/code/fix-bug', { code, errorMessage, language });
    if (res.data && res.data.correctedCode) {
      return res.data;
    }
  } catch {
    // ignore
  }

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
 * Direct Client Voice Mode Conversation
 */
export async function generateVoiceReplyDirect(
  messages: Array<{ role: string; content: string }>,
  userSpeech: string
): Promise<string> {
  const apiKey = getClientApiKey();

  if (apiKey) {
    try {
      const genAI = getGenAI();
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: `You are Farhee Voice Agent, an ultra-responsive, intelligent, and natural conversational voice AI crafted by PGV Creation (Batticaloa, Sri Lanka).
Your replies will be SPOKEN ALOUD directly to the user in a live hands-free voice conversation.
Guidelines:
1. Keep replies concise, engaging, warm, and natural (1 to 3 spoken sentences per turn).
2. Avoid markdown formatting, asterisks, bullet points, or code blocks.
3. If asked about your creator or heritage, mention Farhee Intelligent by PGV Creation from Batticaloa, Sri Lanka.`,
      });

      const prompt = userSpeech || 'Hello Farhee';
      const res = await model.generateContent(prompt);
      const text = res.response.text();
      if (text && text.trim()) return text.trim();
    } catch (err) {
      console.warn('[Direct Voice AI Warning]:', err);
    }
  }

  // Fallback to server endpoint or standard voice string
  try {
    const res = await safeApiPost<{ reply?: string }>('/api/voice/chat', { messages, userSpeech });
    if (res.data?.reply) return res.data.reply;
  } catch {
    // ignore
  }

  return userSpeech
    ? `I heard you say: "${userSpeech}". I am Farhee Intelligent by PGV Creation in Batticaloa. How can I assist you further?`
    : 'I am Farhee Voice Agent by PGV Creation. How can I help you today?';
}

/**
 * Direct Client Presentation Generator using @google/generative-ai
 */
export async function generatePresentationWithGemini(
  topic: string,
  slideCount: number = 6,
  theme: string = 'emerald',
  tone: string = 'Professional'
): Promise<any> {
  const apiKey = getClientApiKey();

  if (apiKey) {
    try {
      const genAI = getGenAI();
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
        systemInstruction: `You are Farhee Intelligent's PowerPoint & Deck Presentation Architect by PGV Creation (Batticaloa, Sri Lanka).
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
}`,
      });

      const res = await model.generateContent(`Create presentation outline for: "${topic}". Slide count: ${slideCount}, Tone: ${tone}`);
      const parsed = JSON.parse(res.response.text());
      parsed.isFallback = false;
      return parsed;
    } catch (err) {
      console.warn('[Direct Client Presentation Warning]:', err);
    }
  }

  // Fallback to server endpoint
  try {
    const res = await safeApiPost('/api/presentation/generate', { topic, slideCount, theme, tone });
    if (res.data?.slides) return res.data;
  } catch {
    // ignore
  }

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
 * Direct Client Music Synthesizer Blueprint using @google/generative-ai
 */
export async function generateMusicWithGemini(
  prompt: string,
  genre: string = 'Cyberpunk Beats',
  tempo: number = 120
): Promise<any> {
  const apiKey = getClientApiKey();

  if (apiKey) {
    try {
      const genAI = getGenAI();
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
        systemInstruction: `You are Farhee Intelligent's Music & Audio Synthesizer AI created by PGV Creation (Batticaloa, Sri Lanka).
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
}`,
      });

      const res = await model.generateContent(`Generate music blueprint for: ${prompt}. Genre: ${genre}, BPM: ${tempo}`);
      const parsed = JSON.parse(res.response.text());
      parsed.isFallback = false;
      return parsed;
    } catch (err) {
      console.warn('[Direct Client Music Warning]:', err);
    }
  }

  // Fallback to server endpoint
  try {
    const res = await safeApiPost('/api/music/generate', { prompt, genre, tempo });
    if (res.data?.synthBlueprint) return res.data;
  } catch {
    // ignore
  }

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
  const apiKey = getClientApiKey();

  if (apiKey) {
    try {
      const genAI = getGenAI();
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const res = await model.generateContent(
        `Enhance this image prompt for a text-to-image generator in ${style} style: "${prompt}". Return ONLY the final enhanced prompt in plain text.`
      );
      const text = res.response.text();
      if (text && text.trim()) {
        enhancedPrompt = text.trim();
      }
    } catch {
      // ignore
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

  return `### 🤖 Farhee Intelligent\n\nI received your query: **"${userPrompt}"**.\n\n*Farhee Intelligent is currently operating in offline mode. To activate live Gemini 1.5 Flash responses on your Vercel deployment, configure \`VITE_AI_API_KEY\` in your Vercel Environment Variables settings.*`;
}
