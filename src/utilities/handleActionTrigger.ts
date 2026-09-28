import { IActionConnectDisconnectDuspol, IActionConnectDisconnectMultimeter, IActionUse, IActionPlace, ILoggedAction, ILoggedActionAdditionalPayload, ILoggedActionRaw, IMandatoryAction, IMandatoryActionRaw, IValidatedMandatoryAction, TAction, IInteractiveObjectRaw, IActionRaw } from "../types/types.ts";
import { useActionsStore, useAudio, useFinalizeActionCallback, useGlobalStore, useLoggedActionsStore, useThreeDReference } from "../store/store.ts";
import { isIAction3D, isIActionPlace, isIActionAutoPlace, isIActionInspect, isIActionMissionInspect, isIActionWear, isIActionConnectDisconnectDuspol, isIActionEquipmentTest, isIActionTimer, isIActionLaptop, isIActionSmartphone, isIActionGlovesPanelInspect, isIActionReadDiagnostics, isIActionReadManual, isIActionDiagnosticDetail, isIActionCallExpert, isIActionConnectDisconnectMultimeter, isIActionUse } from "../types/typeguards.ts";
import { activateActionToggle, addLoggedAction, increaseActivationCount, setAnimationState, setAutoPlaceActivated, setConnectDisconnectDuspolObjectName, setConnectDisconnectMultimeterObjectName, setUnsetPlacedInteractiveObjectName } from "./reducers.ts";
import { checkAllConditions, checkCustomCondition, evaluateJsepTree, processMandatoryActions } from "./utilities.ts";
import jsep from "jsep";
import DATA from "../data/data.json";
import { checkPerformedActionAgainstUnvalidatedMandatoryAction, comparePerformedAndMandatoryActionsSimple } from "./comparePerformedAndMandatoryActionsSimple.ts";

/**
 * Unequips any currently worn item in the same equipment category.
 * Returns updated actions array and any logged actions that should be added.
 */
function unequipSameCategory(currentActions: TAction[], interactiveObjectName: string): { actions: TAction[]; logEntries: ILoggedActionRaw[] } {
    const interactiveObject = DATA.interactiveObjects.find((obj) => obj.name === interactiveObjectName);
    const equipmentCategory = interactiveObject?.equipmentCategory;
    if (!equipmentCategory) return { actions: currentActions, logEntries: [] };

    let updatedActions = currentActions;
    const logEntries: ILoggedActionRaw[] = [];

    const sameCategory = DATA.interactiveObjects.filter(
        (obj) => obj.equipmentCategory === equipmentCategory && obj.name !== interactiveObjectName) as IInteractiveObjectRaw[];
    for (const obj of sameCategory) {
        const otherWearAction = updatedActions.find(
            (a) => obj.actions.includes(a.name) && isIActionWear(a) && a.activated
        );
        if (otherWearAction) {
            updatedActions = activateActionToggle(updatedActions, otherWearAction.name);
            logEntries.push({ actionName: otherWearAction.name, activated: false, actionType: otherWearAction.type });
        }
    }

    return { actions: updatedActions, logEntries };
}

/**
 * Plays a one-shot UI sound. When the preloaded element is idle it is reused
 * directly and only rewound to the start — this plays instantly because the
 * element is already decoded, and it still replays reliably on repeated triggers
 * (e.g. each parking-brake engage). A fresh clone is only used as a fallback
 * while the element is still playing, so a sound can overlap itself without
 * waiting; cloning is avoided in the common case because the clone has to decode
 * before it can start, which is audible as a delay on the first play.
 * The play() promise is swallowed: it can reject when playback is interrupted
 * or blocked by autoplay policy, which is not an error worth surfacing.
 */
function playActionSound(soundName: string) {
    const audio = useAudio.getState().audio[soundName];
    if (!audio) return;
    if (audio.paused || audio.ended) {
        // Only rewind when there is something to rewind: skips a redundant seek on
        // the first play and avoids an InvalidStateError if the media hasn't
        // loaded yet (currentTime is 0 while readyState is HAVE_NOTHING).
        if (audio.currentTime > 0) audio.currentTime = 0;
        audio.play().catch(() => {});
    } else {
        (audio.cloneNode() as HTMLAudioElement).play().catch(() => {});
    }
}

function finalizeAction(loggedActionToAdd: ILoggedActionRaw) {
    const exerciseModeIsActive = useGlobalStore.getState().exerciseModeIsActive;

    if (exerciseModeIsActive) {
        const activeMissionName = useGlobalStore.getState().activeMissionName;

        //Check if performed action is always wrong
        if (loggedActionToAdd) {
            const currentPerformedAction = useActionsStore.getState().actions.find(action => action.name === loggedActionToAdd.actionName);
            if (currentPerformedAction?.alwaysWrong) {
                useGlobalStore.setState({
                    activeLightboxMessage: currentPerformedAction.alwaysWrong.message
                });
                return;
            }
        }

        //Check if warnings apply to the last performed action
        const mandatoryActionsRaw = DATA.missions.find(mission => mission.name === activeMissionName)?.mandatoryActions ?? [];
        const temporaryLoggedActions = addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd);
        const comparisonResult = comparePerformedAndMandatoryActionsSimple(temporaryLoggedActions, processMandatoryActions(mandatoryActionsRaw));

        //Find last correct action and check whether it was the one that was performed right now. If so, check if it has warnings.
        let mandatoryActionWithWarnings: IValidatedMandatoryAction | undefined;
        loop1: for (let i = comparisonResult.validatedMandatoryActions.length - 1; i >= 0; i--) {
            const orderUnimportantGroup = comparisonResult.validatedMandatoryActions[i];
            for (let j = orderUnimportantGroup.length - 1; j >= 0; j--) {
                const mandatoryActionOrOptionalGroup = orderUnimportantGroup[j];
                if (Array.isArray(mandatoryActionOrOptionalGroup)) {
                    if (mandatoryActionOrOptionalGroup.find((mandatoryAction) => mandatoryAction.isCorrect)) {
                        const lastCorrectAction = mandatoryActionOrOptionalGroup.find((mandatoryAction) => mandatoryAction.isCorrect);
                        if (lastCorrectAction && lastCorrectAction.associatedUid === comparisonResult.annotatedPerformedActions[comparisonResult.annotatedPerformedActions.length - 1].uid) {
                            if (lastCorrectAction.warnings) {
                                mandatoryActionWithWarnings = lastCorrectAction;
                            }
                            break loop1;
                        }
                    }
                }
                else {
                    if (mandatoryActionOrOptionalGroup.isCorrect && mandatoryActionOrOptionalGroup.associatedUid === comparisonResult.annotatedPerformedActions[comparisonResult.annotatedPerformedActions.length - 1].uid) {
                        if (mandatoryActionOrOptionalGroup.warnings) {
                            mandatoryActionWithWarnings = mandatoryActionOrOptionalGroup;
                        }
                        break loop1;
                    }
                }
            }
        }


        if (mandatoryActionWithWarnings && mandatoryActionWithWarnings.warnings) {
            let warningText = "";
            mandatoryActionWithWarnings.warnings.forEach((warning) => {
                const foundAction = comparisonResult.annotatedPerformedActions.find((performedAction) => {
                    if (Array.isArray(warning.necessaryMandatoryActionOrGroup)) {
                        for (const mandatoryAction of warning.necessaryMandatoryActionOrGroup) {
                            if (checkPerformedActionAgainstUnvalidatedMandatoryAction(performedAction, mandatoryAction)) {
                                return true;
                            }
                        }
                    }
                    else {
                        return checkPerformedActionAgainstUnvalidatedMandatoryAction(performedAction, warning.necessaryMandatoryActionOrGroup);
                    }
                });

                if (!foundAction) {
                    warningText += `<br/>${warning.message}`;
                }
            });

            if (warningText) {
                useGlobalStore.setState({
                    activeLightboxMessage: warningText
                });
            }
            else {
                useFinalizeActionCallback.getState().callback();
            }
        }
        else {
            useFinalizeActionCallback.getState().callback();
        }
    }
    else {
        useFinalizeActionCallback.getState().callback();
    }
}


export function handleActionTrigger(action: TAction, additionalPayload?: ILoggedActionAdditionalPayload) {
    let actions = useActionsStore.getState().actions;
    let loggedActionToAdd: ILoggedActionRaw;
    let finalizeActionCallback = null;

    if (checkAllConditions(action, actions)) {

        //Actions that are only finished after callbacks
        if (isIActionConnectDisconnectDuspol(action)) {

            //Entering connectDisconnectDuspol mode
            if (!action.activated) {
                if (action.connectedFirstInteractiveObjectName === "" && action.connectedSecondInteractiveObjectName === "") {

                    //Get into connectDisconnectDuspol mode
                    useGlobalStore.setState({
                        activeConnectDisconnectDuspolActionName: action.name,
                        activeInteractiveObjectName: ""
                    });

                    const callbackForSecond = (threeDObjectName: string) => {
                        const actions = useActionsStore.getState().actions;
                        const updatedAction = actions.find((updatedAction) => updatedAction.name === action.name) as IActionConnectDisconnectDuspol;
                        const pickedInteractiveObject = DATA.interactiveObjects.find(interactiveObject => interactiveObject.objects3DNames.includes(threeDObjectName));
                        if (!pickedInteractiveObject) return;

                        const isConnectableInteractiveObject = action.connectableInteractiveObjects.find((connectableInteractiveObject) => connectableInteractiveObject.name === pickedInteractiveObject.name);
                        if (isConnectableInteractiveObject) {
                            loggedActionToAdd = {
                                actionName: action.name,
                                activated: true,
                                actionType: action.type,
                                additionalPayload: {
                                    connectDisconnectDuspol: {
                                        connectedFirstInteractiveObjectName: updatedAction.connectedFirstInteractiveObjectName,
                                        connectedSecondInteractiveObjectName: pickedInteractiveObject.name
                                    }
                                }
                            };
                            finalizeActionCallback = () => {
                                useActionsStore.setState({
                                    actions:
                                        increaseActivationCount(
                                            activateActionToggle(
                                                setConnectDisconnectDuspolObjectName(
                                                    actions,
                                                    action.name,
                                                    "second",
                                                    pickedInteractiveObject.name
                                                ),
                                                action.name
                                            ),
                                            action.name
                                        )
                                });
                                useThreeDReference.getState().threeD?.focusInteractiveObject("duspol")
                                useGlobalStore.setState({ activeConnectDisconnectDuspolActionName: "" });
                                useLoggedActionsStore.setState({ loggedActions: addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd) });
                            }

                            useFinalizeActionCallback.setState({ callback: finalizeActionCallback })
                            finalizeAction(loggedActionToAdd);
                        }
                    }
                    const callbackForFirst = (threeDObjectName: string) => {
                        const pickedInteractiveObject = DATA.interactiveObjects.find(interactiveObject => interactiveObject.objects3DNames.includes(threeDObjectName));
                        if (!pickedInteractiveObject) return;
                        const isConnectableInteractiveObject = action.connectableInteractiveObjects.find((connectableInteractiveObject) => connectableInteractiveObject.name === pickedInteractiveObject.name);

                        if (isConnectableInteractiveObject) {
                            useActionsStore.setState({ actions: increaseActivationCount(setConnectDisconnectDuspolObjectName(actions, action.name, "first", pickedInteractiveObject.name), action.name) });
                            useGlobalStore.setState({ activeConnectDisconnectDuspolActionCallback: callbackForSecond });
                        }
                    }

                    useGlobalStore.setState({ activeConnectDisconnectDuspolActionCallback: callbackForFirst });
                }
            }
            //Removing connection
            else {
                loggedActionToAdd = {
                    actionName: action.name,
                    activated: false,
                    actionType: action.type
                };
                finalizeActionCallback = () => {
                    useActionsStore.setState({ actions: increaseActivationCount(setConnectDisconnectDuspolObjectName(activateActionToggle(actions, action.name), action.name, "removeAll"), action.name) });
                    useLoggedActionsStore.setState({ loggedActions: addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd) });
                }
                useFinalizeActionCallback.setState({ callback: finalizeActionCallback })
                finalizeAction(loggedActionToAdd);
            }
        }
        if (isIActionConnectDisconnectMultimeter(action)) {
            //Entering connectDisconnectMultimeter mode
            if (!action.activated) {
                if (action.connectedFirstInteractiveObjectName === "" && action.connectedSecondInteractiveObjectName === "") {
                    //Get into connectDisconnectMultimeter mode
                    useGlobalStore.setState({
                        activeConnectDisconnectMultimeterActionName: action.name,
                        activeInteractiveObjectName: ""
                    });

                    const callbackForSecond = (threeDObjectName: string) => {
                        const actions = useActionsStore.getState().actions;
                        const updatedAction = actions.find((updatedAction) => updatedAction.name === action.name) as IActionConnectDisconnectMultimeter;
                        const pickedInteractiveObject = DATA.interactiveObjects.find(interactiveObject => interactiveObject.objects3DNames.includes(threeDObjectName));
                        if (!pickedInteractiveObject) return;
                        const isConnectableInteractiveObject = action.connectableInteractiveObjects.find((connectableInteractiveObject) => connectableInteractiveObject.name === pickedInteractiveObject.name);

                        if (isConnectableInteractiveObject) {
                            loggedActionToAdd = {
                                actionName: action.name,
                                activated: true,
                                actionType: action.type,
                                additionalPayload: {
                                    connectDisconnectMultimeter: {
                                        connectedFirstInteractiveObjectName: updatedAction.connectedFirstInteractiveObjectName,
                                        connectedSecondInteractiveObjectName: pickedInteractiveObject.name
                                    }
                                }
                            };
                            finalizeActionCallback = () => {
                                useActionsStore.setState({
                                    actions:
                                        increaseActivationCount(
                                            activateActionToggle(
                                                setConnectDisconnectMultimeterObjectName(
                                                    actions,
                                                    action.name,
                                                    "second",
                                                    pickedInteractiveObject.name
                                                ),
                                                action.name
                                            ),
                                            action.name
                                        )
                                });
                                useThreeDReference.getState().threeD?.focusInteractiveObject("multimeter")
                                useGlobalStore.setState({ activeConnectDisconnectMultimeterActionName: "" });
                                useLoggedActionsStore.setState({ loggedActions: addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd) });
                            }

                            useFinalizeActionCallback.setState({ callback: finalizeActionCallback })
                            finalizeAction(loggedActionToAdd);
                        }
                    }
                    const callbackForFirst = (threeDObjectName: string) => {
                        const pickedInteractiveObject = DATA.interactiveObjects.find(interactiveObject => interactiveObject.objects3DNames.includes(threeDObjectName));
                        if (!pickedInteractiveObject) return;
                        const isConnectableInteractiveObject = action.connectableInteractiveObjects.find((connectableInteractiveObject) => connectableInteractiveObject.name === pickedInteractiveObject.name);

                        if (isConnectableInteractiveObject) {
                            useActionsStore.setState({ actions: increaseActivationCount(setConnectDisconnectMultimeterObjectName(actions, action.name, "first", pickedInteractiveObject.name), action.name) });
                            useGlobalStore.setState({ activeConnectDisconnectMultimeterActionCallback: callbackForSecond });
                        }
                    }

                    useGlobalStore.setState({ activeConnectDisconnectMultimeterActionCallback: callbackForFirst });
                }
            }
            //Removing connection
            else {
                loggedActionToAdd = {
                    actionName: action.name,
                    activated: false,
                    actionType: action.type
                };
                finalizeActionCallback = () => {
                    useActionsStore.setState({ actions: increaseActivationCount(setConnectDisconnectMultimeterObjectName(activateActionToggle(actions, action.name), action.name, "removeAll"), action.name) });
                    useLoggedActionsStore.setState({ loggedActions: addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd) });
                }
                useFinalizeActionCallback.setState({ callback: finalizeActionCallback })
                finalizeAction(loggedActionToAdd);
            }
        }
        if (isIActionPlace(action)) {
            handlePlaceAction(action, actions);
        }

        if (isIActionAutoPlace(action)) {
            const placedInteractiveObject = DATA.interactiveObjects.find((interactiveObject) => (interactiveObject.actions as string[]).includes(action.name));
            if (!placedInteractiveObject) return;
            const autoPlaceTarget = action.correctPlaceInteractiveObjects[0];

            if (!action.activated && autoPlaceTarget) {
                loggedActionToAdd = {
                    actionName: action.name,
                    activated: true,
                    actionType: action.type,
                    additionalPayload: {
                        autoPlace: {
                            autoPlacePlaceName: autoPlaceTarget.name,
                            placedInteractiveObjectName: placedInteractiveObject.name
                        }
                    }
                };
                finalizeActionCallback = () => {
                    let updatedActions = increaseActivationCount(
                        setUnsetPlacedInteractiveObjectName(
                            useActionsStore.getState().actions,
                            action.name,
                            autoPlaceTarget.name
                        ),
                        action.name
                    );
                    // Set autoplace as activated
                    updatedActions = setAutoPlaceActivated(updatedActions, action.name, true);
                    // Sync the sibling place action so both agree on location = autoplace target.
                    // Activate it if it wasn't (object was in inventory); otherwise just update pickedLocation
                    // (object was placed elsewhere and is now being returned to the target).
                    const interactiveObjectWithAction = DATA.interactiveObjects.find((io) => (io.actions as string[]).includes(action.name));
                    if (interactiveObjectWithAction) {
                        interactiveObjectWithAction.actions.forEach((actionName) => {
                            const siblingAction = updatedActions.find((a) => a.name === actionName);
                            if (siblingAction && siblingAction.type === 'place') {
                                if (!siblingAction.activated) {
                                    updatedActions = activateActionToggle(
                                        setUnsetPlacedInteractiveObjectName(updatedActions, actionName, autoPlaceTarget.name),
                                        actionName
                                    );
                                } else {
                                    updatedActions = setUnsetPlacedInteractiveObjectName(updatedActions, actionName, autoPlaceTarget.name);
                                }
                            }
                        });
                    }
                    useActionsStore.setState({ actions: updatedActions });
                    useLoggedActionsStore.setState({ loggedActions: addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd) });
                }
                useFinalizeActionCallback.setState({ callback: finalizeActionCallback })
                finalizeAction(loggedActionToAdd);
            }
        }

        //Actions that are finished immediately
        if (action.sound || action.soundToggle) {
            if (action.toggle !== undefined) {
                if (action.activated) {
                    action.soundToggle && playActionSound(action.soundToggle);
                }
                else {
                    action.sound && playActionSound(action.sound);
                }
            }
            else {
                action.sound && playActionSound(action.sound);
            }
        }

        if (isIActionInspect(action)) {
            const activeInspectActionName = useGlobalStore.getState().activeInspectActionName;
            let loggedActionToAdd: ILoggedActionRaw | null = null;

            if (activeInspectActionName === "") {
                loggedActionToAdd = { actionName: action.name, activated: true, actionType: action.type };
                finalizeActionCallback = () => {
                    useGlobalStore.setState({ activeInspectActionName: action.name });
                    useActionsStore.setState({ actions: increaseActivationCount(activateActionToggle(actions, action.name), action.name) });
                    useLoggedActionsStore.setState({
                        loggedActions: addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd!)
                    });
                };
            } else {
                finalizeActionCallback = () => {
                    useGlobalStore.setState({ activeInspectActionName: "" });
                    useActionsStore.setState({ actions: increaseActivationCount(activateActionToggle(actions, action.name), action.name) });
                };
            }

            useFinalizeActionCallback.setState({ callback: finalizeActionCallback });
            finalizeAction(loggedActionToAdd as ILoggedActionRaw);
        }

        if (isIActionEquipmentTest(action)) {
            const activeEquipmentTestActionName = useGlobalStore.getState().activeEquipmentTestActionName;
            let loggedActionToAdd: ILoggedActionRaw | null = null;

            if (activeEquipmentTestActionName === "") {
                loggedActionToAdd = { actionName: action.name, actionType: action.type, activated: !action.activated };
                finalizeActionCallback = () => {
                    useGlobalStore.setState({ activeEquipmentTestActionName: action.name });
                    useActionsStore.setState({ actions: increaseActivationCount(activateActionToggle(actions, action.name), action.name) });
                    useLoggedActionsStore.setState({ loggedActions: addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd as ILoggedActionRaw) })
                }
            }
            else {
                finalizeActionCallback = () => {
                    useGlobalStore.setState({ activeEquipmentTestActionName: "" });
                    useActionsStore.setState({ actions: increaseActivationCount(activateActionToggle(actions, action.name), action.name) });
                }
            }
            useFinalizeActionCallback.setState({ callback: finalizeActionCallback })
            finalizeAction(loggedActionToAdd as ILoggedActionRaw);
        }

        if (isIActionWear(action)) {
            const wearingInteractiveObject = DATA.interactiveObjects.find((obj) => (obj.actions as string[]).includes(action.name));

            loggedActionToAdd = { actionName: action.name, activated: !action.activated, actionType: action.type };
            finalizeActionCallback = () => {
                let updatedActions = actions;
                let logEntries: ILoggedActionRaw[] = [];

                // If equipping, unequip any other item of the same category first
                if (!action.activated && wearingInteractiveObject) {
                    const result = unequipSameCategory(updatedActions, wearingInteractiveObject.name);
                    updatedActions = result.actions;
                    logEntries = result.logEntries;
                }

                updatedActions = increaseActivationCount(activateActionToggle(updatedActions, action.name), action.name);
                useActionsStore.setState({ actions: updatedActions });

                // Batch all log entries in a single setState
                let loggedActions = useLoggedActionsStore.getState().loggedActions;
                for (const entry of logEntries) {
                    loggedActions = addLoggedAction(loggedActions, entry);
                }
                loggedActions = addLoggedAction(loggedActions, loggedActionToAdd);
                useLoggedActionsStore.setState({ loggedActions });
            }
            useFinalizeActionCallback.setState({ callback: finalizeActionCallback })
            finalizeAction(loggedActionToAdd);
        }
        if (isIActionReadDiagnostics(action) || isIActionReadManual(action)) {
            loggedActionToAdd = { actionName: action.name, actionType: action.type, activated: true };
            finalizeActionCallback = () => {
                useActionsStore.setState({ actions: increaseActivationCount(actions, action.name) });
                useLoggedActionsStore.setState({ loggedActions: addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd) });
            }
            useFinalizeActionCallback.setState({ callback: finalizeActionCallback })
            finalizeAction(loggedActionToAdd);
        }
        if (isIActionDiagnosticDetail(action)) {
            loggedActionToAdd = { actionName: action.name, actionType: action.type, additionalPayload: additionalPayload };
            finalizeActionCallback = () => {
                useActionsStore.setState({ actions: increaseActivationCount(actions, action.name) });
                useLoggedActionsStore.setState({ loggedActions: addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd) });
            }
            useFinalizeActionCallback.setState({ callback: finalizeActionCallback })
            finalizeAction(loggedActionToAdd);
        }
        if (isIActionCallExpert(action)) {
            loggedActionToAdd = { actionName: action.name, actionType: action.type };
            finalizeActionCallback = () => {
                useActionsStore.setState({ actions: increaseActivationCount(actions, action.name) });
                useLoggedActionsStore.setState({ loggedActions: addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd) });
            }
            useFinalizeActionCallback.setState({ callback: finalizeActionCallback })
            finalizeAction(loggedActionToAdd);
        }
        if (isIActionMissionInspect(action)) {
            loggedActionToAdd = { actionName: action.name, activated: !action.activated, actionType: action.type };
            finalizeActionCallback = () => {
                useActionsStore.setState({ actions: activateActionToggle(increaseActivationCount(actions, action.name), action.name) });
                useLoggedActionsStore.setState({ loggedActions: addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd) });
            }
            useFinalizeActionCallback.setState({ callback: finalizeActionCallback })
            finalizeAction(loggedActionToAdd);
        }
        if (isIActionGlovesPanelInspect(action)) {
            loggedActionToAdd = { actionName: action.name, activated: !action.activated, actionType: action.type };
            finalizeActionCallback = () => {
                useActionsStore.setState({ actions: activateActionToggle(increaseActivationCount(actions, action.name), action.name) });
                useLoggedActionsStore.setState({ loggedActions: addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd) });
            }
            useFinalizeActionCallback.setState({ callback: finalizeActionCallback })
            finalizeAction(loggedActionToAdd);
        }
        if (isIAction3D(action)) {
            loggedActionToAdd = { actionName: action.name, activated: !action.activated, actionType: action.type };
            finalizeActionCallback = () => {
                useActionsStore.setState({ actions: increaseActivationCount(activateActionToggle(actions, action.name), action.name) });
                useLoggedActionsStore.setState({ loggedActions: addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd) });
            }
            useFinalizeActionCallback.setState({ callback: finalizeActionCallback })
            finalizeAction(loggedActionToAdd);
        }
        if (isIActionTimer(action)) {
            loggedActionToAdd = {
                actionName: action.name,
                activated: true,
                actionType: action.type,
                additionalPayload: additionalPayload
            }
            finalizeActionCallback = () => {
                useActionsStore.setState({ actions: increaseActivationCount(actions, action.name) });
                useLoggedActionsStore.setState({ loggedActions: addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd) });
            }
            useFinalizeActionCallback.setState({ callback: finalizeActionCallback })
            finalizeAction(loggedActionToAdd);
        }
        if (isIActionLaptop(action)) {
            loggedActionToAdd = { actionName: action.name, activated: !action.activated, actionType: action.type };
            finalizeActionCallback = () => {
                useActionsStore.setState({ actions: activateActionToggle(increaseActivationCount(actions, action.name), action.name) });
                useLoggedActionsStore.setState({ loggedActions: addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd) });
            }
            useFinalizeActionCallback.setState({ callback: finalizeActionCallback })
            finalizeAction(loggedActionToAdd);
        }
        if (isIActionSmartphone(action)) {
            finalizeActionCallback = () => {
                useActionsStore.setState({ actions: increaseActivationCount(actions, action.name) });
                useGlobalStore.setState((state) => ({ showSmartphone: !state.showSmartphone }));
            }
            useFinalizeActionCallback.setState({ callback: finalizeActionCallback })
            finalizeAction(loggedActionToAdd);
        }
        if (isIActionUse(action)) {
            handleUseAction(action, actions);
        }
    }
}

function handleUseAction(action: IActionUse, actions: TAction[]) {
    let loggedActionToAdd: any;
    let finalizeActionCallback: () => void;

    const callback = (threeDObjectName: string) => {
        const actions = useActionsStore.getState().actions;
        const clickedInteractiveObject = DATA.interactiveObjects.find(io => io.objects3DNames.includes(threeDObjectName));
        if (!clickedInteractiveObject) return;

        const isMatchingTarget = action.correctInteractiveObjects.find(c => c.name === clickedInteractiveObject.name);

        if (isMatchingTarget) {
            // Check targetCondition using the standard condition system
            if (isMatchingTarget.targetCondition) {
                const jsepTree = jsep(isMatchingTarget.targetCondition);
                if (!evaluateJsepTree(jsepTree, actions)) return;
            }

            const usingInteractiveObject = DATA.interactiveObjects.find(io => (io.actions as string[]).includes(action.name));
            loggedActionToAdd = {
                actionName: action.name,
                activated: true,
                actionType: action.type,
                additionalPayload: {
                    use: {
                        usingInteractiveObjectName: usingInteractiveObject?.name || "",
                        usedInteractiveObjectName: clickedInteractiveObject.name
                    }
                }
            };
            finalizeActionCallback = () => {
                let updatedActions = useActionsStore.getState().actions;

                // Execute effects
                isMatchingTarget.effects.forEach(effect => {
                    if (effect.type === "toggleAction") {
                        updatedActions = increaseActivationCount(
                            activateActionToggle(updatedActions, effect.actionName),
                            effect.actionName
                        );
                        // If toggling a place action, also clear its pickedLocationInteractiveObjectName
                        const toggledAction = updatedActions.find(a => a.name === effect.actionName);
                        if (toggledAction && isIActionPlace(toggledAction)) {
                            updatedActions = setUnsetPlacedInteractiveObjectName(updatedActions, effect.actionName);
                        }
                    }
                });

                updatedActions = increaseActivationCount(updatedActions, action.name);
                useActionsStore.setState({ actions: updatedActions });
                useGlobalStore.setState({ activeUseActionName: "" });
                useLoggedActionsStore.setState({
                    loggedActions: addLoggedAction(
                        useLoggedActionsStore.getState().loggedActions,
                        loggedActionToAdd
                    )
                });
            };
            useFinalizeActionCallback.setState({ callback: finalizeActionCallback });
            finalizeAction(loggedActionToAdd);
        }
        else {
            loggedActionToAdd = {
                actionName: action.name,
                activated: true,
                actionType: action.type,
                additionalPayload: {
                    isWrong: true
                }
            };
            finalizeActionCallback = () => {
                useGlobalStore.setState({
                    activeLightboxMessage: "Bist du sicher, dass du das hier benutzen möchtest?",
                    activeUseActionName: ""
                });
                useLoggedActionsStore.setState({ loggedActions: addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd) });
            };
            useFinalizeActionCallback.setState({ callback: finalizeActionCallback });
            finalizeAction(loggedActionToAdd);
        }
    };

    useGlobalStore.setState({
        activeUseActionName: action.name,
        activeInteractiveObjectName: "",
        activeUseActionCallback: callback
    });
}

function handlePlaceAction(action: IActionPlace, actions: TAction[]) {
    let loggedActionToAdd: any;
    let finalizeActionCallback: () => void;

    const placedInteractiveObject = DATA.interactiveObjects.find(
        (interactiveObject) => (interactiveObject.actions as string[]).includes(action.name));
    if (!placedInteractiveObject) { return; }
    // Entering place mode
    if (!action.activated) {
        const callback = (threeDObjectName: string) => {
            const pickedLocationInteractiveObject = DATA.interactiveObjects.find((interactiveObject) =>
                interactiveObject.objects3DNames.includes(threeDObjectName));
            if (!pickedLocationInteractiveObject) { return; }
            const isCorrectPlace = action.correctPlaceInteractiveObjects.find(
                (correctPlaceInteractiveObject) => correctPlaceInteractiveObject.name === pickedLocationInteractiveObject.name);

            if (isCorrectPlace) {
                loggedActionToAdd = {
                    actionName: action.name,
                    activated: true,
                    actionType: action.type,
                    additionalPayload: {
                        place: {
                            pickedLocationInteractiveObjectName: pickedLocationInteractiveObject.name,
                            placedInteractiveObjectName: placedInteractiveObject.name,
                        },
                    },
                };

                finalizeActionCallback = () => {
                    // Update actions: activate place action and increment count
                    let updatedActions = increaseActivationCount(
                        setUnsetPlacedInteractiveObjectName(
                            activateActionToggle(actions, action.name),
                            action.name,
                            pickedLocationInteractiveObject.name
                        ),
                        action.name
                    );

                    // MERGE-LOGIK: Wenn das Item gerade getragen wird, auch ausziehen (unequip)
                    const wearAction = updatedActions.find(
                        (a) => (placedInteractiveObject.actions as string[]).includes(a.name) && isIActionWear(a) && a.activated
                    );

                    if (wearAction) {
                        updatedActions = activateActionToggle(updatedActions, wearAction.name);
                    }

                    useActionsStore.setState({ actions: updatedActions });

                    // Batch log entries: erst unequip (falls nötig), dann placement
                    let loggedActions = useLoggedActionsStore.getState().loggedActions;
                    if (wearAction) {
                        loggedActions = addLoggedAction(loggedActions, {
                            actionName: wearAction.name,
                            activated: false,
                            actionType: wearAction.type,
                        });
                    }
                    loggedActions = addLoggedAction(loggedActions, loggedActionToAdd);

                    useLoggedActionsStore.setState({ loggedActions });
                    useGlobalStore.setState({ activePlaceActionName: "" });
                };

                useFinalizeActionCallback.setState({ callback: finalizeActionCallback });
                finalizeAction(loggedActionToAdd);
            } else {
                // Wrong place logic
                loggedActionToAdd = {
                    actionName: action.name,
                    activated: true,
                    actionType: action.type,
                    additionalPayload: { isWrong: true },
                };

                finalizeActionCallback = () => {
                    useGlobalStore.setState({
                        activeLightboxMessage: "Bist du sicher, dass du diese Verbindung herstellen möchtest?",
                        activePlaceActionName: "",
                    });
                    useLoggedActionsStore.setState({
                        loggedActions: addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd),
                    });
                };

                useFinalizeActionCallback.setState({ callback: finalizeActionCallback });
                finalizeAction(loggedActionToAdd);
            }
        };

        useGlobalStore.setState({
            activePlaceActionName: action.name,
            activeInteractiveObjectName: "",
            activePlaceActionCallback: callback,
        });
    }
    // Removing placement
    else {
        const loggedActions = useLoggedActionsStore.getState().loggedActions;
        const lastLoggedAction = structuredClone(loggedActions)
            .reverse()
            .find((loggedAction) => loggedAction.actionName === action.name);

        let pickedLocationInteractiveObject = "";
        if (lastLoggedAction) {
            pickedLocationInteractiveObject = lastLoggedAction.additionalPayload.place.pickedLocationInteractiveObjectName;
        } else {
            // Fallback for items placed on startup
            pickedLocationInteractiveObject = DATA.actions.find(
                (rawAction) => rawAction.name === action.name
            )?.pickedLocationInteractiveObjectName;
        }

        loggedActionToAdd = {
            actionName: action.name,
            activated: false,
            actionType: action.type,
            additionalPayload: {
                place: {
                    placedInteractiveObjectName: placedInteractiveObject.name,
                    pickedLocationInteractiveObjectName: pickedLocationInteractiveObject,
                },
            },
        };

        finalizeActionCallback = () => {
            let updatedActions = increaseActivationCount(
                setUnsetPlacedInteractiveObjectName(activateActionToggle(actions, action.name), action.name),
                action.name
            );
            // Deactivate any autoplace actions on the same object
            const interactiveObjectWithAction = DATA.interactiveObjects.find((io) => (io.actions as string[]).includes(action.name));
            if (interactiveObjectWithAction) {
                interactiveObjectWithAction.actions.forEach((actionName) => {
                    updatedActions = setAutoPlaceActivated(updatedActions, actionName, false);
                });
            }
            useActionsStore.setState({ actions: updatedActions });
            useLoggedActionsStore.setState({
                loggedActions: addLoggedAction(useLoggedActionsStore.getState().loggedActions, loggedActionToAdd),
            });
        };

        useFinalizeActionCallback.setState({ callback: finalizeActionCallback });
        finalizeAction(loggedActionToAdd);
    }
}

