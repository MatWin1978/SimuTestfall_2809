import MissionList from "../MissionList/MissionList.tsx";
import DATA from "../../data/data.json";
import {MOTION_VARIANTS} from "../../utilities/variants.ts";
import {motion} from "motion/react";
import {PiFlagCheckeredFill} from "react-icons/pi";
import {useGlobalStore} from "../../store/store.ts";
import {useState} from "react";
import Toggle from "../Toggle/Toggle.tsx";
import {IMission} from "../../types/types.ts";
import { EnvelopeIcon } from "@heroicons/react/24/outline";

function LightboxContentTermsOfUse() {
    const userName = useGlobalStore(state => state.userName);
    const activeMissionName = useGlobalStore(state => state.activeMissionName);
    return (
        <div className={'flex flex-col flex-1 min-h-0 p-16 select-none'}>
            <motion.h1 variants={MOTION_VARIANTS.appearUp} className={'text-3xl font-black mb-6 text-center'}>Herzlich willkommen zum<br/><span className={'bg-gradient-to-r from-sky-600 to-sky-800 inline-block text-transparent bg-clip-text text-4xl'}>Kfz-Simulator</span></motion.h1>
            <motion.div variants={MOTION_VARIANTS.appearUp} className="flex flex-col text-center max-w-[600px]">
                <p className="mb-2">Der Kfz-Simulator wurde an der<br/><b>Pädagogischen Hochschule Ludwigsburg</b><br/>entwickelt.</p>
                <p className="mb-4">Die Fördermittel wurden von der<br/><b>Wirtschaftsförderung Region Stuttgart GmbH, Projekt CARS 2.0</b><br/>bereit gestellt.</p>
                <p className="text-xl mb-4 text-sky-700"><b>Die Nutzung des Kfz-Simulators ist frei.</b></p>
                <p className="mb-2 text-sm">Die Entwickler und der Mittelgeber übernehmen keinerlei Haftung.<br/>Bei lizenzrechtlichen Fragen im Falle einer zustimmungspflichtigen Nutzung (Verlinkung des Kfz-Simulators oder Möglichkeit einer Unterlizenzierung) kontaktieren Sie bitte den Projektleiter <br/><a className={'text-sky-700 font-bold inline-flex items-center'} href={"mailto:gschwendtner@ph-ludwigsburg.de"}><EnvelopeIcon className="size-6 mr-1"/>Prof. Gschwendtner.</a></p>
                <motion.button
                    variants={MOTION_VARIANTS.scaleUp}
                    className={'pointer-events-auto shadow-xl px-3 py-2 flex flex-row items-center justify-center bg-sky-700 rounded-full text-white relative cursor-pointer w-full mt-8'}
                        onClick={() => {
                            useGlobalStore.setState({
                                showWelcomeScreen: true,
                                showTermsOfUse: false
                            });
                        }}>
                    
                        <span>Ich bestätige, dass ich die hier aufgeführten Nutzungshinweise gelesen habe.</span>
                    </motion.button>
            </motion.div>
        </div>
    );
}

export default LightboxContentTermsOfUse;
