import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, TrendingDown, Zap, ArrowRight } from "lucide-react";
import ModelMetrics from "@/components/ModelMetrics";

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6 rounded-2xl border border-white/25 bg-white/10 p-6 md:p-8 backdrop-blur-md shadow-xl md:border-0 md:bg-transparent md:p-0 md:shadow-none">
              <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight drop-shadow">
                  Detect Student Burnout
                  <span className="bg-gradient-to-r from-indigo-200 to-purple-200 bg-clip-text text-transparent">
                    {" "}Before It's Too Late
                  </span>
                </h1>
              </div>
              <p className="text-lg text-white/90 leading-relaxed drop-shadow">
                Our AI-powered system analyzes your daily habits and provides personalized insights to help you maintain a healthy balance between studies and well-being.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/dashboard">
                  <a>
                    <Button size="lg" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 w-full sm:w-auto">
                      Get Started <ArrowRight className="ml-2" size={20} />
                    </Button>
                  </a>
                </Link>
                <Link href="/auth">
                  <a>
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      Login
                    </Button>
                  </a>
                </Link>
              </div>


            </div>

            {/* Right Image */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-2xl blur-3xl opacity-30" />
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663458786222/SAs5Ewx48ED2WXxAV3T38j/hero-background-bHBNHCa7PPPcmHBNFN53Qc.webp"
                alt="Student wellness"
                className="relative rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow">
              Why Choose BurnoutAI?
            </h2>
            <p className="text-lg text-white/90 max-w-2xl mx-auto drop-shadow">
              Our comprehensive platform combines AI technology with wellness insights to support your mental health journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="glass-card p-8 hover:shadow-2xl transition border border-white/30">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <Brain className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">AI Prediction</h3>
              <p className="text-gray-700">
                Advanced machine learning algorithms analyze your daily habits to predict burnout risk with high accuracy.
              </p>
            </Card>

            {/* Feature 2 */}
            <Card className="glass-card p-8 hover:shadow-2xl transition border border-white/30">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <TrendingDown className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Mental Health Monitoring</h3>
              <p className="text-gray-700">
                Track your mental health metrics over time and receive personalized recommendations for improvement.
              </p>
            </Card>

            {/* Feature 3 */}
            <Card className="glass-card p-8 hover:shadow-2xl transition border border-white/30">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-4">
                <Zap className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Actionable Insights</h3>
              <p className="text-gray-700">
                Get specific, personalized suggestions to reduce burnout and improve your overall well-being.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Model Metrics Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow">
              Model Performance
            </h2>
            <p className="text-lg text-white/90 max-w-2xl mx-auto drop-shadow">
              See how our AI model performs with real-time accuracy metrics and visualization.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <ModelMetrics />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow">
              How It Works
            </h2>
            <p className="text-lg text-white/90 max-w-2xl mx-auto drop-shadow">
              Choose your preferred assessment method and get instant insights.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="text-center rounded-2xl glass-card p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Choose Mode</h3>
              <p className="text-gray-700">
                Use form, camera, or image upload.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center rounded-2xl glass-card p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Analyze</h3>
              <p className="text-gray-700">
                System checks emotions and stress patterns.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center rounded-2xl glass-card p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">View Results</h3>
              <p className="text-gray-700">
                Get burnout score and recommendations.
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center rounded-2xl glass-card p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                4
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Track History</h3>
              <p className="text-gray-700">
                Monitor previous assessments and progress.
              </p>
            </div>
          </div>

          {/* Assessment Mode Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            {/* Form Assessment */}
            <div className="text-center rounded-2xl glass-card p-6 border-2 border-blue-200">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Brain className="text-white" size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Form Assessment</h3>
              <p className="text-gray-700 text-sm">
                Comprehensive questionnaire about study habits, sleep, mental health, and lifestyle factors.
              </p>
            </div>

            {/* Camera Assessment */}
            <div className="text-center rounded-2xl glass-card p-6 border-2 border-green-200">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="text-white" size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Camera AI Analysis</h3>
              <p className="text-gray-700 text-sm">
                Real-time webcam analysis with instant emotion detection and burnout scoring.
              </p>
            </div>

            {/* Upload Image */}
            <div className="text-center rounded-2xl glass-card p-6 border-2 border-purple-200">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingDown className="text-white" size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Image Analysis</h3>
              <p className="text-gray-700 text-sm">
                Upload a photo for detailed AI emotion analysis and personalized recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Take Control of Your Well-Being?
          </h2>
          <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
            Join thousands of students who are using BurnoutAI to maintain a healthy balance and prevent burnout.
          </p>
          <Link href="/dashboard">
            <a>
              <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100">
                Get Started Now <ArrowRight className="ml-2" size={20} />
              </Button>
            </a>
          </Link>
        </div>
      </section>
    </div>
  );
}
