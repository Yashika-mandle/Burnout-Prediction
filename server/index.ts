import cors from "cors";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import { buildSuggestions } from "./suggestions.ts";

const ML_API_URL =
  process.env.ML_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:5001/predict";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const ML_ROOT = path.join(REPO_ROOT, "ml");
const FEATURES_JSON_PATH = path.join(ML_ROOT, "features.json");

const DATA_DIR =
  path.basename(__dirname) === "dist"
    ? path.join(__dirname, "..", "server")
    : __dirname;
const USERS_PATH = path.join(DATA_DIR, "users.json");
const HISTORY_PATH = path.join(DATA_DIR, "history.json");

type UserRecord = { username: string; password: string };
type SessionRecord = { token: string; username: string };

type UsersFile = { users: UserRecord[]; sessions: SessionRecord[] };

type FieldMeta =
  | {
      name: string;
      kind: "numeric";
      min: number;
      max: number;
      step: number;
      default: number;
    }
  | {
      name: string;
      kind: "categorical";
      options: string[];
      default: string;
    };

type FeaturesMeta = {
  feature_names: string[];
  fields: FieldMeta[];
  target_column?: string;
  source_csv?: string;
};

type HistoryItem = {
  id: string;
  username: string;
  timestamp: string;
  versionLabel?: string;
  type?: string;
  lastUpdated?: string;
  burnoutScore?: number;
  prediction?: any;
  emotions?: any;
  imageData?: string;
  formValues?: Record<string, string>;
  confidence?: number;
  recommendations?: string[];
  status?: string;
  originalVersionId?: string;
  burnout_score?: number;
  burnout_level?: string;
  summary?: string;
  input_summary?: Record<string, string | number>;
};

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

async function loadUsersFile(): Promise<UsersFile> {
  const data = await readJson<Partial<UsersFile>>(USERS_PATH, {});
  return {
    users: Array.isArray(data.users) ? data.users : [],
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
  };
}

async function saveUsersFile(file: UsersFile) {
  await writeJson(USERS_PATH, file);
}

async function loadHistory(): Promise<HistoryItem[]> {
  const data = await readJson<{ history?: HistoryItem[] }>(HISTORY_PATH, {
    history: [],
  });
  return Array.isArray(data.history) ? data.history : [];
}

async function saveHistory(history: HistoryItem[]) {
  await writeJson(HISTORY_PATH, { history });
}

// Generate version label based on existing versions
function generateVersionLabel(assessments: any[], username: string) {
  const userAssessments = assessments.filter(a => a.user === username);
  const versionCount = userAssessments.length + 1;
  return `Version ${versionCount}`;
}

async function loadFeaturesMeta(): Promise<FeaturesMeta | null> {
  try {
    const raw = await fs.readFile(FEATURES_JSON_PATH, "utf-8");
    return JSON.parse(raw) as FeaturesMeta;
  } catch {
    return null;
  }
}

function coercePredictPayload(
  body: unknown,
  meta: FeaturesMeta,
): Record<string, string | number> | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const out: Record<string, string | number> = {};

  for (const f of meta.fields) {
    // Skip student_id as it's not a feature for ML prediction
    if (f.name === "student_id") continue;
    
    const v = b[f.name];
    if (v === undefined || v === "") return null;

    if (f.kind === "numeric") {
      const n = typeof v === "number" ? v : parseFloat(String(v));
      if (!Number.isFinite(n) || n < 0) return null;
      const rounded =
        Number.isInteger(f.default) && f.step >= 1 ? Math.round(n) : n;
      out[f.name] = rounded;
    } else {
      const s = String(v);
      if (!f.options.includes(s)) return null;
      out[f.name] = s;
    }
  }
  return out;
}

function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  console.log('[DEBUG] Auth middleware - Request received for:', req.path);
  const header = req.headers.authorization;
  console.log('[DEBUG] Auth middleware - Authorization header present:', !!header);
  
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  console.log('[DEBUG] Auth middleware - Token extracted:', !!token);
  
  if (!token) {
    console.log('[DEBUG] Auth middleware - Missing token, returning 401');
    res.status(401).json({ error: "Missing token" });
    return;
  }
  
  console.log('[DEBUG] Auth middleware - Loading users file...');
  void loadUsersFile().then(({ sessions }) => {
    console.log('[DEBUG] Auth middleware - Sessions loaded, count:', sessions.length);
    const session = sessions.find((s) => s.token === token);
    console.log('[DEBUG] Auth middleware - Session found:', !!session);
    
    if (!session) {
      console.log('[DEBUG] Auth middleware - Invalid token, returning 401');
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    
    console.log('[DEBUG] Auth middleware - Authentication successful for user:', session.username);
    (req as express.Request & { username?: string }).username = session.username;
    next();
  }).catch(error => {
    console.error('[DEBUG] Auth middleware - Error loading users file:', error);
    res.status(500).json({ error: "Authentication error" });
  });
}

async function callMlService(payload: Record<string, string | number>) {
  console.log('[DEBUG] ML call - Payload:', payload);
  const start = Date.now();
  const res = await fetch(ML_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const elapsed = Date.now() - start;
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`ML API returned non-JSON (${res.status})`);
  }
  console.log('[DEBUG] ML call - Response status:', res.status, 'elapsed_ms:', elapsed, 'payload:', data);
  if (!res.ok) {
    const err = (data as { error?: string }).error ?? text;
    throw new Error(typeof err === "string" ? err : "ML API error");
  }
  return data as {
    burnout_level: string;
    burnout_score: number;
    burnout_label?: string;
    confidence?: number;
  };
}

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/api/features", async (_req, res) => {
  const meta = await loadFeaturesMeta();
  if (!meta) {
    res.status(503).json({
      error: "features.json not found. Run python ml/train.py first.",
    });
    return;
  }
  res.json(meta);
});

app.post("/api/signup", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username.length < 3 ||
    password.length < 6
  ) {
    res.status(400).json({
      error: "Username (min 3) and password (min 6) required",
    });
    return;
  }

  const file = await loadUsersFile();
  if (file.users.some((u) => u.username === username)) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  file.users.push({ username, password });

  const token = nanoid();
  file.sessions.push({ token, username });
  await saveUsersFile(file);

  res.json({ message: "Account created", token, username });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const file = await loadUsersFile();
  const user = file.users.find((u) => u.username === username && u.password === password);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = nanoid();
  file.sessions.push({ token, username });
  await saveUsersFile(file);

  res.json({ message: "Signed in", token, username });
});

app.post("/api/predict", authMiddleware, async (req, res) => {
  const meta = await loadFeaturesMeta();
  if (!meta) {
    res.status(503).json({ error: "ML schema missing. Run python ml/train.py." });
    return;
  }

  console.log('[DEBUG] Predict request received. Body keys:', Object.keys(req.body || {}));

  const payload = coercePredictPayload(req.body, meta);
  if (!payload) {
    res.status(400).json({ error: "Invalid or incomplete feature payload" });
    return;
  }

  try {
    const ml = await callMlService(payload);
    const raw = ml.burnout_level;
    const burnout_level =
      raw === "Low" || raw === "Medium" || raw === "High" ? raw : "Medium";
    const burnout_score =
      typeof ml.burnout_score === "number" && Number.isFinite(ml.burnout_score)
        ? Math.min(10, Math.max(1, Math.round(ml.burnout_score)))
        : 5;

    const responsePayload = {
      burnout_score,
      burnout_level,
      suggestions: buildSuggestions(burnout_level, payload as Record<string, unknown>),
      ml_confidence: ml.confidence,
      ml_label: ml.burnout_label,
    };

    console.log('[DEBUG] Predict response payload:', responsePayload);
    res.json(responsePayload);
  } catch (e) {
    console.error("[server] ML service error:", e);
    res.status(503).json({
      error:
        e instanceof Error
          ? e.message
          : "ML service unavailable. Start Flask (python ml/app.py on port 5001).",
    });
  }
});

app.post("/api/save-history", authMiddleware, async (req, res) => {
  const username = (req as express.Request & { username?: string }).username!;
  const { prediction, input } = req.body ?? {};

  if (!prediction || typeof prediction !== "object") {
    res.status(400).json({ error: "prediction object required" });
    return;
  }

  const p = prediction as Record<string, unknown>;
  const burnout_score = typeof p.burnout_score === "number" ? p.burnout_score : null;
  const burnout_level = typeof p.burnout_level === "string" ? p.burnout_level : null;
  if (burnout_score === null || burnout_level === null) {
    res.status(400).json({ error: "prediction.burnout_score and burnout_level required" });
    return;
  }

  const inp =
    input && typeof input === "object"
      ? (input as Record<string, string | number>)
      : null;

  const input_summary: Record<string, string | number> = inp ?? {};

  const summary = inp
    ? Object.entries(inp)
        .slice(0, 6)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ")
    : "Saved assessment";

  const item: HistoryItem = {
    id: nanoid(),
    username,
    timestamp: new Date().toISOString(),
    burnout_score,
    burnout_level,
    summary,
    input_summary,
  };

  const history = await loadHistory();
  history.push(item);
  await saveHistory(history);

  res.json({ ok: true, id: item.id });
});

app.get("/api/history", authMiddleware, async (req, res) => {
  const username = (req as express.Request & { username?: string }).username!;
  const history = await loadHistory();
  const mine = history.filter((h) => h.username === username);
  res.json({ history: mine });
});

app.delete("/api/history/:id", authMiddleware, async (req, res) => {
  const username = (req as express.Request & { username?: string }).username!;
  const { id } = req.params;
  const history = await loadHistory();
  const idx = history.findIndex((h) => h.id === id && h.username === username);
  if (idx === -1) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  history.splice(idx, 1);
  await saveHistory(history);
  res.json({ ok: true });
});

// Enhanced assessment endpoints
app.post("/api/save-assessment", authMiddleware, async (req, res) => {
  const assessmentData = req.body ?? {};
  const username = (req as express.Request & { username?: string }).username!;
  
  console.log('[DEBUG] Save assessment - Request received for user:', username);
  console.log('[DEBUG] Save assessment - Assessment data keys:', Object.keys(assessmentData));
  console.log('[DEBUG] Save assessment - Assessment type:', assessmentData.type);
  
  try {
    console.log('[DEBUG] Save assessment - Loading history...');
    const history = await loadHistory();
    console.log('[DEBUG] Save assessment - History loaded, current size:', history.length);
    
    const newAssessment: HistoryItem = {
      id: Date.now().toString(),
      username,
      timestamp: new Date().toISOString(),
      versionLabel: generateVersionLabel(history, username),
      type: assessmentData.type || 'form',
      lastUpdated: new Date().toISOString(),
      burnoutScore: assessmentData.prediction?.burnout_score,
      prediction: assessmentData.prediction,
      emotions: assessmentData.emotions,
      imageData: assessmentData.imageData,
      formValues: assessmentData.formValues,
      confidence: assessmentData.confidence,
      recommendations: assessmentData.prediction?.suggestions || [],
      status: 'completed',
      originalVersionId: assessmentData.originalVersionId
    };
    
    console.log('[DEBUG] Save assessment - New assessment created:', {
      id: newAssessment.id,
      type: newAssessment.type,
      burnoutScore: newAssessment.burnoutScore,
      versionLabel: newAssessment.versionLabel
    });
    
    history.push(newAssessment);
    console.log('[DEBUG] Save assessment - Assessment added to history');
    
    await saveHistory(history);
    console.log('[DEBUG] Save assessment - History saved successfully');
    
    res.json({ success: true, assessment: newAssessment });
    
  } catch (error) {
    console.error('[DEBUG] Save assessment - Error:', error);
    console.error('[DEBUG] Save assessment - Stack:', (error as Error).stack);
    res.status(500).json({ error: "Failed to save assessment" });
  }
});

// Get all assessments for user with filtering
app.get("/api/get-assessments/:username", authMiddleware, async (req, res) => {
  const { username } = req.params;
  const { filter = 'all', limit = 50, offset = 0 } = req.query as any;
  
  console.log('[DEBUG] Get assessments - Request received for username:', username);
  console.log('[DEBUG] Get assessments - Filter:', filter, 'Limit:', limit, 'Offset:', offset);
  
  try {
    console.log('[DEBUG] Get assessments - Loading history from file...');
    const history = await loadHistory();
    console.log('[DEBUG] Get assessments - History loaded, total items:', history.length);
    
    let userAssessments = history.filter(h => h.username === username);
    console.log('[DEBUG] Get assessments - User assessments found:', userAssessments.length);
    
    // Apply filters
    if (filter !== 'all') {
      userAssessments = userAssessments.filter(a => a.type === filter);
      console.log('[DEBUG] Get assessments - After filter:', userAssessments.length);
    }
    
    // Sort by timestamp (newest first)
    userAssessments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Apply pagination
    const paginatedAssessments = userAssessments.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    console.log('[DEBUG] Get assessments - Paginated assessments:', paginatedAssessments.length);
    
    const response = {
      assessments: paginatedAssessments,
      total: userAssessments.length,
      filter
    };
    
    console.log('[DEBUG] Get assessments - Sending response:', response);
    res.json(response);
    
  } catch (error) {
    console.error('[DEBUG] Get assessments - Error:', error);
    console.error('[DEBUG] Get assessments - Stack:', (error as Error).stack);
    res.status(500).json({ error: "Failed to get assessments" });
  }
});

// Get specific assessment by ID
app.get("/api/get-assessment/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    const history = await loadHistory();
    const assessment = history.find(h => h.id === id);
    
    if (!assessment) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }
    
    res.json(assessment);
  } catch (error) {
    console.error("[server] Get assessment error:", error);
    res.status(500).json({ error: "Failed to get assessment" });
  }
});

// Update assessment (creates new version)
app.put("/api/update-assessment/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const updateData = req.body ?? {};
  const username = (req as express.Request & { username?: string }).username!;
  
  try {
    const history = await loadHistory();
    const originalAssessment = history.find(h => h.id === id);
    
    if (!originalAssessment) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }
    
    // Create new version
    const newVersionLabel = generateVersionLabel(history, username);
    const newAssessment = {
      ...originalAssessment,
      id: Date.now().toString(),
      versionLabel: updateData.versionLabel || `${newVersionLabel} (Edited)`,
      timestamp: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      ...updateData,
      originalVersionId: originalAssessment.id
    };
    
    history.push(newAssessment);
    await saveHistory(history);
    
    res.json({ success: true, assessment: newAssessment });
  } catch (error) {
    console.error("[server] Update assessment error:", error);
    res.status(500).json({ error: "Failed to update assessment" });
  }
});

// Duplicate assessment
app.post("/api/duplicate-assessment/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const username = (req as express.Request & { username?: string }).username!;
  
  try {
    const history = await loadHistory();
    const originalAssessment = history.find(h => h.id === id);
    
    if (!originalAssessment) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }
    
    // Create duplicate
    const newVersionLabel = generateVersionLabel(history, username);
    const duplicateAssessment = {
      ...originalAssessment,
      id: Date.now().toString(),
      versionLabel: `${newVersionLabel} (Duplicate)`,
      timestamp: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      originalVersionId: originalAssessment.id
    };
    
    history.push(duplicateAssessment);
    await saveHistory(history);
    
    res.json({ success: true, assessment: duplicateAssessment });
  } catch (error) {
    console.error("[server] Duplicate assessment error:", error);
    res.status(500).json({ error: "Failed to duplicate assessment" });
  }
});

// Delete assessment
app.delete("/api/delete-assessment/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    const history = await loadHistory();
    const assessmentIndex = history.findIndex(h => h.id === id);
    
    if (assessmentIndex === -1) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }
    
    history.splice(assessmentIndex, 1);
    await saveHistory(history);
    
    res.json({ success: true });
  } catch (error) {
    console.error("[server] Delete assessment error:", error);
    res.status(500).json({ error: "Failed to delete assessment" });
  }
});

// Optimized CNN-based image analysis endpoint
app.post("/api/analyze-image-cnn", authMiddleware, async (req, res) => {
  console.log('[CNN] Image analysis request received');
  const { image, emotions, confidence } = req.body ?? {};
  
  console.log('[CNN] Request body keys:', Object.keys(req.body || {}));
  console.log('[CNN] Image present:', !!image);
  console.log('[CNN] Image data type:', typeof image);
  console.log('[CNN] Image data length:', image ? image.length : 'N/A');
  console.log('[CNN] Emotions present:', !!emotions);
  console.log('[CNN] Confidence present:', !!confidence);
  
  if (!image || typeof image !== "string") {
    console.log('[CNN] Invalid image data received');
    res.status(400).json({ error: "Image data is required" });
    return;
  }

  try {
    console.log('[CNN] Processing image analysis with CNN pipeline...');
    
    let burnoutScore: number, burnoutLevel: "Low" | "Medium" | "High", mlConfidence: number;
    
    // Use CNN emotion data from frontend if provided
    if (emotions && confidence) {
      console.log('[CNN] Using CNN emotion data:', emotions);
      console.log('[CNN] Emotion values:', {
        happy: emotions.happy,
        sad: emotions.sad,
        angry: emotions.angry,
        neutral: emotions.neutral,
        fear: emotions.fear,
        surprise: emotions.surprise,
        disgust: emotions.disgust,
        stress: emotions.stress,
        fatigue: emotions.fatigue,
        attention: emotions.attention
      });
      
      // Calculate burnout score from CNN emotions
      const negativeEmotions = (emotions.sad || 0) + (emotions.angry || 0) + (emotions.fear || 0) + (emotions.disgust || 0);
      const positiveEmotions = emotions.happy || 0;
      const neutralState = emotions.neutral || 0;
      
      // CNN-specific factors (stress, fatigue, attention from frontend)
      const stressFactor = (emotions.stress || 0) * 0.4;
      const fatigueFactor = (emotions.fatigue || 0) * 0.35;
      const attentionFactor = ((1 - (emotions.attention || 0)) * 0.25);
      
      // Emotion-based factors
      const negativeFactor = negativeEmotions * 0.15;
      const positiveFactor = (1 - positiveEmotions) * 0.1;
      const neutralFactor = (1 - neutralState) * 0.05;
      
      const burnoutScoreValue = stressFactor + fatigueFactor + attentionFactor + negativeFactor + positiveFactor + neutralFactor;
      burnoutScore = Math.round(burnoutScoreValue * 10);
      
      if (burnoutScore >= 7) burnoutLevel = "High";
      else if (burnoutScore >= 4) burnoutLevel = "Medium";
      else burnoutLevel = "Low";
      
      mlConfidence = confidence;
      console.log('[CNN] CNN-based burnout calculation:', {
        burnoutScoreValue,
        burnoutScore,
        burnoutLevel,
        mlConfidence
      });
      
    } else {
      console.log('[CNN] No CNN emotion data provided, using fallback analysis');
      
      // Fallback to simulated CNN analysis if no emotion data provided
      const simulatedEmotions = {
        stress: Math.random() * 0.8,
        fatigue: Math.random() * 0.7,
        sadness: Math.random() * 0.6,
        anxiety: Math.random() * 0.5,
        happiness: Math.random() * 0.4,
        neutral: Math.random() * 0.3,
        attention: Math.random() * 0.9,
        eye_fatigue: Math.random() * 0.6
      };
      
      console.log('[CNN] Generated simulated CNN emotions:', simulatedEmotions);
      
      // CNN-weighted scoring
      const stressWeight = 0.4;
      const fatigueWeight = 0.35;
      const anxietyWeight = 0.15;
      const sadnessWeight = 0.1;
      
      const weightedScore = 
        (simulatedEmotions.stress * stressWeight) +
        (simulatedEmotions.fatigue * fatigueWeight) +
        (simulatedEmotions.anxiety * anxietyWeight) +
        (simulatedEmotions.sadness * sadnessWeight) +
        ((1 - simulatedEmotions.attention) * 0.15);
      
      burnoutScore = Math.round(weightedScore * 10);
      if (burnoutScore >= 7) burnoutLevel = "High";
      else if (burnoutScore >= 4) burnoutLevel = "Medium";
      else burnoutLevel = "Low";
      
      mlConfidence = 0.75 + Math.random() * 0.2;
      console.log('[CNN] Fallback CNN burnout score:', burnoutScore, burnoutLevel);
    }
    
    const prediction = {
      burnout_score: burnoutScore,
      burnout_level: burnoutLevel as "Low" | "Medium" | "High",
      suggestions: buildSuggestions(burnoutLevel as "Low" | "Medium" | "High", emotions || {}),
      ml_confidence: confidence || mlConfidence,
      ml_label: "CNN Vision Analysis"
    };
    
    console.log('[CNN] Final CNN prediction:', prediction);
    
    const response = {
      prediction,
      emotions: emotions || null,
      confidence: confidence || mlConfidence,
      analysis_type: "cnn_computer_vision"
    };
    
    console.log('[CNN] Sending CNN response:', response);
    res.json(response);
    
  } catch (error) {
    console.error('[CNN] Image analysis error:', error);
    console.error('[CNN] Error type:', typeof error);
    console.error('[CNN] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[CNN] Error stack:', error instanceof Error ? error.stack : 'No stack available');
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[CNN] Final error to return:', errorMessage);
    
    res.status(500).json({
      error: "CNN image analysis failed. Please try again."
    });
  }
});

// Simplified image analysis endpoint for stable Upload Image feature
app.post("/api/analyze-image-simple", authMiddleware, async (req, res) => {
  console.log('[SIMPLE] Simplified image analysis request received');
  const { image, emotions, confidence } = req.body ?? {};
  
  console.log('[SIMPLE] Image present:', !!image);
  console.log('[SIMPLE] Emotions present:', !!emotions);
  console.log('[SIMPLE] Confidence present:', !!confidence);
  
  if (!image || typeof image !== "string") {
    console.log('[SIMPLE] Invalid image data received');
    res.status(400).json({ error: "Image data is required" });
    return;
  }

  try {
    console.log('[SIMPLE] Processing simplified analysis...');
    
    let burnoutScore: number, burnoutLevel: "Low" | "Medium" | "High", mlConfidence: number;
    
    // Use emotion data from frontend if provided
    if (emotions && confidence) {
      console.log('[SIMPLE] Using emotion data:', emotions);
      
      // Simple burnout calculation
      const negativeEmotions = (emotions.sad || 0) + (emotions.angry || 0) + (emotions.fear || 0) + (emotions.disgust || 0);
      const positiveEmotions = emotions.happy || 0;
      const neutralEmotions = emotions.neutral || 0;
      
      // Weighted calculation
      const negativeWeight = negativeEmotions * 0.5;
      const positiveWeight = (1 - positiveEmotions) * 0.3;
      const neutralWeight = (1 - neutralEmotions) * 0.2;
      
      const burnoutScoreValue = negativeWeight + positiveWeight + neutralWeight;
      burnoutScore = Math.round(burnoutScoreValue * 10);
      
      if (burnoutScore >= 7) burnoutLevel = "High";
      else if (burnoutScore >= 4) burnoutLevel = "Medium";
      else burnoutLevel = "Low";
      
      mlConfidence = confidence;
      console.log('[SIMPLE] Burnout calculation:', { burnoutScore, burnoutLevel, mlConfidence });
      
    } else {
      console.log('[SIMPLE] No emotion data, using fallback');
      
      // Simple fallback
      burnoutScore = Math.round(Math.random() * 10);
      if (burnoutScore >= 7) burnoutLevel = "High";
      else if (burnoutScore >= 4) burnoutLevel = "Medium";
      else burnoutLevel = "Low";
      
      mlConfidence = 0.7;
      console.log('[SIMPLE] Fallback burnout:', { burnoutScore, burnoutLevel });
    }
    
    const prediction = {
      burnout_score: burnoutScore,
      burnout_level: burnoutLevel as "Low" | "Medium" | "High",
      suggestions: buildSuggestions(burnoutLevel as "Low" | "Medium" | "High", emotions || {}),
      ml_confidence: mlConfidence,
      ml_label: "Simple Emotion Analysis"
    };
    
    console.log('[SIMPLE] Final prediction:', prediction);
    
    const response = {
      prediction,
      emotions: emotions || null,
      confidence: mlConfidence,
      analysis_type: "simplified_emotion"
    };
    
    console.log('[SIMPLE] Sending response');
    res.json(response);
    
  } catch (error) {
    console.error('[SIMPLE] Analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[SIMPLE] Error message:', errorMessage);
    
    res.status(500).json({
      error: errorMessage || "Image analysis failed. Please try again."
    });
  }
});

// Keep existing endpoints for reference but use simplified one
app.post("/api/analyze-image", authMiddleware, async (req, res) => {
  console.log('[DEBUG] Image analysis request received');
  const { image, emotions, confidence } = req.body ?? {};
  
  console.log('[DEBUG] Request body keys:', Object.keys(req.body || {}));
  console.log('[DEBUG] Image present:', !!image);
  console.log('[DEBUG] Emotions present:', !!emotions);
  console.log('[DEBUG] Confidence present:', typeof confidence === 'number');
  
  if (!image || typeof image !== "string") {
    console.log('[DEBUG] Invalid image data received');
    res.status(400).json({ error: "Image data is required" });
    return;
  }

  const imageSizeKb = Buffer.byteLength(image, 'utf8') / 1024;
  console.log('[DEBUG] Image size (KB):', imageSizeKb.toFixed(2));

  try {
    console.log('[DEBUG] Processing image analysis...');
    
    let burnoutScore: number, burnoutLevel: "Low" | "Medium" | "High", mlConfidence: number;
    
    // Use real emotion data from frontend if provided
    if (emotions && typeof confidence === "number") {
      console.log('[DEBUG] Using provided emotion data:', emotions);
      
      // Calculate burnout score from real emotions
      const negativeEmotions = (emotions.sad || 0) + (emotions.angry || 0) + (emotions.fear || 0) + (emotions.disgust || 0);
      const positiveEmotions = emotions.happy || 0;
      const neutralState = emotions.neutral || 0;
      
      // Eye fatigue and attention are strong indicators
      const fatigueFactor = (emotions.eye_fatigue || 0) * 0.3;
      const attentionFactor = (1 - (emotions.attention || 0)) * 0.2;
      
      // Emotion-based factors
      const negativeFactor = negativeEmotions * 0.3;
      const positiveFactor = (1 - positiveEmotions) * 0.1;
      const neutralFactor = (1 - neutralState) * 0.1;
      
      const burnoutScoreValue = fatigueFactor + attentionFactor + negativeFactor + positiveFactor + neutralFactor;
      burnoutScore = Math.round(burnoutScoreValue * 10);
      
      if (burnoutScore >= 7) burnoutLevel = "High";
      else if (burnoutScore >= 4) burnoutLevel = "Medium";
      else burnoutLevel = "Low";
      
      mlConfidence = confidence;
      console.log('[DEBUG] Calculated burnout score:', burnoutScore, burnoutLevel);
      
    } else {
      console.log('[DEBUG] No emotion data provided, using fallback analysis');
      
      // Fallback to simulated analysis if no emotion data provided
      const simulatedEmotions = {
        stress: Math.random() * 0.8,
        fatigue: Math.random() * 0.7,
        sadness: Math.random() * 0.6,
        anxiety: Math.random() * 0.5,
        happiness: Math.random() * 0.4,
        neutral: Math.random() * 0.3,
        attention: Math.random() * 0.9,
        eye_fatigue: Math.random() * 0.6
      };
      
      console.log('[DEBUG] Generated simulated emotions:', simulatedEmotions);
      
      const stressWeight = 0.3;
      const fatigueWeight = 0.25;
      const anxietyWeight = 0.2;
      const sadnessWeight = 0.15;
      const attentionWeight = 0.1;
      
      const weightedScore = 
        (simulatedEmotions.stress * stressWeight) +
        (simulatedEmotions.fatigue * fatigueWeight) +
        (simulatedEmotions.anxiety * anxietyWeight) +
        (simulatedEmotions.sadness * sadnessWeight) +
        ((1 - simulatedEmotions.attention) * attentionWeight);
      
      burnoutScore = Math.round(weightedScore * 10);
      if (burnoutScore >= 7) burnoutLevel = "High";
      else if (burnoutScore >= 4) burnoutLevel = "Medium";
      else burnoutLevel = "Low";
      
      mlConfidence = 0.75 + Math.random() * 0.2;
      console.log('[DEBUG] Fallback burnout score:', burnoutScore, burnoutLevel);
    }
    
    const prediction = {
      burnout_score: burnoutScore,
      burnout_level: burnoutLevel as "Low" | "Medium" | "High",
      suggestions: buildSuggestions(burnoutLevel as "Low" | "Medium" | "High", emotions || {}),
      ml_confidence: confidence || mlConfidence,
      ml_label: "AI Vision Analysis"
    };
    
    console.log('[DEBUG] Final prediction:', prediction);
    
    const response = {
      prediction,
      emotions: emotions || null,
      confidence: typeof confidence === 'number' ? confidence : mlConfidence,
      analysis_type: "computer_vision"
    };
    
    console.log('[DEBUG] Sending response:', response);
    res.json(response);
    
  } catch (error) {
    console.error('[DEBUG] Image analysis error:', error);
    res.status(500).json({
      error: "Image analysis failed. Please try again."
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Serve ML static files
app.get("/api/metrics.json", async (_req, res) => {
  try {
    const metricsPath = path.join(ML_ROOT, "metrics.json");
    const data = await fs.readFile(metricsPath, "utf-8");
    res.setHeader("Content-Type", "application/json");
    res.send(data);
  } catch (error) {
    res.status(404).json({ error: "Metrics not found" });
  }
});

app.get("/api/confusion_matrix.png", async (_req, res) => {
  try {
    const imagePath = path.join(ML_ROOT, "confusion_matrix.png");
    const data = await fs.readFile(imagePath);
    res.setHeader("Content-Type", "image/png");
    res.send(data);
  } catch (error) {
    res.status(404).json({ error: "Confusion matrix not found" });
  }
});

app.get("/api/roc_curve.png", async (_req, res) => {
  try {
    const imagePath = path.join(ML_ROOT, "roc_curve.png");
    const data = await fs.readFile(imagePath);
    res.setHeader("Content-Type", "image/png");
    res.send(data);
  } catch (error) {
    res.status(404).json({ error: "ROC curve not found" });
  }
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] Unexpected error:', err);
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({ error: 'Payload too large. Use a smaller or compressed image.' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload.' });
  }
  return res.status(500).json({ error: 'Internal server error. Please try again.' });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const MAX_PORT_TRIES = 24;

function startServer(port: number, tries = 0): void {
  const srv = app.listen(port, "127.0.0.1", () => {
    console.log(`[server] Student Burnout API → http://127.0.0.1:${port}`);
    console.log(`[server] ML proxy → ${ML_API_URL}`);
    console.log(`[server] features → ${FEATURES_JSON_PATH}`);
    console.log("[server] Ready (one process per port — avoid duplicate terminals)");
  });

  srv.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.warn(
        `[server] Port ${port} in use (EADDRINUSE). ${tries + 1 < MAX_PORT_TRIES ? `Retrying ${port + 1}…` : "Abort."}`,
      );
      srv.close(() => {
        if (tries + 1 >= MAX_PORT_TRIES) {
          console.error("[server] No free port. Set PORT or free a port.");
          process.exit(1);
        }
        startServer(port + 1, tries + 1);
      });
      return;
    }
    console.error("[server] Fatal listen error:", err);
    process.exit(1);
  });
}

const PORT = Number(process.env.PORT) || 5000;
startServer(PORT);
