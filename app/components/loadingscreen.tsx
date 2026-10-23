"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { MOTION_EASE } from "./ui/motion";

// Longest the splash may cover an already-hydrated page. Waiting for the full
// `load` event alone kept slow mobile connections behind the spinner until
// every image on the page had downloaded.
const MAX_SPLASH_MS = 600;

const LoadingScreen = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleLoad = () => {
      setIsLoading(false);
    };

    if (document.readyState === "complete") {
      handleLoad();
      return;
    }

    const timeout = window.setTimeout(handleLoad, MAX_SPLASH_MS);
    window.addEventListener("load", handleLoad);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("load", handleLoad);
    };
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="splash-failsafe fixed inset-0 bg-pine flex items-center justify-center z-50"
          role="status"
          aria-label="Loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: MOTION_EASE }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, ease: "linear", repeat: Infinity }}
          >
            <Loader2 className="h-12 w-12 text-mint" aria-hidden="true" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingScreen;
