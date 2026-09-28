import {MOTION_VARIANTS} from "../../utilities/variants.ts";
import {motion} from "motion/react";
import {useActionsStore, useExpertSystemStore, useGlobalStore} from "../../store/store.ts";
import React from "react";
import ExpertSystem from "../ExpertSystem/ExpertSystem.tsx";
import {EActionType, EXPERT_SYSTEM_ROUTES} from "../../types/types.ts";
import {handleActionTrigger} from "../../utilities/handleActionTrigger.ts";
import {findActionByType} from "../../utilities/utilities.ts";
import {MinusIcon, XMarkIcon} from "@heroicons/react/24/outline";

function Computer() {
    const actions = useActionsStore(state => state.actions);
    const computerIsMinimized = useGlobalStore(state => state.computerIsMinimized);

    return(
        <motion.div
            variants={MOTION_VARIANTS.lightbox}
            initial={"initial"}
            animate={"animate"}
            exit={"exit"}
            className={`fixed inset-0 w-screen h-screen backdrop-blur-sm bg-black/30 p-16 flex flex-col items-center justify-center z-20 pointer-events-auto ${computerIsMinimized ? 'hidden' : ''}`}
        >
            <motion.div variants={MOTION_VARIANTS.lightboxContent} className={'w-[90vw] max-w-[1400px] max-h-[787px] h-[90vh] shrink-0 rounded-[30px] bg-black flex flex-col items-stretch justify-center shadow-3xl p-10'}>
                <div className={'w-full h-full flex flex-col overflow-hidden bg-white rounded-xl'}>
                    <div className={'flex-1 min-h-0 overflow-y-auto'}>
                        <ExpertSystem/>
                    </div>
                    <div className={'flex flex-row items-center justify-end gap-3 px-8 py-2 border-t border-gray-200 bg-gray-50'}>
                        <div className={'flex flex-row items-center gap-3'}>
                            <button
                                onClick={() => {
                                    useGlobalStore.setState({computerIsMinimized: true});
                                }}
                                className={'px-4 py-2 flex flex-row items-center gap-1 bg-white text-gray-700 border border-gray-300 rounded-full cursor-pointer hover:bg-gray-100 transition-colors'}
                            >
                                <MinusIcon className={'size-4'}/>
                                Minimieren
                            </button>
                            <button
                                onClick={() => {
                                    const laptopAction = findActionByType(actions, EActionType.LAPTOP);
                                    if(laptopAction) {
                                        useGlobalStore.setState({computerIsMinimized: false});
                                        useExpertSystemStore.setState({
                                            activeRoute: EXPERT_SYSTEM_ROUTES.HOME,
                                            activeDiagnosticRoute: 'home',
                                            activeDiagnosticSubRoute: ''
                                        });
                                        handleActionTrigger(laptopAction);
                                    }
                                }}
                                className={'px-4 py-2 flex flex-row items-center gap-1 bg-white text-gray-700 border border-gray-300 rounded-full cursor-pointer hover:bg-gray-100 transition-colors'}
                            >
                                <XMarkIcon className={'size-4'}/>
                                Schließen
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}

export default Computer;
