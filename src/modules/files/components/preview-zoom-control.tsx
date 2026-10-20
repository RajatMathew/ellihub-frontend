import { Button } from '@/app/components/ui/button';
import { Slider, SliderThumb } from '@/app/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import {
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  sliderToZoom,
  stepZoom,
  zoomToSlider,
} from '@/modules/files/lib/preview-zoom';
import { Minus, Plus } from 'lucide-react';

/**
 * The status-bar zoom of Excel and Word: − / slider / + and the percentage,
 * which resets to 100% when clicked. Ctrl/⌘ + scroll and pinch over the page
 * zoom too (`usePreviewZoomGestures`).
 */
export function PreviewZoomControl({
  zoom,
  onZoomChange,
}: {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 pr-2">
      <Button
        variant="ghost"
        mode="icon"
        size="sm"
        className="size-7 text-muted-foreground"
        aria-label="Zoom out"
        disabled={zoom <= MIN_ZOOM}
        onClick={() => onZoomChange(stepZoom(zoom, -1))}
      >
        <Minus aria-hidden="true" />
      </Button>
      <Slider
        className="hidden w-28 sm:flex"
        min={0}
        max={100}
        step={0.5}
        value={[zoomToSlider(zoom)]}
        onValueChange={([position]) => {
          if (position != null) onZoomChange(sliderToZoom(position));
        }}
        aria-label="Zoom"
      >
        <SliderThumb className="size-3" aria-label="Zoom" aria-valuetext={`${zoom}%`} />
      </Slider>
      <Button
        variant="ghost"
        mode="icon"
        size="sm"
        className="size-7 text-muted-foreground"
        aria-label="Zoom in"
        disabled={zoom >= MAX_ZOOM}
        onClick={() => onZoomChange(stepZoom(zoom, 1))}
      >
        <Plus aria-hidden="true" />
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-14 px-1 text-xs tabular-nums text-muted-foreground"
            aria-label={`Zoom ${zoom}%, reset to ${DEFAULT_ZOOM}%`}
            onClick={() => onZoomChange(DEFAULT_ZOOM)}
          >
            {zoom}%
          </Button>
        </TooltipTrigger>
        <TooltipContent>Reset to {DEFAULT_ZOOM}%</TooltipContent>
      </Tooltip>
    </div>
  );
}
