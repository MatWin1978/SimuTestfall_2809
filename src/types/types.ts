import {ThreeD} from "../components/ThreeDCanvas/ThreeD";
import {Texture} from "three";

export type NestedObject<T> = {
    [key: string]: T | NestedObject<T>;
};

export type TGlobalState = {
    isLoading: boolean;
    loadingFailed: boolean;
    loadedPercentage: number;
    viewport: {
        width: number;
        height: number;
    };
    fullscreenIsActive: boolean;
    baseUrl: string;
    hoveredInteractiveObjectName: string;
    //Name of the pin currently under the pointer - only the part behind "-pin-" / "-pin_", e.g. "hv_inv_pos_in".
    //Empty when no pin is hovered.
    hoveredPinName: string;
    activeInteractiveObjectName: string;
    lastPointerUpCoordinates: {x: number, y: number},
    userName: string;
    exerciseModeIsActive: boolean;
    showWelcomeScreen: boolean;
    showTermsOfUse: boolean;
    termsOfUseWereAccepted: boolean;
    showSmartphone: boolean;
    computerIsMinimized: boolean;
    showLog: boolean;
    showResult: boolean;
    missionIsDone: boolean;
    activeLightboxMessage: string;
    activeMissionName: string;
    activeInspectActionName: string;
    activePlaceActionName: string;
    activeEquipmentTestActionName: string;
    activePlaceActionCallback: (threeDObjectName: string) => void;
    activeConnectDisconnectDuspolActionName: string;
    activeConnectDisconnectDuspolActionCallback: (threeDObjectName: string) => void;
    activeUseActionName: string;
    activeUseActionCallback: (threeDObjectName: string) => void;
    activeConnectDisconnectMultimeterActionName: string;
    activeConnectDisconnectMultimeterActionCallback: (threeDObjectName: string) => void;
    activeExpertSystemVehicle: undefined | IVehicle;
    hiddenCollectionNames: string[];
};

/**
 * A named group of 3D objects that can be shown/hidden as a whole (see DATA.collections).
 * The glTF scene has no Blender collections, so the grouping lives in data.json.
 *
 * Members are primarily matched by name pattern (case insensitive regex), so a Blender re-export that
 * renames, splits or adds objects doesn't silently empty the collection. Explicit names can be added on
 * top and are always the *runtime* names: the glTF loader strips dots, so "o-cable.001" in Blender is
 * "o-cable001" here.
 */
export interface ICollection {
    name: string;
    displayName: string;
    objects3DNamePatterns?: string[];
    objects3DNames?: string[];
    excludedObjects3DNamePatterns?: string[];
    excludedObjects3DNames?: string[];
}

export enum EXPERT_SYSTEM_ROUTES {
    HOME= 'home',
    VEHICLE= 'vehicle',
    DIAGNOSTIC= 'diagnostic',
    MANUALS = 'manuals'
}

export enum EXPERT_SYSTEM_DIAGNOSTIC_ROUTES {
    HOME = 'home',
    ABS = 'abs',
    AIRBAG = 'airbag',
    EINPARKHILFE = 'einparkhilfe',
    HEIZUNG_KLIMAANLAGE = 'heizung_klimaanlage',
    KOMFORTELEKTRONIK = 'komfortelektronik',
    FAHRERASSISTENZSYSTEME = 'fahrerassistenzsysteme',
    INSTRUMENTIERUNG = 'instrumentierung',
    HV_BATTERIEMANAGEMENT = 'hv_batteriemanagement',
    WEGFAHRSPERRE = 'wegfahrsperre'
}

export enum EXPERT_SYSTEM_DIAGNOSTIC_SUB_ROUTES {
    HOME = 'home',
    ERROR_MEMORY = 'errorMemory',
    CURRENT_VALS = 'currentVals'
}

export type TExpertSystemState = {
    activeVehicle: undefined | IVehicle
    activeRoute: EXPERT_SYSTEM_ROUTES,
    activeDiagnosticRoute: string,
    activeDiagnosticSubRoute: string,
}

export type TPerformanceSettingsState = {
    showPerformanceSettings: boolean;
    maxResolutionToggle: boolean;
    occlusion: boolean;
    occlusionHighRes: boolean;
    occlusionPerformance: OCCLUSION_PERFORMANCE_PRESET;
}

export enum OCCLUSION_PERFORMANCE_PRESET {
    PERFORMANCE = "Performance",
    LOW = "Low",
    MEDIUM = "Medium",
    HIGH = "High",
    ULTRA = "Ultra"
}

export type TActionsState = {
    actions: TAction[];
};

export type TTimerState = {
    currentTime: number;
    currentState: 'idle' | 'running' | 'done';
    goalTime: number;
};

export interface ICameraPositionAllViewports {
    landscape: ICameraPosition;
    portrait?: ICameraPosition;
}

export type ThreeDReference = {
    threeD: ThreeD | null;
};

export type TFinalizeActionCallback = {
    callback: () => void | null;
};

export type AudioReference = {
    audio: {
        [key: string]: HTMLAudioElement
    };
};

export interface ICameraPositionAllViewports {
    landscape: ICameraPosition;
    portrait?: ICameraPosition;
}

export interface ICameraPosition {
    target: IPosition3D;
    camera: IPosition3D;
}

export interface IPosition3D {
    x: number;
    y: number;
    z: number;
}

export interface ThreeDOptions {
    canvas: HTMLCanvasElement;
}

export interface ILoadingStats {
    gltfLoaded: number;
    gltfTotal: number;
    rgbeLoaded: number;
    rgbeTotal: number;
    gltfWasLoaded: boolean;
    rgbeWasLoaded: boolean;
}

export interface ITextureCache {
    [key: string]: Texture;
}

export interface IThreeDConfig {
    frameRate: number;
    maxResolution: number;
    debug: boolean;
    continuousRender: boolean,
    containObjectInViewParams: {
        portraitAspectRatio: number;
        portraitZoom: number;
        landscapeAspectRatio: number;
        landscapeZoom: number;
    };
    logCamPosition: boolean;
    showGridHelper: boolean;
    showCamTarget: boolean;
}

export enum EEquipmentCategory {
    GLASSES = "glasses",
    VISOR = "visor",
    GLOVES = "gloves",
}

export interface IInteractiveObjectRaw {
    displayName: string,
    loggedDisplayName?: string,
    name: string,
    icon?: string,
    equipmentCategory?: EEquipmentCategory,
    quickNavCategory?: EQuickNavCategories,
    main3DTransform?: string,
    objects3DNames: string[],
    hoverStyleChangeObjectsNames: string[],
    focusable?: boolean,
    focusObject?: string,
    focusCameraPosition?: ICameraPositionAllViewports,
    actions: string[]
}

export enum EQuickNavCategories {
    CAR = 'car',
    TOOLS = 'tools'
}

export enum EActionType {
    LIGHTBOX = 'lightbox',
    INSPECT = 'inspect',
    THREED = 'threeD',
    WEAR = 'wear',
    PLACE = 'place',
    AUTOPLACE = 'autoplace',
    MISSION_INSPECT = 'missionInspect',
    GLOVES_PANEL_INSPECT = 'glovesPanelInspect',
    CONNECT_DISCONNECT_DUO = 'connectDisconnectDuspol',
    CONNECT_DISCONNECT_MULTIMETER = 'connectDisconnectMultimeter',
    EQUIPMENT_TEST = 'equipmentTest',
    TIMER = 'timer',
    LAPTOP = 'laptop',
    SMARTPHONE = 'smartphone',
    READ_DIAGNOSTICS = 'readDiagnostics',
    READ_MANUAL = 'readManual',
    DIAGNOSTIC_DETAIL = 'diagnosticDetail',
    CALL_EXPERT = 'callExpert',
    USE = 'use'
}

export interface IActionRaw {
    sound?: string;
    soundToggle?: string;
    condition?: string;
    conditionToggle?: string;
    toggle?: boolean;
    alwaysWrong?: {
        message: string;
    };
}

export interface IAction3DRaw extends IActionRaw {
    type:EActionType.THREED;
    name: string;
    activated?: boolean;
    displayName: string;
    displayNameToggle?: string;
    sceneActionConditionSets: ISceneActionConditionSet[];
    sceneActionConditionSetsToggle: ISceneActionConditionSet[];
}

export interface IAction3D extends IAction3DRaw {
    activationCount: number;
    activated: boolean;
    animationState: EAnimationStates;
}

export interface IActionInspectRaw extends IActionRaw {
    type: EActionType.INSPECT;
    name: string;
    activated?: boolean;
    displayName: string;
    displayNameToggle: string;
}

export interface IActionInspect extends IActionInspectRaw {
    activationCount: number;
    activated: boolean;
    animationState: EAnimationStates;
}

export interface IActionWearRaw extends IActionRaw {
    type: EActionType.WEAR;
    name: string;
    toggle: boolean;
    activated?: boolean;
    displayName: string;
    displayNameToggle: string;
}

export interface IActionWear extends IActionWearRaw{
    activationCount: number;
    activated: boolean;
}

export interface IActionPlaceRaw extends IActionRaw  {
    type: EActionType.PLACE;
    name: string;
    toggle: boolean;
    activated?: boolean;
    displayName: string;
    displayNameToggle: string;
    correctPlaceInteractiveObjects: {
        name: string,
        sceneActionConditionSets: ISceneActionConditionSet[];
        condition?: string;
    }[];
    sceneActionConditionSetsToggle: ISceneActionConditionSet[];
    autoPlace?: boolean;
    pickedLocationInteractiveObjectName?: string;
}

export interface IActionPlace extends IActionPlaceRaw {
    activationCount: number;
    activated: boolean;
    animationState: EAnimationStates;
    pickedLocationInteractiveObjectName: string;
}

export interface IActionAutoPlaceRaw extends IActionRaw {
    type: EActionType.AUTOPLACE;
    name: string;
    displayName: string;
    displayNameToggle?: string;
    activated?: boolean;
    correctPlaceInteractiveObjects: {
        name: string,
        sceneActionConditionSets: ISceneActionConditionSet[];
    }[];
    sceneActionConditionSetsToggle: ISceneActionConditionSet[];
}

export interface IActionAutoPlace extends IActionAutoPlaceRaw {
    activationCount: number;
    activated: boolean;
    animationState: EAnimationStates;
    pickedLocationInteractiveObjectName: string;
}

export interface IActionEquipmentTestRaw extends IActionRaw {
    type: EActionType.EQUIPMENT_TEST;
    name: string;
    toggle: boolean;
    activated?: boolean;
    displayName: string;
    displayNameToggle: string;
    sceneActionConditionSets: ISceneActionConditionSet[];
    sceneActionConditionSetsToggle: ISceneActionConditionSet[];
    focusCameraPosition: ICameraPositionAllViewports;
}

export interface IActionEquipmentTest extends IActionEquipmentTestRaw {
    activationCount: number;
    activated: boolean;
    animationState: EAnimationStates;
}

export interface IActionMissionInspectRaw extends IActionRaw {
    type: EActionType.MISSION_INSPECT,
    name: string,
    toggle: boolean;
    displayName: string;
    displayNameToggle: string;
    activated?: boolean;
}

export interface IActionMissionInspect extends IActionMissionInspectRaw {
    activationCount: number;
    activated: boolean;
}

export interface IActionGlovesPanelInspectRaw extends IActionRaw {
    type: EActionType.GLOVES_PANEL_INSPECT,
    name: string,
    toggle: boolean;
    displayName: string;
    displayNameToggle: string;
    activated?: boolean;
}

export interface IActionGlovesPanelInspect extends IActionGlovesPanelInspectRaw {
    activationCount: number;
    activated: boolean;
}

export interface IActionConnectDisconnectDuspolRaw extends IActionRaw {
    type: EActionType.CONNECT_DISCONNECT_DUO,
    name: string,
    toggle: boolean;
    displayName: string;
    displayNameToggle: string;
    activated?: boolean;
    first3DMainTransform: string;
    second3DMainTransform: string;
    connectableInteractiveObjects: {
        name: string,
        sceneActionConditionSets: {
            condition?: string;
            sceneActions: Omit<TSceneAction, "objectName">[];
        }[];
    }[];
    connectionPairResults: {
        pairing: string[],
        orderRelevant: boolean,
        sceneActionConditionSets: ISceneActionConditionSet[]
    }[];
    sceneActionConditionSetsToggle: ISceneActionConditionSet[];
}

export interface IActionConnectDisconnectMultimeterRaw extends IActionRaw {
    type: EActionType.CONNECT_DISCONNECT_MULTIMETER,
    name: string,
    toggle: boolean;
    displayName: string;
    displayNameToggle: string;
    activated?: boolean;
    first3DMainTransform: string;
    second3DMainTransform: string;
    connectableInteractiveObjects: {
        name: string,
        sceneActionConditionSets: {
            condition?: string;
            sceneActions: Omit<TSceneAction, "objectName">[];
        }[];
    }[];
    connectionPairResults: {
        pairing: string[],
        orderRelevant: boolean,
        sceneActionConditionSets: ISceneActionConditionSet[]
    }[];
    sceneActionConditionSetsToggle: ISceneActionConditionSet[];
}

export interface ISceneActionConditionSet {
    condition?: string;
    sceneActions: TSceneAction[];
}

export interface IActionConnectDisconnectDuspol extends IActionConnectDisconnectDuspolRaw {
    activationCount: number;
    activated: boolean;
    animationState: EAnimationStates;
    connectedFirstInteractiveObjectName: string;
    connectedSecondInteractiveObjectName: string;
}

export interface IActionConnectDisconnectMultimeter extends IActionConnectDisconnectMultimeterRaw {
    activationCount: number;
    activated: boolean;
    animationState: EAnimationStates;
    connectedFirstInteractiveObjectName: string;
    connectedSecondInteractiveObjectName: string;
}

export interface IActionTimerRaw extends IActionRaw {
    type: EActionType.TIMER;
    name: string;
    toggle: boolean;
    displayName: string;
    displayNameToggle: string;
}

export interface IActionTimer extends IActionTimerRaw {
    activationCount: number;
    activated: boolean;
}

export interface IActionLaptopRaw extends IActionRaw {
    type: EActionType.TIMER;
    name: string;
    toggle: boolean;
    displayName: string;
    displayNameToggle: string;
}

export interface IActionLaptop extends IActionLaptopRaw {
    activationCount: number;
    activated: boolean;
}

export interface IActionSmartphoneRaw extends IActionRaw {
    type: EActionType.TIMER;
    name: string;
    toggle: boolean;
    displayName: string;
    displayNameToggle: string;
}

export interface IActionSmartphone extends IActionSmartphoneRaw {
    activationCount: number;
    activated: boolean;
}

export interface IActionReadDiagnosticsRaw extends IActionRaw {
    name: string,
    type: EActionType.READ_DIAGNOSTICS,
    toggle: boolean,
    displayName: string,
    displayNameToggle: string,
    routes: {
        name: string,
        displayName: string,
        disabled?: boolean,
        subRoutes: {
            name: string,
            displayName: string,
            disabled?: boolean,
            actionDependentValues: IDiagnosticActionDependentValue[]
        }[]
    }[]
}

export interface IDiagnosticValue {
    displayName: string,
    value: string
}

export interface IDiagnosticActionDependentValue {
    condition?: string,
    values: IDiagnosticValue[]
}

export interface IActionReadDiagnostics extends IActionReadDiagnosticsRaw {
    activationCount: number;
    activated: boolean;
}

export interface IActionDiagnosticDetailRaw extends IActionRaw {
    name: string,
    type: EActionType.DIAGNOSTIC_DETAIL,
    toggle: boolean,
    displayName: string,
    displayNameToggle: string
}

export interface IActionDiagnosticDetail extends IActionDiagnosticDetailRaw {
    activationCount: number;
    activated: boolean;
}

export interface IActionReadManualRaw extends IActionRaw {
    name: string,
    type: EActionType.READ_DIAGNOSTICS,
    toggle: boolean,
    displayName: string,
    displayNameToggle: string,
    actionDependentValues: {
        condition?: string,
        values: {
            errorMemory?: {
                displayName: string,
                value: string
            }[],
            currentVals?: {
                displayName: string,
                "value": string
            }[]
        }
    }[]
}

export interface IActionReadManual extends IActionReadManualRaw {
    activationCount: number;
    activated: boolean;
}

export interface IActionUseEffect {
    type: "toggleAction";
    actionName: string;
}

export interface IActionUseRaw extends IActionRaw {
    type: EActionType.USE;
    name: string;
    displayName: string;
    displayNameToggle?: string;
    correctInteractiveObjects: {
        name: string;
        targetCondition?: string;
        effects: IActionUseEffect[];
        sceneActionConditionSets?: ISceneActionConditionSet[];
    }[];
}

export interface IActionUse extends IActionUseRaw {
    activationCount: number;
    activated: boolean;
}

export interface IActionCallExpertRaw extends IActionRaw {
    name: string,
    type: EActionType.CALL_EXPERT,
    toggle: boolean,
    displayName: string,
    displayNameToggle: string,
}

export interface IActionCallExpert extends IActionCallExpertRaw {
    activationCount: number;
    activated: boolean;
}

export type TActionRaw = IActionInspectRaw | IAction3DRaw | IActionWearRaw | IActionPlaceRaw | IActionAutoPlaceRaw | IActionMissionInspectRaw | IActionGlovesPanelInspectRaw | IActionConnectDisconnectDuspolRaw | IActionConnectDisconnectMultimeterRaw | IActionEquipmentTestRaw | IActionTimerRaw | IActionLaptopRaw | IActionReadDiagnosticsRaw | IActionReadManualRaw | IActionDiagnosticDetailRaw | IActionCallExpertRaw | IActionUseRaw;

export type TAction = IActionInspect | IAction3D | IActionWear | IActionPlace | IActionAutoPlace | IActionMissionInspect | IActionGlovesPanelInspect | IActionConnectDisconnectDuspol | IActionConnectDisconnectMultimeter | IActionEquipmentTest | IActionTimer | IActionLaptop | IActionReadDiagnostics | IActionReadManual | IActionDiagnosticDetail | IActionCallExpert | IActionUse;

export type TAnimatedAction = IActionEquipmentTest | IAction3D | IActionPlace | IActionAutoPlace | IActionConnectDisconnectDuspol | IActionConnectDisconnectMultimeter;

export interface ILightboxContentImage {
    type: "image";
    src: string;
}

export interface ILightboxContentText {
    type: "text";
    contentHtml: string;
}

export enum ESceneActionType {
    PARAMETER_ANIMATION = 'parameterAnimation',
    SET_BLENDER_POSITION = 'setBlenderPosition',
    SET_BLENDER_QUATERNION = 'setBlenderQuaternion',
    VISIBILITY = 'visibility',
    PARENT = 'parent',
    TEXTURE = 'texture',
    MULTIMETER_DIGITS = 'multimeterDigits',
    CAMERA = 'camera',
    TIMER = 'timer',
    COLOR = 'color'
}

export interface ISceneActionVisibility {
    type: ESceneActionType.VISIBILITY;
    visibleMeshNames: string[];
    invisibleMeshNames: string[];
}

export interface ISceneActionParameterAnimation {
    type: ESceneActionType.PARAMETER_ANIMATION;
    objectName?: string;
    materialNames?: string[];
    parameter: string;
    /** "original" animates back to the scale the object was exported with - only supported for `scale`. */
    value: number | "original";
    duration: number;
}

export interface ISceneActionSetBlenderPosition {
    type: ESceneActionType.SET_BLENDER_POSITION;
    objectName: string;
    blenderPosition: [number, number, number];
}

export interface ISceneActionSetBlenderQuaternion {
    type: ESceneActionType.SET_BLENDER_QUATERNION;
    objectName: string;
    blenderQuaternion: [number, number, number, number];
}

export interface ISceneActionSetParent {
    type: ESceneActionType.PARENT;
    objectName: string;
    newParentName: string;
}

export interface ISceneActionColor {
    type: ESceneActionType.COLOR;
    materialNames: string[];
    parameterName: string;
    RGBValues?: number[];
    RGBValuesNormalized?: number[];
    duration?: number;
}

export type TTextureProperty = "map" | "envMap" | "aoMap" | "emissiveMap" | "normalMap" | "bumpMap" | "roughnessMap" | "metalnessMap" | "alphaMap";

export interface ISceneActionTexture {
    type: "texture";
    materialNames: string[];
    textureProperty: TTextureProperty;
    textureFileName: string;
    repeatU: number;
    repeatV: number;
}

export interface ISceneActionMultimeterDigits {
    type: "multimeterDigits";
    number: number | "off";
}

export type TSceneAction = ISceneActionParameterAnimation | ISceneActionSetBlenderPosition | ISceneActionVisibility | ISceneActionSetBlenderQuaternion | ISceneActionSetParent | ISceneActionColor | ISceneActionTexture | ISceneActionMultimeterDigits;

export enum EAnimationStates {
    IDLE = "idle",
    IS_RUNNING = "isRunning"
}

export type TLoggedActionsStore = {
    loggedActions: ILoggedAction[];
}

export interface ILoggedActionRaw {
    actionName: string,
    actionType: EActionType,
    activated?: boolean,
    additionalPayload?: ILoggedActionAdditionalPayload
}

export interface ILoggedAction extends ILoggedActionRaw {
    uid: string,
}

export interface ILoggedActionAdditionalPayload {
    place?: {
        pickedLocationInteractiveObjectName?: string,
        placedInteractiveObjectName: string
    };
    autoPlace?: {
        autoPlacePlaceName: string,
        placedInteractiveObjectName: string
    };
    connectDisconnectDuspol?: {
        connectedFirstInteractiveObjectName?: string,
        connectedSecondInteractiveObjectName: string
    };
    connectDisconnectMultimeter?: {
        connectedFirstInteractiveObjectName?: string,
        connectedSecondInteractiveObjectName: string
    };
    timer?: {
        duration: number,
    }
    use?: {
        usingInteractiveObjectName: string;
        usedInteractiveObjectName: string;
    };
    isWrong?: boolean;
    diagnosticDetail?: string
}

export interface IMandatoryActionRaw {
    actionName: string,
    activated?: boolean,
    before?: string[],
    after?: string[],
    additionalPayload?: ILoggedActionAdditionalPayload,
    warnings?: IWarning[]
}

export interface IWarning {
    necessaryMandatoryActionOrGroup: IMandatoryActionRaw | IMandatoryActionRaw[],
    message: string
}

export interface IMandatoryAction extends IMandatoryActionRaw {
    actionType: EActionType
}

export interface IValidatedMandatoryAction extends IMandatoryAction {
    isCorrect: boolean;
    associatedUid?: string | null;
    incorrectReason?: "notPerformed" | "performedAfter" | "performedBefore" | "notOrTooLatePerformed";
}

export interface IMission {
    name: string;
    displayName: string;
    description: string;
    missionStatement: string;
    carData: {
        clientNumber: string;
        "licensePlateNumber": string;
        "kbaNumber": string;
        "registrationDate": string;
        "model": string
        "mileage": string;
    };
    disabled: boolean,
    actions?: TActionRaw;
    videoId?: string;
    mandatoryActions: (IMandatoryActionRaw | IMandatoryActionRaw[])[][];
    predefinedStates?: IPredefinedState[]
}

export interface IPredefinedState {
    id: string;
    camData: ICameraPositionAllViewports;
    actions: TActionRaw[];
    loggedActions: ILoggedActionRaw[];
}

export interface IVehicle {
    RbSchluessel: string,
    Marke: string,
    Modell: string,
    Fahrzeugtyp: string,
    Baujahr: string,
    VIN: string,
    HSN: string,
    TSN: string,
    isElectric: boolean,
    isValid: boolean
}

export interface IViewPoint {
    name: string;
    displayName: string;
    icon?: string;
    camData: ICameraPositionAllViewports;
}
