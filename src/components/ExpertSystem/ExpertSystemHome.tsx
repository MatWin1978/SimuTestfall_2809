import { useEffect, useState } from "react";
import {useActionsStore, useExpertSystemStore} from "../../store/store.ts";
import {EXPERT_SYSTEM_ROUTES} from "../../types/types.ts";

function ExpertSystemHome() {
    const actions = useActionsStore((state) => state.actions);
    const laptopIsConnected = actions.find((action) => action.name === "laptopPlace")?.activated;
    const vehicle = useExpertSystemStore((state) => state.activeVehicle);
    const [showElectricWarning, setShowElectricWarning] = useState(false)
    const buttonStyles = "block p-6 border rounded-lg shadow-sm";
    const buttonActiveStyles = "bg-sky-700 hover:bg-sky-800 border-sky-800 cursor-pointer";
    const buttonDisabledStyles = "bg-gray-300 border-grey-400 cursor-not-allowed";

    useEffect(() => {
        vehicle?.isElectric && setShowElectricWarning(true);
    }, [vehicle]);

    return(
        <div className={'w-full min-h-full flex flex-col items-start justify-items-start p-8'}>
            <h1 className={'text-4xl font-semibold tracking-tight text-balance text-sky-700 sm:text-5xl mb-10'}>
                QueSI[tronIQ] Evolution
            </h1>

            <div className="w-full">
                <label htmlFor="helper-text" className="block mb-2 text-sm font-medium text-gray-900">Fahrzeug:</label>
                <div className="relative">
                    <input
                        className="shadow appearance-none w-full py-3 px-3 rounded-2xl bg-gray-200 inset-shadow-sm leading-tight focus:border-sky-700 focus:shadow-outline"
                        placeholder="Kein Fahrzeug ausgewählt" disabled
                        defaultValue={vehicle ? `${vehicle.RbSchluessel} | ${vehicle.HSN}/${vehicle.TSN} : ${vehicle.Marke} ${vehicle.Fahrzeugtyp} (${vehicle.Baujahr})` : undefined}
                    />
                    <button
                        className={`${buttonStyles} ${buttonActiveStyles} text-white absolute end-2.5 bottom-0.5 font-medium rounded-lg text-sm px-4 py-2`}
                        onClick={() => {
                            useExpertSystemStore.setState({activeRoute: EXPERT_SYSTEM_ROUTES.VEHICLE});
                        }}
                    >
                        Auswählen
                    </button>
                </div>
            </div>

            {showElectricWarning ? (
                <div className="w-full border-3 rounded-lg border-orange-300 p-5 flex flex-col gap-5 my-5">
                    <p className="font-bold">Sicherheitsbezogene Information: Qualifikation der Nutzer</p>
                    <p>Für alle anfallenden Tätigkeiten an diesem Fahrzeug ist eine spezielle Qualifizierung für Arbeiten an Fahrzeugen mit Hochvoltsystemen erforderlich.</p>
                    <p>Länderspezifische Regelungen und Schutzmaßnahmen zum Umgang von Fahrzeugen mit Hochvoltsystemen müssen beachtet und eingehalten werden.</p>
                    <div className="inline-flex flex-row gap-10 justify-center">
                        <button
                            className={'w-1/3 pointer-events-auto shadow-xl px-3 py-2 bg-sky-700 rounded-lg text-white relative cursor-pointer'}
                            onClick={() => setShowElectricWarning(false)}>
                            <span>OK</span>
                        </button>
                        <button
                            className={'w-1/3 pointer-events-auto shadow-xl px-3 py-2 bg-sky-700 rounded-lg text-white relative cursor-pointer'}
                            onClick={() => setShowElectricWarning(false)}>
                            <span>Abbrechen</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid w-full grid-cols-3 gap-5 mt-10">
                    <button
                        className={`${buttonStyles} ${(laptopIsConnected && vehicle) ? buttonActiveStyles : buttonDisabledStyles}`}
                        disabled={!laptopIsConnected || !vehicle}
                        onClick={() => {
                            useExpertSystemStore.setState({activeRoute: EXPERT_SYSTEM_ROUTES.DIAGNOSTIC});
                        }}
                    >
                        <h2 className="mb-2 text-xl font-bold tracking-tight text-white">Diagnose</h2>
                    </button>
                    <button
                        className={`${buttonStyles} ${vehicle ? buttonActiveStyles : buttonDisabledStyles}`}
                        disabled={!vehicle}
                        onClick={() => {
                            useExpertSystemStore.setState({activeRoute: EXPERT_SYSTEM_ROUTES.MANUALS});
                        }}
                    >
                        <h2 className="mb-2 text-xl font-bold tracking-tight text-white">Handbücher</h2>
                    </button>
                </div>
            )}
        </div>
    )
}

export default ExpertSystemHome;
