import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Loader2, Plus, Trash2, ChevronRight, ChevronLeft, Save } from "lucide-react";

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

const formSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  jobTitle: z.string().min(2, "Job title is required"),
  summary: z.string().min(10, "Summary must be at least 10 characters"),
  skills: z.string().min(1, "Skills are required"), // We'll split this by comma for the API
  languages: z.string().optional(), // We'll split this by comma for the API
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")).nullable(),
  portfolioUrl: z.string().url("Invalid URL").optional().or(z.literal("")).nullable(),
  workExperience: z.array(workExperienceSchema),
  education: z.array(educationSchema),
});

type FormValues = z.infer<typeof formSchema>;

const STEPS = [
  { id: "personal", title: "Personal Info" },
  { id: "summary", title: "Summary & Skills" },
  { id: "experience", title: "Work Experience" },
  { id: "education", title: "Education" },
  { id: "review", title: "Review" },
];

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
      });
    }
  }, [initialData, form]);

  const onSubmit = async (values: FormValues) => {
    const apiData = {
      ...values,
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
      <main className="flex-1 container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            {isEditing ? "Edit CV" : "Create New CV"}
          </h1>
          <p className="text-muted-foreground mt-1">Fill out the fields to build your professional profile.</p>
        </div>

        {/* Stepper */}
        <div className="mb-8 flex items-center justify-between relative">
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
              <span className={`text-xs font-medium hidden sm:block ${idx <= activeStep ? "text-foreground" : "text-muted-foreground"}`}>
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
              <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                <CardTitle>{STEPS[activeStep].title}</CardTitle>
                <CardDescription>
                  {activeStep === 0 && "Your contact information and professional headline."}
                  {activeStep === 1 && "A brief summary of your background and key skills."}
                  {activeStep === 2 && "Your relevant work history."}
                  {activeStep === 3 && "Your academic background."}
                  {activeStep === 4 && "Review everything before saving your CV."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className={activeStep === 0 ? "space-y-6" : "hidden"}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div className={activeStep === 1 ? "space-y-6" : "hidden"}>
                  <FormField
                    control={form.control}
                    name="summary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Professional Summary *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="A dedicated software engineer with 5 years of experience..." 
                            className="h-32 resize-none" 
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

                <div className={activeStep === 2 ? "space-y-6" : "hidden"}>
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
                      <CardContent className="pt-6 space-y-4">
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
                                  className="h-32 resize-none" 
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
                    className="w-full border-dashed border-2 py-8 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Work Experience
                  </Button>
                </div>

                <div className={activeStep === 3 ? "space-y-6" : "hidden"}>
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
                      <CardContent className="pt-6 space-y-4">
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
                    className="w-full border-dashed border-2 py-8 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Education
                  </Button>
                </div>

                <div className={activeStep === 4 ? "space-y-6" : "hidden"}>
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
                                  <p className="mt-2 text-sm whitespace-pre-wrap">{item?.description || "-"}</p>
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
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t border-border/50 py-4 flex justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={prevStep} 
                  disabled={activeStep === 0 || isSubmitting}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                
                {activeStep < STEPS.length - 2 ? (
                  <Button type="button" onClick={nextStep} disabled={isSubmitting}>
                    Next Step
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
                  >
                    Review
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={isSubmitting}
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
              </CardFooter>
            </Card>
          </form>
        </Form>
      </main>
    </div>
  );
}
