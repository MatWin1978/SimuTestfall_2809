import {ChevronRightIcon, FilmIcon, XMarkIcon} from "@heroicons/react/24/outline";
import {IMission} from "../../types/types.ts";
import {useState} from "react";
import {AnimatePresence, motion} from "motion/react";
import {MOTION_VARIANTS} from "../../utilities/variants.ts";
import YouTube from "react-youtube";

interface IMissionListItemProps {
    mission: IMission;
    missionIndex: number;
    onMissionSelect: (missionName: string) => void;
    selectedMissionName: string | undefined;
}

function MissionListItem(props: IMissionListItemProps) {
    const [videoIsOpen, setVideoIsOpen] = useState(false);

    let itemClasses = 'bg-white border-white cursor-pointer';
    if(props.mission.disabled) {
        itemClasses = 'bg-gray-100 border-gray-100 pointer-events-none';
    }
    if(props.mission.name === props.selectedMissionName) {
        itemClasses = 'bg-white border-sky-700';
    }
    const displayNameClasses = props.mission.disabled ? 'text-gray-400' : 'text-sky-700';
    const descriptionClasses = props.mission.disabled ? 'text-gray-400' : 'text-gray-600';
    return (
        <div className={'shadow-lg bg-white rounded-2xl overflow-hidden'}>
            <div
                key={"mission" + props.missionIndex}
                className={`flex flex-row justify-between gap-2 border-2 relative z-2 rounded-2xl shadow-xl ${itemClasses}`}
                onClick={() => {props.onMissionSelect(props.mission.name)}}
            >
                <div className={'flex flex-col px-6 py-4'}>
                    <div className={`text-lg font-bold ${displayNameClasses}`}>{props.mission.displayName}</div>
                    <div className={`text-sm ${descriptionClasses}`}>{props.mission.description}</div>
                </div>
                {props.mission.videoId &&
                    <div className={' text-sky-700 px-6 py-4 rounded-2xl flex flex-row justify-center items-center cursor-pointer border-l-sky-700'} onClick={() => {setVideoIsOpen(!videoIsOpen)}}>
                        {!videoIsOpen &&
                            <FilmIcon className={'size-10 text-sky-700 border-l-1 pl-2 mr-2 border-l-sky-700'}/>
                        }
                        {videoIsOpen &&
                            <XMarkIcon className={'size-10 text-sky-700 border-l-1 pl-2 border-l-sky-700'}/>
                        }
                        <div className={'text-sm'}>{videoIsOpen ? "Tutorial einklappen" : "Tutorial anzeigen"}</div>
                    </div>
                }
            </div>
            <AnimatePresence>
                {videoIsOpen &&
                    <motion.div variants={MOTION_VARIANTS.linklistItemAppearDown} initial={'initial'} animate={'animate'} exit={'exit'} className={'relative -top-4 z-1 p-4 rounded-2xl rounded-t-none inset-shadow-sm pt-4'} >
                        <YouTube
                            videoId={props.mission.videoId}
                            iframeClassName={'w-full aspect-video rounded-2xl overflow-hidden m-0'}
                            className={'w-full mt-4'}
                        />
                    </motion.div>
                }
            </AnimatePresence>
        </div>
    )
}

export default MissionListItem;
