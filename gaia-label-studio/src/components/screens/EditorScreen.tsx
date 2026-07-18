import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import EditorHeader from '@/components/editor/EditorHeader';
import Toolbar from '@/components/editor/Toolbar';
import LeftRail from '@/components/editor/LeftRail';
import CanvasStage from '@/components/editor/CanvasStage';
import EditorControlWindow from '@/components/editor/EditorControlWindow';

export default function EditorScreen() {
  const template = useAppStore((s) => s.template);
  const goto = useAppStore((s) => s.goto);

  useEffect(() => {
    if (!template) goto('template');
  }, [template, goto]);

  if (!template) return null;

  return (
    <div className="flex h-full flex-col">
      <EditorHeader />
      <Toolbar />
      <div className="relative flex min-h-0 flex-1">
        <LeftRail />
        <CanvasStage />
        <EditorControlWindow />
      </div>
    </div>
  );
}
