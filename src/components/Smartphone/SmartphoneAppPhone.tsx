import React, {useEffect, useState} from "react";
import {PhoneIcon} from "@heroicons/react/24/solid";
import {motion} from "motion/react";
import {MOTION_VARIANTS} from "../../utilities/variants.ts";
import {handleActionTrigger} from "../../utilities/handleActionTrigger.ts";
import {findActionByType} from "../../utilities/utilities.ts";
import {EActionType} from "../../types/types.ts";
import {useActionsStore} from "../../store/store.ts";

interface ISmartphoneAppPhoneProps {
    onClose: () => void;
}

function SmartphoneAppPhone(props: ISmartphoneAppPhoneProps) {
    const [callWasMade, setCallWasMade] = useState(false);
    const actions = useActionsStore(state => state.actions);

    useEffect(() => {
        if(callWasMade) {
            const callAction = findActionByType(actions, EActionType.CALL_EXPERT);
            if(callAction) {
                handleActionTrigger(callAction);
            }
        }
    }, [callWasMade])

    return(
        <motion.div variants={MOTION_VARIANTS.scaleUp} className={'bg-black absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-full h-full rounded-[24px] p-4 flex flex-col items-center'}>
            <div className={'flex flex-col items-center justify-center w-full h-full'}>
                <div className={`w-full font-extralight p-8 rounded-3xl text-center mb-8`}>
                    <div className={'text-white text-[1.3rem]'}>Fachkraft<br/>+49 172 000 000</div>
                    {callWasMade && (
                        <div className={'text-green-500 text-[1.0rem] mt-10'}>Vielen Dank, die Fachkraft für Elektromobilität kümmert sich um ihr Anliegen. Bitte beenden Sie die Arbeit.<br/>Dauer: 00:10:27</div>
                    )}
                </div>
                <button
                    onClick={() => {setCallWasMade(true)}}
                    className={'rounded-full bg-green-800 text-white p-2 cursor-pointer w-full flex flex-row items-center justify-center'}
                >
                    <PhoneIcon className={'size-5 mr-4'}/>
                    <span>Anrufen</span>
                </button>
                <button
                    onClick={() => {props.onClose()}}
                    className={'rounded-full mt-auto bg-sky-700 text-white p-2 cursor-pointer w-full'}
                >
                    Schließen
                </button>
            </div>
        </motion.div>
    )
}

export default SmartphoneAppPhone;
