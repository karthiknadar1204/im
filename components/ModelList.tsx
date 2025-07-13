"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Download, Trash2, Brain, Plus, Sparkles } from "lucide-react";

interface Model {
  id: number;
  modelName: string;
  gender: string;
  status: string;
  trainingProgress: number;
  createdAt: string;
  completedAt?: string;
  modelId?: string;
  version?: string;
  errorMessage?: string;
}

export default function ModelList() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/models');
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      const data = await response.json();
      setModels(data.models || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { 
        className: "bg-gray-100 text-gray-700 border-gray-200",
        text: "Pending",
        icon: "⏳"
      },
      starting: { 
        className: "bg-blue-50 text-blue-700 border-blue-200",
        text: "Starting",
        icon: "🚀"
      },
      training: { 
        className: "bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-sm",
        text: "Training",
        icon: "⚡"
      },
      processing: { 
        className: "bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0 shadow-sm",
        text: "Processing",
        icon: "🔄"
      },
      completed: { 
        className: "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-sm",
        text: "Completed",
        icon: "✅"
      },
      failed: { 
        className: "bg-gradient-to-r from-red-500 to-pink-600 text-white border-0 shadow-sm",
        text: "Failed",
        icon: "❌"
      },
      canceled: { 
        className: "bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-sm",
        text: "Canceled",
        icon: "⏹️"
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${config.className}`}>
        <span>{config.icon}</span>
        <span>{config.text}</span>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleUseModel = (model: Model) => {
    console.log('Using model:', model);
    if (model.status === 'completed' && model.modelId && model.version) {
      // Redirect to image generation with model parameters
      window.location.href = `/image-generation?model_id=${model.modelId}:${model.version}`;
    } else {
      console.log('Model not ready for use:', model);
    }
  };

  const handleDownloadModel = (model: Model) => {
    // TODO: Implement model download logic
    console.log('Downloading model:', model);
  };

  const handleDeleteModel = async (modelId: number) => {
    if (!confirm('Are you sure you want to delete this model? This action cannot be undone.')) return;
    console.log(modelId)
    
    try {
      const response = await fetch(`/api/models/${modelId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Model deleted successfully:', result);
        setModels(models.filter(model => model.id !== modelId));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete model');
      }
    } catch (err) {
      console.error('Error deleting model:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete model');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading models...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchModels} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="relative mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
            <Brain className="w-12 h-12 text-blue-600" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No models yet
        </h3>
        <p className="text-gray-600 mb-6 max-w-md">
          You haven't trained any models yet. Start by creating your first AI model with your own training data.
        </p>
        
        <div className="space-y-3">
          <Button 
            onClick={() => window.location.href = '/model-training'}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Train Your First Model
          </Button>
          
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span>Upload training data</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span>Train your model</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
              <span>Generate images</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {models.map((model) => (
          <Card 
            key={model.id} 
            className="group relative overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50/50 hover:from-white hover:to-blue-50/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
          >
            {/* Status indicator bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${
              model.status === 'completed' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
              model.status === 'training' || model.status === 'processing' ? 'bg-gradient-to-r from-blue-400 to-purple-500' :
              model.status === 'failed' || model.status === 'canceled' ? 'bg-gradient-to-r from-red-400 to-pink-500' :
              'bg-gradient-to-r from-gray-400 to-gray-500'
            }`} />
            
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {model.modelName}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className={`w-2 h-2 rounded-full ${
                      model.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'
                    }`} />
                    <span className="capitalize font-medium">{model.gender}</span>
                    <span className="text-gray-400">•</span>
                    <span>{formatDate(model.createdAt)}</span>
                  </div>
                </div>
                <div className="ml-4">
                  {getStatusBadge(model.status)}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Training Progress */}
                {model.status === 'training' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Training Progress</span>
                      <span className="text-sm font-bold text-blue-600">{model.trainingProgress}%</span>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500 ease-out shadow-sm"
                          style={{ width: `${model.trainingProgress}%` }}
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                    </div>
                  </div>
                )}
                
                {/* Error Message */}
                {model.errorMessage && (
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-sm text-red-700 font-medium">{model.errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Model Info */}
                {(model.modelId || model.version) && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {model.version && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Version:</span>
                        <code className="bg-white px-2 py-1 rounded text-xs font-mono text-gray-700 border">
                          {model.version}
                        </code>
                      </div>
                    )}
                    {model.modelId && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Model ID:</span>
                        <code className="bg-white px-2 py-1 rounded text-xs font-mono text-gray-700 border">
                          {model.modelId}
                        </code>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {model.status === 'completed' && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => handleUseModel(model)}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Use Model
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDownloadModel(model)}
                        className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  
                  {model.status === 'failed' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleUseModel(model)}
                      className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400 transition-all duration-200"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Retry Training
                    </Button>
                  )}

                  {model.status === 'pending' || model.status === 'starting' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 border-gray-300 text-gray-600 cursor-not-allowed opacity-60"
                      disabled
                    >
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </Button>
                  )}
                  
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleDeleteModel(model.id)}
                    className="text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 group-hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 