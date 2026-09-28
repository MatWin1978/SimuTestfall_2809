import {useGlobalStore} from "../../store/store.ts";
import React from "react";
import {MOTION_VARIANTS} from "../../utilities/variants.ts";
import {motion} from "motion/react";

interface IModeInfoProps {
    text?: string;
    buttonText?: string;
    callback?: () => void;
}

function ModeInfo(props: IModeInfoProps) {
    return(
        <motion.div
            variants={MOTION_VARIANTS.scaleUp}
            className={'absolute bottom-30 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-xl flex flex-row items-center justify-center pointer-events-none'}
            initial={'initial'}
            animate={'animate'}
            exit={'exit'}
        >
            {props.text ? (<p className={'mr-4'}>{props.text}</p>) : null}
            {props.buttonText && props.callback &&
                <button
                    onClick={props.callback}
                    className={'shadow-xl px-3 py-2 flex flex-row items-center bg-sky-700 rounded-full text-white relative cursor-pointer pointer-events-auto'}
                >
                    {props.buttonText}
                </button>
            }
        </motion.div>
    )
}

export default ModeInfo;
