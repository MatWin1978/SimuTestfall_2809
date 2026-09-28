import {EActionType, ILoggedActionRaw} from "../types/types.ts";
import DATA from "../data/data.json";
import {useActionsStore} from "../store/store.ts";
import {isIActionReadDiagnostics} from "../types/typeguards.ts";

// O(1) lookup instead of repeated O(n) .find() calls
const interactiveObjectsMap = new Map(DATA.interactiveObjects.map(obj => [obj.name, obj]));

export function returnLoggedActionText(loggedAction: ILoggedActionRaw): string {
    const currentAction = useActionsStore.getState().actions.find((action) => action.name == loggedAction.actionName);
    if(!currentAction) return;
    let text = currentAction.displayName;

    if(loggedAction.activated !== undefined && loggedAction.activated === false) {
        text = currentAction.displayNameToggle ?? text;
    }
    if(loggedAction.actionType === EActionType.PLACE) {
        if(loggedAction.activated) {
            if(loggedAction.additionalPayload?.place.pickedLocationInteractiveObjectName && loggedAction.additionalPayload?.place.placedInteractiveObjectName) {
                const placedInteractiveObject = interactiveObjectsMap.get(loggedAction.additionalPayload.place.placedInteractiveObjectName);
                const locationInteractiveObject = interactiveObjectsMap.get(loggedAction.additionalPayload.place.pickedLocationInteractiveObjectName);

                if(placedInteractiveObject && locationInteractiveObject) {
                    text = `Platzierung: ${placedInteractiveObject.displayName} an ${locationInteractiveObject.displayName}`;
                }
            }
            else if(loggedAction.additionalPayload?.place.placedInteractiveObjectName) {
                const placedInteractiveObject = interactiveObjectsMap.get(loggedAction.additionalPayload.place.placedInteractiveObjectName);
                if(placedInteractiveObject) {
                    text = `Platzierung: ${placedInteractiveObject.loggedDisplayName ? placedInteractiveObject.loggedDisplayName : placedInteractiveObject.displayName}`;
                }
            }
        }
        else {
            if(loggedAction.additionalPayload?.place.placedInteractiveObjectName) {
                const placedInteractiveObject = interactiveObjectsMap.get(loggedAction.additionalPayload.place.placedInteractiveObjectName);
                if(placedInteractiveObject) {
                    text = `In den Werkstattwagen legen: ${placedInteractiveObject.loggedDisplayName ? placedInteractiveObject.loggedDisplayName : placedInteractiveObject.displayName}`;
                }
            }
        }
    }
    if(loggedAction.actionType === EActionType.USE) {
        if(loggedAction.activated) {
            if(loggedAction.additionalPayload?.use?.usedInteractiveObjectName) {
                const usedInteractiveObject = interactiveObjectsMap.get(loggedAction.additionalPayload.use.usedInteractiveObjectName);
                const usingInteractiveObject = interactiveObjectsMap.get(loggedAction.additionalPayload.use.usingInteractiveObjectName);
                if(usedInteractiveObject && usingInteractiveObject) {
                    text = `Benutzen: ${usingInteractiveObject.displayName} an ${usedInteractiveObject.displayName}`;
                }
            }
        }
    }
    if(loggedAction.actionType === EActionType.AUTOPLACE) {
        if(loggedAction.additionalPayload?.autoPlace) {
            const placedInteractiveObject = interactiveObjectsMap.get(loggedAction.additionalPayload.autoPlace.placedInteractiveObjectName);
            const locationInteractiveObject = interactiveObjectsMap.get(loggedAction.additionalPayload.autoPlace.autoPlacePlaceName);

            if(placedInteractiveObject && locationInteractiveObject) {
                text = `Automatisch platzieren: ${placedInteractiveObject.displayName} an ${locationInteractiveObject.displayName}`;
            }
        }
    }
    if(loggedAction.actionType === EActionType.CONNECT_DISCONNECT_DUO) {
        if(loggedAction.activated) {
            if(loggedAction.additionalPayload?.connectDisconnectDuspol.connectedFirstInteractiveObjectName && loggedAction.additionalPayload?.connectDisconnectDuspol.connectedSecondInteractiveObjectName) {
                const firstConnectedObject = interactiveObjectsMap.get(loggedAction.additionalPayload.connectDisconnectDuspol.connectedFirstInteractiveObjectName);
                const secondConnectedObject = interactiveObjectsMap.get(loggedAction.additionalPayload.connectDisconnectDuspol.connectedSecondInteractiveObjectName);

                if(firstConnectedObject && secondConnectedObject) {
                    text = `Spannungsprüfer angelegt an: ${firstConnectedObject.displayName} & ${secondConnectedObject.displayName}`;
                }
            }
        }
        else {
            text = `Spannungsprüfer entfernt`;
        }
    }
    if(loggedAction.actionType === EActionType.TIMER) {
        if(loggedAction.additionalPayload?.timer?.duration) {
            text = `Timer gesetzt und abgewartet: ${loggedAction.additionalPayload.timer.duration} Sekunden`;
        }
    }
    if(loggedAction.actionType === EActionType.DIAGNOSTIC_DETAIL) {
        if(loggedAction.additionalPayload?.diagnosticDetail) {
            const readDiagnosticsAction = useActionsStore.getState().actions.find((action) => action.type === EActionType.READ_DIAGNOSTICS);

            if(readDiagnosticsAction && isIActionReadDiagnostics(readDiagnosticsAction)) {
                for(const diagnosticRoute of readDiagnosticsAction.routes) {
                    for(const subRoute of diagnosticRoute.subRoutes) {
                        if(subRoute.name === loggedAction.additionalPayload?.diagnosticDetail) {
                            text += `: ${subRoute.displayName}`;
                        }
                    }
                }
            }
        }
    }

    return text;
}
