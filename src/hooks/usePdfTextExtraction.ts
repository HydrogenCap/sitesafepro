import { useState, useCallback } from "react";

interface ExtractResult {
  text: string;
  pageCount: number;
}

export function usePdfTextExtraction() {
  const [extracting, setExtracting] = useState(false);

  const extractTextFromPdf = useCallback(async (file: File): Promise<ExtractResult | null> => {
    if (file.type !== "application/pdf") {
      return null;
    }

    setExtracting(true);
    
    try {
      // Dynamically import pdfjs-dist
      const pdfjsLib = await import("pdfjs-dist");
      
      // Set the worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = "";
      const maxPages = Math.min(pdf.numPages, 5); // Only extract first 5 pages for speed
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += pageText + "\n";
        
        // Stop if we have enough text
        if (fullText.length > 5000) break;
      }
      
      return {
        text: fullText.substring(0, 5000), // Limit to 5000 chars
        pageCount: pdf.numPages,
      };
    } catch (error) {
      console.error("Error extracting PDF text:", error);
      return null;
    } finally {
      setExtracting(false);
    }
  }, []);

  return { extractTextFromPdf, extracting };
}
