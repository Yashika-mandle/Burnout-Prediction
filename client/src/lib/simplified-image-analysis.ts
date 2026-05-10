
import * as faceapi from 'face-api.js';


let modelsLoaded = false;
let modelsLoadingPromise: Promise<void> | null = null;


export interface SimplifiedEmotionResult {
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
}

// Load models globally once
export async function loadModelsOnce(): Promise<void> {
  if (modelsLoaded) {
    console.log('[SIMPLE] Models already loaded, skipping');
    return;
  }
  if (modelsLoadingPromise) {
    console.log('[SIMPLE] Models loading in progress, waiting...');
    return modelsLoadingPromise;
  }

  const LOCAL_MODEL_URL = '/models';
  console.log('[SIMPLE] Starting model loading from:', LOCAL_MODEL_URL);

  modelsLoadingPromise = (async () => {
    try {
      console.log('[SIMPLE] Attempting to load tiny face detector...');
      await faceapi.nets.tinyFaceDetector.loadFromUri(LOCAL_MODEL_URL);
      console.log('[SIMPLE] ✓ Tiny face detector loaded');

      console.log('[SIMPLE] Attempting to load face landmark model...');
      await faceapi.nets.faceLandmark68Net.loadFromUri(LOCAL_MODEL_URL);
      console.log('[SIMPLE] ✓ Face landmark model loaded');

      console.log('[SIMPLE] Attempting to load face expression model...');
      await faceapi.nets.faceExpressionNet.loadFromUri(LOCAL_MODEL_URL);
      console.log('[SIMPLE] ✓ Face expression model loaded');

      modelsLoaded = true;
      console.log('[SIMPLE] ✅ All models loaded successfully from local /models');
      return;
    } catch (localError) {
      console.error('[SIMPLE] ❌ Local model load failed:', localError);
      console.error('[SIMPLE] Error details:', {
        message: localError instanceof Error ? localError.message : String(localError),
        stack: localError instanceof Error ? localError.stack : 'No stack'
      });

      // Try to provide more specific error information
      if (localError instanceof Error && localError.message.includes('404')) {
        throw new Error('Model files not found. Please ensure model files are in /models directory');
      } else if (localError instanceof Error && localError.message.includes('fetch')) {
        throw new Error('Failed to fetch model files. Check network connection and file paths');
      } else {
        throw new Error(`Model loading failed: ${localError instanceof Error ? localError.message : 'Unknown error'}`);
      }
    }
  })();

  return modelsLoadingPromise;
}


// Simple face detection with validation and debugging
export async function detectFaceSimple(imageDataUrl: string): Promise<SimplifiedEmotionResult> {
  console.log('[SIMPLE] ========== STARTING FACE DETECTION PIPELINE ==========');
  console.log('[SIMPLE] Input image data URL length:', imageDataUrl.length);
  
  try {
    // Step 1: Ensure models are loaded
    console.log('[SIMPLE] Step 1: Checking model load status...');
    if (!modelsLoaded) {
      console.log('[SIMPLE] Models not loaded, initiating load...');
      await loadModelsOnce();
      if (!modelsLoaded) {
        throw new Error('Model failed to load');
      }
    }
    console.log('[SIMPLE] ✓ Models confirmed loaded');

    // Step 2: Create image element from data URL
    console.log('[SIMPLE] Step 2: Creating image element from data URL...');
    let imageElement: HTMLImageElement;
    try {
      imageElement = await createImageElement(imageDataUrl);
      console.log('[SIMPLE] ✓ Image element created successfully');
      console.log('[SIMPLE] Image dimensions:', imageElement.width, 'x', imageElement.height);
      console.log('[SIMPLE] Image naturalWidth:', imageElement.naturalWidth, 'naturalHeight:', imageElement.naturalHeight);
    } catch (imageError) {
      console.error('[SIMPLE] ✗ Failed to create image element:', imageError);
      throw imageError;
    }

    // Step 3: Validate image dimensions
    console.log('[SIMPLE] Step 3: Validating image dimensions...');
    if (!imageElement.width || !imageElement.height) {
      throw new Error(`Invalid image dimensions: ${imageElement.width}x${imageElement.height}`);
    }
    if (imageElement.width < 50 || imageElement.height < 50) {
      throw new Error(`Image too small: ${imageElement.width}x${imageElement.height} (minimum 50x50)`);
    }
    console.log('[SIMPLE] ✓ Image dimensions valid');

    // Step 4: First attempt - Moderate settings
    console.log('[SIMPLE] Step 4: First detection attempt (moderate settings)...');
    console.log('[SIMPLE] TinyFaceDetector options: { inputSize: 416, scoreThreshold: 0.3 }');
    
    let detections: any[] = [];
    try {
      detections = await Promise.race([
        faceapi.detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.3
        }))
          .withFaceLandmarks()
          .withFaceExpressions(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Detection timeout (8s)')), 8000))
      ]) as any[];
      
      console.log('[SIMPLE] ✓ First attempt completed:', detections.length, 'faces detected');
      if (detections.length > 0) {
        console.log('[SIMPLE] Detection scores:', detections.map((d: any) => ({
          score: d.detection.score,
          box: { x: Math.round(d.detection.box.x), y: Math.round(d.detection.box.y), w: Math.round(d.detection.box.width), h: Math.round(d.detection.box.height) }
        })));
      }
    } catch (attemptError) {
      console.warn('[SIMPLE] First attempt failed/timeout:', attemptError);
    }

    // Step 5: Retry with lenient settings if no faces found
    if (detections.length === 0) {
      console.log('[SIMPLE] Step 5: No faces detected, retrying with LENIENT settings...');
      console.log('[SIMPLE] TinyFaceDetector options: { inputSize: 320, scoreThreshold: 0.15 }');
      
      try {
        const retryDetections = await Promise.race([
          faceapi.detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.15
          }))
            .withFaceLandmarks()
            .withFaceExpressions(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Detection timeout (5s)')), 5000))
        ]) as any[];
        
        console.log('[SIMPLE] ✓ Retry completed:', retryDetections.length, 'faces detected');
        if (retryDetections.length > 0) {
          detections = retryDetections;
          console.log('[SIMPLE] Detection scores:', detections.map((d: any) => ({
            score: d.detection.score,
            box: { x: Math.round(d.detection.box.x), y: Math.round(d.detection.box.y), w: Math.round(d.detection.box.width), h: Math.round(d.detection.box.height) }
          })));
        }
      } catch (retryError) {
        console.warn('[SIMPLE] Retry failed/timeout:', retryError);
      }
    }

    // Step 6: Ultra-lenient fallback if still no faces
    if (detections.length === 0) {
      console.log('[SIMPLE] Step 6: ULTRA-LENIENT fallback attempt...');
      console.log('[SIMPLE] TinyFaceDetector options: { inputSize: 224, scoreThreshold: 0.05 }');
      
      try {
        const fallbackDetections = await Promise.race([
          faceapi.detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.05
          }))
            .withFaceLandmarks()
            .withFaceExpressions(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Detection timeout (3s)')), 3000))
        ]) as any[];
        
        console.log('[SIMPLE] ✓ Fallback completed:', fallbackDetections.length, 'faces detected');
        if (fallbackDetections.length > 0) {
          detections = fallbackDetections;
          console.log('[SIMPLE] Detection scores:', detections.map((d: any) => ({
            score: d.detection.score,
            box: { x: Math.round(d.detection.box.x), y: Math.round(d.detection.box.y), w: Math.round(d.detection.box.width), h: Math.round(d.detection.box.height) }
          })));
        }
      } catch (fallbackError) {
        console.warn('[SIMPLE] Fallback failed/timeout:', fallbackError);
      }
    }

    // Step 7: Check if we have exactly ONE face
    console.log('[SIMPLE] Step 7: Processing detection results...');
    if (detections.length === 0) {
      console.log('[SIMPLE] ✗ NO FACES DETECTED after all attempts');
      console.log('[SIMPLE] This usually means:');
      console.log('[SIMPLE]   - Image does not contain a visible face');
      console.log('[SIMPLE]   - Image quality is too poor');
      console.log('[SIMPLE]   - Face is too small or obscured');
      console.log('[SIMPLE] ========== DETECTION PIPELINE FAILED ==========');
      return {
        emotions: { happy: 0, sad: 0, angry: 0, neutral: 0, fear: 0, surprise: 0, disgust: 0 },
        confidence: 0,
        faceDetected: false,
        faceCount: 0
      };
    }

    if (detections.length > 1) {
      console.log('[SIMPLE] ✗ MULTIPLE FACES DETECTED:', detections.length, '- rejecting image');
      console.log('[SIMPLE] System requires exactly ONE face per image');
      console.log('[SIMPLE] ========== DETECTION PIPELINE FAILED ==========');
      return {
        emotions: { happy: 0, sad: 0, angry: 0, neutral: 0, fear: 0, surprise: 0, disgust: 0 },
        confidence: 0,
        faceDetected: false,
        faceCount: detections.length
      };
    }

    // Step 8: Process detected face
    console.log('[SIMPLE] Step 8: Processing detected face...');
    const detection = detections[0];
    const expressions = detection.expressions;
    
    const faceConfidence = detection.detection.score || 0.8;
    console.log('[SIMPLE] Primary face detection score:', faceConfidence);
    
    const emotions = {
      happy: expressions.happy || 0,
      sad: expressions.sad || 0,
      angry: expressions.angry || 0,
      neutral: expressions.neutral || 0,
      fear: expressions.fearful || 0,
      surprise: expressions.surprised || 0,
      disgust: expressions.disgusted || 0
    };
    
    // Allow faces with score as low as 0.25
    const confidence = Math.max(0.25, Math.min(0.99, faceConfidence));
    
    console.log('[SIMPLE] ✓ Face analysis complete:');
    console.log('[SIMPLE]   Emotions:', emotions);
    console.log('[SIMPLE]   Confidence:', confidence);
    console.log('[SIMPLE]   Bounding box:', { x: detection.detection.box.x, y: detection.detection.box.y, w: detection.detection.box.width, h: detection.detection.box.height });
    console.log('[SIMPLE] ========== DETECTION PIPELINE SUCCESS ==========');
    
    return {
      emotions,
      confidence,
      faceDetected: true,
      faceCount: detections.length
    };
    
  } catch (error) {
    console.error('[SIMPLE] ✗ FATAL ERROR during face detection:', error);
    console.error('[SIMPLE] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'N/A'
    });
    console.log('[SIMPLE] ========== DETECTION PIPELINE FAILED ==========');

    // Return no face detected on error
    return {
      emotions: { happy: 0, sad: 0, angry: 0, neutral: 0, fear: 0, surprise: 0, disgust: 0 },
      confidence: 0,
      faceDetected: false,
      faceCount: 0
    };
  }
}

// Helper function to create image element with comprehensive error handling
function createImageElement(imageDataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    console.log('[SIMPLE] createImageElement: Starting image load...');
    
    // Validate input
    if (!imageDataUrl) {
      reject(new Error('No image data URL provided'));
      return;
    }
    
    if (!imageDataUrl.startsWith('data:image/') && !imageDataUrl.startsWith('blob:')) {
      console.warn('[SIMPLE] createImageElement: Unusual image URL format:', imageDataUrl.substring(0, 50));
    }
    
    const img = new Image();
    
    // Set timeout for image loading
    const timeoutId = setTimeout(() => {
      console.error('[SIMPLE] createImageElement: Image load timeout (10s)');
      reject(new Error('Image load timeout after 10 seconds'));
    }, 10000);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      console.log('[SIMPLE] createImageElement: Image loaded successfully');
      console.log('[SIMPLE] createImageElement: Dimensions - width:', img.width, 'height:', img.height);
      console.log('[SIMPLE] createImageElement: Natural dimensions - width:', img.naturalWidth, 'height:', img.naturalHeight);
      
      // Validate dimensions
      if (img.width === 0 || img.height === 0) {
        console.error('[SIMPLE] createImageElement: Invalid dimensions (0x0)');
        reject(new Error('Image has invalid dimensions (0x0)'));
        return;
      }
      
      resolve(img);
    };
    
    img.onerror = (error) => {
      clearTimeout(timeoutId);
      console.error('[SIMPLE] createImageElement: Image load failed:', error);
      console.error('[SIMPLE] createImageElement: Error event:', error);
      reject(new Error('Failed to load image - error event triggered'));
    };
    
    img.onabort = () => {
      clearTimeout(timeoutId);
      console.error('[SIMPLE] createImageElement: Image load aborted');
      reject(new Error('Image load was aborted'));
    };
    
    console.log('[SIMPLE] createImageElement: Setting image src...');
    img.src = imageDataUrl;
    
    // Check if image is already loaded (cached)
    if (img.complete) {
      console.log('[SIMPLE] createImageElement: Image appears to be cached/already loaded');
      clearTimeout(timeoutId);
      if (img.width && img.height) {
        resolve(img);
      } else {
        reject(new Error('Cached image has invalid dimensions'));
      }
    }
  });
}

// Check if models are loaded and ready
export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

// Get model loading status
export function getModelLoadingStatus(): string {
  if (modelsLoaded) return 'loaded';
  if (modelsLoadingPromise) return 'loading';
  return 'not_loaded';
}
