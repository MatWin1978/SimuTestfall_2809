import {MOTION_VARIANTS} from "../../utilities/variants.ts";
import {motion} from "motion/react";
import React, {useState} from "react";
import SmartphoneAppButton from "./SmartphoneAppButton.tsx";
import SmartphoneAppTimer from "./SmartphoneAppTimer.tsx";
import {useGlobalStore} from "../../store/store.ts";
import SmartphoneAppPhone from "./SmartphoneAppPhone.tsx";

function Smartphone() {
    const [activeApp, setActiveApp] = useState<'home' | 'timer' | 'phone'>('home');
    return(
        <motion.div
            variants={MOTION_VARIANTS.lightbox}
            initial={"initial"}
            animate={"animate"}
            exit={"exit"}
            className={`fixed inset-0 w-screen h-screen backdrop-blur-sm bg-black/30 p-16 flex flex-col items-center justify-center z-20 pointer-events-auto`}
        >
            <motion.div variants={MOTION_VARIANTS.lightboxContent} className={'h-[60vh] rounded-[30px] aspect-9/20 bg-white flex flex-col items-center justify-center shadow-3xl'}>
                <div className={'bg-black w-[calc(100%-2px)] h-[calc(100%-2px)] rounded-[29px] aspect-9/16 flex flex-col items-center justify-center'}>
                    <div className={'bg-sky-700 w-[calc(100%-20px)] h-[calc(100%-20px)] rounded-[24px] aspect-9/16 p-4 flex flex-row relative'}>
                        <SmartphoneAppButton type={'phone'} onClick={() => setActiveApp('phone')}/>
                        <SmartphoneAppButton type={'timer'} onClick={() => setActiveApp('timer')}/>
                        {activeApp === 'timer' && (
                            <SmartphoneAppTimer onClose={() => {setActiveApp('home')}}/>
                        )}
                        {activeApp === 'phone' && (
                            <SmartphoneAppPhone onClose={() => {setActiveApp('home')}}/>
                        )}
                    </div>
                </div>
            </motion.div>
            <button
                onClick={() => {useGlobalStore.setState({showSmartphone: false})}}
                className={'shadow-xl mt-4 px-3 py-2 flex flex-row items-center bg-sky-700 rounded-full text-white relative cursor-pointer'}
            >
                Smartphone schließen
            </button>
        </motion.div>
    )
}

export default Smartphone;
