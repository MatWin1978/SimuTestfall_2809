import {motion} from "motion/react";
import {MOTION_VARIANTS} from "../../utilities/variants.ts";
import {useGlobalStore} from "../../store/store.ts";

function LightboxContentMessage() {
    const message = useGlobalStore(state => state.activeLightboxMessage);
    return(
        <div className={'h-full p-16 flex flex-col items-center justify-center'}>
            <motion.div className={'text-center mb-10'} variants={MOTION_VARIANTS.appearUp} dangerouslySetInnerHTML={{__html: message}}></motion.div>
            <motion.button
                variants={MOTION_VARIANTS.scaleUp}
                className={'pointer-events-auto shadow-xl px-3 py-2 flex flex-row items-center justify-center bg-sky-700 rounded-full text-white relative cursor-pointer w-full'}
                onClick={() => {
                    useGlobalStore.setState({
                      activeLightboxMessage: ""
                    });
                }}>
                <span>Schließen</span>
            </motion.button>
        </div>
    )
}

export default LightboxContentMessage;
