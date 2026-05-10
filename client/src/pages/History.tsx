import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Trash2, TrendingUp, Edit, Plus, Camera, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/api";
import { motion } from "framer-motion";

type HistoryRecord = {
  id: string;
  timestamp: string;
  burnoutScore?: number;
  burnout_level?: string;
  prediction?: {
    burnout_score: number;
    burnout_level: string;
    suggestions?: string[];
  };
  input_summary?: Record<string, string | number>;
  type?: string;
  imageData?: string;
  emotions?: any;
  confidence?: number;
  recommendations?: string[];
  versionLabel?: string;
  formValues?: Record<string, string>;
};

export default function History() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      setLocation("/auth");
      return;
    }
    loadHistory();
  }, [setLocation]);

  const loadHistory = async (filterType = 'all') => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const username = localStorage.getItem("user") || 'user';
      
      const response = await fetch(`${API_URL}/get-assessments/${username}?filter=${filterType}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setHistory(data.assessments || []);
        setFilter(filterType);
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        toast.error('Failed to load assessment history');
        console.error('History load error:', error);
      }
    } catch (error) {
      toast.error('Failed to load assessment history');
      console.error('History load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBurnoutBadge = (level: string) => {
    switch (level) {
      case "Low":
        return "text-green-700 bg-green-500/15 border-green-400/40";
      case "Medium":
        return "text-yellow-800 bg-yellow-500/15 border-yellow-400/40";
      case "High":
        return "text-red-700 bg-red-500/15 border-red-400/40";
      default:
        return "text-gray-700 bg-white/20 border-white/30";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const rowSummary = (record: HistoryRecord) => {
    if (record.type === 'form' && record.formValues) {
      return Object.entries(record.formValues)
        .slice(0, 4)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ");
    }
    if (record.type === 'upload' || record.type === 'camera') {
      return `Image analysis • Confidence: ${Math.round((record.confidence || 0) * 100)}%`;
    }
    return "—";
  };

  const deleteEntry = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/delete-assessment/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        setHistory((prev) => prev.filter((h) => h.id !== id));
        toast.success("Entry removed");
        // Reload history to ensure consistency
        loadHistory(filter);
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(error.error || "Failed to delete");
      }
    } catch (error) {
      toast.error("Connection error");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-white" size={40} />
          <p className="text-white/90">Loading your history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 md:py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-sm mb-2">
            Your Assessment History
          </h1>
          <p className="text-white/90 max-w-2xl drop-shadow">
            Track your burnout assessments over time and monitor your progress.
          </p>
          
          {/* Filter Buttons */}
          <div className="flex gap-2 mt-4">
            {['all', 'form', 'upload', 'camera'].map((filterType) => (
              <Button
                key={filterType}
                variant={filter === filterType ? "default" : "outline"}
                size="sm"
                onClick={() => loadHistory(filterType)}
                className={filter === filterType ? 
                  "bg-indigo-600 text-white" : 
                  "border-white/30 text-white/90 hover:bg-white/10"
                }
              >
                {filterType === 'all' && <TrendingUp className="mr-1" size={14} />}
                {filterType === 'form' && <FileText className="mr-1" size={14} />}
                {filterType === 'upload' && <Upload className="mr-1" size={14} />}
                {filterType === 'camera' && <Camera className="mr-1" size={14} />}
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {history.length === 0 ? (
          <Card className="glass-card p-12 text-center transition hover:shadow-2xl">
            <TrendingUp className="mx-auto mb-4 text-indigo-200" size={48} />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Assessments Yet</h3>
            <p className="text-gray-700">
              You haven't completed any burnout assessments yet. Head to the dashboard to get started!
            </p>
          </Card>
        ) : (
          <Card className="glass-card overflow-hidden p-0 transition hover:shadow-2xl">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/30 hover:bg-white/10">
                    <TableHead className="text-gray-900 font-semibold">Type</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Timestamp</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Burnout Level</TableHead>
                    <TableHead className="text-gray-900 font-semibold">Score</TableHead>
                    <TableHead className="text-gray-900 font-semibold min-w-[240px]">Details</TableHead>
                    <TableHead className="text-gray-900 font-semibold w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((record, index) => (
                    <TableRow
                      key={record.id || `${record.timestamp}-${index}`}
                      className="border-white/20 transition hover:bg-white/25"
                    >
                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                          {record.type === 'form' && <FileText size={12} />}
                          {record.type === 'upload' && <Upload size={12} />}
                          {record.type === 'camera' && <Camera size={12} />}
                          {record.type || 'unknown'}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-gray-800">{formatDate(record.timestamp)}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getBurnoutBadge(record.prediction?.burnout_level || record.burnout_level || 'Unknown')}`}
                        >
                          {record.prediction?.burnout_level || record.burnout_level || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {record.prediction?.burnout_score || record.burnoutScore || 0}/10
                      </TableCell>
                      <TableCell className="text-gray-800 max-w-xl">{rowSummary(record)}</TableCell>
                      <TableCell className="text-right">
                        {record.id ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-700 hover:text-red-800 hover:bg-red-500/10"
                            onClick={() => deleteEntry(record.id)}
                            aria-label="Delete entry"
                          >
                            <Trash2 size={18} />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {history.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass-card p-6 transition hover:shadow-2xl">
              <h3 className="text-gray-700 text-sm font-semibold mb-2">Total assessments</h3>
              <p className="text-3xl font-bold text-indigo-700">{history.length}</p>
            </Card>
            <Card className="glass-card p-6 transition hover:shadow-2xl">
              <h3 className="text-gray-700 text-sm font-semibold mb-2">Average score</h3>
              <p className="text-3xl font-bold text-indigo-700">
                {(history.reduce((sum, h) => sum + (h.prediction?.burnout_score || h.burnoutScore || 0), 0) / history.length).toFixed(1)}
              </p>
            </Card>
            <Card className="glass-card p-6 transition hover:shadow-2xl">
              <h3 className="text-gray-700 text-sm font-semibold mb-2">Latest score</h3>
              <p className="text-3xl font-bold text-indigo-700">
                {history[0]?.prediction?.burnout_score || history[0]?.burnoutScore || 0}
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
