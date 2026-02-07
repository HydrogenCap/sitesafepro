import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { COSHHSubstance, COSHHFormData } from '@/types/coshh';

export const useCOSHH = (projectId: string) => {
  const { user } = useAuth();
  const [substances, setSubstances] = useState<COSHHSubstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubstances = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('coshh_substances')
        .select('*')
        .eq('project_id', projectId)
        .order('product_name', { ascending: true });

      if (fetchError) throw fetchError;
      setSubstances((data || []) as COSHHSubstance[]);
    } catch (err) {
      console.error('Error fetching COSHH substances:', err);
      setError('Failed to load COSHH register');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSubstances();
  }, [fetchSubstances]);

  const addSubstance = async (formData: COSHHFormData): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in');
      return false;
    }

    try {
      // Get organisation_id
      const { data: memberData } = await supabase
        .from('organisation_members')
        .select('organisation_id')
        .eq('profile_id', user.id)
        .eq('status', 'active')
        .single();

      if (!memberData) {
        toast.error('Organisation not found');
        return false;
      }

      const { error: insertError } = await supabase
        .from('coshh_substances')
        .insert({
          project_id: projectId,
          organisation_id: memberData.organisation_id,
          added_by: user.id,
          product_name: formData.product_name,
          manufacturer: formData.manufacturer || null,
          substance_type: formData.substance_type,
          quantity_on_site: formData.quantity_on_site || null,
          hazard_pictograms: formData.hazard_pictograms,
          hazard_statements: formData.hazard_statements,
          precautionary_statements: formData.precautionary_statements,
          route_of_exposure: formData.route_of_exposure,
          health_effects: formData.health_effects || null,
          control_measures: formData.control_measures,
          ppe_required: formData.ppe_required,
          workplace_exposure_limit: formData.workplace_exposure_limit || null,
          health_surveillance_required: formData.health_surveillance_required,
          health_surveillance_details: formData.health_surveillance_details || null,
          storage_location: formData.storage_location || null,
          storage_requirements: formData.storage_requirements || null,
          first_aid_measures: formData.first_aid_measures || null,
          spill_procedure: formData.spill_procedure || null,
          fire_fighting_measures: formData.fire_fighting_measures || null,
        });

      if (insertError) throw insertError;
      
      toast.success('Substance added to COSHH register');
      await fetchSubstances();
      return true;
    } catch (err) {
      console.error('Error adding substance:', err);
      toast.error('Failed to add substance');
      return false;
    }
  };

  const updateSubstance = async (id: string, formData: Partial<COSHHFormData>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('coshh_substances')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;
      
      toast.success('Substance updated');
      await fetchSubstances();
      return true;
    } catch (err) {
      console.error('Error updating substance:', err);
      toast.error('Failed to update substance');
      return false;
    }
  };

  const removeSubstance = async (id: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('coshh_substances')
        .update({ is_active: false })
        .eq('id', id);

      if (updateError) throw updateError;
      
      toast.success('Substance removed from site');
      await fetchSubstances();
      return true;
    } catch (err) {
      console.error('Error removing substance:', err);
      toast.error('Failed to remove substance');
      return false;
    }
  };

  const deleteSubstance = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('coshh_substances')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      toast.success('Substance deleted');
      await fetchSubstances();
      return true;
    } catch (err) {
      console.error('Error deleting substance:', err);
      toast.error('Failed to delete substance');
      return false;
    }
  };

  const linkSDS = async (substanceId: string, documentId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('coshh_substances')
        .update({ 
          sds_document_id: documentId, 
          sds_available: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', substanceId);

      if (updateError) throw updateError;
      
      toast.success('Safety Data Sheet linked');
      await fetchSubstances();
      return true;
    } catch (err) {
      console.error('Error linking SDS:', err);
      toast.error('Failed to link SDS');
      return false;
    }
  };

  // Computed statistics
  const activeSubstances = substances.filter(s => s.is_active);
  const totalCount = activeSubstances.length;
  const healthSurveillanceCount = activeSubstances.filter(s => s.health_surveillance_required).length;
  const missingSdsCount = activeSubstances.filter(s => !s.sds_available).length;

  return {
    substances: activeSubstances,
    allSubstances: substances,
    loading,
    error,
    totalCount,
    healthSurveillanceCount,
    missingSdsCount,
    addSubstance,
    updateSubstance,
    removeSubstance,
    deleteSubstance,
    linkSDS,
    refresh: fetchSubstances,
  };
};
