import { ImageGenerationForm } from "@/components/image-generation-form"

export default function ImageGenerationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Image Generation</h2>
        <p className="text-muted-foreground">
          Create stunning AI-generated images with customizable parameters.
        </p>
      </div>
      
      <div className="flex justify-start">
        <ImageGenerationForm />
      </div>
    </div>
  )
}