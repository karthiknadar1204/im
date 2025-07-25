"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Image as ImageIcon, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getUserImages } from "@/app/actions/image-actions";

interface GalleryImage {
  id: number;
  createdAt: string;
  model: string;
  prompt: string;
  guidance: number;
  numInferenceSteps: number;
  outputFormat: string;
  width: number;
  height: number;
  aspectRatio: string;
  imageUrls: string[];
}

export function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackStates, setFallbackStates] = useState<Record<string, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, string | null>>({});
  const [useDirectImages, setUseDirectImages] = useState(true); // Start with direct img tags
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        const result = await getUserImages();
        
        if (result.success && result.data) {
          setImages(result.data);
        } else {
          setError(result.error || "Failed to fetch images");
        }
      } catch (err) {
        setError("An unexpected error occurred");
        console.error("Error fetching images:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const migrateExpiredImages = async () => {
    try {
      setMigrating(true);
      const response = await fetch('/api/migrate-images', {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Migration result:', result);
        
        // Refresh the images
        const imagesResult = await getUserImages();
        if (imagesResult.success && imagesResult.data) {
          setImages(imagesResult.data);
        }
        
        alert(`Migration completed! Migrated: ${result.migratedCount}, Failed: ${result.failedCount}`);
      } else {
        alert('Migration failed. Please try again.');
      }
    } catch (error) {
      console.error('Error migrating images:', error);
      alert('Migration failed. Please try again.');
    } finally {
      setMigrating(false);
    }
  };

  const setFallbackState = (imageId: number, index: number, useFallback: boolean) => {
    const key = `${imageId}-${index}`;
    setFallbackStates(prev => ({ ...prev, [key]: useFallback }));
  };

  const setImageError = (imageId: number, index: number, error: string | null) => {
    const key = `${imageId}-${index}`;
    setImageErrors(prev => ({ ...prev, [key]: error }));
  };

  const getFallbackState = (imageId: number, index: number) => {
    const key = `${imageId}-${index}`;
    return fallbackStates[key] || false;
  };

  const getImageError = (imageId: number, index: number) => {
    const key = `${imageId}-${index}`;
    return imageErrors[key] || null;
  };

  if (loading) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle>My Images</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading your images...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle>My Images</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-red-600">
            <div className="text-center">
              <p className="font-medium">Error loading images</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (images.length === 0) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle>My Images</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No images yet</p>
            <p className="text-sm text-center">
              Start generating images to see them appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>My Images ({images.length})</CardTitle>
          {/* <Button
            variant="outline"
            size="sm"
            onClick={migrateExpiredImages}
            disabled={migrating}
          >
            {migrating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {migrating ? 'Migrating...' : 'Fix Expired Images'}
          </Button> */}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        
        {images.map((image) => (
          <Card key={image.id} className="overflow-hidden">
            <CardContent className="p-6">
              {/* Image Details Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{image.model}</Badge>
                    <Badge variant="outline">{image.aspectRatio}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Created {formatDistanceToNow(new Date(image.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Prompt */}
              {image.prompt && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-1">Prompt:</p>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {image.prompt}
                  </p>
                </div>
              )}

              {/* Parameters */}
              <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Guidance:</span> {image.guidance}
                </div>
                <div>
                  <span className="font-medium">Steps:</span> {image.numInferenceSteps}
                </div>
                <div>
                  <span className="font-medium">Format:</span> {image.outputFormat}
                </div>
                {image.width && image.height && (
                  <div>
                    <span className="font-medium">Size:</span> {image.width}×{image.height}
                  </div>
                )}
              </div>

              {/* Images Grid */}
              {image.imageUrls && image.imageUrls.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {image.imageUrls.map((url, index) => {
                    const useFallback = getFallbackState(image.id, index);
                    const imageError = getImageError(image.id, index);
                    
                    return (
                      <div key={index} className="relative group">
                        <div className="aspect-square relative overflow-hidden rounded-lg border bg-muted">
                          <img
                            src={url}
                            alt={`Generated image ${index + 1}`}
                            className="w-full h-full object-cover"
                            style={{ 
                              display: 'block',
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              position: 'relative',
                              zIndex: 1
                            }}
                            onError={(e) => {
                              console.error('Image failed to load:', url);
                              setImageError(image.id, index, 'Image failed to load');
                            }}
                            onLoad={(e) => {
                              console.log('Image loaded successfully:', url);
                              setImageError(image.id, index, null);
                            }}
                          />
                          
                          {/* Show error message if image failed */}
                          {imageError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-600 text-sm p-2 text-center">
                              <p>Image expired or unavailable</p>
                              <p className="text-xs mt-1">This image URL has expired</p>
                            </div>
                          )}
                          
                          {/* Download button overlay */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              onClick={() => downloadImage(url, `generated-image-${image.id}-${index + 1}.${image.outputFormat}`)}
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
              ) : (
                <div className="flex items-center justify-center h-32 bg-muted rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">All images expired</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
} 