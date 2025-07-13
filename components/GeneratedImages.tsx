"use client";

import { useState } from "react";
import Image from "next/image";
import { useImageStore, type GeneratedImage } from "@/lib/store/image-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Download, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function GeneratedImages() {
  const { images, removeImage } = useImageStore();
  const [fallbackStates, setFallbackStates] = useState<Record<string, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, string | null>>({});
  
  // Debug: Log images when they change
  console.log('Current images in store:', images);

  const setFallbackState = (imageId: string, index: number, useFallback: boolean) => {
    const key = `${imageId}-${index}`;
    setFallbackStates(prev => ({ ...prev, [key]: useFallback }));
  };

  const setImageError = (imageId: string, index: number, error: string | null) => {
    const key = `${imageId}-${index}`;
    setImageErrors(prev => ({ ...prev, [key]: error }));
  };

  const getFallbackState = (imageId: string, index: number) => {
    const key = `${imageId}-${index}`;
    return fallbackStates[key] || false;
  };

  const getImageError = (imageId: string, index: number) => {
    const key = `${imageId}-${index}`;
    return imageErrors[key] || null;
  };

  if (images.length === 0) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle>Generated Images</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>No images generated yet. Start by creating your first image!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: GeneratedImage['status']) => {
    switch (status) {
      case 'generating':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: GeneratedImage['status']) => {
    switch (status) {
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <div className="h-4 w-4 rounded-full bg-green-500" />;
      case 'error':
        return <div className="h-4 w-4 rounded-full bg-red-500" />;
      default:
        return null;
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Generated Images ({images.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {images.map((image) => (
          <Card key={image.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(image.status)}
                  <Badge className={getStatusColor(image.status)}>
                    {image.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeImage(image.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Parameters */}
              <div className="mb-3 text-sm text-muted-foreground">
                <p><strong>Model:</strong> {image.parameters.model}</p>
                <p><strong>Prompt:</strong> {image.parameters.prompt}</p>
                <p><strong>Aspect Ratio:</strong> {image.parameters.aspectRatio}</p>
                <p><strong>Created:</strong> {formatDistanceToNow(image.createdAt, { addSuffix: true })}</p>
              </div>

              {/* Images */}
              {image.status === 'generating' && (
                <div className="flex items-center justify-center h-32 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Generating images...</span>
                  </div>
                </div>
              )}

              {image.status === 'error' && (
                <div className="flex items-center justify-center h-32 bg-red-50 rounded-lg">
                  <div className="text-center text-red-600">
                    <p className="font-medium">Generation failed</p>
                    <p className="text-sm">{image.error}</p>
                  </div>
                </div>
              )}

              {image.status === 'completed' && image.urls.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {image.urls.map((url, index) => {
                    const useFallback = getFallbackState(image.id, index);
                    const imageError = getImageError(image.id, index);
                    
                    return (
                      <div key={index} className="relative group">
                        <div className="relative w-full h-auto rounded-lg border overflow-hidden">
                          <img
                            src={url}
                            alt={`Generated image ${index + 1}`}
                            className="w-full h-auto rounded-lg"
                            style={{ 
                              display: 'block',
                              width: '100%',
                              height: 'auto',
                              objectFit: 'cover',
                              position: 'relative',
                              zIndex: 1
                            }}
                            onLoad={() => {
                              console.log('Image loaded successfully:', url);
                              setImageError(image.id, index, null);
                            }}
                            onError={(e) => {
                              console.error('Image failed to load:', url);
                              setImageError(image.id, index, 'Image failed to load');
                            }}
                          />
                          
                          {/* Show error message if image failed */}
                          {imageError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-600 text-sm p-2 text-center">
                              <p>Failed to load image</p>
                            </div>
                          )}
                          
                          {/* Download button overlay */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              onClick={() => downloadImage(url, `generated-image-${index + 1}.${image.parameters.outputFormat}`)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}