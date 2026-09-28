import {EAnimationStates, IAction3D, ILoggedAction, ILoggedActionRaw, TAction} from "../types/types.ts";
import {isIActionPlace, isIActionAutoPlace, isIActionConnectDisconnectDuspol, isIActionConnectDisconnectMultimeter} from "../types/typeguards.ts";

export function increaseActivationCount(actions: TAction[], actionName: string): TAction[] {
    const index = actions.findIndex(a => a.name === actionName);
    if (index === -1) return actions;
    const result = actions.slice();
    result[index] = { ...actions[index], activationCount: actions[index].activationCount + 1 };
    return result;
}

export function activateActionToggle(actions: TAction[], actionName: string): TAction[] {
    const index = actions.findIndex(a => a.name === actionName);
    if (index === -1) return actions;
    const action = actions[index];
    if (!action.toggle || action.activated === undefined) return actions;
    const result = actions.slice();
    result[index] = { ...action, activated: !action.activated };
    return result;
}

export function setAnimationState(actions: TAction[], actionName: string, animationState: EAnimationStates): TAction[] {
    const index = actions.findIndex(a => a.name === actionName);
    if (index === -1) return actions;
    const result = actions.slice();
    result[index] = { ...actions[index], animationState } as TAction;
    return result;
}

export function setUnsetPlacedInteractiveObjectName(actions: TAction[], actionName: string, pickedLocationInteractiveObjectName?: string): TAction[] {
    const index = actions.findIndex(a => a.name === actionName);
    if (index === -1) return actions;
    const action = actions[index];
    if (!isIActionPlace(action) && !isIActionAutoPlace(action)) return actions;

    let newPickedLocation: string;
    if (action.pickedLocationInteractiveObjectName) {
        newPickedLocation = "";
    } else if (pickedLocationInteractiveObjectName) {
        newPickedLocation = pickedLocationInteractiveObjectName;
    } else {
        return actions;
    }

    const result = actions.slice();
    result[index] = { ...action, pickedLocationInteractiveObjectName: newPickedLocation };
    return result;
}

export function setAutoPlaceActivated(actions: TAction[], actionName: string, activated: boolean): TAction[] {
    const index = actions.findIndex(a => a.name === actionName);
    if (index === -1) return actions;
    const action = actions[index];
    if (!isIActionAutoPlace(action)) return actions;
    const result = actions.slice();
    result[index] = {
        ...action,
        activated,
        pickedLocationInteractiveObjectName: activated ? action.pickedLocationInteractiveObjectName : "",
    };
    return result;
}

export function setConnectDisconnectDuspolObjectName(actions: TAction[], actionName: string, mode: "first" | "second" | "removeAll", pickedInteractiveObjectName?: string): TAction[] {
    const index = actions.findIndex(a => a.name === actionName);
    if (index === -1) return actions;
    const action = actions[index];
    if (!isIActionConnectDisconnectDuspol(action)) return actions;
    const result = actions.slice();
    if (mode === "removeAll") {
        result[index] = { ...action, connectedFirstInteractiveObjectName: "", connectedSecondInteractiveObjectName: "" };
    } else if (mode === "first") {
        result[index] = { ...action, connectedFirstInteractiveObjectName: pickedInteractiveObjectName };
    } else {
        result[index] = { ...action, connectedSecondInteractiveObjectName: pickedInteractiveObjectName };
    }
    return result;
}

export function setConnectDisconnectMultimeterObjectName(actions: TAction[], actionName: string, mode: "first" | "second" | "removeAll", pickedInteractiveObjectName?: string): TAction[] {
    const index = actions.findIndex(a => a.name === actionName);
    if (index === -1) return actions;
    const action = actions[index];
    if (!isIActionConnectDisconnectMultimeter(action)) return actions;
    const result = actions.slice();
    if (mode === "removeAll") {
        result[index] = { ...action, connectedFirstInteractiveObjectName: "", connectedSecondInteractiveObjectName: "" };
    } else if (mode === "first") {
        result[index] = { ...action, connectedFirstInteractiveObjectName: pickedInteractiveObjectName };
    } else {
        result[index] = { ...action, connectedSecondInteractiveObjectName: pickedInteractiveObjectName };
    }
    return result;
}

export function addLoggedAction(loggedActions: ILoggedAction[], loggedActionRaw: ILoggedActionRaw): ILoggedAction[] {
    return [...loggedActions, { ...loggedActionRaw, uid: crypto.randomUUID() }];
}

export function setEntireAction(actions: TAction[], actionName: string, newAction: Partial<TAction>): TAction[] {
    const index = actions.findIndex(a => a.name === actionName);
    if (index === -1) return actions;
    const result = actions.slice();
    result[index] = { ...actions[index], ...newAction } as TAction;
    return result;
}
