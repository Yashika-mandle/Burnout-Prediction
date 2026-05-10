import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, BarChart3, TrendingUp, Target, Zap, Shield } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { motion } from "framer-motion";
import { API_URL } from "@/lib/api";

interface MetricsData {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
}

export default function ModelMetrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState({
    confusion: false,
    roc: false
  });

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'accuracy': return <Target className="w-4 h-4" />;
      case 'precision': return <Zap className="w-4 h-4" />;
      case 'recall': return <Shield className="w-4 h-4" />;
      case 'f1_score': return <TrendingUp className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  const getMetricColor = (value: number) => {
    if (value >= 0.9) return 'bg-green-500';
    if (value >= 0.8) return 'bg-blue-500';
    if (value >= 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const chartData = metrics ? [
    { name: 'Accuracy', value: metrics.accuracy, fill: '#3b82f6' },
    { name: 'Precision', value: metrics.precision, fill: '#8b5cf6' },
    { name: 'Recall', value: metrics.recall, fill: '#10b981' },
    { name: 'F1 Score', value: metrics.f1_score, fill: '#f59e0b' },
  ] : [];

  const lineChartData = metrics ? [
    { metric: 'Accuracy', value: metrics.accuracy * 100 },
    { metric: 'Precision', value: metrics.precision * 100 },
    { metric: 'Recall', value: metrics.recall * 100 },
    { metric: 'F1 Score', value: metrics.f1_score * 100 },
  ] : [];

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/metrics.json`);
        if (!response.ok) {
          throw new Error('Metrics not available');
        }
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        setError('Model metrics not available');
        console.error('Error fetching metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <Card className="glass-card p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card className="glass-card p-6">
        <div className="text-center py-8">
          <BarChart3 className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">{error || 'No metrics available'}</p>
          <p className="text-gray-500 text-sm mt-2">
            Train the model to see performance metrics
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-card p-6 hover:shadow-2xl transition border border-white/30">
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center mr-4">
          <TrendingUp className="text-white" size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Model Performance</h3>
          <p className="text-gray-600 text-sm">RandomForest Classifier Metrics</p>
        </div>
      </div>

      {/* Animated Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {Object.entries(metrics).map(([key, value]) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: Object.keys(metrics).indexOf(key) * 0.1 }}
            className="p-4 bg-white/50 rounded-lg border border-white/30"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getMetricIcon(key)}
                <span className="font-medium text-gray-700 capitalize">
                  {key.replace('_', ' ')}
                </span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {(value * 100).toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={value * 100} 
              className="h-2"
              // @ts-ignore
              indicatorClassName={getMetricColor(value)}
            />
          </motion.div>
        ))}
      </div>

      {/* Charts and Images */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="p-4 bg-white/50 rounded-lg border border-white/30"
        >
          <h4 className="font-semibold text-gray-900 mb-4">Performance Overview</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number) => [(value * 100).toFixed(1) + '%', 'Score']}
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Line Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="p-4 bg-white/50 rounded-lg border border-white/30"
        >
          <h4 className="font-semibold text-gray-900 mb-4">Trend Analysis</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number) => [value.toFixed(1) + '%', 'Score']}
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Confusion Matrix and ROC Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Confusion Matrix */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="p-4 bg-white/50 rounded-lg border border-white/30"
        >
          <h4 className="font-semibold text-gray-900 mb-3">Confusion Matrix</h4>
          <div className="relative">
            <img 
              src={`${API_URL}/confusion_matrix.png`} 
              alt="Confusion Matrix" 
              className="w-full h-auto rounded-lg shadow-md"
              onLoad={() => setImagesLoaded(prev => ({ ...prev, confusion: true }))}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            {!imagesLoaded.confusion && (
              <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                <p className="text-gray-500 text-sm">Confusion matrix not available</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ROC Curve */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="p-4 bg-white/50 rounded-lg border border-white/30"
        >
          <h4 className="font-semibold text-gray-900 mb-3">ROC Curve</h4>
          <div className="relative">
            <img 
              src={`${API_URL}/roc_curve.png`} 
              alt="ROC Curve" 
              className="w-full h-auto rounded-lg shadow-md"
              onLoad={() => setImagesLoaded(prev => ({ ...prev, roc: true }))}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            {!imagesLoaded.roc && (
              <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                <p className="text-gray-500 text-sm">ROC curve not available</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </Card>
  );
}
