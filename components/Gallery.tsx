"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Image as ImageIcon, RefreshCw, ChevronLeft, ChevronRight, Brain, ChevronDown, X, Info } from "lucide-react";
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
  const [currentImageIndex, setCurrentImageIndex] = useState<Record<number, number>>({});
  const carouselRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [expandedModels, setExpandedModels] = useState<Record<number, boolean>>({});
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);

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

  const getCurrentImageIndex = (imageId: number) => {
    return currentImageIndex[imageId] || 0;
  };

  const setCurrentImageIndexForId = (imageId: number, index: number) => {
    setCurrentImageIndex(prev => ({ ...prev, [imageId]: index }));
  };

  const navigateImage = (imageId: number, direction: 'prev' | 'next', totalImages: number) => {
    const currentIndex = getCurrentImageIndex(imageId);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : totalImages - 1;
    } else {
      newIndex = currentIndex < totalImages - 1 ? currentIndex + 1 : 0;
    }
    
    setCurrentImageIndexForId(imageId, newIndex);
    
    // Scroll to the new image
    const carousel = carouselRefs.current[imageId];
    if (carousel) {
      const imageWidth = carousel.clientWidth;
      carousel.scrollTo({
        left: newIndex * imageWidth,
        behavior: 'smooth'
      });
    }
  };

  const toggleModelExpansion = (imageId: number) => {
    setExpandedModels(prev => ({
      ...prev,
      [imageId]: !prev[imageId]
    }));
  };

  const openDrawer = (image: GalleryImage) => {
    setSelectedImage(image);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerClosing(true);
    setTimeout(() => {
      setIsDrawerOpen(false);
      setIsDrawerClosing(false);
      setSelectedImage(null);
    }, 300); // Match the animation duration
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading your images...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <div className="text-center">
          <p className="font-medium">Error loading images</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No images yet</p>
        <p className="text-sm text-center">
          Start generating images to see them appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Images ({images.length})</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image) => (
            <Card 
              key={image.id} 
              className="overflow-hidden hover:shadow-lg transition-all duration-200 aspect-square cursor-pointer group p-0"
              onClick={() => openDrawer(image)}
            >
              <CardContent className="p-0 h-full relative m-0">
                {/* Images Carousel - Full card */}
                {image.imageUrls && image.imageUrls.length > 0 ? (
                  <div className="relative h-full">
                    {image.imageUrls.length === 1 ? (
                      // Single image - no carousel needed
                      <div className="relative group h-full w-full">
                        <div className="h-full w-full relative overflow-hidden bg-muted m-0 p-0">
                          <img
                            src={image.imageUrls[0]}
                            alt={`Generated image 1`}
                            className="w-full h-full object-cover"
                            style={{ 
                              display: 'block',
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              zIndex: 1
                            }}
                            onError={(e) => {
                              console.error('Image failed to load:', image.imageUrls[0]);
                              setImageError(image.id, 0, 'Image failed to load');
                            }}
                            onLoad={(e) => {
                              console.log('Image loaded successfully:', image.imageUrls[0]);
                              setImageError(image.id, 0, null);
                            }}
                          />
                          
                          {/* Show error message if image failed */}
                          {getImageError(image.id, 0) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-600 text-sm p-2 text-center">
                              <p>Image expired or unavailable</p>
                              <p className="text-xs mt-1">This image URL has expired</p>
                            </div>
                          )}
                          
                          {/* Info button overlay */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white border-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDrawer(image);
                              }}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Multiple images - horizontal carousel
                      <div className="relative group h-full w-full">
                        <div className="h-full w-full relative overflow-hidden bg-muted m-0 p-0">
                          <div 
                            ref={(el) => carouselRefs.current[image.id] = el}
                            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide h-full"
                            onScroll={(e) => {
                              const target = e.target as HTMLDivElement;
                              const imageWidth = target.clientWidth;
                              const scrollLeft = target.scrollLeft;
                              const newIndex = Math.round(scrollLeft / imageWidth);
                              setCurrentImageIndexForId(image.id, newIndex);
                            }}
                          >
                            {image.imageUrls.map((url, index) => {
                              const useFallback = getFallbackState(image.id, index);
                              const imageError = getImageError(image.id, index);
                              
                              return (
                                <div key={index} className="flex-shrink-0 w-full h-full snap-center relative" style={{ minWidth: '100%' }}>
                                  <img
                                    src={url}
                                    alt={`Generated image ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    style={{ 
                                      display: 'block',
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
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
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Navigation Arrows */}
                          <div className="absolute inset-y-0 left-0 flex items-center">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white border-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateImage(image.id, 'prev', image.imageUrls.length);
                              }}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="absolute inset-y-0 right-0 flex items-center">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mr-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white border-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateImage(image.id, 'next', image.imageUrls.length);
                              }}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Info button overlay */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white border-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDrawer(image);
                              }}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Image counter indicator */}
                          <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full z-10 backdrop-blur-sm">
                            {getCurrentImageIndex(image.id) + 1} / {image.imageUrls.length}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-muted m-0 p-0">
                    <div className="text-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">All images expired</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Image Details Drawer */}
        {isDrawerOpen && selectedImage && (
          <div 
            className="fixed inset-0 z-50 flex justify-end"
            onClick={closeDrawer}
          >
            {/* Drawer */}
            <div 
              className={`w-96 bg-white dark:bg-gray-900 shadow-xl h-full transform transition-transform duration-300 ease-in-out ${
                isDrawerClosing ? 'translate-x-full' : 'translate-x-0'
              }`}
              onClick={(e) => e.stopPropagation()}
              style={{
                animation: isDrawerClosing ? 'none' : 'slideInFromRight 0.3s ease-out'
              }}
            >
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                  <h3 className="text-lg font-semibold">Image Details</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeDrawer}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Model and Format Badges */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-sm">
                        <Brain className="h-3 w-3 mr-1" />
                        {selectedImage.model}
                      </Badge>
                      <Badge variant="outline" className="text-sm">{selectedImage.outputFormat}</Badge>
                      <Badge variant="outline" className="text-sm">{selectedImage.aspectRatio}</Badge>
                    </div>
                  </div>

                  {/* Prompt */}
                  {selectedImage.prompt && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Prompt</p>
                      <p className="text-sm text-gray-700 leading-relaxed bg-muted p-3 rounded-lg">
                        {selectedImage.prompt}
                      </p>
                    </div>
                  )}

                  {/* Parameters */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Parameters</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Guidance:</span>
                        <span className="font-medium">{selectedImage.guidance}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Steps:</span>
                        <span className="font-medium">{selectedImage.numInferenceSteps}</span>
                      </div>
                      {selectedImage.width && selectedImage.height && (
                        <div className="flex justify-between col-span-2">
                          <span className="text-muted-foreground">Size:</span>
                          <span className="font-medium">{selectedImage.width}×{selectedImage.height}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Created Date */}
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Created {formatDistanceToNow(new Date(selectedImage.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                
                {/* Footer with Download */}
                <div className="p-6 border-t">
                  <Button
                    className="w-full"
                    onClick={() => {
                      const currentIndex = getCurrentImageIndex(selectedImage.id);
                      downloadImage(selectedImage.imageUrls[currentIndex], `generated-image-${selectedImage.id}-${currentIndex + 1}.${selectedImage.outputFormat}`);
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Image
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
} 