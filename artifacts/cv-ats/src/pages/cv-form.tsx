import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateCV, useUpdateCV, useGetCV, getGetCVQueryKey } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ChevronRight, ChevronLeft, Save, Eye, CheckCircle2, XCircle } from "lucide-react";
import { generateCVPreviewHtml } from "@/lib/generate-cv-html";

const workExperienceSchema = z.object({
  company: z.string().min(1, "Company is required"),
  position: z.string().min(1, "Position is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().nullable(),
  isCurrent: z.boolean().default(false),
  description: z.string().min(1, "Description is required"),
});

const educationSchema = z.object({
  institution: z.string().min(1, "Institution is required"),
  degree: z.string().min(1, "Degree is required"),
  field: z.string().min(1, "Field of study is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().nullable(),
  isCurrent: z.boolean().default(false),
  gpa: z.string().optional().nullable(),
});

const extraSectionEntrySchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

const extraSectionSchema = z.object({
  sectionTitle: z.string().min(1, "Section name is required"),
  entries: z.array(extraSectionEntrySchema),
});

const formSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  jobTitle: z.string().min(2, "Job title is required"),
  summary: z.string().min(10, "Summary must be at least 10 characters"),
  skills: z.string().min(1, "Skills are required"), // We'll split this by comma for the API
  languages: z.string().optional(), // We'll split this by comma for the API
  linkedinUrl: z.string().optional().or(z.literal("")).nullable().refine((val) => {
    if (!val) return true;
    try { new URL(/^https?:\/\//i.test(val) ? val : `https://${val}`); return true; } catch { return false; }
  }, "Invalid URL"),
  portfolioUrl: z.string().optional().or(z.literal("")).nullable().refine((val) => {
    if (!val) return true;
    try { new URL(/^https?:\/\//i.test(val) ? val : `https://${val}`); return true; } catch { return false; }
  }, "Invalid URL"),
  workExperience: z.array(workExperienceSchema),
  education: z.array(educationSchema),
  extraSections: z.array(extraSectionSchema),
});

type FormValues = z.infer<typeof formSchema>;

const STEPS = [
  { id: "personal", title: "Personal Info" },
  { id: "summary", title: "Summary & Skills" },
  { id: "experience", title: "Work Experience" },
  { id: "education", title: "Education" },
  { id: "extra", title: "Extra Sections" },
  { id: "review", title: "Review" },
];

const PRESET_SECTIONS = [
  "Awards & Honors",
  "Organizational Experience",
  "Training & Certifications",
  "Projects",
  "Publications",
  "Volunteer Work",
  "Online Courses",
];

function ExtraSectionItem({
  sectionIndex,
  control,
  onRemove,
}: {
  sectionIndex: number;
  control: Control<FormValues>;
  onRemove: () => void;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `extraSections.${sectionIndex}.entries`,
  });

  return (
    <Card className="relative border-border shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <CardHeader className="pb-3 pr-12">
        <FormField
          control={control}
          name={`extraSections.${sectionIndex}.sectionTitle`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Section Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Certifications" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field, entryIndex) => (
          <Card key={field.id} className="relative bg-muted/20 shadow-none">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => remove(entryIndex)}
              disabled={fields.length === 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <CardContent className="pt-6 pr-12 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name={`extraSections.${sectionIndex}.entries.${entryIndex}.title`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="AWS Certified Cloud Practitioner" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={`extraSections.${sectionIndex}.entries.${entryIndex}.subtitle`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtitle</FormLabel>
                      <FormControl>
                        <Input placeholder="Amazon Web Services" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={control}
                name={`extraSections.${sectionIndex}.entries.${entryIndex}.date`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date / Period</FormLabel>
                    <FormControl>
                      <Input placeholder="2024" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`extraSections.${sectionIndex}.entries.${entryIndex}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add short bullet points relevant to the position you're applying for."
                        className="h-24 resize-none"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>Each new line becomes a separate bullet point on the CV.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={() => append({ title: "", subtitle: "", date: "", description: "" })}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </CardContent>
    </Card>
  );
}

export default function CVForm() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const id = params.id ? parseInt(params.id, 10) : undefined;
  const isEditing = !!id;

  const [activeStep, setActiveStep] = useState(0);

  const { data: initialData, isLoading: isLoadingInitial } = useGetCV(id as number, {
    query: {
      enabled: isEditing,
      queryKey: getGetCVQueryKey(id as number),
    }
  });

  const createCV = useCreateCV();
  const updateCV = useUpdateCV();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      jobTitle: "",
      summary: "",
      skills: "",
      languages: "",
      linkedinUrl: "",
      portfolioUrl: "",
      workExperience: [],
      education: [],
      extraSections: [],
    },
  });

  const { fields: expFields, append: appendExp, remove: removeExp } = useFieldArray({
    control: form.control,
    name: "workExperience",
  });

  const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({
    control: form.control,
    name: "education",
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control: form.control,
    name: "extraSections",
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        fullName: initialData.fullName || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        location: initialData.location || "",
        jobTitle: initialData.jobTitle || "",
        summary: initialData.summary || "",
        skills: initialData.skills ? initialData.skills.join(", ") : "",
        languages: initialData.languages ? initialData.languages.join(", ") : "",
        linkedinUrl: initialData.linkedinUrl || "",
        portfolioUrl: initialData.portfolioUrl || "",
        workExperience: initialData.workExperience || [],
        education: initialData.education || [],
        extraSections: (initialData.extraSections as { sectionTitle: string; entries: { title: string; subtitle?: string | null; date?: string | null; description?: string | null }[] }[]) || [],
      });
    }
  }, [initialData, form]);

  const normalizeUrl = (url: string | null | undefined) => {
    if (!url) return url;
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  };

  const onSubmit = async (values: FormValues) => {
    const apiData = {
      ...values,
      linkedinUrl: normalizeUrl(values.linkedinUrl),
      portfolioUrl: normalizeUrl(values.portfolioUrl),
      skills: values.skills.split(",").map(s => s.trim()).filter(Boolean),
      languages: values.languages ? values.languages.split(",").map(s => s.trim()).filter(Boolean) : [],
    };

    try {
      if (isEditing) {
        await updateCV.mutateAsync({ id: id as number, data: apiData });
        toast({ title: "CV Updated", description: "Your CV has been successfully updated." });
        setLocation(`/cv/${id}`);
      } else {
        const result = await createCV.mutateAsync({ data: apiData });
        toast({ title: "CV Created", description: "Your CV has been successfully created." });
        setLocation(`/cv/${result.id}`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while saving your CV. Please check the fields and try again.",
        variant: "destructive",
      });
    }
  };

  const validateStep = async (stepIndex: number) => {
    let fieldsToValidate: (keyof FormValues)[] = [];
    
    if (stepIndex === 0) {
      fieldsToValidate = ["fullName", "email", "phone", "location", "jobTitle", "linkedinUrl", "portfolioUrl"];
    } else if (stepIndex === 1) {
      fieldsToValidate = ["summary", "skills", "languages"];
    } else if (stepIndex === 2) {
      fieldsToValidate = ["workExperience"];
    } else if (stepIndex === 3) {
      fieldsToValidate = ["education"];
    } else if (stepIndex === 4) {
      fieldsToValidate = ["extraSections"];
    }

    const isValid = await form.trigger(fieldsToValidate);
    return isValid;
  };

  const nextStep = async () => {
    const isValid = await validateStep(activeStep);
    if (!isValid) {
      return;
    }

    if (activeStep < STEPS.length - 1) {
      setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isSubmitting = createCV.isPending || updateCV.isPending;

  const watchedValues = form.watch();
  const previewHtml = useMemo(
    () => generateCVPreviewHtml(watchedValues),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      watchedValues.fullName, watchedValues.email, watchedValues.phone, watchedValues.location,
      watchedValues.jobTitle, watchedValues.summary, watchedValues.skills, watchedValues.languages,
      watchedValues.linkedinUrl, watchedValues.portfolioUrl,
      JSON.stringify(watchedValues.workExperience), JSON.stringify(watchedValues.education),
      JSON.stringify(watchedValues.extraSections),
    ]
  );
  const previewDocument = useMemo(
    () => previewHtml.replace(
      "</style>",
      `html, body { scrollbar-width: none; }
       html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }
       .page { min-height: 0 !important; }</style>`,
    ),
    [previewHtml],
  );

  const IFRAME_SCALE = 0.693;
  const IFRAME_WIDTH = 820;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(1120);

  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;
    const h = iframe.contentDocument.documentElement.scrollHeight;
    if (h > 0) setIframeHeight(h);
  }, []);

  if (isEditing && isLoadingInitial) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-background/50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background/50">
      <Navbar />
      <main className="flex-1 px-3 py-5 sm:px-4 lg:py-6">
        <div className="mx-auto max-w-[1320px]">
        <div className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary md:text-3xl">
            {isEditing ? "Edit CV" : "Create New CV"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 md:text-base">Fill out the fields to build your professional profile.</p>
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,680px)_minmax(520px,1fr)]">
          <div className="min-w-0">

        {/* Stepper */}
        <div className="mb-5 flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border rounded-full z-0" />
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-300"
            style={{ width: `${(activeStep / (STEPS.length - 1)) * 100}%` }}
          />
          {STEPS.map((step, idx) => (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                  idx <= activeStep 
                    ? "bg-primary border-primary text-primary-foreground" 
                    : "bg-card border-border text-muted-foreground"
                }`}
              >
                {idx + 1}
              </div>
              <span className={`text-[11px] font-medium hidden sm:block ${idx <= activeStep ? "text-foreground" : "text-muted-foreground"}`}>
                {step.title}
              </span>
            </div>
          ))}
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !(e.target instanceof HTMLTextAreaElement) &&
                activeStep < STEPS.length - 1
              ) {
                e.preventDefault();
              }
            }}
            className="space-y-8"
          >
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border/50 px-5 py-4">
                <CardTitle>{STEPS[activeStep].title}</CardTitle>
                <CardDescription>
                  {activeStep === 0 && "Your contact information and professional headline."}
                  {activeStep === 1 && "A brief summary of your background and key skills."}
                  {activeStep === 2 && "Your relevant work history."}
                  {activeStep === 3 && "Your academic background."}
                  {activeStep === 4 && "Add optional sections like certifications, projects, awards, or volunteer work."}
                  {activeStep === 5 && "Review everything before saving your CV."}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 pt-5">
                <div className={activeStep === 0 ? "space-y-5" : "hidden"}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="jobTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title *</FormLabel>
                          <FormControl>
                            <Input placeholder="Software Engineer" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+62 812 3456 7890" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Jakarta, Indonesia" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="linkedinUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LinkedIn URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://linkedin.com/in/johndoe" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="portfolioUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Portfolio URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://johndoe.com" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className={activeStep === 1 ? "space-y-5" : "hidden"}>
                  <FormField
                    control={form.control}
                    name="summary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Professional Summary *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="A dedicated software engineer with 5 years of experience..." 
                            className="h-28 resize-none" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>Write 2-4 sentences summarizing your professional background and goals.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skills *</FormLabel>
                        <FormControl>
                          <Input placeholder="JavaScript, React, Node.js, Project Management" {...field} />
                        </FormControl>
                        <FormDescription>Comma-separated list of your key skills.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="languages"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Languages</FormLabel>
                        <FormControl>
                          <Input placeholder="Indonesian, English" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>Comma-separated list of languages you speak.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className={activeStep === 2 ? "space-y-5" : "hidden"}>
                  {expFields.map((field, index) => (
                    <Card key={field.id} className="relative border-border shadow-sm">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeExp(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <CardContent className="pt-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`workExperience.${index}.company`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Tech Corp" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`workExperience.${index}.position`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Position *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Frontend Developer" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`workExperience.${index}.startDate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Date *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Jan 2020" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`workExperience.${index}.endDate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Date</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Present" 
                                    {...field} 
                                    value={field.value || ""} 
                                    disabled={form.watch(`workExperience.${index}.isCurrent`)} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name={`workExperience.${index}.isCurrent`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    if (checked) {
                                      form.setValue(`workExperience.${index}.endDate`, "");
                                    }
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>I currently work here</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`workExperience.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description *</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="• Developed new features using React..." 
                                  className="h-28 resize-none" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>Use bullet points to list achievements and responsibilities.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendExp({ company: "", position: "", startDate: "", endDate: "", isCurrent: false, description: "" })}
                    className="w-full border-dashed border-2 py-6 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Work Experience
                  </Button>
                </div>

                <div className={activeStep === 3 ? "space-y-5" : "hidden"}>
                  {eduFields.map((field, index) => (
                    <Card key={field.id} className="relative border-border shadow-sm">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeEdu(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <CardContent className="pt-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`education.${index}.institution`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Institution *</FormLabel>
                                <FormControl>
                                  <Input placeholder="University of Jakarta" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`education.${index}.degree`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Degree *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Bachelor of Science" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`education.${index}.field`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-1">
                                <FormLabel>Field of Study *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Computer Science" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`education.${index}.startDate`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-1">
                                <FormLabel>Start Date *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Aug 2016" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`education.${index}.endDate`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-1">
                                <FormLabel>End Date</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="May 2020" 
                                    {...field} 
                                    value={field.value || ""} 
                                    disabled={form.watch(`education.${index}.isCurrent`)} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`education.${index}.gpa`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>GPA (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="3.8/4.0" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`education.${index}.isCurrent`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm mt-8">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked);
                                      if (checked) {
                                        form.setValue(`education.${index}.endDate`, "");
                                      }
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>I currently study here</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendEdu({ institution: "", degree: "", field: "", startDate: "", endDate: "", isCurrent: false, gpa: "" })}
                    className="w-full border-dashed border-2 py-6 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Education
                  </Button>
                </div>

                {/* ─── Step 4: Extra Sections ─── */}
                <div className={activeStep === 4 ? "space-y-5" : "hidden"}>
                  <div>
                    <p className="text-sm font-medium mb-3 text-muted-foreground">Choose a section to add:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PRESET_SECTIONS.map((preset) => (
                        <Button
                          key={preset}
                          type="button"
                          variant="outline"
                          className="justify-start h-auto py-2 text-sm"
                          onClick={() => appendSection({ sectionTitle: preset, entries: [{ title: "", subtitle: "", date: "", description: "" }] })}
                        >
                          <Plus className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                          {preset}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        className="justify-start h-auto py-2 text-sm border-dashed"
                        onClick={() => appendSection({ sectionTitle: "", entries: [{ title: "", subtitle: "", date: "", description: "" }] })}
                      >
                        <Plus className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                        Custom Section
                      </Button>
                    </div>
                  </div>

                  {sectionFields.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                      <p className="text-sm">Click one of the options above to add an extra section.</p>
                      <p className="text-xs mt-1">This step is optional — skip it if not needed.</p>
                    </div>
                  )}

                  {sectionFields.map((sectionField, sectionIndex) => (
                    <ExtraSectionItem
                      key={sectionField.id}
                      sectionIndex={sectionIndex}
                      control={form.control}
                      onRemove={() => removeSection(sectionIndex)}
                    />
                  ))}
                </div>

                {/* ─── Step 5: Review ─── */}
                <div className={activeStep === 5 ? "space-y-6" : "hidden"}>
                  {/* ATS Readiness Checklist */}
                  {(() => {
                    const v = form.watch();
                    const checks = [
                      { label: "Full name filled in", ok: !!v.fullName?.trim() },
                      { label: "Job title filled in", ok: !!v.jobTitle?.trim() },
                      { label: "Email address provided", ok: !!v.email?.trim() },
                      { label: "Phone number provided", ok: !!v.phone?.trim() },
                      { label: "Location provided", ok: !!v.location?.trim() },
                      { label: "Professional summary written", ok: (v.summary?.trim().length ?? 0) >= 50 },
                      { label: "At least 3 skills listed", ok: v.skills.split(",").map(s => s.trim()).filter(Boolean).length >= 3 },
                      { label: "At least 1 work experience", ok: v.workExperience.length > 0 },
                      { label: "Work experience has descriptions", ok: v.workExperience.every(e => e.description?.trim().length > 0) },
                      { label: "At least 1 education entry", ok: v.education.length > 0 },
                      { label: "LinkedIn URL provided", ok: !!v.linkedinUrl?.trim() },
                    ];
                    const passed = checks.filter(c => c.ok).length;
                    const total = checks.length;
                    const pct = Math.round((passed / total) * 100);
                    const color = pct >= 90 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-destructive";
                    const bgColor = pct >= 90 ? "bg-green-50 border-green-200" : pct >= 60 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
                    return (
                      <Card className={`border shadow-sm ${bgColor}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">ATS Readiness Score</CardTitle>
                            <span className={`text-2xl font-bold ${color}`}>{pct}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 mt-1">
                            <div
                              className={`h-2 rounded-full transition-all ${pct >= 90 ? "bg-green-500" : pct >= 60 ? "bg-amber-500" : "bg-destructive"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <CardDescription className="mt-1">{passed}/{total} checks passed — {pct >= 90 ? "Excellent! Your CV is well-optimized." : pct >= 60 ? "Good start. Complete the remaining items to improve your score." : "Fill in more fields to improve your ATS score."}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {checks.map((c) => (
                              <li key={c.label} className="flex items-center gap-2 text-sm">
                                {c.ok
                                  ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                  : <XCircle className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
                                <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    );
                  })()}
                  <Card className="border-border/50 shadow-sm">
                    <CardContent className="pt-6 space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Full Name</p>
                          <p className="font-medium">{form.watch("fullName") || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Job Title</p>
                          <p className="font-medium">{form.watch("jobTitle") || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{form.watch("email") || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{form.watch("phone") || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Location</p>
                          <p className="font-medium">{form.watch("location") || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">LinkedIn</p>
                          <p className="font-medium break-all">{form.watch("linkedinUrl") || "-"}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Summary</p>
                        <p className="mt-1 whitespace-pre-wrap">{form.watch("summary") || "-"}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Skills</p>
                        <p className="mt-1">{form.watch("skills") || "-"}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Languages</p>
                        <p className="mt-1">{form.watch("languages") || "-"}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Work Experience</p>
                        <div className="mt-2 space-y-3">
                          {expFields.length > 0 ? (
                            expFields.map((_, index) => {
                              const item = form.watch(`workExperience.${index}`);
                              return (
                                <div key={index} className="rounded-lg border p-4">
                                  <p className="font-medium">{item?.position || "-"} {item?.company ? `at ${item.company}` : ""}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {item?.startDate || "-"} {item?.endDate ? ` - ${item.endDate}` : item?.isCurrent ? " - Present" : ""}
                                  </p>
                                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                                    {(item?.description || "")
                                      .split(/\n+/)
                                      .map((line) => line.trim())
                                      .filter(Boolean)
                                      .map((line, bulletIndex) => (
                                        <li key={bulletIndex} className="flex gap-2">
                                          <span className="shrink-0">•</span>
                                          <span className="min-w-0 whitespace-pre-wrap break-words">{line}</span>
                                        </li>
                                      ))}
                                    {!item?.description ? <li>-</li> : null}
                                  </ul>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-muted-foreground">No work experience added.</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Education</p>
                        <div className="mt-2 space-y-3">
                          {eduFields.length > 0 ? (
                            eduFields.map((_, index) => {
                              const item = form.watch(`education.${index}`);
                              return (
                                <div key={index} className="rounded-lg border p-4">
                                  <p className="font-medium">{item?.degree || "-"}{item?.field ? ` · ${item.field}` : ""}</p>
                                  <p className="text-sm text-muted-foreground">{item?.institution || "-"}</p>
                                  {item?.gpa && (
                                    <p className="text-sm text-muted-foreground">GPA: {item.gpa}</p>
                                  )}
                                  <p className="text-sm text-muted-foreground">
                                    {item?.startDate || "-"} {item?.endDate ? ` - ${item.endDate}` : item?.isCurrent ? " - Present" : ""}
                                  </p>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-muted-foreground">No education added yet.</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Extra Sections</p>
                        <div className="mt-2 space-y-3">
                          {sectionFields.length > 0 ? (
                            sectionFields.map((_, sectionIndex) => {
                              const section = form.watch(`extraSections.${sectionIndex}`);
                              return (
                                <div key={sectionIndex} className="rounded-lg border p-4">
                                  <p className="font-medium">{section?.sectionTitle || "-"}</p>
                                  <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                                    {section?.entries?.length ? section.entries.map((entry, entryIndex) => (
                                      <div key={entryIndex}>
                                        <p className="font-medium text-foreground">{entry.title || "-"}</p>
                                        <p>{[entry.subtitle, entry.date].filter(Boolean).join(" · ") || "-"}</p>
                                        {entry.description && <p className="whitespace-pre-wrap">{entry.description}</p>}
                                      </div>
                                    )) : <p>No items yet.</p>}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-muted-foreground">No extra sections added.</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t border-border/50 px-5 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  Step {activeStep + 1} of {STEPS.length}: {activeStep === STEPS.length - 1 ? "review then save your CV" : "fill in this section to continue"}
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={prevStep} 
                  disabled={activeStep === 0 || isSubmitting}
                  className="flex-1 sm:flex-none"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                
                {activeStep < STEPS.length - 2 ? (
                  <Button type="button" onClick={nextStep} disabled={isSubmitting} className="flex-1 sm:flex-none">
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : activeStep === STEPS.length - 2 ? (
                  <Button
                    type="button"
                    onClick={async () => {
                      const isValid = await validateStep(activeStep);
                      if (isValid) {
                        setActiveStep(STEPS.length - 1);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none"
                  >
                    Review CV
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save CV
                      </>
                    )}
                  </Button>
                )}
                </div>
              </CardFooter>
            </Card>
          </form>
        </Form>

          </div>{/* end form column */}

          {/* Live Preview Panel */}
          <div className="hidden xl:flex min-w-0 flex-col sticky top-4">
            <div className="border rounded-xl shadow-sm bg-white overflow-hidden">
              <div className="bg-muted/50 px-4 py-2.5 border-b text-sm font-medium text-muted-foreground flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5" />
                Live Preview
                </span>
                <span className="text-[11px] font-normal">Scroll to see the full page</span>
              </div>
              <div className="max-h-[calc(100vh-150px)] overflow-y-auto overflow-x-hidden bg-slate-100 p-4 overscroll-contain">
                <div
                  className="mx-auto overflow-hidden"
                  style={{
                    width: `${Math.round(IFRAME_WIDTH * IFRAME_SCALE)}px`,
                    height: `${Math.round(iframeHeight * IFRAME_SCALE)}px`,
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    srcDoc={previewDocument}
                    title="CV Preview"
                    onLoad={handleIframeLoad}
                    scrolling="no"
                    style={{
                      width: `${IFRAME_WIDTH}px`,
                      height: `${iframeHeight}px`,
                      border: 'none',
                      transform: `scale(${IFRAME_SCALE})`,
                      transformOrigin: 'top left',
                      pointerEvents: 'none',
                      display: 'block',
                    }}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">Preview updates automatically as you type</p>
          </div>

        </div>{/* end flex split */}
        </div>{/* end max-w container */}
      </main>
    </div>
  );
}
