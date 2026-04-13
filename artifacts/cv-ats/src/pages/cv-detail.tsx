import { useParams, useLocation } from "wouter";
import { useGetCVHtml, getGetCVHtmlQueryKey } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Edit, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useRef } from "react";

export default function CVDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();

  const { data: cvHtml, isLoading, error } = useGetCVHtml(id, {
    query: {
      enabled: !!id,
      queryKey: getGetCVHtmlQueryKey(id)
    }
  });

  const handlePrint = () => {
    window.print();
  };

  if (!id || isNaN(id)) {
    setLocation("/cv");
    return null;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background print:bg-white print:min-h-0">
      <div className="print:hidden">
        <Navbar />
      </div>
      
      <main className="flex-1 container mx-auto max-w-5xl px-4 py-8 print:p-0 print:m-0 print:max-w-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 print:hidden">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/cv" className="hover:text-foreground flex items-center gap-1 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to CVs
            </Link>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/cv/${id}/edit`}>
              <Button variant="outline" className="shadow-sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit Content
              </Button>
            </Link>
            <Button onClick={handlePrint} className="shadow-sm">
              <Download className="mr-2 h-4 w-4" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        <div className="bg-white shadow-md border rounded-sm overflow-hidden print:shadow-none print:border-none print:rounded-none mx-auto w-full max-w-[210mm]">
          {isLoading ? (
            <div className="p-8 sm:p-12 space-y-6">
              <div className="space-y-3">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-5 w-1/4" />
                <div className="flex gap-4 pt-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-px w-full my-6" />
              <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-24 w-full" />
              </div>
              <Skeleton className="h-px w-full my-6" />
              <div className="space-y-6">
                <Skeleton className="h-6 w-40" />
                <div className="space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-destructive">
              <p>Failed to load CV preview. The CV might not exist.</p>
              <Button variant="outline" className="mt-4" onClick={() => setLocation("/cv")}>
                Return to My CVs
              </Button>
            </div>
          ) : (
            <div 
              className="cv-preview-container print:p-0"
              dangerouslySetInnerHTML={{ __html: cvHtml?.html || "" }} 
            />
          )}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .cv-preview-container { padding: 0 !important; }
        }
      `}} />
    </div>
  );
}
