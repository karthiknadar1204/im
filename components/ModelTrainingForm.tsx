"use client";

import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const ACCEPTED_ZIP_FILES = ["application/x-zip-compressed", "application/zip"];
const MAX_FILE_SIZE = 1024 * 1024 * 45; // 45MB

const formSchema = z.object({
  modelName: z.string({ required_error: "Model name is required" }),
  gender: z.enum(["male", "female"]),
  zipFile: z.any()
    .refine((files) => files?.[0] instanceof File, "Please select a valid zip file")
    .refine((files) => files?.[0]?.type && ACCEPTED_ZIP_FILES.includes(files?.[0]?.type), "Only zip files are accepted!")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, "Max file size allowed is 45MB"),
});

type ModelTrainingFormValues = z.infer<typeof formSchema>;

const ModelTrainingForm = () => {
  const form = useForm<ModelTrainingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      modelName: "",
      gender: "male",
      zipFile: undefined,
    },
  });

  const onSubmit = (values: ModelTrainingFormValues) => {
    console.log("Form values:", values);
    // TODO: Implement model training logic
  };

  return (
    <TooltipProvider>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Train Custom Model</CardTitle>
          <CardDescription>
            Upload your images to train a personalized AI model for image generation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Model Name Field */}
              <FormField
                control={form.control}
                name="modelName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your model name"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Choose a unique name for your custom model
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Gender Selection */}
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="male" id="male" />
                          <Label htmlFor="male">Male</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="female" id="female" />
                          <Label htmlFor="female">Female</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Upload */}
              <FormField
                control={form.control}
                name="zipFile"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Training Images (ZIP File)
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Upload a ZIP file containing your training images</p>
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center justify-center w-full">
                        <label
                          htmlFor="zip-upload"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 transition-colors"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground">ZIP files only (MAX. 45MB)</p>
                          </div>
                          <input
                            id="zip-upload"
                            type="file"
                            accept=".zip"
                            className="hidden"
                            onChange={(e) => {
                              const files = e.target.files;
                              onChange(files);
                            }}
                            {...field}
                          />
                        </label>
                      </div>
                    </FormControl>
                    {value?.[0] && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                        Selected: {value[0].name} ({(value[0].size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Requirements Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Image Requirements</h3>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Follow these guidelines for best training results</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <div className="space-y-2">
                    <p className="font-medium">Image Count & Breakdown:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Provide 10, 12 or 15 images in total</li>
                      <li><strong>Ideal breakdown for 12 images:</strong></li>
                      <li className="ml-4">• 6 face closeups</li>
                      <li className="ml-4">• 3/4 half body closeups (till stomach)</li>
                      <li className="ml-4">• 2/3 full body shots</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium">Image Quality Requirements:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>No accessories on face/head ideally</li>
                      <li>No other people in images</li>
                      <li>Different expressions, clothing, backgrounds with good lighting</li>
                      <li>Images to be in 1:1 resolution (1048x1048 or higher)</li>
                      <li>Use images of similar age group (ideally within past few months)</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium">File Requirements:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Provide only ZIP file (under 45MB size)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full">
                Start Model Training
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ModelTrainingForm;