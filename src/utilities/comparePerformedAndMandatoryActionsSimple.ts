import {ILoggedAction, IMandatoryAction, IMandatoryActionRaw, IValidatedMandatoryAction} from "../types/types.ts";

interface IAnnotatedPerformedAction extends ILoggedAction {
    wasCounted: boolean;
    associatedMandatoryGroupIndex: number;
    performedActionIndex: number
}

export function comparePerformedAndMandatoryActionsSimple(performedActions: ILoggedAction[], mandatoryActions: (IMandatoryAction | IMandatoryAction[])[][]): {allDone: boolean, annotatedPerformedActions: IAnnotatedPerformedAction[], validatedMandatoryActions: (IValidatedMandatoryAction | IValidatedMandatoryAction[])[][] } {
    const validatedMandatoryActions = structuredClone(mandatoryActions) as (IValidatedMandatoryAction | IValidatedMandatoryAction[])[][];
    const annotatedPerformedActions = structuredClone(performedActions).map((performedAction, index) => {
        (performedAction as IAnnotatedPerformedAction)["wasCounted"] = false;
        (performedAction as IAnnotatedPerformedAction)["performedActionIndex"] = index;
        return performedAction;
    }) as IAnnotatedPerformedAction[];

    annotatedPerformedActions.forEach((performedAction) => {
        //Look for undone group
        let indexOfUndoneGroup = -1;
        let currentIndex = -1;
        loop1: for(const optionalOrderMandatoryActionGroup of validatedMandatoryActions) {
            currentIndex += 1;
            for(const mandatoryActionOrOptionalGroup of optionalOrderMandatoryActionGroup) {
                if(!Array.isArray(mandatoryActionOrOptionalGroup)) {
                    if(mandatoryActionOrOptionalGroup.associatedUid === undefined && mandatoryActionOrOptionalGroup.incorrectReason === undefined) {
                        indexOfUndoneGroup = currentIndex;
                        break loop1;
                    }
                }
                else {
                    if(!mandatoryActionOrOptionalGroup.some((mandatoryAction) => mandatoryAction.associatedUid !== undefined) && !mandatoryActionOrOptionalGroup.some((mandatoryAction) => mandatoryAction.incorrectReason !== undefined)) {
                        indexOfUndoneGroup = currentIndex;
                        break loop1;
                    }
                }
            }
        }

        //Check if performed action is part of the undone group
        let actionWasFound = false;
        for(const mandatoryActionOrOptionalGroup of validatedMandatoryActions[indexOfUndoneGroup]) {
            if(!Array.isArray(mandatoryActionOrOptionalGroup)) {
                if(checkPerformedActionAgainstMandatoryAction(performedAction, mandatoryActionOrOptionalGroup) === true) {
                    performedAction["wasCounted"] = true;
                    performedAction["associatedMandatoryGroupIndex"] = indexOfUndoneGroup;
                    mandatoryActionOrOptionalGroup["isCorrect"] = true;
                    mandatoryActionOrOptionalGroup["associatedUid"] = performedAction.uid;
                    actionWasFound = true;
                    break;
                }
            }
            else {
                for(const optionalMandatoryAction of mandatoryActionOrOptionalGroup) {
                    if(checkPerformedActionAgainstMandatoryAction(performedAction, optionalMandatoryAction) === true) {
                        performedAction["wasCounted"] = true;
                        performedAction["associatedMandatoryGroupIndex"] = indexOfUndoneGroup;
                        optionalMandatoryAction["isCorrect"] = true;
                        optionalMandatoryAction["associatedUid"] = performedAction.uid;
                        actionWasFound = true;
                        break
                    }
                }

            }
        }

        //If action was not found, check if it is the first action of any of the next groups
        if(!actionWasFound && validatedMandatoryActions[indexOfUndoneGroup + 1]) {
            let actionWasFoundInGroupIndex = -1;
            loopA: for(let a = indexOfUndoneGroup + 1; a < validatedMandatoryActions.length; a++) {
                if(!Array.isArray(validatedMandatoryActions[a][0])) {
                    if(checkPerformedActionAgainstMandatoryAction(performedAction, (validatedMandatoryActions[a][0] as IValidatedMandatoryAction)) === true) {
                        performedAction["wasCounted"] = true;
                        performedAction["associatedMandatoryGroupIndex"] = indexOfUndoneGroup;
                        validatedMandatoryActions[a][0]["isCorrect"] = true;
                        validatedMandatoryActions[a][0]["associatedUid"] = performedAction.uid;
                        actionWasFoundInGroupIndex = a;
                        break loopA;
                    }
                }
                else {
                    for(const optionalMandatoryAction of (validatedMandatoryActions[a][0] as IValidatedMandatoryAction[])) {
                        if(checkPerformedActionAgainstMandatoryAction(performedAction, optionalMandatoryAction) === true) {
                            performedAction["wasCounted"] = true;
                            performedAction["associatedMandatoryGroupIndex"] = indexOfUndoneGroup;
                            validatedMandatoryActions[a][0]["isCorrect"] = true;
                            validatedMandatoryActions[a][0]["associatedUid"] = performedAction.uid;
                            actionWasFoundInGroupIndex = a;
                            break loopA;
                        }
                    }
                }
            }

            if(actionWasFoundInGroupIndex > -1) {
                //Mark all other actions in the all the groups up to found group as incorrect
                for(let b = indexOfUndoneGroup; b < actionWasFoundInGroupIndex; b++) {
                    for(const mandatoryActionOrOptionalGroup of validatedMandatoryActions[b]) {
                        if(!Array.isArray(mandatoryActionOrOptionalGroup)) {
                            if(mandatoryActionOrOptionalGroup.associatedUid === undefined && mandatoryActionOrOptionalGroup.incorrectReason === undefined) {
                                mandatoryActionOrOptionalGroup["isCorrect"] = false;
                                mandatoryActionOrOptionalGroup["incorrectReason"] = "notOrTooLatePerformed";
                            }
                        }
                        else {
                            for(const optionalMandatoryAction of mandatoryActionOrOptionalGroup) {
                                if(optionalMandatoryAction.associatedUid === undefined && optionalMandatoryAction.incorrectReason === undefined) {
                                    optionalMandatoryAction["isCorrect"] = false;
                                    optionalMandatoryAction["incorrectReason"] = "notOrTooLatePerformed";
                                }
                            }
                        }
                    }
                }
            }
        }
    })

    return {
        allDone: checkIfAllDone(validatedMandatoryActions),
        annotatedPerformedActions: annotatedPerformedActions,
        validatedMandatoryActions: validatedMandatoryActions
    }
}

// Bei diesen Verbindungsaktionen ist die Reihenfolge der beiden Kontaktpunkte (z.B. HV+ / HV-)
// irrelevant - beide Polungen werden als gueltige Pruefung gewertet.
const ORDER_INDEPENDENT_CONTACT_KEYS = ["connectDisconnectDuspol", "connectDisconnectMultimeter"];

function additionalPayloadGroupMatches(
    mandatoryGroup: Record<string, unknown>,
    performedGroup: Record<string, unknown>,
    payloadKey: string
): boolean {
    if(
        ORDER_INDEPENDENT_CONTACT_KEYS.includes(payloadKey) &&
        "connectedFirstInteractiveObjectName" in mandatoryGroup &&
        "connectedSecondInteractiveObjectName" in mandatoryGroup
    ) {
        const mandatoryPair = [
            mandatoryGroup.connectedFirstInteractiveObjectName,
            mandatoryGroup.connectedSecondInteractiveObjectName,
        ].sort();
        const performedPair = [
            performedGroup.connectedFirstInteractiveObjectName,
            performedGroup.connectedSecondInteractiveObjectName,
        ].sort();
        return mandatoryPair[0] === performedPair[0] && mandatoryPair[1] === performedPair[1];
    }
    return Object.keys(mandatoryGroup).every(
        (subKey) => mandatoryGroup[subKey] === performedGroup[subKey]
    );
}

export function checkPerformedActionAgainstMandatoryAction(performedAction: IAnnotatedPerformedAction, mandatoryAction: IValidatedMandatoryAction) {
    if((mandatoryAction.associatedUid === undefined) && (performedAction.actionName === mandatoryAction.actionName) && (performedAction.activated === mandatoryAction.activated)) {
        //Check for additional payload
        if(mandatoryAction.additionalPayload) {
            //Check if all keys in additionalPayload are present in performedAction
            const additionalPayloadKeys = Object.keys(mandatoryAction.additionalPayload);
            for(let u=0; u < additionalPayloadKeys.length; u++) {
                const additionalPayloadKey = additionalPayloadKeys[u];
                if(performedAction.additionalPayload && performedAction.additionalPayload[additionalPayloadKey]) {
                    if(additionalPayloadGroupMatches(mandatoryAction.additionalPayload[additionalPayloadKey], performedAction.additionalPayload[additionalPayloadKey], additionalPayloadKey)) {
                        return true;
                    }
                }
            }
        }
        else {
            return true;
        }
    }

    return false;
}

export function checkPerformedActionAgainstUnvalidatedMandatoryAction(performedAction: IAnnotatedPerformedAction, mandatoryAction: IMandatoryActionRaw) {
    if((performedAction.actionName === mandatoryAction.actionName) && (performedAction.activated === mandatoryAction.activated)) {
        //Check for additional payload
        if(mandatoryAction.additionalPayload) {
            //Check if all keys in additionalPayload are present in performedAction
            const additionalPayloadKeys = Object.keys(mandatoryAction.additionalPayload);
            for(let u=0; u < additionalPayloadKeys.length; u++) {
                const additionalPayloadKey = additionalPayloadKeys[u];
                if(performedAction.additionalPayload && performedAction.additionalPayload[additionalPayloadKey]) {
                    if(additionalPayloadGroupMatches(mandatoryAction.additionalPayload[additionalPayloadKey], performedAction.additionalPayload[additionalPayloadKey], additionalPayloadKey)) {
                        return true;
                    }
                }
            }
        }
        else {
            return true;
        }
    }

    return false;
}

function checkIfAllDone(validatedMandatoryActions: (IValidatedMandatoryAction | IValidatedMandatoryAction[])[][]) {
    let incorrectWasFound = false;

    loop1: for(let i = 0; i < validatedMandatoryActions.length; i++) {
        for(let j = 0; j < validatedMandatoryActions[i].length; j++) {
            if(Array.isArray(validatedMandatoryActions[i][j])) {
                if(!(validatedMandatoryActions[i][j] as Array<IValidatedMandatoryAction>).find((optionalMandatoryAction) => optionalMandatoryAction.isCorrect === true)) {
                    incorrectWasFound = true;
                    break loop1;
                }
            }
            else {
                if(!(validatedMandatoryActions[i][j] as IValidatedMandatoryAction).isCorrect) {
                    incorrectWasFound = true;
                    break loop1;
                }
            }
        }
    }

    return !incorrectWasFound;
}

