import { create } from 'zustand';
import { type ImageGenerationFormValues } from '@/lib/schemas/image-generation';

export interface GeneratedImage {
  id: string;
  urls: string[];
  parameters: ImageGenerationFormValues;
  createdAt: Date;
  status: 'generating' | 'completed' | 'error';
  error?: string;
}

interface ImageStore {
  images: GeneratedImage[];
  addImage: (image: Omit<GeneratedImage, 'id' | 'createdAt'>, id?: string) => void;
  updateImageStatus: (id: string, status: GeneratedImage['status'], error?: string) => void;
  updateImage: (id: string, updates: Partial<Omit<GeneratedImage, 'id' | 'createdAt'>>) => void;
  clearImages: () => void;
  removeImage: (id: string) => void;
}

export const useImageStore = create<ImageStore>((set) => ({
  images: [],
  
  addImage: (image, id) => set((state) => ({
    images: [
      {
        ...image,
        id: id || crypto.randomUUID(),
        createdAt: new Date(),
      },
      ...state.images, // Add new images at the top
    ],
  })),
  
  updateImageStatus: (id, status, error) => set((state) => ({
    images: state.images.map((img) =>
      img.id === id ? { ...img, status, error } : img
    ),
  })),
  
  updateImage: (id, updates) => set((state) => ({
    images: state.images.map((img) =>
      img.id === id ? { ...img, ...updates } : img
    ),
  })),
  
  clearImages: () => set({ images: [] }),
  
  removeImage: (id) => set((state) => ({
    images: state.images.filter((img) => img.id !== id),
  })),
})); 