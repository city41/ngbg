import React from "react";
import classnames from "classnames";
import { renderTileToCanvas } from "../state/renderTileToCanvas";
import {
    getNeoGeoPalette,
    convertNeoGeoPaletteToRGB
} from "../palette/neoGeoPalette";

import styles from "./tile.module.css";

interface TileProps {
    y: number;
    tileIndex: number;
    paletteIndex: number;
    horizontalFlip?: boolean;
    verticalFlip?: boolean;
}

export class Tile extends React.PureComponent<TileProps> {
    render() {
        const {
            y: tileY,
            tileIndex,
            paletteIndex,
            horizontalFlip,
            verticalFlip
        } = this.props;

        function renderCanvas(canvas: HTMLCanvasElement) {
            const rgbPalette = convertNeoGeoPaletteToRGB(
                getNeoGeoPalette(paletteIndex)
            );
            renderTileToCanvas(canvas, tileIndex, rgbPalette);
        }

        const horizontalScale = horizontalFlip ? -1 : 1;
        const verticalScale = verticalFlip ? -1 : 1;

        const inlineStyle = {
            transform: `scale(${horizontalScale},${verticalScale})`
        };

        return (
            <canvas
                className={styles.canvas}
                ref={r => r && renderCanvas(r)}
                style={inlineStyle}
            />
        );
    }
}
