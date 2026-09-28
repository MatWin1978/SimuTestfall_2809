import {useEffect, useMemo} from "react";
import {ArrowLeftCircleIcon} from "@heroicons/react/24/solid";
import {useActionsStore, useExpertSystemStore} from "../../../store/store.ts";
import {EActionType, EXPERT_SYSTEM_ROUTES} from "../../../types/types.ts";
import {evaluateJsepTree} from "../../../utilities/utilities.ts";
import {isIActionDiagnosticDetail, isIActionReadDiagnostics} from "../../../types/typeguards.ts";
import jsep from "jsep";
import {handleActionTrigger} from "../../../utilities/handleActionTrigger.ts";
import {ExpertSystemDiagnosticRouteSelection} from "./ExpertSystemDiagnosticRouteSelection.tsx";

function ExpertSystemDiagnostic() {
    const actions = useActionsStore((state) => state.actions);
    const activeDiagnosticRoute = useExpertSystemStore((state) => state.activeDiagnosticRoute);
    const activeDiagnosticSubRoute = useExpertSystemStore((state) => state.activeDiagnosticSubRoute);

    // All hooks must appear before any conditional returns
    const readDiagnosticsAction = useMemo(
        () => actions.find((a) => a.type === EActionType.READ_DIAGNOSTICS),
        [actions]
    );
    const diagnosticDetailAction = useMemo(
        () => actions.find((a) => a.type === EActionType.DIAGNOSTIC_DETAIL),
        [actions]
    );

    const validReadDiagnosticsAction = isIActionReadDiagnostics(readDiagnosticsAction) ? readDiagnosticsAction : null;

    // Cache active route/subroute to avoid repeated .find() in header and renderRoute
    const activeRoute = useMemo(
        () => validReadDiagnosticsAction?.routes.find((r) => r.name === activeDiagnosticRoute) ?? null,
        [validReadDiagnosticsAction, activeDiagnosticRoute]
    );
    const activeSubRoute = useMemo(
        () => activeRoute?.subRoutes.find((s) => s.name === activeDiagnosticSubRoute) ?? null,
        [activeRoute, activeDiagnosticSubRoute]
    );

    // Memoize diagnostic message computation — includes jsep parsing
    const diagnosticMessages = useMemo(() => {
        if (!activeDiagnosticSubRoute || !activeSubRoute) return [];
        const messages = [];
        for (const adv of activeSubRoute.actionDependentValues) {
            const conditionsMet = !adv.condition || evaluateJsepTree(jsep(adv.condition), actions);
            if (conditionsMet) messages.push(...adv.values);
        }
        return messages;
    }, [activeDiagnosticSubRoute, activeSubRoute, actions]);

    useEffect(() => {
        if (readDiagnosticsAction) handleActionTrigger(readDiagnosticsAction);
    }, []);

    useEffect(() => {
        if (activeDiagnosticSubRoute && diagnosticDetailAction) {
            handleActionTrigger(diagnosticDetailAction, {diagnosticDetail: activeDiagnosticSubRoute});
        }
    }, [activeDiagnosticSubRoute]);

    if (!validReadDiagnosticsAction || !diagnosticDetailAction || !isIActionDiagnosticDetail(diagnosticDetailAction)) return null;

    const renderHeader = () => (
        <div className={'bg-sky-700 text-white mb-4 font-bold p-4 w-full sticky top-0 flex items-center gap-4 z-10'}>
            <button className="cursor-pointer" onClick={() => {
                if (activeDiagnosticRoute === 'home' && !activeDiagnosticSubRoute) {
                    useExpertSystemStore.setState({
                        activeRoute: EXPERT_SYSTEM_ROUTES.HOME,
                        activeDiagnosticRoute: 'home',
                        activeDiagnosticSubRoute: ""
                    });
                } else if (activeDiagnosticRoute !== 'home' && !activeDiagnosticSubRoute) {
                    useExpertSystemStore.setState({ activeDiagnosticRoute: 'home', activeDiagnosticSubRoute: "" });
                } else if (activeDiagnosticSubRoute) {
                    useExpertSystemStore.setState({ activeDiagnosticSubRoute: "" });
                }
            }}>
                <ArrowLeftCircleIcon className={'size-10 text-white'} />
            </button>
            {/* Use cached activeRoute/activeSubRoute — no repeated .find() */}
            <h1>Diagnose {activeRoute?.displayName} {activeSubRoute?.displayName}</h1>
        </div>
    );

    const renderRoute = () => {
        if (activeDiagnosticRoute === 'home' && !activeDiagnosticSubRoute) {
            return <ExpertSystemDiagnosticRouteSelection items={validReadDiagnosticsAction.routes} />;
        }
        if (activeDiagnosticRoute !== 'home' && !activeDiagnosticSubRoute && activeRoute) {
            return <ExpertSystemDiagnosticRouteSelection isSubRouteList={true} items={activeRoute.subRoutes} />;
        }
        if (activeDiagnosticSubRoute) {
            return diagnosticMessages.map((diagnosticValue, i) => (
                <div key={i} className={'flex flex-row justify-start border-b-gray-400'}>
                    <h2 className={'font-bold mr-4 w-[200px]'}>{diagnosticValue.displayName}</h2>
                    {diagnosticValue.value ? <p>{diagnosticValue.value}</p> : null}
                </div>
            ));
        }
    };

    return (
        <div className={'w-full min-h-full flex flex-col justify-start'}>
            {renderHeader()}
            <div className={'p-4'}>
                {renderRoute()}
            </div>
        </div>
    );
}

export default ExpertSystemDiagnostic;
