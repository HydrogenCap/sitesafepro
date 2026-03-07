import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLog, activityDescriptions } from '@/hooks/useActivityLog';
import { useNotifications } from '@/hooks/useNotifications';
import type { ClassificationResult } from '@/hooks/useDocumentClassification';

interface Project {
  id: string;
  name: string;
}

interface ParentDocument {
  id: string;
  name: string;
  version: number;
  category: string;
  project_id: string | null;
}

interface UploadParams {
  file: File;
  name: string;
  description: string;
  category: string;
  projectId: string;
  organisationId: string;
  userId: string;
  parentDocument?: ParentDocument | null;
  classificationResult?: ClassificationResult | null;
  requiresAcknowledgement: boolean;
  acknowledgementDeadline?: Date;
  expiryDate?: Date;
  projects: Project[];
}

export const useDocumentUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { logActivity } = useActivityLog();
  const { notifyDocumentAcknowledgement } = useNotifications();

  const upload = async (params: UploadParams): Promise<boolean> => {
    const {
      file, name, description, category, projectId, organisationId, userId,
      parentDocument, classificationResult, requiresAcknowledgement,
      acknowledgementDeadline, expiryDate, projects,
    } = params;

    setUploading(true);
    setUploadProgress(10);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${organisationId}/${fileName}`;

      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      const newVersion = parentDocument ? parentDocument.version + 1 : 1;
      const parentDocId = parentDocument ? parentDocument.id : null;

      const { data: docData, error: dbError } = await supabase
        .from('documents')
        .insert({
          organisation_id: organisationId,
          project_id: projectId !== 'none' ? projectId : null,
          uploaded_by: userId,
          name: name.trim(),
          description: description.trim() || null,
          category,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          version: newVersion,
          parent_document_id: parentDocId,
          ai_category: classificationResult?.category || null,
          ai_confidence: classificationResult?.confidence || null,
          ai_compliance_flags: classificationResult?.complianceFlags || null,
          requires_acknowledgement: requiresAcknowledgement,
          acknowledgement_deadline: acknowledgementDeadline?.toISOString() || null,
          expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : null,
        } as any)
        .select()
        .single();

      if (dbError) throw dbError;

      // Update organisation storage usage
      const { data: orgData } = await supabase
        .from('organisations')
        .select('storage_used_bytes')
        .eq('id', organisationId)
        .single();

      if (orgData) {
        await supabase
          .from('organisations')
          .update({ storage_used_bytes: (orgData.storage_used_bytes || 0) + file.size })
          .eq('id', organisationId);
      }

      logActivity({
        activityType: 'document_uploaded',
        entityType: 'document',
        entityName: name.trim(),
        description: activityDescriptions.document_uploaded(name.trim()),
        projectId: projectId !== 'none' ? projectId : undefined,
      });

      if (requiresAcknowledgement && docData) {
        const { data: members } = await supabase
          .from('organisation_members')
          .select('profile_id')
          .eq('organisation_id', organisationId)
          .eq('status', 'active')
          .neq('profile_id', userId);

        if (members && members.length > 0) {
          const recipientIds = members.map((m) => m.profile_id);
          const projectName = projects.find((p) => p.id === projectId)?.name || 'General';
          const deadlineStr = acknowledgementDeadline
            ? format(acknowledgementDeadline, 'dd MMM yyyy')
            : undefined;

          notifyDocumentAcknowledgement(
            recipientIds, docData.id, name.trim(), projectName, deadlineStr
          ).catch((err) => console.error('Failed to send document notifications:', err));
        }
      }

      setUploadProgress(100);
      toast.success(
        parentDocument
          ? `Version ${parentDocument.version + 1} uploaded successfully!`
          : 'Document uploaded successfully!'
      );

      return true;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
      return false;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, uploadProgress };
};
