import MissionList from "../MissionList/MissionList.tsx";
import DATA from "../../data/data.json";
import {MOTION_VARIANTS} from "../../utilities/variants.ts";
import {motion} from "motion/react";
import {PiFlagCheckeredFill} from "react-icons/pi";
import {useGlobalStore} from "../../store/store.ts";
import {useState} from "react";
import Toggle from "../Toggle/Toggle.tsx";
import {IMission} from "../../types/types.ts";
import {AnimatePresence} from "motion/react";
import {ChevronDownIcon, ChevronRightIcon, FilmIcon, XMarkIcon} from "@heroicons/react/24/outline";

function LightboxContentWelcome() {
    const userName = useGlobalStore(state => state.userName);
    const activeMissionName = useGlobalStore(state => state.activeMissionName);
    const exerciseModeIsActive = useGlobalStore(state => state.exerciseModeIsActive);
    const [videoIsOpen, setVideoIsOpen] = useState(false);
    const [tempUserName, setTempUserName] = useState(userName ? userName : "");
    const [tempMissionName, setTempMissionName] = useState(activeMissionName ? activeMissionName : "");
    return (
        <div className={'flex flex-col flex-1 min-h-0 px-16 py-12 max-w-[900px]'}>
            <motion.h1 variants={MOTION_VARIANTS.appearUp} className={'text-3xl font-black mb-6 text-center'}>Herzlich willkommen zum<br/><span className={'bg-gradient-to-r from-sky-600 to-sky-800 inline-block text-transparent bg-clip-text text-4xl'}>Kfz-Simulator</span></motion.h1>
            {!userName &&
                <>
                    <motion.div variants={MOTION_VARIANTS.appearUp} className="flex flex-col mb-8">
                    <label className="block text-sm font-bold mb-2" htmlFor="username">Gib dir einen Nutzernamen:</label>
                    <input
                        className="shadow appearance-none w-full py-3 px-3 rounded-2xl bg-gray-200 inset-shadow-sm leading-tight focus:border-sky-700 focus:shadow-outline"
                        id="username"
                        type="text"
                        placeholder="Name"
                        value={tempUserName}
                        onChange={(e) => {setTempUserName(e.target.value)}}
                    />
                    </motion.div>
                </>
            }
            <motion.div variants={MOTION_VARIANTS.appearUp} className="block text-sm mb-2 font-bold">Du kannst dir ein Einführungsvideo zum Kfz-Simulator anschauen:</motion.div>
            <motion.div variants={MOTION_VARIANTS.appearUp} className="flex-1 bg-gray-200 p-4 rounded-2xl inset-shadow-sm mb-8">
                <div className="shadow-lg bg-white rounded-2xl overflow-hidden relative z-1"> 
                    <div className={'text-sky-700 px-4 py-2 font-bold rounded-2xl cursor-pointer flex flex-row items-center justify-between'} onClick={() => {setVideoIsOpen(!videoIsOpen)}}>
                        <div className="flex flex-row items-center">
                            <FilmIcon className={'size-10 text-sky-700 pl-2 mr-2'}/>
                            <div className={'text-sm'}>{videoIsOpen ? "Einführungsvideo einklappen" : "Einführungsvideo anzeigen"}</div>
                        </div>
                        <ChevronDownIcon className={`size-8 transition-transform duration-300 ${videoIsOpen ? "rotate-180" : ""}`}/>
                    </div>
                </div>
                <motion.div 
                    variants={MOTION_VARIANTS.toHeightAutoContainer}  
                    initial="initial"
                    animate={videoIsOpen ? "animate" : "initial"} 
                    className={'relative rounded-2xl rounded-t-none bg-white -top-5 z-0 overflow-hidden'}
                >
                    <div className="p-5 pt-10">
                        <video className="w-full rounded-2xl overflow-hidden shadow-md" controls src="/video/einfuehrung-e-kfz-simu-hb.mp4">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </motion.div>
            </motion.div>
            {!activeMissionName &&
                <>
                    <motion.h2 variants={MOTION_VARIANTS.appearUp} className={'text-sm font-bold mb-2'}>Wähle einen Ablauf aus, den du simulieren möchtest:</motion.h2>
                    <motion.div variants={MOTION_VARIANTS.appearUp} className={'flex-1 overflow-auto bg-gray-200 p-4 rounded-2xl inset-shadow-sm mb-8'}>
                        <MissionList
                            missions={DATA.missions as IMission[]}
                            selectedMissionName={tempMissionName}
                            onMissionSelect={(missionName: string) => {
                                setTempMissionName(missionName)
                            }}
                        />
                    </motion.div>
                </>
            }
            <motion.div variants={MOTION_VARIANTS.appearUp} className={'flex flex-col'}>
                <Toggle label={`${exerciseModeIsActive ? "Übungsmodus ist aktiv" : "Übungsmodus ist nicht aktiv"}`} checked={exerciseModeIsActive} onChange={() => {useGlobalStore.setState({exerciseModeIsActive: !exerciseModeIsActive})}}/>
                <p className={'text-xs text-gray-500 mt-2'}>Im Übungsmodus wirst du sofort benachrichtigt, wenn du eine Aktion ausführst, die nicht der erwünschten Reihenfolge entspricht.<br/>Außerdem bekommst du einen Hinweis, was dein nächster Schritt sein sollte.</p>
            </motion.div>
            <div className={'flex flex-none flex-col items-center'}>
                {tempUserName.length > 0 && tempMissionName.length > 0 && <motion.button
                    variants={MOTION_VARIANTS.scaleUp}
                    className={'pointer-events-auto shadow-xl mt-8 px-3 py-2 flex flex-row items-center justify-center bg-sky-700 rounded-full text-white relative cursor-pointer w-full'}
                        onClick={() => {
                            useGlobalStore.setState({
                                showWelcomeScreen: false,
                                activeMissionName: tempMissionName,
                                userName: tempUserName
                            });
                        }}>
                        <PiFlagCheckeredFill size={'22px'} className={'mr-2'}/>
                        <span>Loslegen</span>
                    </motion.button>
                }
            </div>
        </div>
    );
}

export default LightboxContentWelcome;
