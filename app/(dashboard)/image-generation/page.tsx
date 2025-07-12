import { ImageGenerationForm } from "@/components/image-generation-form"
import { GeneratedImages } from "@/components/GeneratedImages"

export default function ImageGenerationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Image Generation</h2>
        <p className="text-muted-foreground">
          Create stunning AI-generated images with customizable parameters.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex justify-start">
          <ImageGenerationForm />
        </div>
        <div className="flex justify-start">
          <GeneratedImages />
        </div>
      </div>
    </div>
  )
}