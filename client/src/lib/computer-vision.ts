// Computer Vision utilities for emotion detection and burnout analysis

export interface EmotionData {
  stress: number;
  fatigue: number;
  sadness: number;
  anxiety: number;
  happiness: number;
  neutral: number;
  attention: number;
  eye_fatigue: number;
}

export interface FaceDetectionResult {
  faces: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
  emotions: EmotionData;
}

// Simulate face detection - in real implementation would use face-api.js or MediaPipe
export function detectFaces(imageData: string): Promise<FaceDetectionResult> {
  return new Promise((resolve) => {
    // Simulate processing delay
    setTimeout(() => {
      const emotions: EmotionData = {
        stress: Math.random() * 0.8,
        fatigue: Math.random() * 0.7,
        sadness: Math.random() * 0.6,
        anxiety: Math.random() * 0.5,
        happiness: Math.random() * 0.4,
        neutral: Math.random() * 0.3,
        attention: Math.random() * 0.9,
        eye_fatigue: Math.random() * 0.6
      };

      const faces = [
        {
          x: Math.random() * 100,
          y: Math.random() * 100,
          width: 150 + Math.random() * 50,
          height: 150 + Math.random() * 50,
          confidence: 0.8 + Math.random() * 0.2
        }
      ];

      resolve({ faces, emotions });
    }, 500 + Math.random() * 1000);
  });
}

// Calculate burnout score from emotions
export function calculateBurnoutScore(emotions: EmotionData): {
  score: number;
  level: 'Low' | 'Medium' | 'High';
  confidence: number;
} {
  const stressWeight = 0.3;
  const fatigueWeight = 0.25;
  const anxietyWeight = 0.2;
  const sadnessWeight = 0.15;
  const attentionWeight = 0.1;
  
  const weightedScore = 
    (emotions.stress * stressWeight) +
    (emotions.fatigue * fatigueWeight) +
    (emotions.anxiety * anxietyWeight) +
    (emotions.sadness * sadnessWeight) +
    ((1 - emotions.attention) * attentionWeight);
  
  const score = Math.round(weightedScore * 10);
  let level: 'Low' | 'Medium' | 'High' = 'Low';
  if (score >= 7) level = 'High';
  else if (score >= 4) level = 'Medium';
  
  const confidence = 0.75 + Math.random() * 0.2; // 75-95% confidence
  
  return { score, level, confidence };
}

// Real-time emotion tracking
export class EmotionTracker {
  private history: EmotionData[] = [];
  private maxHistory = 30; // Keep last 30 frames

  addEmotionData(emotions: EmotionData) {
    this.history.push(emotions);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  getAverageEmotions(): EmotionData {
    if (this.history.length === 0) {
      return {
        stress: 0, fatigue: 0, sadness: 0, anxiety: 0,
        happiness: 0, neutral: 0, attention: 0, eye_fatigue: 0
      };
    }

    const sum = this.history.reduce((acc, emotions) => {
      Object.keys(emotions).forEach(key => {
        acc[key as keyof EmotionData] += emotions[key as keyof EmotionData];
      });
      return acc;
    }, {
      stress: 0, fatigue: 0, sadness: 0, anxiety: 0,
      happiness: 0, neutral: 0, attention: 0, eye_fatigue: 0
    });

    const count = this.history.length;
    return {
      stress: sum.stress / count,
      fatigue: sum.fatigue / count,
      sadness: sum.sadness / count,
      anxiety: sum.anxiety / count,
      happiness: sum.happiness / count,
      neutral: sum.neutral / count,
      attention: sum.attention / count,
      eye_fatigue: sum.eye_fatigue / count
    };
  }

  getTrend(emotion: keyof EmotionData): 'increasing' | 'decreasing' | 'stable' {
    if (this.history.length < 5) return 'stable';
    
    const recent = this.history.slice(-5);
    const first = recent[0][emotion];
    const last = recent[recent.length - 1][emotion];
    
    const diff = last - first;
    if (Math.abs(diff) < 0.1) return 'stable';
    return diff > 0 ? 'increasing' : 'decreasing';
  }

  clear() {
    this.history = [];
  }
}

// FPS counter for video processing
export class FPSCounter {
  private lastTime = performance.now();
  private frames = 0;
  private fps = 0;

  tick(): number {
    this.frames++;
    const currentTime = performance.now();
    
    if (currentTime - this.lastTime >= 1000) {
      this.fps = this.frames;
      this.frames = 0;
      this.lastTime = currentTime;
    }
    
    return this.fps;
  }

  reset() {
    this.frames = 0;
    this.lastTime = performance.now();
    this.fps = 0;
  }
}
