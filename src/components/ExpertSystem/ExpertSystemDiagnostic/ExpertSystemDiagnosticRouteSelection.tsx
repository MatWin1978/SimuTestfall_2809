import {useExpertSystemStore} from "../../../store/store.ts";

interface IExpertSystemDiagnosticRouteSelectionProps {
    isSubRouteList?: boolean;
    items: {
        displayName: string;
        name: string;
        disabled?: boolean;
    }[]
}

export function ExpertSystemDiagnosticRouteSelection(props: IExpertSystemDiagnosticRouteSelectionProps) {
    return(
        <div>
            {props.items.map(item => {
                return(
                    <div key={item.name} className={`mx-2 p-2 ${item.disabled ? "pointer-events-none" : "cursor-pointer"}`} onClick={() => {
                        if(props.isSubRouteList) {
                            useExpertSystemStore.setState({
                                activeDiagnosticSubRoute: item.name,
                            })
                        }
                        else {
                            useExpertSystemStore.setState({
                                activeDiagnosticRoute: item.name,
                            })
                        }
                    }}>
                        <div className={`px-4 py-2 bg-white ${item.disabled ? "border-gray-400 border-1 text-gray-400" : "border-sky-700 border-1 shadow-md"}`} dangerouslySetInnerHTML={{__html: item.displayName}} />
                    </div>
                )
            })}
        </div>
    )
}
