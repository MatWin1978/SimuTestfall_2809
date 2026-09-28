import {EActionType, ICameraPositionAllViewports, IInteractiveObjectRaw, IMandatoryAction, IMandatoryActionRaw, NestedObject, TAction} from "../types/types.ts";
import {useActionsStore, useGlobalStore} from "../store/store.ts";
import DATA from "../data/data.json";
import jsep from 'jsep';

jsep.addIdentifierChar('#');

/**
 * Two-point-form of the line equation
 */
export function mapRange(x: number, p1x: number, p1y: number, p2x: number, p2y: number) {
    return ((p2y - p1y) / (p2x - p1x)) * (x - p1x) + p1y;
}

export function getNestedProperty<T>(obj: NestedObject<T>, path: string): T | undefined {
    const properties: string[] = path.split(".");
    let currentObj: NestedObject<T> = obj;

    properties.forEach((property, index) => {
        if (
            (!currentObj[property] || typeof currentObj[property] !== "object") &&
            index < properties.length - 1
        ) {
            return undefined;
        }
        currentObj = currentObj[property] as NestedObject<T>;
    });

    return currentObj as T;
}

/**
 * Takes in a camera position of ICameraPositionAllViewports and returns either portrait or landscape position
 */
export function returnViewportDependentCameraPosition(cameraPosition: ICameraPositionAllViewports) {
    const viewportWidth = useGlobalStore.getState().viewport.width;
    const viewportHeight = useGlobalStore.getState().viewport.height;

    const isPortrait = viewportWidth < viewportHeight;

    if (isPortrait && cameraPosition.portrait) {
        return cameraPosition.portrait;
    }

    return cameraPosition.landscape;
}

export function findInteractiveObjectByActionName(interactiveObjects: IInteractiveObjectRaw[], actionName: string): IInteractiveObjectRaw | undefined {
    return interactiveObjects.find((interactiveObject) => interactiveObject.actions.includes(actionName));
}

export function findActionByType(actions: TAction[], type: EActionType): TAction | undefined {
    return actions.find((action) => action.type === type);
}

/**
 * Removes extension from a filename string (ie. "foo.jpg") and returns the filename (ie. "foo")
 * @param filename
 */
export function removeExtension(filename: string) {
    return filename.split(".").slice(0, -1).join(".");
}

interface IJsepTree {
    type: string;
    name?: string;
    argument?: {
        name: string;
    };
    operator?: string;
    left?: IJsepTree;
    right?: IJsepTree;
}
export function evaluateJsepTree(parsedTree: IJsepTree, actions: TAction[]): boolean {
    if (parsedTree.type === 'Compound') return true;

    //Simple action name: "tTop"
    if (parsedTree.type === 'Identifier' && parsedTree.name !== undefined) {
        const [baseName, specifier] = parsedTree.name.split('#');
        const action = actions.find((action) => action.name === baseName);
        if (action !== null && action.activated === true) {
            if(specifier) {
                if(action.type === EActionType.PLACE) {
                    if(action.pickedLocationInteractiveObjectName === specifier) {
                        return true;
                    }
                }
                else {
                    console.warn("A specifier was found in the action name, but the action is not a place action. This should not happen.");
                }
            }
            else {
                return true;
            }
        }
    }
    //Negated action name: "!tTop"
    if (parsedTree.type === 'UnaryExpression' && parsedTree.operator === '!' && parsedTree.argument !== undefined) {
        const [baseName, specifier] = parsedTree.argument.name.split('#');
        //@ts-ignore
        const action = actions.find((action) => action.name === baseName);
        if (action !== null && !action.activated) {
            return true;
        }
        else {
            if(action !== null && specifier) {
                if(action.type === EActionType.PLACE) {
                    if(action.pickedLocationInteractiveObjectName === specifier) {
                        return false;
                    }
                    else {
                        return true;
                    }
                }
            }
        }
    }
    //Binary expressions: "tTop && tTop2" or "!tTop && tTop2"
    if (parsedTree.type === 'BinaryExpression' && parsedTree.operator === '&&' && parsedTree.left !== undefined && parsedTree.right !== undefined) {
        return evaluateJsepTree(parsedTree.left, actions) && evaluateJsepTree(parsedTree.right, actions);
    }
    //Binary expressions: "tTop || tTop2" or "!tTop || tTop2"
    if (parsedTree.type === 'BinaryExpression' && parsedTree.operator === '||' && parsedTree.left !== undefined && parsedTree.right !== undefined) {
        return evaluateJsepTree(parsedTree.left, actions) || evaluateJsepTree(parsedTree.right, actions);
    }

    return false;
}

/**
 * Takes an action and checks whether the condition written in the data.json is met
 */
export function checkCustomCondition(action: TAction, actions: TAction[]) {
    let conditionsMet = true;
    if(action.condition || action.conditionToggle) {
        if(!action.activated) {
            if(action.condition) {
                const jsepTree = jsep(action.condition);
                conditionsMet = evaluateJsepTree(jsepTree, actions);
            }
        }
        else {
            if(action.conditionToggle) {
                const jsepTree = jsep(action.conditionToggle);
                conditionsMet = evaluateJsepTree(jsepTree, actions);
            }
        }
    }

    return conditionsMet
}

/**
 * Takes an action and checks whether custom conditions written in the data.json is met, but also makes sure conditions that always apply without having to be written in the data.json are met
 * This includes that items can only be connected when they are in the inventory
 */
export function checkAllConditions(action: TAction, actions: TAction[]) {
    let conditionsMet = checkCustomCondition(action, actions);

    if(conditionsMet) {

        //Check if any inspect action is active which automatically disallows all other actions
        if(actions.find((globalAction) => globalAction.name !== action.name && globalAction.type === EActionType.INSPECT && globalAction.activated === true)) {
            conditionsMet = false;
        }

        //Check if any equipment test action is active which automatically disallows all other actions
        if(actions.find((globalAction) => globalAction.name !== action.name && globalAction.type === EActionType.EQUIPMENT_TEST && globalAction.activated === true)) {
            conditionsMet = false;
        }

        //Autoplace is unavailable when:
        // - the object is already at the autoplace target (sibling place/autoplace activated at that location)
        // - the object is currently worn (sibling wear action activated)
        // - a sibling place action is in "pick a target" mode
        if(action.type === EActionType.AUTOPLACE) {
            const interactiveObject = DATA.interactiveObjects.find((io) => io.actions.includes(action.name));
            if(interactiveObject) {
                const autoPlaceTargetName = action.correctPlaceInteractiveObjects[0]?.name;
                const alreadyAtTarget = actions.some((a) =>
                    interactiveObject.actions.includes(a.name)
                    && (a.type === EActionType.PLACE || a.type === EActionType.AUTOPLACE)
                    && a.activated
                    && a.pickedLocationInteractiveObjectName === autoPlaceTargetName
                );
                if(alreadyAtTarget) {
                    conditionsMet = false;
                }
                const wornSibling = actions.some((a) =>
                    interactiveObject.actions.includes(a.name) && a.type === EActionType.WEAR && a.activated
                );
                if(wornSibling) {
                    conditionsMet = false;
                }
                const activePlaceActionName = useGlobalStore.getState().activePlaceActionName;
                if(activePlaceActionName && interactiveObject.actions.includes(activePlaceActionName)) {
                    conditionsMet = false;
                }
            }
        }
    }

    return conditionsMet;
}

export function processMandatoryActions(mandatoryActions: (IMandatoryActionRaw | IMandatoryActionRaw[])[][]): (IMandatoryAction | IMandatoryAction[])[][] {
    return mandatoryActions.map((mandatoryActionGroup) => {
        return mandatoryActionGroup.map((mandatoryActionOrOptionalGroup) => {
            if(Array.isArray(mandatoryActionOrOptionalGroup)) {
                return mandatoryActionOrOptionalGroup.map((mandatoryAction) => {
                    return {
                        ...mandatoryAction,
                        actionType: useActionsStore.getState().actions.find((action) => action.name === mandatoryAction.actionName)?.type
                    }
                });
            }
            else {
                return {
                    ...mandatoryActionOrOptionalGroup,
                    actionType: useActionsStore.getState().actions.find((action) => action.name === mandatoryActionOrOptionalGroup.actionName)?.type
                }
            }
        })
    }) as unknown as (IMandatoryAction | IMandatoryAction[])[][];
}

export function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}
