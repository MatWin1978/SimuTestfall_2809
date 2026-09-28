import ExpertSystemHome from "./ExpertSystemHome.tsx";
import ExpertSystemManuals from "./ExpertSystemManuals.tsx";
import ExpertSystemDiagnostic from "./ExpertSystemDiagnostic/ExpertSystemDiagnostic.tsx";
import ExpertSystemVehicles from "./ExpertSystemVehicles";
import {EXPERT_SYSTEM_ROUTES} from "../../types/types";
import {useExpertSystemStore} from "../../store/store.ts";


function ExpertSystem() {
    const activeRoute = useExpertSystemStore((state) => state.activeRoute);

    function renderRoute(route: EXPERT_SYSTEM_ROUTES) {
        return (
            route == EXPERT_SYSTEM_ROUTES.VEHICLE && <ExpertSystemVehicles /> ||
            route == EXPERT_SYSTEM_ROUTES.MANUALS && <ExpertSystemManuals /> ||
            route == EXPERT_SYSTEM_ROUTES.DIAGNOSTIC && <ExpertSystemDiagnostic /> ||
            <ExpertSystemHome />
        );
    }

    return(
        <div className={'w-full min-h-full bg-white'}>
            {renderRoute(activeRoute)}
        </div>
    )
}

export default ExpertSystem;
