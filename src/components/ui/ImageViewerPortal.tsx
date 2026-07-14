'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useImageViewer } from '@/context/ImageViewerContext';

export default function ImageViewerPortal() {
  const { viewer, closeViewer } = useImageViewer();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!viewer.open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [viewer.open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {viewer.open && (
        <motion.div
          className="
            fixed
            inset-0
            z-[99999]
            bg-black/95
            backdrop-blur-xl
            flex
            items-center
            justify-center
            p-1
            overflow-hidden
            "
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={closeViewer}
        >
          <motion.img
            key={viewer.images[viewer.index]}
            src={viewer.images[viewer.index]}
            alt=""
            draggable={false}
            onClick={(e) => e.stopPropagation()}
            initial={{
              opacity: 0,
              scale: 0.88,
              y: 20,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.94,
            }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 24,
            }}
            className="
            w-auto
            h-auto
            max-w-[99vw]
            max-h-[99vh]
            object-contain
            rounded-md
            select-none
            cursor-zoom-out
            shadow-[0_30px_80px_rgba(0,0,0,0.65)]
            "
          />

          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: 0.05 }}
            onClick={(e) => {
              e.stopPropagation();
              closeViewer();
            }}
            className="
              absolute
              top-4
              right-4
              w-10
              h-10
              rounded-full
              bg-white/45
              backdrop-blur-md
              border
              border-white/15
              flex
              items-center
              justify-center
              text-white
              transition
              hover:bg-white/20
              hover:scale-105
            "
          >
            <X size={22} />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}