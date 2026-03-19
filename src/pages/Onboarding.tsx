import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/landing/Logo";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  Phone,
  Palette,
  FolderPlus,
  Users,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
} from "lucide-react";

interface OnboardingData {
  // Company details
  companyAddress: string;
  companyPhone: string;
  primaryColour: string;
  // First project
  projectName: string;
  projectAddress: string;
  clientName: string;
  principalDesigner: string;
  startDate: string;
  estimatedEndDate: string;
}

const STEPS = [
  { id: 1, title: "Company Details", icon: Building2 },
  { id: 2, title: "First Project", icon: FolderPlus },
  { id: 3, title: "All Done!", icon: Check },
];

const COLOR_OPTIONS = [
  { name: "Teal", value: "#0F766E" },
  { name: "Blue", value: "#1D4ED8" },
  { name: "Purple", value: "#7C3AED" },
  { name: "Orange", value: "#EA580C" },
  { name: "Green", value: "#16A34A" },
  { name: "Red", value: "#DC2626" },
];

const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organisationId, setOrganisationId] = useState<string | null>(null);
  const [organisationName, setOrganisationName] = useState<string>("");
  
  const [data, setData] = useState<OnboardingData>({
    companyAddress: "",
    companyPhone: "",
    primaryColour: "#0F766E",
    projectName: "",
    projectAddress: "",
    clientName: "",
    principalDesigner: "",
    startDate: "",
    estimatedEndDate: "",
  });

  // Fetch organisation details
  useEffect(() => {
    const fetchOrganisation = async () => {
      if (!user) return;

      const { data: memberData } = await supabase
        .from("organisation_members")
        .select("organisation_id")
        .eq("profile_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (memberData) {
        setOrganisationId(memberData.organisation_id);
        
        const { data: orgData } = await supabase
          .from("organisations")
          .select("name, address, phone, primary_colour")
          .eq("id", memberData.organisation_id)
          .single();

        if (orgData) {
          setOrganisationName(orgData.name);
          setData(prev => ({
            ...prev,
            companyAddress: orgData.address || "",
            companyPhone: orgData.phone || "",
            primaryColour: orgData.primary_colour || "#0F766E",
          }));
        }
      }
    };

    fetchOrganisation();
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const updateField = (field: keyof OnboardingData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      // Save company details
      setIsSubmitting(true);
      try {
        const { error } = await supabase
          .from("organisations")
          .update({
            address: data.companyAddress,
            phone: data.companyPhone,
            primary_colour: data.primaryColour,
          })
          .eq("id", organisationId);

        if (error) throw error;
        setCurrentStep(2);
      } catch (error) {
        console.error("Error updating organisation:", error);
        toast.error("Failed to save company details");
      } finally {
        setIsSubmitting(false);
      }
    } else if (currentStep === 2) {
      // Create first project
      if (!data.projectName.trim()) {
        toast.error("Please enter a project name");
        return;
      }
      
      setIsSubmitting(true);
      try {
        const { error } = await supabase
          .from("projects")
          .insert({
            organisation_id: organisationId,
            name: data.projectName,
            address: data.projectAddress || null,
            client_name: data.clientName || null,
            principal_designer: data.principalDesigner || null,
            start_date: data.startDate || null,
            estimated_end_date: data.estimatedEndDate || null,
            created_by: user?.id,
          });

        if (error) throw error;
        setCurrentStep(3);
      } catch (error) {
        console.error("Error creating project:", error);
        toast.error("Failed to create project");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSkipProject = () => {
    setCurrentStep(3);
  };

  const handleFinish = () => {
    navigate("/dashboard");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Logo />
      </header>

      {/* Progress steps */}
      <div className="container max-w-3xl mx-auto px-4 mb-8">
        <div className="flex items-center justify-center gap-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  currentStep === step.id
                    ? "bg-primary text-primary-foreground"
                    : currentStep > step.id
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <step.icon className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
                <span className="text-sm font-medium sm:hidden">{step.id}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-2 ${
                    currentStep > step.id ? "bg-success" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 container max-w-2xl mx-auto px-4 pb-12">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card rounded-2xl p-8 shadow-lg border border-border"
            >
              <div className="text-center mb-8">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Complete Your Company Profile
                </h1>
                <p className="text-muted-foreground">
                  Add details for {organisationName || "your organisation"}
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Company Address
                  </Label>
                  <Textarea
                    id="address"
                    placeholder="Enter your company address"
                    value={data.companyAddress}
                    onChange={(e) => updateField("companyAddress", e.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g. 020 1234 5678"
                    value={data.companyPhone}
                    onChange={(e) => updateField("companyPhone", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Brand Colour
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => updateField("primaryColour", color.value)}
                        className={`w-10 h-10 rounded-lg transition-all ${
                          data.primaryColour === color.value
                            ? "ring-2 ring-offset-2 ring-primary scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <Button onClick={handleNext} disabled={isSubmitting} size="lg">
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card rounded-2xl p-8 shadow-lg border border-border"
            >
              <div className="text-center mb-8">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <FolderPlus className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Create Your First Project
                </h1>
                <p className="text-muted-foreground">
                  Set up a construction project to start managing safety compliance
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="projectName">
                    Project Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="projectName"
                    placeholder="e.g. Riverside Apartments Phase 1"
                    value={data.projectName}
                    onChange={(e) => updateField("projectName", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectAddress">Site Address</Label>
                  <Textarea
                    id="projectAddress"
                    placeholder="Enter the construction site address"
                    value={data.projectAddress}
                    onChange={(e) => updateField("projectAddress", e.target.value)}
                    className="resize-none"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Client Name</Label>
                    <Input
                      id="clientName"
                      placeholder="e.g. ABC Developments Ltd"
                      value={data.clientName}
                      onChange={(e) => updateField("clientName", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="principalDesigner">Principal Designer</Label>
                    <Input
                      id="principalDesigner"
                      placeholder="e.g. Smith Architects"
                      value={data.principalDesigner}
                      onChange={(e) => updateField("principalDesigner", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={data.startDate}
                      onChange={(e) => updateField("startDate", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">Estimated End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={data.estimatedEndDate}
                      onChange={(e) => updateField("estimatedEndDate", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep(1)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleSkipProject}>
                    Skip for now
                  </Button>
                  <Button onClick={handleNext} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Create Project
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-2xl p-8 shadow-lg border border-border text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6"
              >
                <Check className="h-10 w-10 text-success" />
              </motion.div>
              
              <h1 className="text-2xl font-bold text-foreground mb-2">
                You're All Set!
              </h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Your account is ready. Start by uploading safety documents, inviting contractors, or generating QR codes for site access.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" onClick={handleFinish}>
                  <Users className="h-4 w-4 mr-2" />
                  Invite Team Members
                </Button>
                <Button onClick={handleFinish}>
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Onboarding;
