import {create} from 'zustand';
import {devtools, subscribeWithSelector} from 'zustand/middleware';
import {shallow} from 'zustand/shallow';
import {AudioReference, EActionType, EAnimationStates, EXPERT_SYSTEM_DIAGNOSTIC_ROUTES, EXPERT_SYSTEM_DIAGNOSTIC_SUB_ROUTES, EXPERT_SYSTEM_ROUTES, IActionAutoPlace, ILoggedAction, ILoggedActionRaw, OCCLUSION_PERFORMANCE_PRESET, TAction, TActionRaw, TActionsState, TExpertSystemState, TFinalizeActionCallback, TGlobalState, ThreeDReference, TLoggedActionsStore, TPerformanceSettingsState, TTimerState} from '../types/types';
import {isIActionConnectDisconnectDuspol, isIActionConnectDisconnectMultimeter, isIActionPlace, isIActionAutoPlace, isTAnimatedAction} from "../types/typeguards";
import DATA from '../data/data.json';
import {CustomUrlParams} from "../utilities/CustomUrlParams.ts";
import {processMandatoryActions} from "../utilities/utilities.ts";
import {comparePerformedAndMandatoryActionsSimple} from "../utilities/comparePerformedAndMandatoryActionsSimple.ts";

/******************************************************************
 * Query strings in URL
 *****************************************************************/
const urlSearchParams = new CustomUrlParams(window.location.search);
const userName = urlSearchParams.get('userName');
let activeMissionName = urlSearchParams.get('activeMissionName');
let predefinedStateId = urlSearchParams.get('predefinedStateId');
let exerciseModeIsActive = urlSearchParams.get('exerciseModeIsActive') === "true" ? true : false;
if(!DATA.missions.find(mission => mission.name === activeMissionName)) {
   activeMissionName = ""
}

/******************************************************************
 * Global Store
 *****************************************************************/
export const useGlobalStore = create<TGlobalState>()(subscribeWithSelector(set => ({
    isLoading: true,
    loadingFailed: false,
    loadedPercentage: 0,
    viewport: {
        width: document.body.clientWidth,
        height: window.innerHeight,
    },
    fullscreenIsActive: document.fullscreenElement !== null,
    baseUrl: window.location.origin,
    hoveredInteractiveObjectName: "",
    hoveredPinName: "",
    userName: userName ? userName : "",
    exerciseModeIsActive: exerciseModeIsActive,
    showTermsOfUse: true,
    termsOfUseWereAccepted: false,
    showWelcomeScreen: false,
    showLog: false,
    showResult: false,
    missionIsDone: false,
    showSmartphone: false,
    computerIsMinimized: false,
    activeLightboxMessage: "",
    activeInteractiveObjectName: "",
    lastPointerUpCoordinates: {x: 0, y: 0},
    activeMissionName: activeMissionName ? activeMissionName : "",
    activeInspectActionName: "",
    activePlaceActionName: "",
    activeEquipmentTestActionName: "",
    activePlaceActionCallback: null,
    activeConnectDisconnectDuspolActionName: "",
    activeConnectDisconnectDuspolActionCallback: null,
    activeUseActionName: "",
    activeUseActionCallback: null,
    activeConnectDisconnectMultimeterActionName: "",
    activeConnectDisconnectMultimeterActionCallback: null,
    activeExpertSystemVehicle: undefined,
    hiddenCollectionNames: []
})));

/******************************************************************
 * Write state changes to URL (only when the 3 URL-relevant fields change)
 *****************************************************************/
useGlobalStore.subscribe(
    (state) => ({ userName: state.userName, activeMissionName: state.activeMissionName, exerciseModeIsActive: state.exerciseModeIsActive }),
    ({ userName, activeMissionName, exerciseModeIsActive }) => {
        const UrlParams = new CustomUrlParams(window.location.search);
        if (userName.length > 0) UrlParams.params['userName'] = userName;
        if (activeMissionName.length > 0) UrlParams.params['activeMissionName'] = activeMissionName;
        UrlParams.params['exerciseModeIsActive'] = exerciseModeIsActive ? "true" : "false";
        window.history.replaceState(null, '', window.location.pathname + UrlParams.returnQueryString());
    },
    { equalityFn: shallow }
);


/******************************************************************
 * Actions Store
 *****************************************************************/
export const useActionsStore = create<TActionsState>()(devtools(subscribeWithSelector(set => ({
    actions: processActions(mergeActions(activeMissionName))
})), {name: 'Interactive Objects'}));

/******************************************************************
 * Merge global actions with mission specific actions on activeMissionName change
 *****************************************************************/
useGlobalStore.subscribe((state) => state.activeMissionName, (newMissionName, oldMissionName) => {

    const newActions = mergeActions(newMissionName);

    useActionsStore.setState({actions: processActions(newActions)});

});

function mergeActions(missionName: string): TActionRaw[] {
    const mergedActions = structuredClone(DATA.actions) as TActionRaw[];
    const mission = DATA.missions.find(mission => mission.name === missionName);
    let missionSpecificActions = mission?.actions;

    if(missionSpecificActions) {
        mergedActions.forEach((globalAction, index) => {
            const missionSpecificAction = missionSpecificActions.find((action) => action.name === globalAction.name);
            if(missionSpecificAction) {
                //@ts-ignore
                mergedActions[index] = {...mergedActions[index], ...missionSpecificAction};
            }
        });
    }

    if(mission && predefinedStateId) {
        const predefinedState = mission.predefinedStates.find((predefinedState) => predefinedState.id === predefinedStateId);
        if(predefinedState && predefinedState.actions) {
            mergedActions.forEach((globalAction, index) => {
                const predefinedStateSpecificAction = predefinedState.actions.find((action) => action.name === globalAction.name);
                if(predefinedStateSpecificAction) {
                    //@ts-ignore
                    mergedActions[index] = {...mergedActions[index], ...predefinedStateSpecificAction};
                }
            });
        }
    }

    return mergedActions;
}


/**
 * Adds the properties to actions data
 */
export function processActions(data: TActionRaw[]): TAction[] {
    //@ts-ignore
    const processed: TAction[] = data.map((action) => {
        if(isTAnimatedAction(action)) {
            action['animationState'] = EAnimationStates.IDLE;
        }
        //@ts-ignore
        if(action.activated === undefined) {
            action['activated'] = false;
        }
        action["activationCount"] = 0;
        if(isIActionPlace(action) && !action.pickedLocationInteractiveObjectName) {
            action['pickedLocationInteractiveObjectName'] = "";
        }
        if(isIActionAutoPlace(action) && !action.pickedLocationInteractiveObjectName) {
            action['pickedLocationInteractiveObjectName'] = "";
        }
        if(isIActionConnectDisconnectDuspol(action)) {
            action['connectedFirstInteractiveObjectName']= "";
            action['connectedSecondInteractiveObjectName']= "";
        }
        if(isIActionConnectDisconnectMultimeter(action)) {
            action['connectedFirstInteractiveObjectName']= "";
            action['connectedSecondInteractiveObjectName']= "";
        }

        return action;
    });

    // Derive autoplace actions from place actions flagged with `autoPlace: true`.
    // The synthesized action shares references to the place action's scene data —
    // no duplication in data.json, and mission/predefined-state overrides on the
    // place action propagate for free.
    for(const action of processed) {
        if(!isIActionPlace(action) || !action.autoPlace) continue;
        const pickedLocation = action.pickedLocationInteractiveObjectName;
        const matchingEntry = action.correctPlaceInteractiveObjects.find(x => x.name === pickedLocation);
        if(!matchingEntry) continue;

        const autoPlaceName = action.name.replace(/Place$/, "") + "Autoplace";
        const autoPlaceAction: IActionAutoPlace = {
            type: EActionType.AUTOPLACE,
            name: autoPlaceName,
            displayName: "Zurück zur Werkzeugablage stellen",
            correctPlaceInteractiveObjects: [matchingEntry],
            sceneActionConditionSetsToggle: action.sceneActionConditionSetsToggle,
            activated: action.activated,
            pickedLocationInteractiveObjectName: pickedLocation,
            activationCount: 0,
            animationState: EAnimationStates.IDLE,
            // Inherit the place action's visibility conditions so the "Zurück zur Werkzeugablage" option is hidden 
            // under the same circumstances as its sibling place action 
            // (e.g. while the Spannungsprüfer tips are connected to HV+ / HV−).
            condition: action.condition,
            conditionToggle: action.conditionToggle,
        };
        processed.push(autoPlaceAction);
    }

    return processed;
}

/******************************************************************
 * Timer Store
 *****************************************************************/
export const useTimerStore = create<TTimerState>()(devtools(subscribeWithSelector(set => ({
    currentState: 'idle',
    currentTime: 0,
    goalTime: 30
})), {name: 'Timer'}));

function findMissionAndPredefinedStateSpecificLoggedActions(missionName: string | undefined, predefinedStateId: string | undefined): ILoggedAction[] {
    if(!predefinedStateId || !missionName) return [];

    const mission = DATA.missions.find(mission => mission.name === missionName);
    if(!mission) return [];

    const predefinedState = mission.predefinedStates?.find(predefinedState => predefinedState.id === predefinedStateId);
    if(!predefinedState) return [];

    let loggedActions = structuredClone(predefinedState.loggedActions) as ILoggedActionRaw[];
    if(!loggedActions) return [];

    loggedActions = loggedActions.map(loggedAction => {
        loggedAction["uid"] = crypto.randomUUID();
        return loggedAction;
    });

    return loggedActions as unknown as ILoggedAction[];
}


/******************************************************************
 * Logged Actions Store
 *****************************************************************/

export const useLoggedActionsStore = create<TLoggedActionsStore>()(devtools(subscribeWithSelector(set => ({
    loggedActions: findMissionAndPredefinedStateSpecificLoggedActions(activeMissionName, predefinedStateId)
})), {name: 'LoggedActions'}));

/******************************************************************
 * Check if all mandatory actions are performed
 *****************************************************************/
useLoggedActionsStore.subscribe((state, prevState) => {
    const activeMissionName = useGlobalStore.getState().activeMissionName;
    if(!activeMissionName) return;

    const performedActions = state.loggedActions;
    const mandatoryActions = processMandatoryActions(DATA.missions.find(mission => mission.name === activeMissionName).mandatoryActions);

    if(comparePerformedAndMandatoryActionsSimple(performedActions, mandatoryActions).allDone) {
        useGlobalStore.setState({
            showResult: true,
            missionIsDone: true
        });
    }
});

/******************************************************************
 * Expert System Store
 *****************************************************************/
export const useExpertSystemStore = create<TExpertSystemState>()(subscribeWithSelector(set => ({
    activeVehicle: undefined,
    activeRoute: EXPERT_SYSTEM_ROUTES.HOME,
    activeDiagnosticRoute: 'home',
    activeDiagnosticSubRoute: ''
})));

/******************************************************************
 * Performance Settings Store
 *****************************************************************/
export const usePerformanceSettings = create<TPerformanceSettingsState>()(subscribeWithSelector(set => ({
    showPerformanceSettings: false,
    maxResolutionToggle: false,
    occlusion: true,
    occlusionHighRes: false,
    occlusionPerformance: OCCLUSION_PERFORMANCE_PRESET.PERFORMANCE
})));

/******************************************************************
 * ThreeD Reference
 *****************************************************************/
export const useThreeDReference = create<ThreeDReference>()(devtools(set => ({
    threeD: null,
}), {name: 'ThreeDReference'}));

/******************************************************************
 * Finalize Action Callback Reference
 *****************************************************************/
export const useFinalizeActionCallback = create<TFinalizeActionCallback>()(devtools(set => ({
    callback: null,
}), {name: 'finalizeActionCallbackReference'}));

/******************************************************************
 * Audio Reference
 *****************************************************************/
export const useAudio = create<AudioReference>()(devtools(set => ({
    audio: {
        ignition: new Audio('/audio/ignition.mp3'),
        ignitionToggle: new Audio('/audio/ignition-toggle.mp3'),
        timer: new Audio('/audio/timer.mp3'),
        parkingBrake: new Audio('/audio/parking-brake.mp3')
    },
}), {name: 'AudioReference'}));
