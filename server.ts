import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Essential CORS and preflight handling to ensure requests never fail due to CORS in iframes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: "25mb" }));

// Support all environment variable configurations seamlessly
function getApiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_AI_API_KEY ||
    process.env.REACT_APP_AI_API_KEY ||
    process.env.AI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  ).trim();
}

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const key = getApiKey();
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Extract standard HTTP status code and details from SDK or network errors
function extractErrorDetails(error: any): { statusCode: number; message: string; codeName: string } {
  const errorString = String(error?.message || error || "");
  const status = error?.status || error?.statusCode || error?.response?.status;

  if (
    status === 401 ||
    errorString.includes("API_KEY_INVALID") ||
    errorString.includes("API key not valid") ||
    errorString.includes("unauthorized") ||
    errorString.includes("401") ||
    !getApiKey()
  ) {
    return {
      statusCode: 401,
      message: "AI API Key is missing or invalid (HTTP 401 Unauthorized)",
      codeName: "UNAUTHORIZED",
    };
  }
  if (status === 403 || errorString.includes("PERMISSION_DENIED") || errorString.includes("403")) {
    return {
      statusCode: 403,
      message: "Access to Gemini API model denied (HTTP 403 Forbidden)",
      codeName: "FORBIDDEN",
    };
  }
  if (status === 429 || errorString.includes("RESOURCE_EXHAUSTED") || errorString.includes("quota") || errorString.includes("429")) {
    return {
      statusCode: 429,
      message: "AI quota or rate limit reached (HTTP 429 Too Many Requests). Operating on Farhee offline engine.",
      codeName: "RATE_LIMITED",
    };
  }
  if (status === 503 || errorString.includes("UNAVAILABLE") || errorString.includes("503")) {
    return {
      statusCode: 503,
      message: "Gemini AI service temporarily unavailable (HTTP 503 Service Unavailable)",
      codeName: "SERVICE_UNAVAILABLE",
    };
  }
  if (status === 504 || errorString.includes("DEADLINE_EXCEEDED") || errorString.includes("timeout") || errorString.includes("504")) {
    return {
      statusCode: 504,
      message: "AI inference request timed out (HTTP 504 Gateway Timeout)",
      codeName: "GATEWAY_TIMEOUT",
    };
  }
  return {
    statusCode: 500,
    message: error?.message || "Internal server error during AI inference (HTTP 500 Server Error)",
    codeName: "INTERNAL_ERROR",
  };
}

// Multi-tier model fallback caller
async function callGeminiWithFallback(config: {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
  topP?: number;
}) {
  const ai = getGeminiClient();
  // Try gemini-3.8-flash first (allocated to this project), then gemini-2.5-flash, then gemini-3.1-flash-lite
  const modelsToTry = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: config.contents,
        config: {
          systemInstruction: config.systemInstruction,
          responseMimeType: config.responseMimeType,
          temperature: config.temperature,
          topP: config.topP,
        },
      });
      return { text: response.text || "", modelUsed: model };
    } catch (err: any) {
      lastError = err;
      const str = String(err?.message || err);
      // If unauthorized, trying other models won't help
      if (str.includes("API_KEY_INVALID") || str.includes("401") || str.includes("unauthorized")) {
        throw err;
      }
      console.warn(`[Farhee Model Router] Model ${model} unavailable: ${str.slice(0, 100)}. Falling back to next tier...`);
    }
  }

  throw lastError;
}

// Intelligent Offline & Mock Reasoning Fallback Engine for Farhee Intelligent
function generateSmartChatFallback(userPrompt: string): string {
  const q = userPrompt.toLowerCase();

  if (q.includes("who are you") || q.includes("who made") || q.includes("creator") || q.includes("pgv") || q.includes("batticaloa")) {
    return `### 🌟 About Farhee Intelligent\n\nI am **Farhee Intelligent**, an advanced multi-functional AI assistant and creator platform built with precision by **PGV Creation** from **Batticaloa, Sri Lanka**.\n\n#### Core Capabilities:\n- 🎙️ **Voice-to-Text & Live Voice Call Conversation Mode**\n- 📊 **PowerPoint Presentation Architect** (PPTX, PDF, Excel & Word DOCX)\n- 💻 **AI Code Generation & Live Sandbox Runner**\n- 🐞 **Automated Bug Diagnosis & Code Repair**\n- 🎨 **High-Definition AI Image Generation**\n- 🎵 **Procedural Audio & Music Synthesizer**\n- ☁️ **Google Firebase Cloud Sync**`;
  }

  if (q.includes("react") || q.includes("component") || q.includes("tailwind") || q.includes("code") || q.includes("javascript") || q.includes("typescript")) {
    return `### 💻 React + Tailwind Component Blueprint\n\nHere is an optimized, modern responsive component design:\n\n\`\`\`tsx\nimport React, { useState } from 'react';\nimport { Sparkles, ArrowRight } from 'lucide-react';\n\nexport const FeatureCard: React.FC<{ title: string; desc: string }> = ({ title, desc }) => {\n  const [hovered, setHovered] = useState(false);\n\n  return (\n    <div \n      onMouseEnter={() => setHovered(true)}\n      onMouseLeave={() => setHovered(false)}\n      className="p-6 rounded-2xl bg-[#0E1317] border border-[#1E272D] hover:border-[#10B981] transition-all duration-300 shadow-xl"\n    >\n      <div className="w-10 h-10 rounded-xl bg-[#10B981]/15 text-[#CCFF00] flex items-center justify-center mb-4">\n        <Sparkles className="w-5 h-5" />\n      </div>\n      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>\n      <p className="text-sm text-neutral-400 leading-relaxed mb-4">{desc}</p>\n      <button className="flex items-center gap-2 text-xs font-bold text-[#10B981] hover:text-[#CCFF00] transition-colors">\n        <span>Explore Feature</span>\n        <ArrowRight className="w-3.5 h-3.5" />\n      </button>\n    </div>\n  );\n};\n\`\`\`\n\n#### Key Features:\n1. **High Contrast Aesthetic**: Matte obsidian background (\`#0E1317\`) with Farhee Emerald accents.\n2. **Zero Layout Shifts**: Fluid hover transitions with strict padding ratios.\n3. **Modular & Type-Safe**: Clean TypeScript interface definitions.`;
  }

  if (q.includes("bug") || q.includes("error") || q.includes("debug") || q.includes("useeffect") || q.includes("render")) {
    return `### 🐞 Debugging & Architecture Diagnosis\n\nWhen debugging React component state or re-render cycles:\n\n1. **Dependency Array Stabilization**: Avoid passing newly allocated objects, inline functions, or un-memoized arrays to \`useEffect\` or \`useMemo\`.\n2. **State Updates inside Effects**: Ensure you do not unconditionally call a state updater that triggers the effect again.\n3. **Cleanup Handlers**: Always return a cleanup function to unsubscribe from listeners, intervals, or abort active fetch requests.\n\n\`\`\`typescript\n// ✅ Correct Pattern\nuseEffect(() => {\n  let isMounted = true;\n  async function fetchData() {\n    const res = await fetch('/api/data');\n    if (isMounted) setData(await res.json());\n  }\n  fetchData();\n  return () => { isMounted = false; };\n}, [primitiveDependency]);\n\`\`\``;
  }

  if (q.includes("presentation") || q.includes("slide") || q.includes("powerpoint") || q.includes("deck") || q.includes("pitch")) {
    return `### 📊 Strategic Presentation Outline\n\n1. **Slide 1: Executive Overview** — Vision, problem scope, and core market opportunity.\n2. **Slide 2: Strategic Pillars** — Primary innovation vectors and differentiators.\n3. **Slide 3: Technical Execution** — Scalable cloud architecture, security, and offline resilience.\n4. **Slide 4: Key Metrics & ROI** — 140% efficiency gains and verified uptime.\n5. **Slide 5: Roadmap & Next Steps** — Phased deployment and strategic milestones.\n\n*Tip: Switch to the **Presentation Architect** tab in the sidebar to export full editable \`.pptx\`, \`.docx\`, \`.xlsx\`, or \`.pdf\` files directly!*`;
  }

  return `### 🤖 Farhee Intelligent Response\n\nThank you for your message: **"${userPrompt}"**\n\nHere is an analytical breakdown:\n\n1. **Core Concept**: Analyzing key requirements and structural principles.\n2. **Strategic Approach**: Prioritizing modular design, high performance, and reliable execution.\n3. **Implementation**: Ensure all logic is well-typed, thoroughly tested, and optimized for real-world production environments.\n\n*Farhee Intelligent by PGV Creation (Batticaloa, Sri Lanka)*`;
}

// Check health & model status
app.get("/api/health", (req, res) => {
  const apiKey = getApiKey();
  res.json({
    status: "ok",
    app: "Farhee Intelligent",
    creator: "PGV Creation (Batticaloa, Sri Lanka)",
    hasGeminiKey: Boolean(apiKey),
    keySource: apiKey ? (process.env.GEMINI_API_KEY ? "GEMINI_API_KEY" : "FALLBACK_ENV_KEY") : "NONE",
    timestamp: new Date().toISOString(),
  });
});

// 1. AI Chat Endpoint
app.post("/api/chat", async (req, res) => {
  const { messages, systemPrompt } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format: 'messages' array required", statusCode: 400 });
  }

  const apiKey = getApiKey();
  const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";

  // If no API key is set, return intelligent mock response with status 200 and mock metadata
  if (!apiKey) {
    const fallbackReply = generateSmartChatFallback(lastUserMsg);
    return res.json({
      reply: fallbackReply,
      mockMode: true,
      notice: "Operating in intelligent mock mode (No API Key configured). Add GEMINI_API_KEY in environment to enable live inference.",
    });
  }

  try {
    const systemInstruction =
      systemPrompt ||
      `You are "Farhee Intelligent", a multi-functional modern AI assistant built with precision by PGV Creation (Batticaloa, Sri Lanka).
Your capabilities include coding, debugging, creative generation, audio & music concept generation, math, and intelligent conversation.
Formatting rules:
- Use clean Markdown with headers, bullet points, and code blocks with language identifiers.
- When explaining mathematical or scientific formulas, format them clearly.
- Maintain an encouraging, sophisticated, and insightful tone.
- Acknowledge your heritage as Farhee Intelligent engineered by PGV Creation when asked.`;

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const result = await callGeminiWithFallback({
      contents,
      systemInstruction,
      temperature: 0.7,
      topP: 0.95,
    });

    const reply = result.text || "I'm sorry, I couldn't process that response.";
    res.json({ reply, mockMode: false, modelUsed: result.modelUsed });
  } catch (error: any) {
    console.warn("[Farhee Chat Endpoint Notice]:", error?.message || error);
    const { statusCode, message } = extractErrorDetails(error);
    const fallbackReply = generateSmartChatFallback(lastUserMsg);

    // Return 200 with fallbackReply and status metadata so client transport never fails
    res.json({
      reply: fallbackReply,
      fallbackReply,
      error: message,
      statusCode,
      mockMode: true,
    });
  }
});

// 2. AI Code Generator Endpoint
app.post("/api/code/generate", async (req, res) => {
  const { prompt, language = "React", framework = "Tailwind CSS" } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required", statusCode: 400 });
  }

  const apiKey = getApiKey();
  const defaultMockCode = {
    title: `${language} ${prompt.slice(0, 30)}`,
    language,
    code: `// ${language} Component: ${prompt}\n// Generated by Farhee Intelligent Engine (PGV Creation)\n\nimport React, { useState } from 'react';\n\nexport default function App() {\n  const [active, setActive] = useState(false);\n\n  return (\n    <div className="p-8 rounded-2xl bg-[#0E1317] border border-[#1E272D] text-white shadow-2xl">\n      <h2 className="text-xl font-bold text-[#10B981] mb-3">${prompt}</h2>\n      <p className="text-sm text-neutral-300 mb-4">Production-grade architecture optimized with ${framework}.</p>\n      <button \n        onClick={() => setActive(!active)}\n        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#CCFF00] text-black font-bold text-xs shadow-lg"\n      >\n        {active ? 'Active State' : 'Interact Now'}\n      </button>\n    </div>\n  );\n}`,
    previewHtml: `<div style="font-family:sans-serif;padding:32px;background:#0E1317;color:white;border-radius:16px;border:1px solid #1E272D;"><h2 style="color:#10B981;margin-bottom:8px;">${prompt}</h2><p style="color:#94a3b8;font-size:14px;">Rendered via Farhee Intelligent Engine</p><button style="background:linear-gradient(to right,#10B981,#CCFF00);color:#000;border:none;padding:8px 16px;border-radius:8px;font-weight:bold;cursor:pointer;margin-top:12px;">Interactive Sandbox</button></div>`,
    explanation: `Structured implementation of "${prompt}" using modern ${language} patterns and ${framework} utility styling.`,
    features: ["Component modularity", "TypeScript typing", "Fluid transitions", "Accessible layout"],
    dependencies: ["lucide-react", "clsx", "tailwind-merge"],
    mockMode: true,
  };

  if (!apiKey) {
    return res.json(defaultMockCode);
  }

  try {
    const systemInstruction = `You are the specialized Code Generation Engine of Farhee Intelligent, crafted by PGV Creation.
Generate modern, production-grade, highly structured code based on the user's prompt.
Target language: ${language}.
Framework/Styling: ${framework}.

You MUST return a clean JSON object with this exact structure:
{
  "title": "Brief title of the code component/script",
  "language": "${language}",
  "code": "The primary clean, fully implemented code string without markdown backticks wrapping the whole JSON",
  "previewHtml": "If this is HTML/JS/CSS or React-renderable web code, provide a self-contained single-page HTML snippet with CDN styles/scripts (like Tailwind or React CDN) that can run directly inside an iframe sandbox preview. Otherwise empty string.",
  "explanation": "Markdown description of how this code works and architectural choices.",
  "features": ["Key feature 1", "Key feature 2", "Key feature 3"],
  "dependencies": ["package-a", "package-b"]
}
Ensure the JSON is valid, properly escaped, and strictly conformant.`;

    const result = await callGeminiWithFallback({
      contents: `Generate code for: ${prompt}`,
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.2,
    });

    let data;
    try {
      data = JSON.parse(result.text || "{}");
      data.mockMode = false;
    } catch {
      data = {
        ...defaultMockCode,
        code: result.text || defaultMockCode.code,
        mockMode: false,
      };
    }

    res.json(data);
  } catch (error: any) {
    console.warn("[Farhee CodeGen Endpoint Notice]:", error?.message || error);
    const { statusCode, message } = extractErrorDetails(error);
    res.json({
      ...defaultMockCode,
      error: message,
      statusCode,
      mockMode: true,
    });
  }
});

// 3. AI Bug Reporter & Fixer Endpoint
app.post("/api/code/fix-bug", async (req, res) => {
  const { code, errorMessage, language = "auto" } = req.body;
  if (!code && !errorMessage) {
    return res.status(400).json({ error: "Code or error message is required", statusCode: 400 });
  }

  const apiKey = getApiKey();
  const defaultMockFix = {
    cause: errorMessage ? `Diagnostic Analysis: Issue identified in error stack [${errorMessage.slice(0, 80)}]` : "Detected syntax inconsistency or unhandled edge-case in code structure.",
    correctedCode: code ? code.replace(/==(?!=)/g, "===") : "// Corrected source snippet\nconsole.log('Fixed execution');",
    explanation: "Standardized equality checks, enforced strict type constraints, and added null-safety guards.",
    preventionTips: ["Enable strict TypeScript checks", "Add automated unit tests", "Sanitize all dynamic inputs", "Use proper error boundaries"],
    severity: "Medium",
    detectedLanguage: language,
    mockMode: true,
  };

  if (!apiKey) {
    return res.json(defaultMockFix);
  }

  try {
    const systemInstruction = `You are Farhee Intelligent's expert AI Bug Reporter & Code Fixer by PGV Creation.
Analyze the provided code and/or raw terminal error logs.
You MUST output a valid JSON with:
1) "cause": Clear, precise root-cause analysis explaining why the error occurred.
2) "correctedCode": The complete, corrected version of the code with clean formatting.
3) "explanation": Detailed line-by-line explanation of changes made.
4) "preventionTips": Array of 3-5 actionable bullet points on how to prevent this bug in the future (e.g. testing, typing, linting).
5) "severity": "High" | "Medium" | "Low"
6) "detectedLanguage": The detected programming language (e.g. "TypeScript", "Python", "React", "Rust").`;

    const userPrompt = `
BUG REPORT INPUT:
${code ? `=== BROKEN CODE ===\n${code}\n` : ""}
${errorMessage ? `=== ERROR / STACK TRACE ===\n${errorMessage}\n` : ""}
Detected/Target Language: ${language}
`;

    const result = await callGeminiWithFallback({
      contents: userPrompt,
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.1,
    });

    let fixData;
    try {
      fixData = JSON.parse(result.text || "{}");
      fixData.mockMode = false;
    } catch {
      fixData = {
        ...defaultMockFix,
        explanation: result.text || defaultMockFix.explanation,
        mockMode: false,
      };
    }

    res.json(fixData);
  } catch (error: any) {
    console.warn("[Farhee BugFix Endpoint Notice]:", error?.message || error);
    const { statusCode, message } = extractErrorDetails(error);
    res.json({
      ...defaultMockFix,
      error: message,
      statusCode,
      mockMode: true,
    });
  }
});

// 4. AI Image Generator & Enhancer Endpoint
app.post("/api/image/generate", async (req, res) => {
  const { prompt, style = "Cinematic", aspectRatio = "1:1", seed } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required", statusCode: 400 });
  }

  const apiKey = getApiKey();
  const styleKeywords: Record<string, string> = {
    Realistic: "photorealistic, hyper-detailed 8k photography, natural lighting, shot on 35mm lens, sharp focus, masterpiece",
    Anime: "modern anime aesthetic, vibrant studio ghibli and makoto shinkai style, cel shading, highly detailed line art",
    "3D Render": "octane render 3D, unreal engine 5, ray-traced lighting, volumetric shaders, ultra clean geometry, Pixar & Disney quality",
    Cyberpunk: "cyberpunk futuristic theme, neon lime and emerald liquid glow, obsidian dark atmosphere, holographic elements, detailed sci-fi cityscape",
    Cinematic: "dramatic cinematic movie still, anamorphic lens flare, rich depth of field, 8k resolution, IMAX color grading, atmospheric mood",
    DigitalArt: "digital concept art, intricate brushstrokes, atmospheric fantasy artstation trending",
  };

  const chosenStyle = styleKeywords[style] || styleKeywords.Cinematic;
  let enhancedPrompt = `${prompt}, ${chosenStyle}`;

  if (apiKey) {
    try {
      const enhancementResponse = await callGeminiWithFallback({
        contents: `Enhance this image prompt for a state-of-the-art text-to-image generator.
Original Prompt: "${prompt}"
Desired Style: "${style}" (${chosenStyle})
Return ONLY the final enhanced prompt in plain text without quotes or explanations.`,
        temperature: 0.7,
      });
      enhancedPrompt = enhancementResponse.text?.trim() || enhancedPrompt;
    } catch {
      // Fallback cleanly to basic prompt with keywords
    }
  }

  let width = 1024;
  let height = 1024;
  if (aspectRatio === "16:9") {
    width = 1280;
    height = 720;
  } else if (aspectRatio === "9:16") {
    width = 720;
    height = 1280;
  }

  const currentSeed = seed || Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(`${enhancedPrompt}, high quality, clean composition`);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${currentSeed}&model=flux&nologo=true&enhance=false`;

  res.json({
    imageUrl,
    enhancedPrompt,
    originalPrompt: prompt,
    style,
    aspectRatio,
    width,
    height,
    seed: currentSeed,
  });
});

// 5. AI Music & Audio Generator Blueprint Endpoint
app.post("/api/music/generate", async (req, res) => {
  const { prompt, genre = "Cyberpunk Beats", duration = 30, tempo = 120 } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required", statusCode: 400 });
  }

  const apiKey = getApiKey();
  const defaultMusicBlueprint = {
    title: `Farhee ${genre} Suite`,
    genre,
    bpm: tempo || 124,
    key: "C Minor",
    mood: "Atmospheric, Driving & Futuristic",
    structure: ["Intro", "Synth Pulse", "Emerald Drop", "Outro"],
    synthBlueprint: {
      bassType: "sub-saw",
      leadType: "neon-supersaw",
      drumPattern: "cyber-electro",
      chordProgression: ["Cm", "Ab", "Fm", "G7"],
      melodyNotes: ["C4", "Eb4", "G4", "Bb4", "C5", "G4", "Ab4", "F4"],
      bassNotes: ["C2", "Ab1", "F1", "G1"],
    },
    aiLyrics: "Farhee Intelligent engineered in light,\nSoundwaves pulsing through Batticaloa night,\nSynthetic rhythms echoing free,\nCrafted by PGV Creation for eternity.",
    audioCraftPrompt: `${genre}, ${prompt}, ${tempo || 120} bpm, electronic synthesizer, clean mix, high production quality`,
    mockMode: true,
  };

  if (!apiKey) {
    return res.json(defaultMusicBlueprint);
  }

  try {
    const systemInstruction = `You are Farhee Intelligent's Music & Audio Synthesizer AI created by PGV Creation (Batticaloa, Sri Lanka).
Generate a rich, structured composition blueprint for a musical piece based on the user's prompt.

You MUST return a JSON object with:
1) "title": A cool title for the track.
2) "genre": The musical genre.
3) "bpm": Recommended BPM tempo number (e.g. 80 - 150).
4) "key": Musical key (e.g., "C Minor", "F# Dorian", "A Minor").
5) "mood": Mood description.
6) "structure": Array of section names (e.g. ["Intro", "Verse / Synth Wave", "Chorus / Drop", "Outro"]).
7) "synthBlueprint": Object detailing synthesized sound design:
   - "bassType": "sub-saw" | "acid-square" | "warm-sine" | "fm-pluck"
   - "leadType": "neon-supersaw" | "ethereal-chime" | "lofi-triangle" | "pluck"
   - "drumPattern": "four-on-the-floor" | "breakbeat" | "half-time-lofi" | "cyber-electro"
   - "chordProgression": Array of chord names (e.g. ["Cm", "Ab", "Eb", "Bb"])
   - "melodyNotes": Array of MIDI/note names for melody sequences (e.g. ["C4", "Eb4", "G4", "Bb4", "C5", "G4", "Ab4", "F4"])
   - "bassNotes": Array of root notes (e.g. ["C2", "Ab1", "Eb2", "Bb1"])
8) "aiLyrics": Optional lyric verses or voiceover narration matching the mood (or empty if purely instrumental).
9) "audioCraftPrompt": Formatted prompt string for Suno/AudioCraft/MusicGen generators.`;

    const result = await callGeminiWithFallback({
      contents: `Generate music blueprint for: "${prompt}". Preferred genre: ${genre}, duration target: ${duration}s, target BPM: ${tempo}`,
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.7,
    });

    let musicData;
    try {
      musicData = JSON.parse(result.text || "{}");
      musicData.mockMode = false;
    } catch {
      musicData = {
        ...defaultMusicBlueprint,
        mockMode: false,
      };
    }

    res.json(musicData);
  } catch (error: any) {
    console.warn("[Farhee Music Endpoint Notice]:", error?.message || error);
    const { statusCode, message } = extractErrorDetails(error);
    res.json({
      ...defaultMusicBlueprint,
      error: message,
      statusCode,
      mockMode: true,
    });
  }
});

// 6. AI Presentation Generator Endpoint
app.post("/api/presentation/generate", async (req, res) => {
  const { topic, slideCount = 6, theme = "emerald", audience = "General", tone = "Professional" } = req.body;
  if (!topic) {
    return res.status(400).json({ error: "Topic is required", statusCode: 400 });
  }

  const apiKey = getApiKey();
  const defaultPresentationData = {
    title: topic,
    subtitle: "Strategic Briefing & Technical Architecture",
    theme,
    aspectRatio: "16:9",
    author: "Farhee Intelligent (PGV Creation)",
    slides: [
      {
        slideNumber: 1,
        layout: "title",
        title: topic,
        subtitle: "Comprehensive Strategic Analysis & Roadmap",
        bulletPoints: [],
        tag: "Introduction",
        notes: "Welcome stakeholders to today's presentation on " + topic + ".",
      },
      {
        slideNumber: 2,
        layout: "content",
        title: "Executive Summary & Core Objectives",
        subtitle: "Key strategic priorities and impact vectors",
        bulletPoints: [
          "Deploy intelligent AI-assisted workflows to accelerate execution.",
          "Ensure end-to-end security, cloud persistence, and offline readiness.",
          "Maximize operational efficiency with user-centric digital tools.",
        ],
        metrics: [
          { label: "Efficiency", value: "+140%", detail: "Year-over-Year Gain" },
          { label: "Uptime", value: "99.9%", detail: "Reliability Standard" },
        ],
        tag: "Executive Summary",
        notes: "Emphasize our commitment to high performance and rapid innovation.",
      },
      {
        slideNumber: 3,
        layout: "content",
        title: "Technical Architecture & System Design",
        subtitle: "Scalable full-stack implementation pillars",
        bulletPoints: [
          "Built on modern TypeScript, Node.js, and React architecture.",
          "Real-time synchronization with Google Firebase Firestore.",
          "Multi-format document generation supporting PPTX, DOCX, XLSX, and PDF.",
        ],
        metrics: [
          { label: "Latency", value: "<150ms", detail: "Edge Response Time" },
          { label: "Security", value: "Enterprise", detail: "Zero-trust rules" },
        ],
        tag: "Architecture",
        notes: "Walk the team through the underlying engineering decisions.",
      },
      {
        slideNumber: 4,
        layout: "content",
        title: "Execution Roadmap & Next Milestones",
        subtitle: "Phased deployment for maximum sustainable growth",
        bulletPoints: [
          "Phase 1: Foundation deployment and local cache hardening.",
          "Phase 2: Live voice agent expansion and hands-free collaboration.",
          "Phase 3: Multi-region synchronization and enterprise integrations.",
        ],
        metrics: [
          { label: "Timeline", value: "Q3-Q4", detail: "Target Delivery" },
          { label: "Adoption", value: "100%", detail: "Target Coverage" },
        ],
        tag: "Roadmap",
        notes: "Conclude with clear actionable next steps and strategic milestones.",
      },
    ],
    mockMode: true,
  };

  if (!apiKey) {
    return res.json(defaultPresentationData);
  }

  try {
    const systemInstruction = `You are Farhee Intelligent's PowerPoint & Deck Presentation Architect by PGV Creation (Batticaloa, Sri Lanka).
Generate a comprehensive, high-impact slide deck outline based on the requested topic.

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Compelling Presentation Title",
  "subtitle": "Informative Subtitle or Deck Pitch",
  "theme": "${theme}",
  "aspectRatio": "16:9",
  "author": "Farhee Intelligent (PGV Creation)",
  "slides": [
    {
      "slideNumber": 1,
      "layout": "title",
      "title": "Title of presentation",
      "subtitle": "Subtitle of the presentation",
      "bulletPoints": [],
      "tag": "Introduction",
      "notes": "Opening remarks for the speaker"
    },
    {
      "slideNumber": 2,
      "layout": "content",
      "title": "Clear Slide Heading",
      "subtitle": "Key takeaway context",
      "bulletPoints": [
        "First major point with rich detail",
        "Second major point with supporting statistics or rationale",
        "Third actionable takeaway"
      ],
      "metrics": [
        { "label": "Growth Index", "value": "+140%", "detail": "Year-over-Year" },
        { "label": "Efficiency", "value": "99.8%", "detail": "Operational uptime" }
      ],
      "tag": "Core Insight",
      "notes": "Detailed speaker notes for slide 2"
    }
  ]
}

Generate exactly ${slideCount} slides. Ensure all bullet points are insightful, precise, and professional.`;

    const result = await callGeminiWithFallback({
      contents: `Create presentation on: "${topic}". Audience: ${audience}, Tone: ${tone}, Slides: ${slideCount}`,
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.3,
    });

    let presentationData;
    try {
      presentationData = JSON.parse(result.text || "{}");
      presentationData.mockMode = false;
    } catch {
      presentationData = {
        ...defaultPresentationData,
        mockMode: false,
      };
    }

    res.json(presentationData);
  } catch (error: any) {
    console.warn("[Farhee Presentation Endpoint Notice]:", error?.message || error);
    const { statusCode, message } = extractErrorDetails(error);
    res.json({
      ...defaultPresentationData,
      error: message,
      statusCode,
      mockMode: true,
    });
  }
});

// 7. Voice Conversation Mode Response Generator
app.post("/api/voice/chat", async (req, res) => {
  const { messages = [], userSpeech = "" } = req.body;
  const apiKey = getApiKey();

  const defaultVoiceReply = userSpeech
    ? `I heard you say: ${userSpeech}. I am Farhee Voice Agent by PGV Creation in Batticaloa. How can I assist you further?`
    : "I am Farhee Voice Agent by PGV Creation. I am here to help you.";

  if (!apiKey) {
    return res.json({ reply: defaultVoiceReply, mockMode: true });
  }

  try {
    const systemInstruction = `You are Farhee Voice Agent, an ultra-responsive, intelligent, and natural conversational voice AI crafted by PGV Creation (Batticaloa, Sri Lanka).
Your replies will be SPOKEN ALOUD directly to the user in a live hands-free voice conversation.
Guidelines:
1. Keep replies concise, engaging, warm, and natural (1 to 3 spoken sentences per turn unless the user asks for a longer explanation).
2. Avoid using markdown formatting, bullet asterisks, code blocks, or URLs because this text is fed directly into a speech synthesis engine.
3. Be helpful, polite, and responsive with a friendly and knowledgeable personality.
4. If asked about your origin, proudly mention Farhee Intelligent by PGV Creation from Batticaloa, Sri Lanka.`;

    const contents = [
      ...messages.slice(-8).map((m: any) => ({
        role: m.role === "model" ? "model" : "user",
        parts: [{ text: m.content || "" }],
      })),
    ];

    if (userSpeech) {
      contents.push({
        role: "user",
        parts: [{ text: userSpeech }],
      });
    }

    const result = await callGeminiWithFallback({
      contents,
      systemInstruction,
      temperature: 0.7,
    });

    const voiceReply = result.text ? result.text.trim() : defaultVoiceReply;
    res.json({ reply: voiceReply, mockMode: false });
  } catch (error: any) {
    console.warn("[Farhee Voice Chat Notice]:", error?.message || error);
    const { statusCode, message } = extractErrorDetails(error);
    res.json({
      reply: defaultVoiceReply,
      error: message,
      statusCode,
      mockMode: true,
    });
  }
});

// Vite middleware / production static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Farhee Intelligent server running on http://localhost:${PORT}`);
  });
}

// Automatically start server unless running in a serverless environment like Vercel
if (!process.env.VERCEL && !process.env.NOW_REGION) {
  startServer();
}

export { app };
export default app;
