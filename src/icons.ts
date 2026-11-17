import arrowLeft from 'lucide-static/icons/arrow-left.svg?raw';
import arrowRight from 'lucide-static/icons/arrow-right.svg?raw';
import chevronRight from 'lucide-static/icons/chevron-right.svg?raw';
import rotateCcw from 'lucide-static/icons/rotate-ccw.svg?raw';
import vibrate from 'lucide-static/icons/vibrate.svg?raw';
import vibrateOff from 'lucide-static/icons/vibrate-off.svg?raw';
import video from 'lucide-static/icons/video.svg?raw';
import volume2 from 'lucide-static/icons/volume-2.svg?raw';
import volumeX from 'lucide-static/icons/volume-x.svg?raw';
import x from 'lucide-static/icons/x.svg?raw';

const icons: Record<string, string> = {
  'arrow-left': arrowLeft, 'arrow-right': arrowRight, 'chevron-right': chevronRight,
  'rotate-ccw': rotateCcw, vibrate, 'vibrate-off': vibrateOff,
  video, 'volume-2': volume2, 'volume-x': volumeX, x,
};

export function hydrateIcons(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-lucide]').forEach(placeholder => {
    const source = icons[placeholder.dataset.lucide ?? ''];
    if (!source) return;
    const template = document.createElement('template');
    template.innerHTML = source;
    const svg = template.content.firstElementChild;
    if (!svg) return;
    svg.setAttribute('aria-hidden', 'true');
    placeholder.replaceWith(svg);
  });
}
