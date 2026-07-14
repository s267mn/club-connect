'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

type Props = {
  images: string[];
  initialIndex?: number;
  children: React.ReactNode;
};

export default function ImageViewer({
  images,
  initialIndex = 0,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(initialIndex);

  const previous = () => {
    setIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  };

  const next = () => {
    setIndex((i) => (i === images.length - 1 ? 0 : i + 1));
  };

  // Lock page scrolling while modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }

      if (images.length > 1) {
        if (e.key === 'ArrowLeft') previous();
        if (e.key === 'ArrowRight') next();
      }
    };

    window.addEventListener('keydown', listener);

    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [open, images.length]);

  return (
    <>
      <div
        className="cursor-zoom-in"
        onClick={() => {
          setIndex(initialIndex);
          setOpen(true);
        }}
      >
        {children}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            className="
              fixed
              inset-0
              z-[9999]
              bg-black/75
              backdrop-blur-lg
              flex
              items-center
              justify-center
              p-8
            "
          >
            <motion.img
              key={images[index]}
              src={images[index]}
              alt=""
              onClick={(e) => e.stopPropagation()}
              initial={{
                scale: 0.9,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              exit={{
                scale: 0.95,
                opacity: 0,
              }}
              transition={{
                duration: 0.25,
              }}
              className="
                max-w-[90vw]
                max-h-[85vh]
                object-contain
                rounded-2xl
                shadow-2xl
                select-none
              "
            />

            <button
              onClick={() => setOpen(false)}
              className="
                absolute
                top-6
                right-6
                text-white
                hover:scale-110
                transition
              "
            >
              <X size={34} />
            </button>

            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    previous();
                  }}
                  className="
                    absolute
                    left-6
                    text-white
                    hover:scale-110
                    transition
                  "
                >
                  <ChevronLeft size={44} />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  className="
                    absolute
                    right-6
                    text-white
                    hover:scale-110
                    transition
                  "
                >
                  <ChevronRight size={44} />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}