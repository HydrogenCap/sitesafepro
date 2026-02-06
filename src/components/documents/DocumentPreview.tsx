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
} from "lucide-react";

interface DocumentPreviewProps {
  signedUrl: string | null;
  mimeType: string;
  fileName: string;
  onDownload: () => void;
}

export const DocumentPreview = ({
  signedUrl,
  mimeType,
  fileName,
  onDownload,
}: DocumentPreviewProps) => {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");
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
          <iframe
            src={`${signedUrl}#toolbar=0&navpanes=0`}
            className="w-full h-[600px] border-0"
            title={fileName}
          />
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
