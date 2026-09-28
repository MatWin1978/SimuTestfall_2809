import React from "react";
import {XMarkIcon} from "@heroicons/react/24/outline";
import {motion} from "motion/react";
import {MOTION_VARIANTS} from "../../utilities/variants.ts";

interface ILightboxProps {
    children: React.ReactNode;
    hasCloseButton?: boolean;
    onClose?: () => void;
}

export default function Lightbox(props: ILightboxProps) {
    return(
        <motion.div
            variants={MOTION_VARIANTS.lightbox}
            initial={"initial"}
            animate={"animate"}
            exit={"exit"}
            className={`fixed inset-0 w-screen h-screen backdrop-blur-sm bg-black/30 p-16 flex flex-col items-center justify-center z-20 pointer-events-auto`}
        >
            <motion.div variants={MOTION_VARIANTS.lightboxContent} className={'relative max-w-6/10 flex flex-col min-h-0'}>
                <div className={'flex flex-col min-h-0 bg-white shadow-xl rounded-4xl w-full overflow-hidden'}>
                    <div className={'flex-1 min-h-0 rounded-4xl overflow-y-auto'}>
                        {props.children}
                    </div>
                </div>
                {props.hasCloseButton &&
                    <button
                        className={'bg-sky-700 rounded-full w-14 h-14 absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-pointer hover:bg-sky-800 transition-colors duration-200'}
                        onClick={props.onClose}
                    >
                        <XMarkIcon className={'size-8 text-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'}/>
                    </button>
                }
            </motion.div>
        </motion.div>
    )
}
