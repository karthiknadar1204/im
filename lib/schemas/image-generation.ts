import * as z from "zod"

export const imageGenerationSchema = z.object({
  model: z.enum(["flux-dev", "flux-schnell"], {
    required_error: "Please select a model",
  }),
  promptGuidance: z.number().min(0).max(10).step(0.5),
  numOutputs: z.number().int().min(1).max(4),
  aspectRatio: z.enum(
    [
      "1:1",
      "16:9",
      "9:16",
      "21:9",
      "9:21",
      "4:5",
      "5:4",
      "4:3",
      "3:4",
      "2:3",
      "3:2",
    ],
    {
      required_error: "Please select an aspect ratio",
    }
  ),
  outputFormat: z.enum(["webp", "png", "jpg"], {
    required_error: "Please select an output format",
  }),
  numInferenceSteps: z.number().min(1).max(50).step(1),
  outputQuality: z.number().min(1).max(100).step(1),
  prompt: z.string().min(1, "Please enter a prompt"),
})

export type ImageGenerationFormValues = z.infer<typeof imageGenerationSchema> 