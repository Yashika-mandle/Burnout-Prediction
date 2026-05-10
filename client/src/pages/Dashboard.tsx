import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle, TrendingUp, ClipboardList, Camera, Upload, FileText, Webcam, Eye, Brain, Activity, Edit, Save, RefreshCw, Plus, Clock } from "lucide-react";
import { API_URL } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { detectFacesReal, calculateRealBurnoutScore, RealEmotionTracker, type RealEmotionData, type ValidationResult } from "@/lib/real-computer-vision";

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
};

function humanize(name: string) {
  return name.replace(/_/g, " ");
}

type AssessmentMode = "upload" | "camera" | "form";

interface SavedAssessment {
  id: string;
  timestamp: string;
  versionLabel?: string;
  type?: string;
  lastUpdated?: string;
  formValues?: Record<string, string>;
  prediction?: any;
  emotions?: any;
  imageData?: string;
  confidence?: number;
  recommendations?: string[];
  status?: string;
  originalVersionId?: string;
  burnoutScore?: number;
}

export default function Dashboard() {
  console.log('[DASHBOARD] Dashboard component function called');
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [featuresMeta, setFeaturesMeta] = useState<FeaturesMeta | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>("upload");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelLoadingError, setModelLoadingError] = useState<string | null>(null);
  const [emotionData, setEmotionData] = useState<RealEmotionData | null>(null);
  const [fps, setFps] = useState(0);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [analysisStage, setAnalysisStage] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [savedAssessment, setSavedAssessment] = useState<SavedAssessment | null>(null);
  const [assessmentHistory, setAssessmentHistory] = useState<SavedAssessment[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<string>('all');
  const [selectedAssessment, setSelectedAssessment] = useState<SavedAssessment | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number | undefined>(null);
  const emotionTrackerRef = useRef(new RealEmotionTracker());
  const fpsCounterRef = useRef({
    lastTime: performance.now(),
    frames: 0,
    fps: 0,
    tick(): number {
      this.frames++;
      const currentTime = performance.now();
      if (currentTime - this.lastTime >= 1000) {
        this.fps = this.frames;
        this.frames = 0;
        this.lastTime = currentTime;
      }
      return this.fps;
    },
    reset() {
      this.frames = 0;
      this.lastTime = performance.now();
      this.fps = 0;
    }
  });

  useEffect(() => {
    // TEMPORARILY DISABLED FOR TESTING MODEL LOADING
    // const user = localStorage.getItem("user");
    // if (!user) {
    //   setLocation("/auth");
    // }
  }, [setLocation]);

  useEffect(() => {
    console.log('[DASHBOARD] Dashboard component mounted, starting model loading...');
    // Load AI models when component mounts
    const loadModelsAsync = async () => {
      console.log('[DASHBOARD] Starting AI model loading...');
      try {
        // Load real computer vision models
        const { loadModels } = await import('@/lib/real-computer-vision');
        await loadModels();
        console.log('[DASHBOARD] Real computer vision models loaded');

        // Load simplified image analysis models
        const { loadModelsOnce, getModelLoadingStatus } = await import('@/lib/simplified-image-analysis');
        console.log('[DASHBOARD] About to call loadModelsOnce...');
        await loadModelsOnce();

        const status = getModelLoadingStatus();
        console.log('[DASHBOARD] Model loading status after loadModelsOnce:', status);

        if (status === 'loaded') {
          setModelsLoaded(true);
          setModelLoadingError(null);
          console.log('[DASHBOARD] ✅ Simplified image analysis models loaded successfully');
        } else {
          console.error('[DASHBOARD] ❌ Model loading failed - status:', status);
          throw new Error('Models failed to load');
        }

      } catch (error) {
        console.error('[DASHBOARD] ❌ Failed to load AI models:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown model loading error';
        setModelLoadingError(errorMessage);
        setModelsLoaded(false);
      }
    };
    loadModelsAsync();
  }, []);

  const loadSchema = useCallback(async () => {
    setSchemaLoading(true);
    setSchemaError(null);
    try {
      const res = await fetch(`${API_URL}/features`);
      const data = await res.json();
      if (!res.ok) {
        setSchemaError(data.error || "Could not load feature schema");
        setFeaturesMeta(null);
        setSchemaLoading(false);
        return;
      }
      const meta = data as FeaturesMeta;
      setFeaturesMeta(meta);
      const init: Record<string, string> = {};
      for (const f of meta.fields) {
        init[f.name] = "";
      }
      setFormValues(init);
    } catch (e) {
      setSchemaError("Connection error loading /api/features");
      setFeaturesMeta(null);
    } finally {
      setSchemaLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchema();
  }, [loadSchema]);

  useEffect(() => {
    // Load assessment history on component mount
    void loadAssessmentHistory();
  }, []);

  const handleChange = (name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featuresMeta) return;
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const payload: Record<string, string | number> = {};
      for (const f of featuresMeta.fields) {
        const raw = formValues[f.name];
        if (raw === undefined || raw === "") {
          toast.error(`Please fill: ${humanize(f.name)}`);
          setLoading(false);
          return;
        }
        if (f.kind === "numeric") {
          const n = parseFloat(raw);
          if (!Number.isFinite(n)) {
            toast.error(`Invalid number: ${humanize(f.name)}`);
            setLoading(false);
            return;
          }
          payload[f.name] = n;
        } else {
          payload[f.name] = raw;
        }
      }

      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Prediction failed");
        setLoading(false);
        return;
      }

      setPrediction(data);
      
      // Save form assessment to history
      await saveAssessment({
        type: 'form',
        formValues: payload,
        prediction: data
      });
      
      toast.success("Prediction completed!");
    } catch (error) {
      toast.error("Connection error. Make sure the backend is running.");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 },
        audio: false 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Start real-time emotion detection
        startRealTimeDetection();
      }
      toast.success("Camera started successfully");
    } catch (error) {
      toast.error("Failed to access camera. Please check permissions.");
      console.error("Camera error:", error);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (ctx && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      
      // Immediately analyze the captured frame
      toast.loading("Analyzing captured frame...");
      analyzeImage(imageData, 'camera');
      
      // Stop camera after capture
      stopCamera();
      toast.success("Camera stopped");
    }
  };

  const startRealTimeDetection = () => {
    let lastDetectionTime = 0;
    const detectionInterval = 500; // Throttle to every 500ms for performance
    
    const detectLoop = () => {
      if (!videoRef.current || !cameraStream) return;
      
      const fps = fpsCounterRef.current.tick();
      setFps(fps);
      
      const currentTime = performance.now();
      
      // Throttle detection to improve performance
      if (currentTime - lastDetectionTime < detectionInterval) {
        animationFrameRef.current = requestAnimationFrame(detectLoop);
        return;
      }
      
      lastDetectionTime = currentTime;
      
      // Capture frame for emotion detection
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 320; // Smaller canvas for better performance
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.6); // Lower quality for performance
        
        // Perform optimized real emotion detection with error handling
        detectFacesReal(imageData).then((result: any) => {
          if (result.validation?.isValid && result.faces.length > 0) {
            emotionTrackerRef.current.addEmotionData(result.emotions);
            const avgEmotions = emotionTrackerRef.current.getAverageEmotions();
            setEmotionData(avgEmotions);
            setValidationResult(result.validation);
          } else {
            setValidationResult(result.validation || { isValid: false, error: 'No face detected' });
            // Don't show toast errors during real-time camera detection to avoid spam
          }
        }).catch((error) => {
          // Continue even if detection fails during real-time camera
          console.warn('Camera detection error:', error);
        });
      }
      
      animationFrameRef.current = requestAnimationFrame(detectLoop);
    };
    
    detectLoop();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }

    // Clear all previous analysis state for clean replacement
    setPrediction(null);
    setEmotionData(null);
    setValidationResult(null);
    setAnalysisError(null);
    setAnalysisStage("Preparing image...");
    setSavedAssessment(null);
    setIsAnalyzing(false); // Reset analyzing state
    toast.dismiss(); // Clear any existing toasts

    const reader = new FileReader();
    reader.onload = async (event) => {
      const raw = event.target?.result as string;
      if (!raw) return;
      try {
        // Use original image without aggressive compression for better face detection
        // Face detection works better with larger images (minimum ~150x150)
        console.log('[DASHBOARD] Using original image for analysis (no aggressive compression)');
        setUploadedImage(raw); // Set the ORIGINAL image, not compressed
        toast.success("Image uploaded successfully");
      } catch (error) {
        console.error('Image processing failed:', error);
        setUploadedImage(raw);
        toast.success("Image uploaded successfully");
      } finally {
        setAnalysisStage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (imageData: string, sourceType: 'upload' | 'camera' = 'upload') => {
    // Prevent multiple simultaneous analyses
    if (isAnalyzing) {
      console.warn('Analysis already in progress');
      return;
    }

    // Check if models are loaded
    if (!modelsLoaded) {
      const errorMsg = modelLoadingError || 'Models are still loading. Please wait.';
      toast.error(errorMsg);
      console.error('[DASHBOARD] Cannot analyze image: models not loaded');
      return;
    }
    
    // Dismiss any existing loading toasts
    toast.dismiss();
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisStage("Detecting face...");
    
    try {
      console.log('[SIMPLE] Starting simplified image analysis...');
      
      // Use simplified pipeline for image analysis
      const { detectFaceSimple } = await import('@/lib/simplified-image-analysis');
      
      console.log('[SIMPLE] Processing image with simplified pipeline...');
      setAnalysisStage("Detecting face...");
      
      const result = await detectFaceSimple(imageData);
      console.log('[SIMPLE] Analysis result:', result);
      
      // Check if face was detected
      if (!result.faceDetected) {
        console.log('[SIMPLE] No face detected in image');
        if (result.faceCount === 0) {
          throw new Error('No human face detected. Please upload a clear photo of your face.');
        } else {
          throw new Error('Multiple faces detected. Please use an image with only one face.');
        }
      }
      
      // STRICT single face validation - reject multiple faces
      if (result.faceCount > 1) {
        console.log('[SIMPLE] Multiple faces detected - rejecting image');
        throw new Error('Multiple faces detected. Please upload an image containing only one face.');
      }
      
      // Check confidence - accept detections with confidence >= 0.2
      if (result.confidence < 0.2) {
        console.log('[SIMPLE] Very low confidence detection:', result.confidence);
        throw new Error('Detection confidence too low. The image may be too dark or the face too small. Try a better lit image or move closer.');
      }
      
      console.log('[SIMPLE] Face detection successful, emotions:', result.emotions);
      setEmotionData({
        happy: result.emotions.happy,
        sad: result.emotions.sad,
        angry: result.emotions.angry,
        neutral: result.emotions.neutral,
        fear: result.emotions.fear,
        surprise: result.emotions.surprise,
        disgust: result.emotions.disgust,
        attention: 0.8,
        eye_fatigue: 0.2,
        confidence: result.confidence
      });
      
      // Call simplified backend endpoint
      console.log('[SIMPLE] Calling simplified backend endpoint...');
      setAnalysisStage("Analyzing burnout level...");
      const token = localStorage.getItem("token");
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const analysisUrl = `${API_URL}/analyze-image-simple`;
      console.log('[SIMPLE] Sending image analysis request to:', analysisUrl);
      const response = await fetch(analysisUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          image: imageData,
          emotions: result.emotions,
          confidence: result.confidence
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('[SIMPLE] Backend response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('[SIMPLE] Backend error:', errorData);
        if (response.status === 404) {
          throw new Error('Analysis endpoint not found. Check server routing and API_URL configuration.');
        }
        throw new Error(errorData.error || `Simplified analysis failed (status ${response.status})`);
      }
      
      setAnalysisStage("Generating results...");
      const data = await response.json();
      console.log('[SIMPLE] Backend response data:', data);
      
      if (!data.prediction) {
        console.log('[SIMPLE] No prediction in response');
        throw new Error('No prediction received from server');
      }
      
      console.log('[SIMPLE] Setting prediction:', data.prediction);
      setPrediction(data.prediction);
      
      // Save to history after successful analysis
      await saveAssessment({
        type: sourceType,
        imageData,
        prediction: data.prediction,
        emotions: result.emotions,
        confidence: result.confidence
      });
      
      setAnalysisStage(null);
      toast.success("Analysis completed successfully!");
      
    } catch (error) {
      console.error("[SIMPLE] Analysis error:", error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      setAnalysisError(errorMessage);
      
      if (errorMessage === 'Image processing timeout') {
        toast.error("Simplified processing took too long. Try a smaller or clearer image.");
      } else if (errorMessage.includes('Model failed to load')) {
        toast.error("Model failed to load. Check console logs or try again later.");
      } else if (errorMessage.includes('Face detection timeout')) {
        toast.error("Face detection timed out. Try a clearer image or better lighting.");
      } else if (errorMessage.includes('No human face detected')) {
        toast.error("No human face detected. Please upload a clear photo of your face.");
      } else if (errorMessage.includes('Multiple faces detected')) {
        toast.error("Multiple faces detected. Please use an image with only one face.");
      } else if (errorMessage.includes('Low confidence detection')) {
        toast.error("Low confidence detection. Try better lighting or clearer image.");
      } else if (error instanceof Error && error.name === 'AbortError') {
        toast.error("Analysis timed out. Please try again.");
      } else {
        toast.error(errorMessage || "Analysis failed. Please try again.");
      }
      
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage(null);
    }
  };

  const saveAssessment = async (assessmentData: any) => {
    try {
      console.log('[HISTORY] Saving assessment:', assessmentData.type);
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/save-assessment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(assessmentData),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('[HISTORY] Assessment saved successfully:', result.assessment.id);
        setSavedAssessment(result.assessment);
        
        // Refresh history after saving
        await loadAssessmentHistory(historyFilter);
        
        return result.assessment;
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[HISTORY] Failed to save assessment:', error);
        throw new Error(error.error || 'Failed to save assessment');
      }
    } catch (error) {
      console.error('[HISTORY] Save assessment error:', error);
      throw error;
    }
  };

  const loadAssessmentHistory = async (_filter = 'all') => {
    try {
      setIsLoadingHistory(true);
      console.log('[HISTORY] Loading assessment history, filter:', _filter);
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/get-assessments/${localStorage.getItem("user") || 'user'}?filter=${_filter}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[HISTORY] Loaded', data.assessments.length, 'assessments');
        setAssessmentHistory(data.assessments);
        setHistoryFilter(_filter);
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[HISTORY] Failed to load history:', error);
        toast.error('Failed to load assessment history');
      }
    } catch (error) {
      console.error('[HISTORY] Load history error:', error);
      toast.error('Failed to load assessment history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const duplicateAssessment = async (assessmentId: string) => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/duplicate-assessment/${assessmentId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        toast.success("Assessment duplicated successfully!");
        loadAssessmentHistory(historyFilter);
      } else {
        toast.error("Failed to duplicate assessment");
      }
    } catch (error) {
      console.error("Duplicate assessment error:", error);
      toast.error("Failed to duplicate assessment");
    }
  };

  const deleteAssessment = async (assessmentId: string) => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/delete-assessment/${assessmentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        toast.success("Assessment deleted successfully!");
        loadAssessmentHistory(historyFilter);
        
        // Clear selected assessment if it was deleted
        if (selectedAssessment?.id === assessmentId) {
          setSelectedAssessment(null);
        }
      } else {
        toast.error("Failed to delete assessment");
      }
    } catch (error) {
      console.error("Delete assessment error:", error);
      toast.error("Failed to delete assessment");
    }
  };

  const loadSpecificAssessment = async (assessmentId: string) => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${API_URL}/get-assessment/${assessmentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const assessment = await response.json();
        setSelectedAssessment(assessment);
        return assessment;
      } else {
        toast.error("Failed to load assessment");
        return null;
      }
    } catch (error) {
      console.error("Load assessment error:", error);
      toast.error("Failed to load assessment");
      return null;
    }
  };

  const openAssessmentForEditing = async (assessment: SavedAssessment) => {
    try {
      // Set editing state first
      setIsEditing(true);
      setSelectedAssessment(assessment);
      
      // Set assessment mode to switch to correct tab
      setAssessmentMode(assessment.type as AssessmentMode);
      
      // Load form data only if it's a form assessment
      if (assessment.type === 'form' && assessment.formValues) {
        setFormValues(assessment.formValues);
      }
      
      // Load image data if it's an image assessment
      if (assessment.type === 'upload' && assessment.imageData) {
        setUploadedImage(assessment.imageData);
      }
      
      if (assessment.type === 'camera' && assessment.imageData) {
        setCapturedImage(assessment.imageData);
      }
      
      // Load prediction data
      if (assessment.prediction) {
        setPrediction(assessment.prediction);
      }
      
      // Load emotion data if available
      if (assessment.emotions) {
        setEmotionData(assessment.emotions);
      }
      
      toast.success(`Opened ${assessment.versionLabel || 'assessment'} for editing`);
      
    } catch (error) {
      console.error('Error opening assessment for editing:', error);
      toast.error('Failed to open assessment for editing');
    }
  };

  const updateAssessment = async () => {
    if (!selectedAssessment) {
      toast.error('No assessment selected for editing');
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      
      // Create new version instead of overwriting
      const newVersionData = {
        type: assessmentMode,
        imageData: uploadedImage || capturedImage,
        prediction: prediction,
        emotions: emotionData,
        formValues: assessmentMode === 'form' ? formValues : undefined,
        confidence: prediction?.ml_confidence || emotionData?.confidence,
        recommendations: prediction?.suggestions || [],
        originalVersionId: selectedAssessment.id
      };
      
      const saveUrl = `${API_URL}/save-assessment`;
      console.log('[DEBUG] Sending save assessment request to:', saveUrl);
      const response = await fetch(saveUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newVersionData),
      });
      
      if (response.ok) {
        const result = await response.json();
        setSavedAssessment(result.assessment);
        setLastSaved(new Date().toLocaleString());
        toast.success("Assessment updated successfully! New version created.");
        
        // Refresh history
        loadAssessmentHistory(historyFilter);
        
        // Exit editing mode
        setIsEditing(false);
        setSelectedAssessment(null);
      } else {
        toast.error("Failed to save updated assessment");
      }
    } catch (error) {
      console.error("Update assessment error:", error);
      toast.error("Failed to save updated assessment");
    }
  };

  const createNewAssessment = () => {
    setSavedAssessment(null);
    setFormValues({});
    setPrediction(null);
    setEmotionData(null);
    setValidationResult(null);
    setLastSaved(null);
    setIsEditing(false);
    toast.success("Ready for new assessment!");
  };

  const getUnit = (fieldName: string) => {
    const units: Record<string, string> = {
      'study_hours': 'h/day',
      'self_study_hours': 'h/day', 
      'online_classes_hours': 'h/day',
      'social_media_hours': 'h/day',
      'gaming_hours': 'h/day',
      'screen_time_hours': 'h/day',
      'sleep_hours': 'h/night',
      'exercise_minutes': 'min/day',
      'caffeine_intake_mg': 'mg/day'
    };
    return units[fieldName] || '';
  };

  const getIcon = (category: string) => {
    switch (category) {
      case 'Personal Information': return '👤';
      case 'Study & Screen Time': return '📚';
      case 'Health & Lifestyle': return '❤️';
      case 'Mental Health & Focus': return '🧠';
      default: return '📋';
    }
  };

  const categorizeField = (fieldName: string) => {
    const personalInfo = ['student_id', 'age', 'gender', 'academic_level'];
    const study = ['study_hours', 'self_study_hours', 'online_classes_hours', 'screen_time_hours', 'exam_score'];
    const health = ['sleep_hours', 'exercise_minutes', 'caffeine_intake_mg', 'part_time_job'];
    const mental = ['social_media_hours', 'gaming_hours', 'internet_quality', 'mental_health_score', 'focus_index', 'productivity_score', 'upcoming_deadline'];
    
    if (personalInfo.includes(fieldName)) return 'Personal Information';
    if (study.includes(fieldName)) return 'Study & Screen Time';
    if (health.includes(fieldName)) return 'Health & Lifestyle';
    if (mental.includes(fieldName)) return 'Mental Health & Focus';
    return 'General';
  };

  const groupFieldsByCategory = () => {
    const groups: Record<string, FieldMeta[]> = {};
    if (!featuresMeta) return groups;
    
    for (const field of featuresMeta.fields) {
      const category = categorizeField(field.name);
      if (!groups[category]) groups[category] = [];
      groups[category].push(field);
    }
    return groups;
  };

  const fieldGroups = groupFieldsByCategory();

  const getBurnoutColor = (level: string) => {
    switch (level) {
      case "Low":
        return "text-green-600";
      case "Medium":
        return "text-yellow-600";
      case "High":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getBurnoutBgColor = (level: string) => {
    switch (level) {
      case "Low":
        return "bg-green-500/10 border-green-400/40";
      case "Medium":
        return "bg-yellow-500/10 border-yellow-400/40";
      case "High":
        return "bg-red-500/10 border-red-400/40";
      default:
        return "bg-white/40 border-white/30";
    }
  };

  if (schemaLoading) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-white" size={40} />
          <p className="text-white/90">Loading assessment fields…</p>
        </div>
      </div>
    );
  }

  if (schemaError || !featuresMeta) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center px-4">
        <Card className="glass-card max-w-lg p-8 text-center">
          <p className="text-gray-800 font-medium">{schemaError ?? "No feature schema"}</p>
          <p className="text-gray-600 text-sm mt-2">
            Run <code className="bg-gray-100 px-1 rounded">python ml/train.py</code> then restart the API.
          </p>
          <Button className="mt-4" onClick={() => void loadSchema()}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 md:py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-sm mb-2">
            AI Burnout Assessment
          </h1>
          <p className="text-white/90 max-w-2xl drop-shadow">
            Choose your assessment method: Form-based questionnaire, Camera analysis, or Image upload.
          </p>
        </div>

        {/* Assessment Mode Switcher */}
        <div className="mb-8">
          <Card className="glass-card p-2">
            <div className="flex flex-col sm:flex-row gap-2">
              {[
                { id: 'upload', label: 'Upload Image', icon: Upload, desc: 'Analyze photo' },
                { id: 'camera', label: 'Camera Assessment', icon: Camera, desc: 'Live webcam analysis' },
                { id: 'form', label: 'Form Assessment', icon: FileText, desc: 'Manual questionnaire' }
              ].map((mode) => (
                <motion.button
                  key={mode.id}
                  onClick={() => setAssessmentMode(mode.id as AssessmentMode)}
                  className={`flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                    assessmentMode === mode.id
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-[1.02]'
                      : 'text-gray-700 hover:bg-white/50'
                  }`}
                  whileHover={{ scale: assessmentMode === mode.id ? 1.02 : 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <mode.icon size={20} />
                  <div className="text-left">
                    <div className="font-semibold">{mode.label}</div>
                    <div className="text-xs opacity-80">{mode.desc}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          </Card>
        </div>



        {/* Edit Controls */}
        {isEditing && (
          <div className="mb-6">
            <Card className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Edit size={16} className="text-indigo-600" />
                    <span className="font-medium text-gray-800">
                      Editing: {selectedAssessment?.versionLabel || 'Assessment'}
                    </span>
                  </div>
                  {lastSaved && (
                    <span className="text-sm text-gray-600">
                      Last saved: {lastSaved}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={updateAssessment}
                    disabled={!prediction}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <Save size={16} className="mr-1" />
                    Save New Version
                  </Button>
                  <Button
                    onClick={createNewAssessment}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {assessmentMode === 'form' && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="max-h-[80vh] overflow-y-auto space-y-6 pr-2">
                      {Object.entries(fieldGroups).map(([category, fields]) => (
                        <Card key={category} className="glass-card p-6 transition hover:shadow-2xl">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-lg">
                              {getIcon(category)}
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">{category}</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {fields.map((f) => (
                              <div key={f.name}>
                                {f.kind === "categorical" ? (
                                  <>
                                    <label className="text-sm font-medium text-gray-700 block mb-2 capitalize">
                                      {humanize(f.name)}
                                      {getUnit(f.name) && (
                                        <span className="text-gray-500 text-xs ml-1">({getUnit(f.name)})</span>
                                      )}
                                    </label>
                                    <Select
                                      value={formValues[f.name] ?? ""}
                                      onValueChange={(v) => handleChange(f.name, v)}
                                    >
                                      <SelectTrigger className="bg-white w-full">
                                        <SelectValue placeholder={`Select ${humanize(f.name)}`} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {f.options.map((opt) => (
                                          <SelectItem key={opt} value={opt}>
                                            {opt}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </>
                                ) : (
                                  <>
                                    <label className="text-sm font-medium text-gray-700 block mb-2 capitalize">
                                      {humanize(f.name)}
                                      {getUnit(f.name) && (
                                        <span className="text-gray-500 text-xs ml-1">({getUnit(f.name)})</span>
                                      )}
                                    </label>
                                    <Input
                                      type="number"
                                      min={f.min}
                                      max={f.max}
                                      step={f.step}
                                      value={formValues[f.name] ?? ""}
                                      onChange={(e) => handleChange(f.name, e.target.value)}
                                      className="bg-white"
                                      placeholder={`Enter ${humanize(f.name)}`}
                                      required
                                    />
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </Card>
                      ))}
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 h-12 text-base shadow-lg transition hover:scale-[1.01] active:scale-[0.99]"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin mr-2" size={20} />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="mr-2" size={20} />
                          Get Burnout Assessment
                        </>
                      )}
                    </Button>
                  </form>
                </motion.div>
              )}

              {assessmentMode === 'camera' && (
                <motion.div
                  key="camera"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="glass-card p-6">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-6">
                        <Webcam className="text-indigo-600" size={24} />
                        <h3 className="text-xl font-bold text-gray-900">Live Camera Assessment</h3>
                      </div>

                      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        {!cameraStream && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                            <div className="text-center">
                              <Camera className="mx-auto text-gray-400 mb-4" size={48} />
                              <p className="text-gray-400">Camera not started</p>
                            </div>
                          </div>
                        )}
                        {fps > 0 && (
                          <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                            FPS: {fps}
                          </div>
                        )}
                      </div>

                      <canvas ref={canvasRef} className="hidden" />

                      <div className="flex gap-3">
                        {!cameraStream ? (
                          <Button
                            onClick={startCamera}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                          >
                            <Camera className="mr-2" size={20} />
                            Start Camera
                          </Button>
                        ) : (
                          <>
                            <Button
                              onClick={stopCamera}
                              className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
                            >
                              <Camera className="mr-2" size={20} />
                              Stop Camera
                            </Button>
                            <Button
                              onClick={captureFrame}
                              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                            >
                              <Eye className="mr-2" size={20} />
                              Capture Frame
                            </Button>
                          </>
                        )}
                      </div>

                      {capturedImage && (
                        <div className="space-y-4">
                          <div className="relative rounded-lg overflow-hidden">
                            <img src={capturedImage} alt="Captured" className="w-full" />
                            <Button
                              onClick={() => analyzeImage(capturedImage)}
                              disabled={isAnalyzing}
                              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                            >
                              {isAnalyzing ? (
                                <>
                                  <Loader2 className="animate-spin mr-2" size={20} />
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  <Brain className="mr-2" size={20} />
                                  Analyze with AI
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Real-time Emotion Display */}
                      {emotionData && cameraStream && (
                        <div className="rounded-xl border border-white/40 bg-white/50 p-4 backdrop-blur-sm">
                          <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Activity size={16} />
                            Real-time Emotion Analysis
                          </h4>
                          <div className="space-y-2">
                            {Object.entries(emotionData).map(([emotion, value]) => (
                              <div key={emotion} className="flex items-center justify-between">
                                <span className="text-sm capitalize text-gray-700">{emotion.replace('_', ' ')}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${(value as number) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-600 w-10">
                                    {Math.round((value as number) * 100)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-white/30">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Live Analysis</span>
                              <span className="text-green-600 font-medium">● Active</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              )}

              {assessmentMode === 'upload' && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  {uploadedImage ? (
                    <Card className="glass-card p-6 transition hover:shadow-2xl">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <Upload className="text-indigo-600" size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Image Analysis</h3>
                      </div>
                      {/* Model Loading Status */}
                      {!modelsLoaded && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center">
                            <AlertCircle className="text-yellow-600 mr-2" size={16} />
                            <div>
                              <p className="text-sm font-medium text-yellow-800">
                                {modelLoadingError ? 'Model Loading Failed' : 'Loading AI Models'}
                              </p>
                              <p className="text-xs text-yellow-600 mt-1">
                                {modelLoadingError || 'Please wait while we load the face detection models...'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Image Preview Container */}
                      <div className="mb-6 p-4 bg-white/40 rounded-lg border border-white/50">
                        <div className="flex justify-center mb-4">
                          <div className="relative">
                            <img 
                              src={uploadedImage} 
                              alt="Uploaded image" 
                              className="w-48 h-48 object-cover rounded-lg border-2 border-gray-300 shadow-md"
                            />
                            {isAnalyzing && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                                <Loader2 className="animate-spin text-white" size={32} />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Status Message */}
                        {(isAnalyzing || analysisError) && (
                          <div className="text-center mb-4">
                            {isAnalyzing ? (
                              <p className="text-sm font-medium text-gray-700">
                                {analysisStage || 'Analyzing image...'}
                              </p>
                            ) : (
                              <p className="text-sm text-red-600 font-medium">
                                {analysisError}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="space-y-3">
                        <Button
                          onClick={async () => {
                            if (!uploadedImage) return;
                            try {
                              await analyzeImage(uploadedImage);
                            } catch (error) {
                              console.error('Upload analysis failed:', error);
                            }
                          }}
                          disabled={isAnalyzing || !modelsLoaded}
                          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg disabled:opacity-50"
                          size="lg"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="mr-2 animate-spin" size={18} />
                              Analyzing Image...
                            </>
                          ) : !modelsLoaded ? (
                            <>
                              <Loader2 className="mr-2 animate-spin" size={18} />
                              Loading Models...
                            </>
                          ) : (
                            <>
                              <Brain className="mr-2" size={18} />
                              Analyze Image
                            </>
                          )}
                        </Button>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => {
                              if (fileInputRef.current) {
                                fileInputRef.current.value = ""; // Reset file input
                                fileInputRef.current.click(); // Open file dialog
                              }
                            }}
                            variant="outline"
                            disabled={isAnalyzing}
                            className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                          >
                            <RefreshCw size={16} className="mr-1" />
                            Replace Image
                          </Button>
                          
                          <Button
                            onClick={() => {
                              // Remove image and reset to empty upload state
                              setUploadedImage(null);
                              setPrediction(null);
                              setEmotionData(null);
                              setValidationResult(null);
                              setAnalysisError(null);
                              setAnalysisStage(null);
                              setSavedAssessment(null);
                              setIsAnalyzing(false);
                              toast.dismiss(); // Clear any loading toasts
                            }}
                            variant="outline"
                            disabled={isAnalyzing}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Plus size={16} className="mr-1" />
                            Remove Image
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Card className="glass-card p-8">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-all duration-300">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        
                        <div className="py-4">
                          <Upload className="mx-auto text-gray-400 mb-4" size={56} />
                          <h4 className="text-lg font-semibold text-gray-800 mb-2">Upload Your Photo</h4>
                          <p className="text-gray-600 text-sm mb-6">
                            Upload a clear image of your face to analyze your burnout level with AI-powered emotion recognition.
                          </p>
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg"
                            size="lg"
                          >
                            <Upload className="mr-2" size={18} />
                            Choose Image
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-1">
            {prediction ? (
              <Card className={`glass-card p-6 border-2 ${getBurnoutBgColor(prediction.burnout_level)} sticky top-24`}>
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Your Burnout Score</h3>
                  <div className={`text-5xl font-bold ${getBurnoutColor(prediction.burnout_level)}`}>
                    {prediction.burnout_score}
                  </div>
                  <p className={`text-lg font-semibold mt-2 ${getBurnoutColor(prediction.burnout_level)}`}>
                    {prediction.burnout_level} Burnout
                  </p>
                  {prediction.ml_confidence && (
                    <p className="text-sm text-gray-600 mt-1">
                      AI Confidence: {Math.round(prediction.ml_confidence * 100)}%
                    </p>
                  )}
                </div>

                <div className="flex justify-center mb-6">
                  {prediction.burnout_level === "Low" && (
                    <CheckCircle className="text-green-600" size={48} />
                  )}
                  {prediction.burnout_level === "Medium" && (
                    <AlertCircle className="text-yellow-600" size={48} />
                  )}
                  {prediction.burnout_level === "High" && (
                    <AlertCircle className="text-red-600" size={48} />
                  )}
                </div>

                {/* Emotion Analysis Section */}
                {emotionData && (
                  <div className="mb-6 rounded-xl border border-white/40 bg-white/50 p-4 backdrop-blur-sm">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Brain size={16} />
                      Emotion Analysis
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(emotionData).map(([emotion, value]) => (
                        <div key={emotion} className="flex items-center justify-between">
                          <span className="text-sm capitalize text-gray-700">{emotion}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
                                style={{ width: `${(value as number) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 w-10">
                              {Math.round((value as number) * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-white/40 bg-white/50 p-4 backdrop-blur-sm">
                  <h4 className="font-bold text-gray-900 mb-3">Recommendations</h4>
                  <div className="space-y-3 max-h-[min(50vh,28rem)] overflow-y-auto pr-1">
                    {(Array.isArray(prediction.suggestions) ? prediction.suggestions : []).map(
                      (suggestion: any, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-white/50 bg-white/60 p-3 text-sm shadow-sm transition hover:bg-white/80"
                        >
                          <p className="font-semibold text-gray-800">{suggestion.category}</p>
                          <p className="text-gray-700 mt-1 leading-relaxed">{suggestion.message}</p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="glass-card p-6 sticky top-24 transition hover:shadow-2xl">
                <div className="text-center">
                  <div className="w-full rounded-lg mb-4 border border-white/30 bg-white/20 py-16 px-4">
                    <ClipboardList className="mx-auto text-indigo-200 mb-2 opacity-90" size={40} />
                    <p className="text-gray-700 text-sm">
                      {assessmentMode === 'form' 
                        ? 'Fill the fields and submit to see your burnout assessment and recommendations.'
                        : assessmentMode === 'camera'
                        ? 'Start camera and capture a frame to analyze your burnout level.'
                        : 'Upload an image to analyze your burnout level with AI.'
                      }
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
