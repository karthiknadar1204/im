import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to validate and potentially fix Replicate image URLs
export function validateReplicateUrl(url: string): string {
  if (!url) return url;
  
  // Ensure the URL is a string
  const urlString = String(url);
  
  // Check if it's already a valid URL
  try {
    new URL(urlString);
    return urlString;
  } catch {
    // If it's not a valid URL, it might be a relative path or malformed
    console.warn('Invalid URL format:', urlString);
    return urlString;
  }
}

// Utility function to generate R2 public URL
export function generateR2PublicUrl(bucketName: string, key: string): string {
  // Use Public Development URL for R2 bucket access
  const publicDevUrl = process.env.CLOUDFLARE_PUBLIC_DEV_URL;
  if (!publicDevUrl) {
    throw new Error('CLOUDFLARE_PUBLIC_DEV_URL environment variable is not configured');
  }
  
  return `${publicDevUrl}/${key}`;
}

// Function to check if an image URL is accessible
export async function checkImageAccessibility(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error checking image accessibility:', error);
    return false;
  }
}
