export const storagePaths = {
  evidence: (
    orgId: string, projectId: string, docId: string,
    versionId: string, evidenceId: string, ext: string
  ) =>
    `org/${orgId}/projects/${projectId}/docs/${docId}/versions/${versionId}/evidence/${evidenceId}.${ext}`,

  signature: (
    orgId: string, projectId: string, docId: string,
    versionId: string, signatureId: string
  ) =>
    `org/${orgId}/projects/${projectId}/docs/${docId}/versions/${versionId}/signatures/${signatureId}.png`,

  export: (
    orgId: string, projectId: string, docId: string,
    versionId: string, exportId: string
  ) =>
    `org/${orgId}/projects/${projectId}/docs/${docId}/versions/${versionId}/exports/${exportId}.pdf`,

  orgLogo: (orgId: string, ext: string) =>
    `org/${orgId}/logo.${ext}`,
} as const;
