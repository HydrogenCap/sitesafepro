import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";

interface DocumentPreviewProps {
  signedUrl: string | null;
  mimeType: string;
  fileName: string;
  onDownload: () => void;
}

const OFFICE_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
];

const OFFICE_LABELS: Record<string, { label: string; extension: string }> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { label: "Word Document", extension: "DOCX" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { label: "Excel Spreadsheet", extension: "XLSX" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { label: "PowerPoint Presentation", extension: "PPTX" },
  "application/msword": { label: "Word Document", extension: "DOC" },
  "application/vnd.ms-excel": { label: "Excel Spreadsheet", extension: "XLS" },
  "application/vnd.ms-powerpoint": { label: "PowerPoint Presentation", extension: "PPT" },
};

export const DocumentPreview = ({
  signedUrl,
  mimeType,
  fileName,
  onDownload,
}: DocumentPreviewProps) => {
  const [zoom, setZoom] = useState(100);

  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");
  const isOffice = OFFICE_MIME_TYPES.includes(mimeType);
  const canPreview = isPdf || isImage;

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 50));

  const handleFullscreen = () => {
    if (signedUrl) {
      window.open(signedUrl, "_blank");
    }
  };

  if (!signedUrl) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-12 text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Preview not available
          </h3>
          <p className="text-muted-foreground mb-6">
            Unable to generate preview for this document.
          </p>
          <Button onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download Document
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Office files — show a friendly download card since they can't be previewed in-browser from private storage
  if (isOffice) {
    const officeInfo = OFFICE_LABELS[mimeType];
    return (
      <Card className="bg-card border-border overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
              {fileName}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardContent className="p-12 text-center">
          <div className="h-20 w-20 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
            <FileText className="h-10 w-10 text-primary" />
          </div>
          <div className="inline-block px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground mb-3">
            {officeInfo?.extension || mimeType.split("/")[1]?.toUpperCase()}
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {officeInfo?.label || "Office Document"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            This document type requires downloading to view. Click below to download and open it in your preferred application.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download to View
            </Button>
            <Button variant="outline" onClick={handleFullscreen}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!canPreview) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-12 text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Preview not available
          </h3>
          <p className="text-muted-foreground mb-2">
            This file type ({mimeType.split("/")[1]?.toUpperCase() || "Unknown"}) cannot be previewed in the browser.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            {fileName}
          </p>
          <Button onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download Document
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          {isPdf ? (
            <FileText className="h-4 w-4 text-primary" />
          ) : (
            <ImageIcon className="h-4 w-4 text-primary" />
          )}
          <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
            {fileName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isImage && (
            <>
              <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={zoom <= 50}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-12 text-center">
                {zoom}%
              </span>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={zoom >= 200}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={handleFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Preview content */}
      <CardContent className="p-0">
        {isPdf ? (
          <object
            data={`${signedUrl}#toolbar=0&navpanes=0`}
            type="application/pdf"
            className="w-full h-[600px] border-0"
            title={fileName}
          >
            <div className="flex flex-col items-center justify-center h-[400px] gap-4 bg-muted/20">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">PDF preview unavailable in this browser.</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleFullscreen}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </object>
        ) : isImage ? (
          <div className="overflow-auto bg-muted/20 flex items-center justify-center min-h-[400px] max-h-[600px]">
            <img
              src={signedUrl}
              alt={fileName}
              className="max-w-full h-auto transition-transform"
              style={{ transform: `scale(${zoom / 100})` }}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
