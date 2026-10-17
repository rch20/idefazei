import { ArrowLeft, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FoundationTheme } from "./FoundationTheme";
import type { StudyHandout } from "./FoundationStudyHandouts";
import type previewData from "./foundationHandoutPages";
import { createElement } from "react";

export type PreviewProps = {
  handout: StudyHandout;
  theme: FoundationTheme;
  onClose: () => void;
  onRestoreFocus: () => void;
};
const runtime = {
  h: createElement,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Button,
  ArrowLeft,
  X,
  Download,
};
export type PreviewRuntime = typeof runtime;
export default function FoundationHandoutPreview(
  props: PreviewProps & { data: typeof previewData }
) {
  return props.data.render(runtime, props);
}
