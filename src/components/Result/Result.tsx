import {MOTION_VARIANTS} from "../../utilities/variants.ts";
import {motion} from "motion/react";
import { useGlobalStore, useLoggedActionsStore} from "../../store/store.ts";
import {ArrowDownTrayIcon} from "@heroicons/react/24/solid";
import DATA from '../../data/data.json'
import {processMandatoryActions} from "../../utilities/utilities.ts";
import React, { useState } from "react";
import {returnLoggedActionText} from "../../utilities/returnLoggedActionText.ts";
import {PerformedAndMandatoryActionsListSimple} from "../PerformedAndMandatoryActionsListSimple/PerformedAndMandatoryActionsListSimple.tsx";
import {comparePerformedAndMandatoryActionsSimple} from "../../utilities/comparePerformedAndMandatoryActionsSimple.ts";

function Result() {
    const userName = useGlobalStore(state => state.userName);
    const activeMissionName = useGlobalStore(state => state.activeMissionName);
    const missionIsDone = useGlobalStore(state => state.missionIsDone);
    const missionData = DATA.missions.find(item => item.name == activeMissionName);
    const performedActions = useLoggedActionsStore(state => state.loggedActions);
    const rawMandatoryActions = DATA.missions.find(mission => mission.name === activeMissionName).mandatoryActions;
    const comparedActionsData = comparePerformedAndMandatoryActionsSimple(performedActions, processMandatoryActions(rawMandatoryActions));
    const [pdfLoading, setPdfLoading] = useState(false);
    const reportActionsData = comparedActionsData.validatedMandatoryActions
        .flatMap(item => item)
        .flatMap(mandatoryActionOrGroup => {
            if(!Array.isArray(mandatoryActionOrGroup)) {
                return {
                    action: returnLoggedActionText(mandatoryActionOrGroup),
                    performed: mandatoryActionOrGroup.isCorrect,
                    successful: mandatoryActionOrGroup.isCorrect
                }
            }
            else {
                const correctMandatoryAction = mandatoryActionOrGroup.find((mandatoryAction) => mandatoryAction.isCorrect);

                if(correctMandatoryAction) {
                    return {
                        action: returnLoggedActionText(correctMandatoryAction),
                        performed: correctMandatoryAction.isCorrect,
                        successful: correctMandatoryAction.isCorrect
                    }
                }
                else {
                    return {
                        action: returnLoggedActionText(mandatoryActionOrGroup[0]),
                        performed: false,
                        successful: false
                    }
                }
            }
        });

    const createPDF = async () => {
        setPdfLoading(true);
        const [{ pdf }, { default: PdfReport }, { default: saveAs }] = await Promise.all([
            import('@react-pdf/renderer'),
            import('../PdfReport/PdfReport'),
            import('file-saver'),
        ]);
        const blob = await pdf(
            <PdfReport
                date={new Date()}
                user={userName}
                mission={missionData?.displayName}
                actions={reportActionsData}
            />
        ).toBlob();
        saveAs(blob, 'Auswertung.pdf');
        setPdfLoading(false);
    };

    return(
        <motion.div
            variants={MOTION_VARIANTS.lightbox}
            initial={"initial"}
            animate={"animate"}
            exit={"exit"}
            className={`fixed inset-0 w-screen h-screen backdrop-blur-sm bg-black/30 p-16 flex flex-col items-center justify-center z-50 pointer-events-auto`}
        >
            <motion.div variants={MOTION_VARIANTS.lightboxContent} className={'relative max-w-6/10 min-w-6/10 flex flex-col min-h-0'}>
                <div className={'flex flex-col min-h-0 bg-white shadow-xl rounded-4xl w-full overflow-hidden'}>
                    <div className={'flex-1 min-h-0 rounded-4xl py-14 px-20 overflow-y-auto w-full'}>
                        <h1 className={'text-3xl font-bold mb-8 text-center bg-gradient-to-r from-sky-600 to-sky-800 text-transparent bg-clip-text'}>Ergebnis</h1>
                        <PerformedAndMandatoryActionsListSimple/>
                        <div className={'flex flex-col items-center mt-14'}>
                            <motion.button
                                variants={MOTION_VARIANTS.scaleUp}
                                disabled={pdfLoading}
                                className={'shadow-xl px-3 py-2 mb-3 flex flex-row items-center justify-center bg-sky-700 rounded-full text-white relative cursor-pointer w-full disabled:opacity-60 disabled:cursor-wait'}
                                onClick={() => createPDF()}>
                                <ArrowDownTrayIcon className={'mr-2 size-6'}/>
                                <span>{pdfLoading ? 'PDF wird erstellt…' : 'PDF herunterladen'}</span>
                            </motion.button>
                            {!missionIsDone &&
                                <motion.button
                                    variants={MOTION_VARIANTS.scaleUp}
                                    className={'shadow-xl px-3 py-2 mb-3 flex flex-row items-center justify-center bg-sky-700 rounded-full text-white relative cursor-pointer w-full'}
                                    onClick={() => {useGlobalStore.setState({showResult: false});}}>
                                    <span>Arbeitsauftrag weiter fortführen</span>
                                </motion.button>
                            }
                            <motion.button
                                variants={MOTION_VARIANTS.scaleUp}
                                className={'shadow-xl px-3 py-2 flex flex-row items-center justify-center bg-sky-700 rounded-full text-white relative cursor-pointer w-full'}
                                onClick={() => {
                                    window.location.reload();
                                }}>
                                <span>Mission neu beginnen</span>
                            </motion.button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}

export default Result;
