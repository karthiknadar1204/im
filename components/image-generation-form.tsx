'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const imageGenerationSchema = z.object({
  model: z.enum(["flux-dev", "flux-schnell"], {
    required_error: "Please select a model",
  }),
  promptGuidance: z.number().min(0).max(10).step(0.5),
  numOutputs: z.number().int().min(1).max(4),
  aspectRatio: z.enum([
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
    "3:2"
  ], {
    required_error: "Please select an aspect ratio",
  }),
  outputFormat: z.enum(["webp", "png", "jpg"], {
    required_error: "Please select an output format",
  }),
  numInferenceSteps: z.number().min(1).max(50).step(1),
  outputQuality: z.number().min(1).max(100).step(1),
  prompt: z.string().min(1, "Please enter a prompt"),
})

type ImageGenerationFormValues = z.infer<typeof imageGenerationSchema>

const models = [
  { value: "flux-dev", label: "Flux Dev Model" },
  { value: "flux-schnell", label: "Flux Schnell Model" },
]

const aspectRatios = [
  { value: "1:1", label: "1:1 (Square)" },
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "9:16", label: "9:16 (Portrait)" },
  { value: "21:9", label: "21:9 (Ultrawide)" },
  { value: "9:21", label: "9:21 (Tall)" },
  { value: "4:5", label: "4:5 (Portrait)" },
  { value: "5:4", label: "5:4 (Landscape)" },
  { value: "4:3", label: "4:3 (Standard)" },
  { value: "3:4", label: "3:4 (Portrait)" },
  { value: "2:3", label: "2:3 (Portrait)" },
  { value: "3:2", label: "3:2 (Landscape)" },
]

const outputFormats = [
  { value: "webp", label: "WebP" },
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPG" },
]



export function ImageGenerationForm() {
  const form = useForm<ImageGenerationFormValues>({
    resolver: zodResolver(imageGenerationSchema),
    defaultValues: {
      model: "flux-dev",
      promptGuidance: 7.5,
      numOutputs: 1,
      aspectRatio: "1:1",
      outputFormat: "webp",
      numInferenceSteps: 20,
      outputQuality: 90,
      prompt: "",
    },
  })

  function onSubmit(values: ImageGenerationFormValues) {
    console.log("Form values:", values)
    // TODO: Handle form submission
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Generate Image</CardTitle>
        <CardDescription>
          Create stunning images with AI using advanced models and customizable parameters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="aspectRatio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aspect Ratio</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select aspect ratio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {aspectRatios.map((ratio) => (
                        <SelectItem key={ratio.value} value={ratio.value}>
                          {ratio.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="numOutputs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Outputs</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={4}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Number of images to generate (1-4)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="outputFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Output Format</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select output format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {outputFormats.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="promptGuidance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt Guidance: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={10}
                      step={0.5}
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      className="w-full"
                    />
                  </FormControl>
                  <FormDescription>
                    Controls how closely the image follows the prompt (0-10)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />



            <FormField
              control={form.control}
              name="numInferenceSteps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Inference Steps: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={50}
                      step={1}
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      className="w-full"
                    />
                  </FormControl>
                  <FormDescription>
                    Number of denoising steps (1-50)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="outputQuality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Output Quality: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={100}
                      step={1}
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      className="w-full"
                    />
                  </FormControl>
                  <FormDescription>
                    Image quality percentage (1-100)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the image you want to generate..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Describe the image you want to create in detail
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Generate Image
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
} 