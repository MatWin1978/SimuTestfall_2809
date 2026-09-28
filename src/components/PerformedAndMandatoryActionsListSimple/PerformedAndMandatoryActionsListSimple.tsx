import {returnLoggedActionText} from "../../utilities/returnLoggedActionText.ts";
import {ArrowDownIcon, ChevronDownIcon} from "@heroicons/react/24/solid";
import {useGlobalStore, useLoggedActionsStore} from "../../store/store.ts";
import PerformedActionList from "../PerformedActionList/PerformedActionList.tsx";
import {processMandatoryActions} from "../../utilities/utilities.ts";
import DATA from "../../data/data.json";
import {comparePerformedAndMandatoryActionsSimple} from "../../utilities/comparePerformedAndMandatoryActionsSimple.ts";

interface IPerformedAndMandatoryActionsListSimpleProps {

}


export function PerformedAndMandatoryActionsListSimple(props: IPerformedAndMandatoryActionsListSimpleProps){
    const activeMissionName = useGlobalStore(state => state.activeMissionName);
    const performedActions = useLoggedActionsStore(state => state.loggedActions);
    const rawMandatoryActions = DATA.missions.find(mission => mission.name === activeMissionName).mandatoryActions;
    const comparedActionsData = comparePerformedAndMandatoryActionsSimple(performedActions, processMandatoryActions(rawMandatoryActions));
    const reasons = {
        performedBefore: "(zur falschen Zeit ausgeführt)",
        notPerformed: "(nicht ausgeführt)",
        performedAfter: "(zur falschen Zeit ausgeführt)",
        notOrTooLatePerformed: "(nicht oder zu spät ausgeführt)",
    }
    return (
        <>
            <div className={'w-full flex flex-row mb-8'}>
                <div className={'w-1/3 shrink-0 grow-0'}>
                    <h1 className={'font-bold text-lg mb-2'}>Alle erfolgten Aktionen:</h1>
                    {
                        performedActions.map((loggedAction) => {
                            return(
                                <div className={'text-sm py-[0.1rem] rounded-lg text-gray-500'} key={loggedAction.uid}>{returnLoggedActionText(loggedAction)}</div>
                            )
                        })
                    }
                </div>
                <div className={'w-2/3 shrink-0 grow-0'}>
                    <h1 className={'font-bold text-lg mb-2'}>Notwendige Aktionen:</h1>
                    {comparedActionsData.validatedMandatoryActions.map((optionalOrderGroup, optionOrderGroupIndex) => {
                        return optionalOrderGroup.map((mandatoryActionOrOptionalGroup, mandatoryActionIndex) => {
                            let mandatoryAction;
                            if(!Array.isArray(mandatoryActionOrOptionalGroup)) {
                                mandatoryAction = mandatoryActionOrOptionalGroup;
                            }
                            else {
                                const correctMandatoryAction = mandatoryActionOrOptionalGroup.find((mandatoryAction) => mandatoryAction.isCorrect);
                                if(correctMandatoryAction) {
                                    mandatoryAction = correctMandatoryAction;
                                }
                                else {
                                    mandatoryAction = mandatoryActionOrOptionalGroup[0];
                                }
                            }

                            let rowColorClass = "bg-white";
                            let textColorClass = "text-gray-400";
                            let generalClass = "text-sm py-1 px-2 rounded-lg mb-2";

                            if(mandatoryAction.isCorrect) {
                                rowColorClass = "bg-green-100";
                                textColorClass = "text-green-800";
                                return(
                                    <div key={`mandatoryAction_${optionOrderGroupIndex}_${mandatoryActionIndex}`} className={`${rowColorClass} ${textColorClass} ${generalClass}`}>
                                        <span className={'mr-2'}>✅</span>
                                        <span>{returnLoggedActionText(mandatoryAction)}</span>
                                    </div>
                                )
                            }
                            else {
                                textColorClass = "text-red-700";
                                rowColorClass = "bg-red-100";
                                let incorrectReason = "";
                                if(mandatoryAction.incorrectReason) {
                                    incorrectReason = reasons[mandatoryAction.incorrectReason]
                                }

                                return(
                                    <div key={`mandatoryAction_${optionOrderGroupIndex}_${mandatoryActionIndex}`} className={`${rowColorClass} ${textColorClass} ${generalClass}`}>
                                        <span className={'mr-2'}>❌</span>
                                        <span>{`${returnLoggedActionText(mandatoryAction)} ${incorrectReason}`}</span>
                                    </div>
                                );
                            }
                        })
                    })}
                </div>
            </div>
        </>
    );
}
