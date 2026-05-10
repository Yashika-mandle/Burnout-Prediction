
import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let emotionModel: any = null;

export interface OptimizedEmotionResult {
  emotions: {
    happy: number;
    sad: number;
    angry: number;
    neutral: number;
    fear: number;
    surprise: number;
    disgust: number;
  };
  confidence: number;
  faceDetected: boolean;
  faceCount: number;
  stress: number;
  fatigue: number;
  attention: number;
}

export async function preloadModels(): Promise<void> {
  if (modelsLoaded) return;
  
  console.log('[CNN] Preloading optimized models...');
  
  try {
   
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('/models')
    ]);
    
    modelsLoaded = true;
    console.log('[CNN] Models preloaded successfully');
  } catch (error) {
    console.error('[CNN] Model preloading failed:', error);
    modelsLoaded = false;
  }
}


export async function analyzeImageOptimized(imageDataUrl: string): Promise<OptimizedEmotionResult> {
  console.log('[CNN] Starting optimized image analysis...');
  
  try {
    
    const imageElement = await createImageElement(imageDataUrl);
    
   
    if (!modelsLoaded) {
      console.log('[CNN] Models not loaded, waiting...');
      await preloadModels();
    }
    
   
    console.log('[CNN] Detecting faces...');
    const detections = await Promise.race([
      faceapi.detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Face detection timeout')), 8000))
    ]) as any[];
    
    console.log('[CNN] Face detection completed:', detections.length, 'faces found');
    
    if (detections.length === 0) {
      console.log('[CNN] No faces detected');
      return {
        emotions: {
          happy: 0, sad: 0, angry: 0, neutral: 0,
          fear: 0, surprise: 0, disgust: 0
        },
        confidence: 0,
        faceDetected: false,
        faceCount: 0,
        stress: 0,
        fatigue: 0,
        attention: 0
      };
    }
    
    if (detections.length > 1) {
      console.log('[CNN] Multiple faces detected');
      return {
        emotions: {
          happy: 0, sad: 0, angry: 0, neutral: 0,
          fear: 0, surprise: 0, disgust: 0
        },
        confidence: 0,
        faceDetected: false,
        faceCount: detections.length,
        stress: 0,
        fatigue: 0,
        attention: 0
      };
    }
    
   
    const detection = detections[0];
    const expressions = detection.expressions;
    
   
    const emotions = {
      happy: expressions.happy || 0,
      sad: expressions.sad || 0,
      angry: expressions.angry || 0,
      neutral: expressions.neutral || 0,
      fear: expressions.fearful || 0,
      surprise: expressions.surprised || 0,
      disgust: expressions.disgusted || 0
    };
    
    // Calculate confidence based on detection quality
    const confidence = Math.max(0.3, Math.min(0.95, detection.detection.score || 0.8));
    
    // Calculate derived metrics for burnout analysis
    const negativeEmotions = emotions.sad + emotions.angry + emotions.fear + emotions.disgust;
    const positiveEmotions = emotions.happy;
    const neutralState = emotions.neutral;
    
    // Enhanced stress calculation
    const stress = Math.min(1.0, (negativeEmotions * 0.6) + ((1 - positiveEmotions) * 0.3) + ((1 - neutralState) * 0.1));
    
    // Enhanced fatigue calculation (based on facial expressions)
    const fatigue = Math.min(1.0, (emotions.sad * 0.4) + (emotions.neutral * 0.3) + ((1 - emotions.happy) * 0.3));
    
    // Enhanced attention calculation
    const attention = Math.max(0.1, Math.min(1.0, positiveEmotions + (1 - negativeEmotions) + neutralState));
    
    console.log('[CNN] Analysis completed:', {
      emotions,
      confidence,
      stress,
      fatigue,
      attention
    });
    
    return {
      emotions,
      confidence,
      faceDetected: true,
      faceCount: 1,
      stress,
      fatigue,
      attention
    };
    
  } catch (error) {
    console.error('[CNN] Analysis failed:', error);
    
    // Return fallback result on error
    return {
      emotions: {
        happy: 0, sad: 0, angry: 0, neutral: 0,
          fear: 0, surprise: 0, disgust: 0
      },
      confidence: 0,
      faceDetected: false,
      faceCount: 0,
      stress: 0,
      fatigue: 0,
      attention: 0
    };
  }
}

// Helper function to create image element
function createImageElement(imageDataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

// Initialize models on module load
if (typeof window !== 'undefined') {
  preloadModels().catch(console.error);
}
