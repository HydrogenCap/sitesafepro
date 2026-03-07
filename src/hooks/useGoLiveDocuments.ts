import { supabase } from "@/integrations/supabase/client";

interface GenerateDocumentsResult {
  success: boolean;
  documentsGenerated: number;
  errors: string[];
}

export async function generateGoLiveDocuments(
  projectId: string,
  organisationId: string,
  userId: string
): Promise<GenerateDocumentsResult> {
  const errors: string[] = [];
  let documentsGenerated = 0;

  try {
    // Fetch active templates that should auto-generate on go-live
    const { data: templates, error: templatesError } = await supabase
      .from("document_templates")
      .select("*")
      .eq("organisation_id", organisationId)
      .eq("is_active", true)
      .eq("auto_generate_on_go_live", true)
      .order("sort_order");

    if (templatesError) {
      throw new Error(`Failed to fetch templates: ${templatesError.message}`);
    }

    if (!templates || templates.length === 0) {
      // No templates configured — nothing to generate
      return { success: true, documentsGenerated: 0, errors: [] };
    }

    // Process each template
    for (const template of templates) {
      try {
        // Download the template file from document-templates bucket
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("document-templates")
          .download(template.file_path);

        if (downloadError) {
          errors.push(`Failed to download template "${template.name}": ${downloadError.message}`);
          continue;
        }

        // Generate new file path for the project document
        const fileExt = template.file_path.split(".").pop();
        const newFilePath = `${organisationId}/${projectId}/${template.id}_${Date.now()}.${fileExt}`;

        // Upload to documents bucket
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(newFilePath, fileData, {
            contentType: template.mime_type,
          });

        if (uploadError) {
          errors.push(`Failed to upload document "${template.name}": ${uploadError.message}`);
          continue;
        }

        // Create document record
        const documentCategory = getCategoryMapping(template.category);
        const { error: insertError } = await supabase
          .from("documents")
          .insert({
            organisation_id: organisationId,
            project_id: projectId,
            name: template.name,
            description: template.description,
            file_path: newFilePath,
            file_size: template.file_size,
            mime_type: template.mime_type,
            category: documentCategory as any,
            uploaded_by: userId,
            status: "approved",
            is_auto_generated: true,
            generated_from_template_id: template.id,
            requires_acknowledgement: template.requires_acknowledgement,
            approved_at: new Date().toISOString(),
            approved_by: userId,
          });

        if (insertError) {
          errors.push(`Failed to create document record for "${template.name}": ${insertError.message}`);
          // Try to clean up the uploaded file
          await supabase.storage.from("documents").remove([newFilePath]);
          continue;
        }

        documentsGenerated++;
      } catch (templateError) {
        const errorMessage = templateError instanceof Error 
          ? templateError.message 
          : "Unknown error";
        errors.push(`Error processing template "${template.name}": ${errorMessage}`);
      }
    }

    return {
      success: errors.length === 0,
      documentsGenerated,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      documentsGenerated,
      errors: [errorMessage, ...errors],
    };
  }
}

// Map template categories to document_category enum
function getCategoryMapping(templateCategory: string): string {
  const mapping: Record<string, string> = {
    induction: "induction",
    safety: "health_safety",
    permits: "permits",
    registers: "other",
    other: "other",
  };
  return mapping[templateCategory] || "other";
}
