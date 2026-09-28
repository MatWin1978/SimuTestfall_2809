import DATA from "../../data/data.json";
import {VideoCameraIcon} from "@heroicons/react/24/outline";
import {useActionsStore, useThreeDReference} from "../../store/store.ts";
import {WrenchScrewdriverIcon} from "@heroicons/react/24/outline";
import {GiSteeringWheel} from "react-icons/gi";
import {handleActionTrigger} from "../../utilities/handleActionTrigger.ts";
import {findActionByType} from "../../utilities/utilities.ts";

function QuickNav() {
    return(
        <>
            <div className={'bg-white rounded-tl-3xl shadow-xl flex flex-col items-start justify-center overflow-hidden'}>
                <div className={'flex flex-col items-center justify-center pointer-events-auto relative pt-8 pb-11 px-12'}>
                    <img src={'./images/thumbnails/thumbnails-assets/thumbnail-car.png'} className={'w-[110px]'}/>
                    <div className={'absolute left-0 top-0 right-0 bottom-0'}>
                        {/*Tools*/}
                        <button
                            className={'cursor-pointer bg-white border-sky-700 border-2 text-sky-700 rounded-full aspect-square w-[46px] shadow-2xl absolute left-[8%] top-[10%] hover:bg-sky-700 transition-all duration-300 group'}
                            onClick={() => {
                                useThreeDReference.getState().threeD?.animateCamera(DATA.viewPoints[1].camData);
                            }}
                        >
                            <WrenchScrewdriverIcon className={'size-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:text-white transition-all duration-300'}/>
                        </button>
                        {/*Left*/}
                        <button
                            className={'cursor-pointer bg-white border-sky-700 border-2 text-sky-700  rounded-full aspect-square w-[46px] shadow-2xl absolute left-[10%] top-[40%] hover:bg-sky-700 transition-all duration-300 group'}
                            onClick={() => {
                                useThreeDReference.getState().threeD?.animateCamera(DATA.viewPoints[3].camData);
                            }}
                        >
                            <VideoCameraIcon className={'size-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:text-white transition-all duration-300'}/>
                        </button>
                        {/*Right*/}
                        <button
                            className={'cursor-pointer bg-white border-sky-700 border-2 text-sky-700  rounded-full aspect-square w-[46px] shadow-2xl absolute right-[10%] top-[40%] rotate-180 hover:bg-sky-700 transition-all duration-300 group'}
                            onClick={() => {
                                useThreeDReference.getState().threeD?.animateCamera(DATA.viewPoints[2].camData);
                            }}
                        >
                            <VideoCameraIcon className={'size-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:text-white transition-all duration-300'}/>
                        </button>
                        {/*Top*/}
                        <button
                            className={'cursor-pointer bg-white border-sky-700 border-2 text-sky-700  rounded-full aspect-square w-[46px] shadow-2xl absolute left-[50%] -translate-x-1/2 top-[4%] rotate-90 hover:bg-sky-700 transition-all duration-300 group'}
                            onClick={() => {
                                useThreeDReference.getState().threeD?.animateCamera(DATA.viewPoints[4].camData);
                            }}
                        >
                            <VideoCameraIcon className={'size-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:text-white transition-all duration-300'}/>
                        </button>
                        {/*Bottom*/}
                        <button
                            className={'cursor-pointer bg-white border-sky-700 border-2 text-sky-700  rounded-full aspect-square w-[46px] shadow-2xl absolute right-[20%] bottom-[6%] rotate-240 hover:bg-sky-700 transition-all duration-300 group'}
                            onClick={() => {
                                useThreeDReference.getState().threeD?.animateCamera(DATA.viewPoints[0].camData);
                            }}
                        >
                            <VideoCameraIcon className={'size-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:text-white transition-all duration-300'}/>
                        </button>
                        {/*Cockpit*/}
                        <button
                            className={'cursor-pointer bg-white border-sky-700 border-2 text-sky-700  rounded-full aspect-square w-[46px] shadow-2xl absolute left-[50%] -translate-x-1/2 bottom-[32%] hover:bg-sky-700 transition-all duration-300 group'}
                            onClick={() => {
                                useThreeDReference.getState().threeD?.animateCamera(DATA.viewPoints[5].camData);
                                const openDoorAction = useActionsStore.getState().actions.find(a => a.name === 'openCloseFrontDoorLeft');
                                if(openDoorAction && !openDoorAction.activated) {
                                    handleActionTrigger(openDoorAction);
                                }
                            }}
                        >
                            <GiSteeringWheel className={'size-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:text-white transition-all duration-300'}/>
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

export default QuickNav;
