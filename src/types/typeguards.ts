import {EActionType, ESceneActionType, IAction3D, IActionPlace, IActionAutoPlace, IActionConnectDisconnectDuspol, IActionInspect, IActionMissionInspect, IActionGlovesPanelInspect, IActionWear, ILightboxContentImage, ILightboxContentText, ISceneActionParameterAnimation, ISceneActionSetBlenderPosition, ISceneActionSetBlenderQuaternion, ISceneActionSetParent, IActionEquipmentTest, IActionTimer, IActionLaptop, IActionReadDiagnostics, ISceneActionColor, IActionSmartphone, IActionReadManual, TAnimatedAction, IActionDiagnosticDetail, IActionCallExpert, ISceneActionTexture, IActionConnectDisconnectMultimeter, ISceneActionMultimeterDigits, IActionUse} from "./types.ts";

export function isIActionInspect(object: any): object is IActionInspect {
    return object.type === EActionType.INSPECT;
}

export function isIAction3D(object: any): object is IAction3D {
    return object.type === EActionType.THREED;
}

export function isIActionWear(object: any): object is IActionWear {
    return object.type === EActionType.WEAR;
}

export function isIActionPlace(object: any): object is IActionPlace {
    return object.type === EActionType.PLACE;
}

export function isIActionAutoPlace(object: any): object is IActionAutoPlace {
    return object.type === EActionType.AUTOPLACE;
}

export function isIActionEquipmentTest(object: any): object is IActionEquipmentTest {
    return object.type === EActionType.EQUIPMENT_TEST;
}

export function isIActionTimer(object: any): object is IActionTimer {
    return object.type === EActionType.TIMER;
}

export function isIActionMissionInspect(object: any): object is IActionMissionInspect {
    return object.type === EActionType.MISSION_INSPECT;
}

export function isIActionGlovesPanelInspect(object: any): object is IActionGlovesPanelInspect {
    return object.type === EActionType.GLOVES_PANEL_INSPECT;
}

export function isIActionLaptop(object: any): object is IActionLaptop {
    return object.type === EActionType.LAPTOP;
}

export function isIActionSmartphone(object: any): object is IActionSmartphone {
    return object.type === EActionType.SMARTPHONE;
}

export function isIActionConnectDisconnectDuspol(object: any): object is IActionConnectDisconnectDuspol {
    return object.type === EActionType.CONNECT_DISCONNECT_DUO;
}

export function isIActionConnectDisconnectMultimeter(object: any): object is IActionConnectDisconnectMultimeter {
    return object.type === EActionType.CONNECT_DISCONNECT_MULTIMETER;
}

export function isIActionReadDiagnostics(object: any): object is IActionReadDiagnostics {
    return object.type === EActionType.READ_DIAGNOSTICS;
}

export function isIActionReadManual(object: any): object is IActionReadManual {
    return object.type === EActionType.READ_MANUAL;
}

export function isIActionDiagnosticDetail(object: any): object is IActionDiagnosticDetail {
    return object.type === EActionType.DIAGNOSTIC_DETAIL;
}

export function isIActionCallExpert(object: any): object is IActionCallExpert {
    return object.type === EActionType.CALL_EXPERT;
}

export function isIActionUse(object: any): object is IActionUse {
    return object.type === EActionType.USE;
}

export function isTAnimatedAction(object: any): object is TAnimatedAction {
    return object.type === EActionType.EQUIPMENT_TEST || object.type === EActionType.THREED || object.type === EActionType.PLACE || object.type === EActionType.AUTOPLACE || object.type === EActionType.CONNECT_DISCONNECT_DUO;
}

export function isILightboxContentImage(object: any): object is ILightboxContentImage {
    return object.type === "image";
}

export function isILightboxContentText(object: any): object is ILightboxContentText {
    return object.type === "text";
}

export function isISceneActionParameterAnimation(object: any): object is ISceneActionParameterAnimation {
    return object.type === ESceneActionType.PARAMETER_ANIMATION;
}

export function isISceneActionSetBlenderPosition(object: any): object is ISceneActionSetBlenderPosition {
    return object.type === ESceneActionType.SET_BLENDER_POSITION;
}

export function isISceneActionSetBlenderQuaternion(object: any): object is ISceneActionSetBlenderQuaternion {
    return object.type === ESceneActionType.SET_BLENDER_QUATERNION;
}

export function isISceneActionSetParent(object: any): object is ISceneActionSetParent {
    return object.type === ESceneActionType.PARENT;
}

export function isISceneActionColor(object: any): object is ISceneActionColor {
    return (
        object.type === "color" &&
        (object.RGBValues || object.RGBValuesNormalized)
    );
}

export function isISceneActionTexture(object: any): object is ISceneActionTexture {
    return object.type === ESceneActionType.TEXTURE;
}

export function isISceneActionMultimeterDigits(object: any): object is ISceneActionMultimeterDigits {
    return object.type === ESceneActionType.MULTIMETER_DIGITS;
}
