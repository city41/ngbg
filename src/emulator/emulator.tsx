import React, { useState } from "react";
import classnames from "classnames";
import { useAppState } from "../state";

import styles from "./emulator.module.css";

interface EmulatorProps {
    className?: string;
}

function loadFile<T>(file: File): Promise<T> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            if (reader.result) {
                resolve((reader.result as unknown) as T);
            } else {
                reject(`Failed to load: ${file.name}`);
            }
        });

        reader.readAsArrayBuffer(file);
    });
}

async function addFileToVirtualFS(file: File) {
    const data: ArrayBuffer = await loadFile(file);

    window.Module.FS_createDataFile(
        "/virtualfs",
        file.name,
        new Uint8Array(data),
        true,
        true
    );
}

export const Emulator: React.FunctionComponent<EmulatorProps> = props => {
    const [state, dispatch] = useAppState();
    const [gameName, setGameName] = useState("");

    function togglePause() {
        if (state.isPaused) {
            window.Module.resumeMainLoop();
        } else {
            window.Module.pauseMainLoop();
        }

        dispatch({ type: "TogglePause" });
    }

    async function loadBiosFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target && e.target.files && e.target.files[0];

        if (!file) {
            return;
        }

        await addFileToVirtualFS(file);
    }

    async function loadROMFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target && e.target.files && e.target.files[0];

        if (!file) {
            return;
        }

        await addFileToVirtualFS(file);

        const gameName = file.name.replace(".zip", "");

        startGame(gameName);
    }

    function startGame(overrideGameName?: string) {
        const argv = window.stackAlloc(3 * 4);

        window.HEAP32[argv >> 2] = window.allocateUTF8OnStack("gngeo");
        window.HEAP32[(argv >> 2) + 1] = window.allocateUTF8OnStack(
            overrideGameName || gameName
        );
        window.HEAP32[(argv >> 2) + 2] = 0;

        dispatch({ type: "StartEmulation" });

        try {
            window.Module._run_rom(2, argv);
        } catch (e) {
            console.log("_run_rom threw");
        }
    }

    let debugButton = null;

    if (process.env.NODE_ENV !== "production") {
        debugButton = (
            <button onClick={() => startGame("samsho2")}>samsho2</button>
        );
    }

    const classes = classnames(styles.root, props.className);

    return (
        <div className={classes}>
            <canvas id="canvas" />
            <div>
                BIOS
                <input type="file" onChange={loadBiosFile} />
            </div>
            <div>
                ROM
                <input type="file" onChange={loadROMFile} />
            </div>
            {debugButton}
            <button disabled={!state.hasStarted} onClick={togglePause}>
                {state.isPaused ? "resume" : "pause"}
            </button>
        </div>
    );
};
