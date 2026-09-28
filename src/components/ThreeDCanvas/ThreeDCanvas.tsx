import { useEffect, useRef } from 'react';
import './ThreeDCanvas.css';
import { ThreeD } from './ThreeD';
import { useGlobalStore, useThreeDReference } from '../../store/store';


function ThreeDCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isLoading = useGlobalStore(state => state.isLoading);
    const hoveredInteractiveObjectName = useGlobalStore(state => state.hoveredInteractiveObjectName);

    useEffect(() => {
        if (canvasRef.current !== null && !useThreeDReference.getState().threeD) {
            useThreeDReference.setState({ threeD: new ThreeD({ canvas: canvasRef.current }) });
            const ThreeDInstance = useThreeDReference.getState().threeD;

            if (ThreeDInstance === null) return;
            ThreeDInstance.init();
        }
    }, []);

    return (
        <div className={`three-d-canvas ${hoveredInteractiveObjectName !== "" ? "cursor-pointer" : "cursor-grab"}`}>
            <canvas ref={canvasRef} className={`three-d-canvas ${isLoading ? '--invisible' : ''}`}></canvas>
        </div>
    );
}

export default ThreeDCanvas;
