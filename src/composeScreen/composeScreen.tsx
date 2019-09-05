import React, { useState, useEffect } from "react";
import classnames from "classnames";
import { useDrop } from "react-dnd";
import { ExtractedSprite as ExtractedSpriteCmp } from "./extractedSprite";
import {
    getBackdropNeoGeoColor,
    neoGeoColorToCSS
} from "../palette/neoGeoPalette";
import { useAppState } from "../state";
import { Layer, ExtractedSprite } from "../state/types";
import { BuildGifModal } from "../gifBuilder/buildGifModal";
import { Layers } from "./layers";
import { CropRect } from "./cropRect";

import styles from "./composeScreen.module.css";

interface ComposeScreenProps {
    className?: string;
}

export const ComposeScreen: React.FunctionComponent<ComposeScreenProps> = ({
    className
}) => {
    const [animationCounter, setAnimationCounter] = useState({
        animation: 0,
        rafFrameCountdown: 0
    });
    const [runPreview, setRunPreview] = useState(false);
    const [showBuildGifModal, setShowBuildGifModal] = useState(false);
    const [state, dispatch] = useAppState();
    const [divRef, setDivRef] = useState<null | HTMLDivElement>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [upperLeftCrop, setUpperLeftCrop] = useState<null | {
        x: number;
        y: number;
    }>(null);
    const [lowerRightCrop, setLowerRightCrop] = useState<null | {
        x: number;
        y: number;
    }>(null);

    useEffect(() => {
        if (runPreview) {
            // minus one because on my machine the animation can't quite keep up
            const frameCountdown =
                window.Module._get_neogeo_frame_counter_speed() - 1;
            requestAnimationFrame(() => {
                const diff = animationCounter.rafFrameCountdown === 0 ? 1 : 0;

                setAnimationCounter({
                    animation: animationCounter.animation + diff,
                    rafFrameCountdown:
                        diff === 1
                            ? frameCountdown
                            : animationCounter.rafFrameCountdown - 1
                });
            });
        }
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, dropRef] = useDrop({
        accept: "Sprite",
        drop: (item: any, monitor: any) => {
            if (divRef) {
                const x =
                    monitor.getClientOffset().x -
                    divRef.getBoundingClientRect().left;

                const composedX = Math.floor(x / 16) * 16;
                const spriteMemoryIndex = item.spriteIndex;
                const pauseId = item.pauseId;

                dispatch({
                    type: "ExtractSprite",
                    spriteMemoryIndex,
                    composedX,
                    pauseId
                });
            }
        },
        canDrop() {
            return !isCropping;
        }
    });

    const extractedSprites = state.layers.reduce<ExtractedSprite[]>(
        (b, layer) => {
            if (layer.hidden) {
                return b;
            } else {
                const sprites = layer.groups.reduce<ExtractedSprite[]>(
                    (b, group) => {
                        if (group.hidden) {
                            return b;
                        } else {
                            return b.concat(group.sprites);
                        }
                    },
                    []
                );

                return b.concat(sprites);
            }
        },
        []
    );

    const sprites = extractedSprites.map(extractedSprite => (
        <ExtractedSpriteCmp
            key={extractedSprite.spriteMemoryIndex}
            data={extractedSprite}
            autoAnimate={runPreview}
            animationCounter={animationCounter.animation}
            canDrag={!isCropping}
        />
    ));

    const backgroundColor = state.isPaused
        ? neoGeoColorToCSS(getBackdropNeoGeoColor())
        : "transparent";

    const maxX = Math.max(...extractedSprites.map(es => es.composedX));
    const width = Math.max(maxX + 48, 320);

    const maxY = Math.max(
        ...extractedSprites.map(es =>
            Math.max(...es.tiles.map(t => t.composedY))
        )
    );
    const height = Math.max(maxY + 48, 240);

    const style = {
        backgroundColor,
        width,
        height
    };

    const finalClassName = classnames(styles.root, className);

    return (
        <>
            <BuildGifModal
                isOpen={showBuildGifModal}
                onRequestClose={() => setShowBuildGifModal(false)}
            />
            <div className={finalClassName}>
                <div className={styles.toolbar}>
                    <button
                        disabled={isCropping}
                        onClick={() => {
                            setIsCropping(true);
                            dispatch({ type: "ClearCrop" });
                            setUpperLeftCrop(null);
                            setLowerRightCrop(null);
                        }}
                    >
                        crop
                    </button>
                    <button
                        disabled={!state.crop}
                        onClick={() => {
                            dispatch({ type: "ClearCrop" });
                            setUpperLeftCrop(null);
                            setLowerRightCrop(null);
                        }}
                    >
                        clear crop
                    </button>
                    <button onClick={() => setRunPreview(!runPreview)}>
                        {runPreview ? "stop" : "preview"}
                    </button>
                    <button onClick={() => setShowBuildGifModal(true)}>
                        build gif
                    </button>
                    <div>
                        {animationCounter.animation} (
                        {animationCounter.rafFrameCountdown})
                    </div>
                </div>
                <Layers className={styles.layers} />
                <div
                    className={styles.bg}
                    ref={div => {
                        setDivRef(div);
                        dropRef(div);
                    }}
                    style={style}
                >
                    {isCropping && (
                        <div
                            className={styles.captureLayer}
                            onMouseDown={(
                                e: React.MouseEvent<HTMLDivElement>
                            ) => {
                                if (isCropping) {
                                    const rect = (e.target as HTMLDivElement).getBoundingClientRect() as DOMRect;

                                    const rawX = e.clientX - rect.x;
                                    const rawY = e.clientY - rect.y;

                                    const x = Math.floor(rawX / 16) * 16;
                                    const y = Math.floor(rawY / 16) * 16;

                                    setUpperLeftCrop({ x, y });
                                }
                            }}
                            onMouseMove={e => {
                                if (isCropping && upperLeftCrop) {
                                    const rect = (e.target as HTMLDivElement).getBoundingClientRect() as DOMRect;

                                    const rawX = e.clientX - rect.x;
                                    const rawY = e.clientY - rect.y;

                                    const x = Math.floor(rawX / 16) * 16;
                                    const y = Math.floor(rawY / 16) * 16;

                                    setLowerRightCrop({ x, y });
                                }
                            }}
                            onMouseUp={e => {
                                if (
                                    isCropping &&
                                    upperLeftCrop &&
                                    lowerRightCrop
                                ) {
                                    dispatch({
                                        type: "SetCrop",
                                        crop: [upperLeftCrop, lowerRightCrop]
                                    });
                                    setIsCropping(false);
                                }
                            }}
                        />
                    )}
                    {sprites}
                    {!!(
                        (isCropping && upperLeftCrop && lowerRightCrop) ||
                        state.crop
                    ) && (
                        <CropRect
                            className={styles.cropRect}
                            crop={
                                state.crop || [upperLeftCrop!, lowerRightCrop!]
                            }
                            totalWidth={width}
                            totalHeight={height}
                        />
                    )}
                </div>
                <button
                    className={styles.handleNegatives}
                    onClick={() => dispatch({ type: "HandleNegatives" })}
                >
                    handle negatives
                </button>
            </div>
        </>
    );
};
