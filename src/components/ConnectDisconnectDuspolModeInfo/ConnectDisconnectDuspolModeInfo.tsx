import {useActionsStore, useGlobalStore} from "../../store/store.ts";
import React from "react";
import {MOTION_VARIANTS} from "../../utilities/variants.ts";
import {motion} from "motion/react";
import {isIActionConnectDisconnectDuspol} from "../../types/typeguards.ts";
import {setEntireAction} from "../../utilities/reducers.ts";
import {EAnimationStates} from "../../types/types.ts";

function ConnectDisconnectDuspolModeInfo() {
    const actions = useActionsStore(state => state.actions);
    const activeConnectDisconnectDuspolActionName = useGlobalStore(state => state.activeConnectDisconnectDuspolActionName);
    const currentAction = actions.find(action => action.name === activeConnectDisconnectDuspolActionName);

    if(!currentAction) return null;
    if(!isIActionConnectDisconnectDuspol(currentAction)) return null;

    return(
        <motion.div
            variants={MOTION_VARIANTS.scaleUp}
            className={'absolute top-14 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-xl flex flex-row items-center justify-center pointer-events-none'}
            initial={'initial'}
            animate={'animate'}
            exit={'exit'}
        >
            <p>{currentAction.connectedFirstInteractiveObjectName === "" ? "Wähle den ersten Verbindungspunkt aus" : "Wähle den zweiten Verbindungspunkt aus"}</p>
            <button
                onClick={() => {
                    useActionsStore.setState({actions: setEntireAction(actions, currentAction.name, {connectedFirstInteractiveObjectName: "", connectedSecondInteractiveObjectName: "", activated: false, animationState: EAnimationStates.IDLE, activationCount: currentAction.activationCount + 1})});
                    useGlobalStore.setState({activeConnectDisconnectDuspolActionName: ""});
                }}
                className={'shadow-xl ml-4 px-3 py-2 flex flex-row items-center bg-sky-700 rounded-full text-white relative cursor-pointer pointer-events-auto'}
            >
                Abbrechen
            </button>
        </motion.div>
    )
}

export default ConnectDisconnectDuspolModeInfo;
