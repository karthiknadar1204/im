"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { imageGenerationSchema, type ImageGenerationFormValues } from "@/lib/schemas/image-generation";
import { models, aspectRatios, outputFormats } from "@/lib/options/image-generation";
import { generateImageFromValues } from "@/app/actions/image-actions";
import { useImageStore } from "@/lib/store/image-store";
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
  const { addImage, updateImage, updateImageStatus } = useImageStore();
  const [completedModels, setCompletedModels] = useState<Array<{ value: string; label: string }>>([]);
  
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

  // Fetch completed models on component mount
  useEffect(() => {
    const fetchCompletedModels = async () => {
      try {
        const response = await fetch('/api/models');
        if (response.ok) {
          const data = await response.json();
          const completed = data.models
            ?.filter((model: any) => model.status === 'completed' && model.modelId && model.version)
            ?.map((model: any) => ({
              value: `karthiknadar1204/${model.modelId}:${model.version}`,
              label: model.modelName
            })) || [];
          setCompletedModels(completed);
        }
      } catch (error) {
        console.error('Error fetching completed models:', error);
      }
    };

    fetchCompletedModels();
  }, []);

  // Watch the model value to dynamically adjust inference steps
  const selectedModel = form.watch("model");
  
  // Get the appropriate range and default value for inference steps based on model
  const getInferenceStepsConfig = (model: string) => {
    if (model === "flux-schnell") {
      return { min: 1, max: 4, defaultValue: 4 };
    }
    return { min: 1, max: 50, defaultValue: 20 };
  };

    const inferenceStepsConfig = getInferenceStepsConfig(selectedModel);

    // Update inference steps when model changes
  useEffect(() => {
    const currentValue = form.getValues("numInferenceSteps");
    const newConfig = getInferenceStepsConfig(selectedModel);
    
    // If current value is outside the new range, reset to default
    if (currentValue < newConfig.min || currentValue > newConfig.max) {
      form.setValue("numInferenceSteps", newConfig.defaultValue);
    }
  }, [selectedModel, form]);

  async function onSubmit(values: ImageGenerationFormValues) {
    console.log("Form values:", values);

    // If custom model, update the prompt
    let newValues = { ...values };
    if (values.model !== "flux-dev" && values.model !== "flux-schnell") {
      newValues.prompt = `photo of a omgx ${values.prompt}`;
    }
    // Add a placeholder image entry with 'generating' status
    const tempId = crypto.randomUUID();
    addImage({
      urls: [],
      parameters: newValues,
      status: 'generating',
    }, tempId);
    try {
      const result = await generateImageFromValues(newValues);
      if (result.success && result.data) {
        console.log('Generated URLs:', result.data);
        // Update the existing entry with the generated URLs and completed status
        updateImage(tempId, {
          urls: result.data,
          status: 'completed',
        });
      } else {
        // Handle subscription-related errors
        if (result.requiresUpgrade) {
          updateImageStatus(tempId, 'error', `Subscription upgrade required. Current plan: ${result.currentPlan}. Please upgrade to generate more images.`);
        } else {
          // Update with error status
          updateImageStatus(tempId, 'error', result.error);
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      updateImageStatus(tempId, 'error', 'An unexpected error occurred');
    }
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
                      {/* Default models */}
                      {models.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                      {/* Completed custom models */}
                      {completedModels.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                            Your Models
                          </div>
                          {completedModels.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))}
                        </>
                      )}
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
                          <p>Defines the width and height shape of the image (like landscape or portrait). Choose based on what kind of photo you want.</p>
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
                          <p>Controls how strictly the image follows your prompt — higher values mean more accurate but less creative results (ideal: 7–10).</p>
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
                          <p>Determines how long the AI spends refining the image — more steps = smoother, more detailed results (ideal: 25–50).</p>
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                  <FormControl>
                    <Slider
                      min={inferenceStepsConfig.min}
                      max={inferenceStepsConfig.max}
                      step={1}
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      className="w-full"
                    />
                  </FormControl>
                  <FormDescription>
                    Number of denoising steps ({inferenceStepsConfig.min}-{inferenceStepsConfig.max})
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
                          <p>Sets the image's visual clarity and detail — higher quality means better results but takes longer to generate (ideal: high).</p>
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
