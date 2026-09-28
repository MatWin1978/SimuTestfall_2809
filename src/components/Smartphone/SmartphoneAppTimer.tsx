import React, {useEffect, useRef} from "react";
import {useActionsStore, useTimerStore} from "../../store/store.ts";
import {MinusIcon, PlusIcon} from "@heroicons/react/24/solid";
import usePrevious from "../../hooks/usePrevious.tsx";
import {motion} from "motion/react";
import {MOTION_VARIANTS} from "../../utilities/variants.ts";
import {handleActionTrigger} from "../../utilities/handleActionTrigger.ts";
import {EActionType} from "../../types/types.ts";

interface ISmartphoneAppTimerProps {
    onClose: () => void;
}

function SmartphoneAppTimer(props: ISmartphoneAppTimerProps) {
    const setIntervalRef = useRef<ReturnType<typeof setInterval>| null>(null);
    const currentState = useTimerStore((state) => state.currentState);
    const prevCurrentState = usePrevious(currentState);
    const currentTime = useTimerStore((state) => state.currentTime);
    const goalTime = useTimerStore((state) => state.goalTime);
    const goalTimeRef = useRef<number | null>(goalTime);
    const displayedTime = currentState === 'idle' ? new Date(goalTime * 1000).toISOString().substring(11, 19) : new Date(currentTime * 1000).toISOString().substring(11, 19);

    const handleSecondButtonClick = (sign: 'positive' | 'negative') => {
        let newGoalTime = 0;
        if(sign === 'positive') {
            newGoalTime = goalTime + 5;
        }
        if(sign === 'negative') {
            newGoalTime = goalTime >=5 ? goalTime - 5 : 0
        }
        useTimerStore.setState({
            goalTime: newGoalTime,
            currentTime: newGoalTime
        })
        goalTimeRef.current = newGoalTime;
    }
    const handleMinuteButtonClick = (sign: 'positive' | 'negative') => {
        let newGoalTime = 0;
        if(sign === 'positive') {
            newGoalTime = goalTime + 60;
        }
        if(sign === 'negative') {
            newGoalTime = goalTime >=60 ? goalTime - 60 : 0;
        }
        goalTimeRef.current = newGoalTime;
        useTimerStore.setState({
            goalTime: newGoalTime,
            currentTime: newGoalTime
        })
    }
    const handleMainButtonClick = () => {
        useTimerStore.setState({currentState: currentState === 'idle' ? 'running' : 'idle'})
    }

    useEffect(() => {
        if(currentState !== prevCurrentState) {
            if(currentState === 'idle') {
                clearInterval(setIntervalRef.current);
                useTimerStore.setState({currentTime: goalTimeRef.current})
            }
            if(currentState === 'running') {
                setIntervalRef.current = setInterval(() => {
                    const currentTime = useTimerStore.getState().currentTime;
                    if(currentTime <= 1 ) {
                        clearInterval(setIntervalRef.current);
                        useTimerStore.setState({
                            currentTime: 0,
                            currentState: 'done'
                        });
                        handleActionTrigger(useActionsStore.getState().actions.find((action) => action.type === EActionType.TIMER), {timer: {duration: goalTimeRef.current}})
                    }
                    else {
                        useTimerStore.setState((state) => {
                            return {currentTime: state.currentTime - 1}})
                    }
                }, 100);
            }
        }
    }, [currentState, prevCurrentState, currentTime, goalTimeRef.current])

    useEffect(() => {
        return () => {
            clearInterval(setIntervalRef.current);
        }
    }, [])



    return(
        <motion.div variants={MOTION_VARIANTS.scaleUp} className={'bg-black absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-full h-full rounded-[24px] p-4 flex flex-col items-center'}>
            <div className={'flex flex-col items-center justify-center w-full'}>
                <div className={`${currentState === "idle" ? "bg-white/10" : ""} ${currentState === "running" ? "bg-red-800/30" : ""} ${currentState === "done" ? "bg-green-800/30" : ""} w-full font-extralight text-white text-[2.2rem] p-6 rounded-3xl text-center mb-8`}>
                    <div>{displayedTime}</div>
                    <div className={'text-[0.6rem]'}>Hinweis: Beschleunigte Wiedergabe, keine Echtzeit.</div>
                </div>
                <div className={'flex flex-row justify-center items-center w-full gap-8 mb-12'}>
                    <div className={'flex flex-col items-center justify-center'}>
                        <button
                            onClick={() => {handleMinuteButtonClick('positive')}}
                            className={'rounded-full bg-white p-2 cursor-pointer'}
                        >
                            <PlusIcon className='size-10'/>
                        </button>
                        <div className={'text-white text-sm mt-2 mb-2'}>1 Minute</div>
                        <button
                            onClick={() => {handleMinuteButtonClick('negative')}}
                            className={'rounded-full bg-white p-2 cursor-pointer'}
                        >
                            <MinusIcon className='size-10'/>
                        </button>
                    </div>
                    <div className={'flex flex-col items-center justify-center'}>
                        <button
                            onClick={() => {handleSecondButtonClick('positive')}}
                            className={'rounded-full bg-white p-2 cursor-pointer'}
                        >
                            <PlusIcon className='size-10'/>
                        </button>
                        <div className={'text-white text-sm mt-2 mb-2'}>5 Sekunden</div>
                        <button
                            onClick={() => {handleSecondButtonClick('negative')}}
                            className={'rounded-full bg-white p-2 cursor-pointer'}
                        >
                            <MinusIcon className='size-10'/>
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => {handleMainButtonClick()}}
                    className={`${(currentState === 'idle' || currentState === 'done') ? "bg-green-800 text-white" : ""} ${currentState === 'running' ? "bg-red-800 text-white" : ""} rounded-full p-2 cursor-pointer w-full mb-2`}
                >
                    {currentState === 'idle' ? "Starten" : "Zurücksetzen" }
                </button>
                <button
                    onClick={() => {props.onClose()}}
                    className={'rounded-full bg-sky-700 text-white p-2 cursor-pointer w-full'}
                >
                    Schließen
                </button>
            </div>
        </motion.div>
    )
}

export default SmartphoneAppTimer;
