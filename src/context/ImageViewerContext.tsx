'use client';

import {
    createContext,
    useContext,
    useState,
    ReactNode,
} from 'react';

type ViewerState = {
    open: boolean;
    images: string[];
    index: number;
};

type ViewerContextType = {
    viewer: ViewerState;

    openViewer: (
        images: string[],
        index?: number
    ) => void;

    closeViewer: () => void;

    nextImage: () => void;

    previousImage: () => void;

    setIndex: (index: number) => void;
};

const ImageViewerContext =
    createContext<ViewerContextType | null>(null);

export function ImageViewerProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [viewer, setViewer] =
        useState<ViewerState>({
            open: false,
            images: [],
            index: 0,
        });

    function openViewer(
        images: string[],
        index = 0
    ) {
        setViewer({
            open: true,
            images,
            index,
        });
    }

    function closeViewer() {
        setViewer((v) => ({
            ...v,
            open: false,
        }));
    }

    function nextImage() {
        setViewer((v) => ({
            ...v,
            index:
                (v.index + 1) %
                v.images.length,
        }));
    }

    function previousImage() {
        setViewer((v) => ({
            ...v,
            index:
                (v.index - 1 + v.images.length) %
                v.images.length,
        }));
    }

    function setIndex(index: number) {
        setViewer((v) => ({
            ...v,
            index,
        }));
    }

    return (
        <ImageViewerContext.Provider
            value={{
                viewer,
                openViewer,
                closeViewer,
                nextImage,
                previousImage,
                setIndex,
            }}
        >
            {children}
        </ImageViewerContext.Provider>
    );
}

export function useImageViewer() {
    const context =
        useContext(ImageViewerContext);

    if (!context) {
        throw new Error(
            'useImageViewer must be used inside ImageViewerProvider'
        );
    }

    return context;
}