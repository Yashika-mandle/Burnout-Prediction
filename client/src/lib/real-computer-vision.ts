// Real AI Computer Vision implementation using face-api.js
import * as faceapi from 'face-api.js';

export interface RealEmotionData {
  happy: number;
  sad: number;
  angry: number;
  neutral: number;
  fear: number;
  surprise: number;
  disgust: number;
  attention: number;
  eye_fatigue: number;
  confidence: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  faceCount?: number;
  quality?: number;
}

export interface RealFaceDetectionResult {
  faces: any[];
  emotions: RealEmotionData;
  confidence: number;
  validation: ValidationResult;
}

// Load face-api.js models
let modelsLoaded = false;

export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;
  
  try {
    // Use local models from public/models directory
    const MODEL_URL = '/models';
    console.log('[REAL-CV] Loading models from:', MODEL_URL);
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
    ]);
    modelsLoaded = true;
    console.log('[REAL-CV] Face-api.js models loaded successfully from local path');
  } catch (error) {
    console.error('[REAL-CV] Failed to load face-api.js models:', error);
    // Fallback to mock implementation if models fail to load
    console.warn('Falling back to mock implementation due to model loading failure');
    modelsLoaded = false;
  }
}

// Validate image before processing
export function validateImage(imageElement: HTMLImageElement | HTMLVideoElement): ValidationResult {
  // Check if image has valid dimensions
  if (!imageElement.width || !imageElement.height || imageElement.width < 100 || imageElement.height < 100) {
    return {
      isValid: false,
      error: 'Image too small. Minimum size is 100x100 pixels.'
    };
  }

  // Basic quality check (this is simplified - real implementation would use more sophisticated metrics)
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      isValid: false,
      error: 'Cannot process image.'
    };
  }

  canvas.width = imageElement.width;
  canvas.height = imageElement.height;
  ctx.drawImage(imageElement, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Simple blur detection (edge detection)
  let edgeCount = 0;
  for (let i = 0; i < data.length - 4; i += 4) {
    const diff = Math.abs(data[i] - data[i + 4]) + 
                 Math.abs(data[i + 1] - data[i + 5]) + 
                 Math.abs(data[i + 2] - data[i + 6]);
    if (diff > 30) edgeCount++;
  }
  
  const quality = edgeCount / (data.length / 4);
  
  if (quality < 0.01) {
    return {
      isValid: false,
      error: 'Image is too blurry. Please use a clearer image.',
      quality
    };
  }

  return {
    isValid: true,
    quality
  };
}

// Real face detection with emotion analysis
export async function detectFacesReal(imageData: string | HTMLImageElement | HTMLVideoElement): Promise<RealFaceDetectionResult> {
  if (!modelsLoaded) {
    await loadModels();
  }
  
  try {
    let imageElement: HTMLImageElement | HTMLVideoElement;
    
    if (typeof imageData === 'string') {
      // Convert base64 to image element
      console.log('[DEBUG] Converting base64 to image element...');
      imageElement = await createImageElement(imageData);
      console.log('[DEBUG] Image element created successfully');
    } else {
      imageElement = imageData;
    }

    // Validate image first
    console.log('[DEBUG] Validating image...');
    const validation = validateImage(imageElement);
    console.log('[DEBUG] Image validation result:', validation);
    
    if (!validation.isValid) {
      console.log('[DEBUG] Image validation failed');
      return {
        faces: [],
        emotions: {
          happy: 0, sad: 0, angry: 0, neutral: 0,
          fear: 0, surprise: 0, disgust: 0,
          attention: 0, eye_fatigue: 0, confidence: 0
        },
        confidence: 0,
        validation
      };
    }

    console.log('[DEBUG] Starting face-api.js detection...');
    // Detect faces with expressions
    const detections = await faceapi
      .detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();
    
    console.log('[DEBUG] Face-api.js detections completed:', detections.length, 'faces found');

    if (detections.length === 0) {
      console.log('[DEBUG] No faces detected by face-api.js');
      return {
        faces: [],
        emotions: {
          happy: 0, sad: 0, angry: 0, neutral: 0,
          fear: 0, surprise: 0, disgust: 0,
          attention: 0, eye_fatigue: 0, confidence: 0
        },
        confidence: 0,
        validation: {
          isValid: false,
          error: 'No face detected. Please upload an image with a clear human face.',
          faceCount: 0
        }
      };
    }

    if (detections.length > 1) {
      console.log('[DEBUG] Multiple faces detected:', detections.length);
      return {
        faces: [],
        emotions: {
          happy: 0, sad: 0, angry: 0, neutral: 0,
          fear: 0, surprise: 0, disgust: 0,
          attention: 0, eye_fatigue: 0, confidence: 0
        },
        confidence: 0,
        validation: {
          isValid: false,
          error: 'Multiple faces detected. Please use an image with only one face.',
          faceCount: detections.length
        }
      };
    }

    // Get the primary face detection
    const detection = detections[0];
    console.log('[DEBUG] Processing single face detection...');
    
    // Calculate confidence based on detection quality
    const confidence = Math.max(0.5, Math.min(0.95, detection.detection.score || 0.8));
    
    // Extract and normalize emotions
    const expressions = detection.expressions;
    const emotions: RealEmotionData = {
      happy: expressions.happy || 0,
      sad: expressions.sad || 0,
      angry: expressions.angry || 0,
      neutral: expressions.neutral || 0,
      fear: expressions.fearful || 0,
      surprise: expressions.surprised || 0,
      disgust: expressions.disgusted || 0,
      attention: 0.8, // Default attention
      eye_fatigue: 0.2, // Default eye fatigue
      confidence
    };
    
    // Analyze eye fatigue and attention from landmarks
    console.log('[DEBUG] Analyzing eye fatigue and attention...');
    const { eye_fatigue, attention } = analyzeEyeFatigueAndAttention(detection.landmarks);
    emotions.eye_fatigue = eye_fatigue;
    emotions.attention = attention;
    
    console.log('[DEBUG] Final emotions calculated:', emotions);
    
    return {
      faces: detections, // Use the actual detections array
      emotions,
      confidence,
      validation: {
        isValid: true,
        faceCount: 1
      }
    };

  } catch (error) {
    console.error('[DEBUG] Face detection error:', error);
    return {
      faces: [],
      emotions: {
        happy: 0, sad: 0, angry: 0, neutral: 0,
        fear: 0, surprise: 0, disgust: 0,
        attention: 0, eye_fatigue: 0, confidence: 0
      },
      confidence: 0,
      validation: {
        isValid: false,
        error: 'Failed to analyze image. Please try again.'
      }
    };
  }
}

// Analyze eye fatigue and attention from facial landmarks
function analyzeEyeFatigueAndAttention(landmarks: any): { eye_fatigue: number; attention: number } {
  try {
    // Get eye landmarks
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    // Calculate Eye Aspect Ratio (EAR) for blink detection
    const leftEAR = calculateEyeAspectRatio(leftEye);
    const rightEAR = calculateEyeAspectRatio(rightEye);
    const averageEAR = (leftEAR + rightEAR) / 2;
    
    // Eye fatigue: lower EAR indicates tired eyes
    const eye_fatigue = Math.max(0, 1 - averageEAR * 3); // Normalize to 0-1
    
    // Attention: based on eye openness and head pose (simplified)
    const attention = Math.min(1, averageEAR * 2); // Higher EAR = more attentive
    
    return { eye_fatigue, attention };
  } catch (error) {
    console.error('Eye analysis error:', error);
    return { eye_fatigue: 0.5, attention: 0.5 }; // Default values
  }
}

// Calculate Eye Aspect Ratio (EAR) for blink detection
function calculateEyeAspectRatio(eye: any[]): number {
  try {
    // Eye landmarks indices for 6-point eye model
    const A = Math.sqrt(Math.pow(eye[1].x - eye[5].x, 2) + Math.pow(eye[1].y - eye[5].y, 2));
    const B = Math.sqrt(Math.pow(eye[2].x - eye[4].x, 2) + Math.pow(eye[2].y - eye[4].y, 2));
    const C = Math.sqrt(Math.pow(eye[0].x - eye[3].x, 2) + Math.pow(eye[0].y - eye[3].y, 2));
    
    const ear = (A + B) / (2 * C);
    return ear;
  } catch (error) {
    return 0.25; // Default EAR value
  }
}

// Convert base64 to HTMLImageElement
function createImageElement(imageData: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageData;
  });
}

// Compress image to improve performance with aggressive optimization
export async function compressImage(imageDataUrl: string, maxWidth = 320, maxHeight = 240, quality = 0.6): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageDataUrl); // Fallback to original
        return;
      }

      // Calculate new dimensions with aggressive resizing
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress with lower quality for speed
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(imageDataUrl); // Fallback to original
    img.src = imageDataUrl;
  });
}

// Async image processing with aggressive timeout
export const processImageWithTimeout = async (
  imageDataUrl: string,
  timeoutMs = 8000 // Reduced from 15s to 8s
): Promise<RealFaceDetectionResult> => {
  console.log('[DEBUG] Starting image processing with timeout:', timeoutMs);
  
  try {
    // Compress image first for faster processing
    console.log('[DEBUG] Compressing image...');
    const compressedImage = await compressImage(imageDataUrl);
    console.log('[DEBUG] Image compressed successfully');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('[DEBUG] Image processing timeout reached');
        reject(new Error('Image processing timeout'));
      }, timeoutMs);
      
      console.log('[DEBUG] Starting face detection...');
      detectFacesReal(compressedImage)
        .then(result => {
          clearTimeout(timeout);
          console.log('[DEBUG] Face detection completed:', result);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          console.log('[DEBUG] Face detection failed:', error);
          reject(error);
        });
    });
  } catch (error) {
    console.log('[DEBUG] Image compression failed:', error);
    throw new Error('Image compression failed');
  }
};

// Calculate burnout score from real emotions
export function calculateRealBurnoutScore(emotions: RealEmotionData): {
  score: number;
  level: 'Low' | 'Medium' | 'High';
  confidence: number;
} {
  // Logical burnout calculation based on real emotions
  const negativeEmotions = emotions.sad + emotions.angry + emotions.fear + emotions.disgust;
  const positiveEmotions = emotions.happy;
  const neutralState = emotions.neutral;
  
  // Eye fatigue and attention are strong indicators
  const fatigueFactor = emotions.eye_fatigue * 0.3;
  const attentionFactor = (1 - emotions.attention) * 0.2;
  
  // Emotion-based factors
  const negativeFactor = negativeEmotions * 0.3;
  const positiveFactor = (1 - positiveEmotions) * 0.1;
  const neutralFactor = (1 - neutralState) * 0.1;
  
  const burnoutScore = fatigueFactor + attentionFactor + negativeFactor + positiveFactor + neutralFactor;
  
  const score = Math.round(burnoutScore * 10);
  let level: 'Low' | 'Medium' | 'High' = 'Low';
  if (score >= 7) level = 'High';
  else if (score >= 4) level = 'Medium';
  
  return { 
    score, 
    level, 
    confidence: emotions.confidence 
  };
}

// Real-time emotion tracking with optimized performance
export class RealEmotionTracker {
  private history: RealEmotionData[] = [];
  private maxHistory = 20; // Reduced from 30 for better performance
  private lastAverage: RealEmotionData | null = null;
  private cacheTimeout: number | null = null;
  
  addEmotionData(emotions: RealEmotionData) {
    this.history.push(emotions);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    
    // Clear cache when new data is added
    if (this.cacheTimeout) {
      clearTimeout(this.cacheTimeout);
    }
  }

  getAverageEmotions(): RealEmotionData {
    // Return cached result if available and recent
    if (this.lastAverage && this.history.length > 0) {
      return this.lastAverage;
    }

    if (this.history.length === 0) {
      return {
        happy: 0, sad: 0, angry: 0, neutral: 0,
        fear: 0, surprise: 0, disgust: 0,
        attention: 0, eye_fatigue: 0, confidence: 0
      };
    }

    // Use only last 10 values for more responsive averages
    const recentHistory = this.history.slice(-10);
    const sum = recentHistory.reduce((acc, emotions) => {
      acc.happy += emotions.happy;
      acc.sad += emotions.sad;
      acc.angry += emotions.angry;
      acc.neutral += emotions.neutral;
      acc.fear += emotions.fear;
      acc.surprise += emotions.surprise;
      acc.disgust += emotions.disgust;
      acc.attention += emotions.attention;
      acc.eye_fatigue += emotions.eye_fatigue;
      acc.confidence += emotions.confidence;
      return acc;
    }, {
      happy: 0, sad: 0, angry: 0, neutral: 0,
      fear: 0, surprise: 0, disgust: 0,
      attention: 0, eye_fatigue: 0, confidence: 0
    });

    const count = recentHistory.length;
    const average = {
      happy: sum.happy / count,
      sad: sum.sad / count,
      angry: sum.angry / count,
      neutral: sum.neutral / count,
      fear: sum.fear / count,
      surprise: sum.surprise / count,
      disgust: sum.disgust / count,
      attention: sum.attention / count,
      eye_fatigue: sum.eye_fatigue / count,
      confidence: sum.confidence / count
    };
    
    // Cache the result
    this.lastAverage = average;
    
    // Set cache timeout to refresh periodically
    this.cacheTimeout = window.setTimeout(() => {
      this.lastAverage = null;
    }, 2000);
    
    return average;
  }

  clear() {
    this.history = [];
    this.lastAverage = null;
    if (this.cacheTimeout) {
      clearTimeout(this.cacheTimeout);
      this.cacheTimeout = null;
    }
  }
}
