import {MOTION_VARIANTS} from "../../utilities/variants.ts";
import {motion} from "motion/react";
import React, {ReactElement, useRef, useState} from "react";
import "./ViewerWrapper.css";

interface IViewerWrapperProps {
    buttonText: string;
    onClose: () => void;
    children: ReactElement;
}

function ViewerWrapper(props: IViewerWrapperProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [showImageViewer, setShowImageViewer] = useState(false);


    const onAnimationComplete = () => {
        setShowImageViewer(true);
    }

    return(
        <motion.div
            variants={MOTION_VARIANTS.lightbox}
            initial={"initial"}
            animate={"animate"}
            exit={"exit"}
            className={`fixed inset-0 w-screen h-screen backdrop-blur-sm bg-black/30 flex flex-col items-center justify-center z-20 pointer-events-auto`}
            onAnimationComplete={onAnimationComplete}
            ref={containerRef}
        >
            {React.cloneElement(props.children, {container: containerRef.current, visible: showImageViewer})}
            <div className={'absolute bottom-0 z-2000 flex justify-center w-full p-16 pointer-events-none'}>
                <motion.button
                    variants={MOTION_VARIANTS.scaleUp}
                    onClick={props.onClose}
                    className={'shadow-xl px-3 py-2 flex flex-row items-center bg-sky-700 rounded-full text-white relative cursor-pointer pointer-events-auto'}
                >
                    {props.buttonText}
                </motion.button>
            </div>
        </motion.div>
    )
}

export default ViewerWrapper;
