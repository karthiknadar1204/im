"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { imageGenerationSchema, type ImageGenerationFormValues } from "@/lib/schemas/image-generation";
import { models, aspectRatios, outputFormats } from "@/lib/options/image-generation";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";





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
  });

  function onSubmit(values: ImageGenerationFormValues) {
    console.log("Form values:", values);
    // TODO: Handle form submission
  }

  return (
    <TooltipProvider>
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Generate Image</CardTitle>
          <CardDescription>
            Create stunning images with AI using advanced models and customizable
            parameters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel className="flex items-center gap-2">
                    Model
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Choose the AI model for image generation.</p>
                        <p><strong>Flux Dev Model:</strong> High quality, slower generation</p>
                        <p><strong>Flux Schnell Model:</strong> Faster generation, good quality</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
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

            <div className="grid grid-cols-2 gap-4 w-full">
              <FormField
                control={form.control}
                name="aspectRatio"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="flex items-center gap-2">
                      Aspect Ratio
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Select the image dimensions ratio.</p>
                          <p><strong>Square (1:1):</strong> Perfect for social media</p>
                          <p><strong>Landscape (16:9, 21:9):</strong> Great for wallpapers</p>
                          <p><strong>Portrait (9:16, 4:5):</strong> Ideal for mobile screens</p>
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
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
                  <FormItem className="w-full">
                    <FormLabel className="flex items-center gap-2">
                      Number of Outputs
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Number of images to generate simultaneously.</p>
                          <p><strong>Range:</strong> 1-4 images</p>
                          <p><strong>Recommended:</strong> 1-2 for faster results</p>
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={4}
                        className="w-full"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="outputFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Output Format
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Choose the image file format.</p>
                        <p><strong>WebP:</strong> Best compression, modern browsers</p>
                        <p><strong>PNG:</strong> Lossless quality, transparency support</p>
                        <p><strong>JPG:</strong> Smaller file size, wide compatibility</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
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
                  <FormLabel className="flex items-center gap-2">
                    Prompt Guidance: {field.value}
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Controls how closely the image follows your prompt.</p>
                        <p><strong>Range:</strong> 0-10 (step 0.5)</p>
                        <p><strong>Low (0-3):</strong> More creative, less accurate</p>
                        <p><strong>Medium (4-7):</strong> Balanced creativity and accuracy</p>
                        <p><strong>High (8-10):</strong> Very accurate to prompt</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
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
                  <FormLabel className="flex items-center gap-2">
                    Number of Inference Steps: {field.value}
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Number of denoising steps during generation.</p>
                        <p><strong>Range:</strong> 1-50 steps</p>
                        <p><strong>Low (1-20):</strong> Faster generation, less detail</p>
                        <p><strong>Medium (21-35):</strong> Good balance of speed and quality</p>
                        <p><strong>High (36-50):</strong> Slower generation, maximum detail</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
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
                  <FormLabel className="flex items-center gap-2">
                    Output Quality: {field.value}
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Controls the quality and file size of the generated image.</p>
                        <p><strong>Range:</strong> 1-100%</p>
                        <p><strong>Low (1-50):</strong> Smaller files, lower quality</p>
                        <p><strong>Medium (51-80):</strong> Good balance</p>
                        <p><strong>High (81-100):</strong> Best quality, larger files</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
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
                  <FormLabel className="flex items-center gap-2">
                    Prompt
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Describe the image you want to generate in detail.</p>
                        <p><strong>Tips:</strong></p>
                        <p>• Be specific about style, colors, and composition</p>
                        <p>• Include artistic styles (e.g., "oil painting", "digital art")</p>
                        <p>• Mention lighting, mood, and atmosphere</p>
                        <p>• Add details about subjects, backgrounds, and objects</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the image you want to generate..."
                      className="min-h-[80px] resize-none"
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
    </TooltipProvider>
  );
}
