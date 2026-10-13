import { notFound } from "next/navigation";
import GlassFolderCardsDemo from "@/components/ui/glass-folder-cards-demo";

// معاينة مكوّن GlassFolder أثناء التطوير فقط — غير متاحة في الإنتاج
export default function GlassFolderDemoPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <GlassFolderCardsDemo />;
}
