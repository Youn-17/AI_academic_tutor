import { useEffect, useRef } from 'react';

/**
 * GptBots AI Widget Component
 *
 * Dynamically loads the GptBots chat widget script only when mounted.
 * Use this component to show the AI assistant on specific pages.
 *
 * @example
 * ```tsx
 * <GptBotsWidget />
 * ```
 */
const GptBotsWidget: React.FC = () => {
  const scriptLoaded = useRef(false);

  useEffect(() => {
    // Prevent duplicate script loading
    if (scriptLoaded.current) return;

    // Create and inject the GptBots script
    const script = document.createElement('script');
    script.src = 'https://www.gptbots.ai/widget/wewxqwyqwdciakjvan8vyfb/chat.js';
    script.async = true;
    script.defer = true;

    // Append to body
    document.body.appendChild(script);
    scriptLoaded.current = true;

    // Cleanup: remove script when component unmounts
    return () => {
      // Note: Removing the script element doesn't remove the injected widget
      // The widget DOM elements are created by the external script
      // We don't remove them to avoid breaking the widget if it's still in use
      script.remove();
    };
  }, []);

  // This component doesn't render any DOM elements
  // The GptBots script creates its own floating button
  return null;
};

export default GptBotsWidget;
