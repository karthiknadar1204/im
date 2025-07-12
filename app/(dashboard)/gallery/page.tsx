import React from 'react'
import { Gallery } from '@/components/Gallery'

const GalleryPage = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gallery</h1>
        <p className="text-muted-foreground">
          View all your generated images in one place
        </p>
      </div>
      <Gallery />
    </div>
  )
}

export default GalleryPage