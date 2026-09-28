import {ArrowLeftCircleIcon} from "@heroicons/react/24/solid";
import {EXPERT_SYSTEM_ROUTES, IVehicle} from "../../types/types";
import vehicles from "../../data/vehicles.json";
import {useEffect, useState} from "react";
import {useExpertSystemStore} from "../../store/store.ts";

function ExpertSystemVehicles() {
    const [vehicleList, setVehicleList] = useState<IVehicle[]>([]);
    const [vehicleInput, setVehicleInput] = useState('');
    const buttonStyles = "block p-6 border rounded-lg shadow-sm";
    const buttonActiveStyles = "bg-sky-700 hover:bg-sky-800 border-sky-800 cursor-pointer";

    const handleSelection = (item: IVehicle) => {
        useExpertSystemStore.setState({
            activeVehicle: item,
            activeRoute: EXPERT_SYSTEM_ROUTES.HOME
        });
    }

    const renderHeader = () => (
        <div className={'bg-sky-700 text-white mb-4 font-bold p-4 w-full sticky top-0 flex items-center gap-4'}>
            <button className="cursor-pointer" onClick={() => {
                useExpertSystemStore.setState({activeRoute: EXPERT_SYSTEM_ROUTES.HOME});
            }}>
                <ArrowLeftCircleIcon className={'size-10 text-white'} />
            </button>
            <h1>Fahrzeugauswahl</h1>
        </div>
    );

    const renderInput = () => (
        <div className="block mx-7 p-2">
            <input
                className="shadow appearance-none w-full py-3 px-3 rounded-2xl bg-gray-200 inset-shadow-sm leading-tight focus:border-sky-700 focus:shadow-outline"
                placeholder="Suche..." autoFocus
                value={vehicleInput}
                onChange={e => setVehicleInput(e.target.value)}
            />
            <p className="mt-2 text-sm text-gray-400 font-medium">Mögliche Suchbegriffe: Fahrzeugname, VIN, KBA</p>
        </div>
    )

    const renderNoResults = () => !vehicleList.length && (
        <tr className="bg-white border-b border-gray-200">
            <td className="px-6 py-4" colSpan={7}>Keine Treffer</td>
        </tr>
    );

    const renderResults = () => vehicleList.map((item, index) => (
        <tr key={index} className="bg-white border-b border-gray-200">
            <td className="px-6 py-4">{item.RbSchluessel}</td>
            <td className="px-6 py-4">{item.Marke}</td>
            <td className="px-6 py-4">{item.Modell}</td>
            <td className="px-6 py-4">{item.Fahrzeugtyp}</td>
            <td className="px-6 py-4">{item.HSN}/{item.TSN}</td>
            <td className="px-6 py-4">{item.Baujahr}</td>
            <td className="px-6 py-3">
                <button
                    className={`${buttonStyles} ${buttonActiveStyles} text-white font-medium rounded-lg text-sm px-4 py-2 block`}
                    onClick={() => handleSelection(item)}
                >
                    Auswählen
                </button>
            </td>
        </tr>
    ));

    useEffect(() => {
        const val = vehicleInput.toLocaleLowerCase();
        setVehicleList(!vehicleInput ? vehicles : (vehicles.filter(item => item.RbSchluessel.toLocaleLowerCase().includes(val) || item.Fahrzeugtyp.toLocaleLowerCase().includes(val) || item.Modell.toLocaleLowerCase().includes(val) || item.Marke.toLocaleLowerCase().includes(val) || item.VIN.toLocaleLowerCase().includes(val) || item.HSN.toLocaleLowerCase().includes(val) || item.TSN.toLocaleLowerCase().includes(val) ) || []).map(value => ({ value, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map(({ value }) => value));
    }, [vehicleInput]);

    return (
        <div className={'w-full min-h-full flex flex-col justify-start'}>
            {renderHeader()}
            {renderInput()}

            <div className="block relative overflow-x-auto mt-5 mx-7 p-2">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 w-[130px]">RB-Schlüssel</th>
                            <th scope="col" className="px-6 py-3 w-[110px]">Marke</th>
                            <th scope="col" className="px-6 py-3 w-[120px]">Modell</th>
                            <th scope="col" className="px-6 py-3 w-[180px]">Fahrzeugtyp</th>
                            <th scope="col" className="px-6 py-3 w-[120px]">HSN / TSN</th>
                            <th scope="col" className="px-6 py-3 w-[110px]">Baujahr</th>
                            <th scope="col" className="px-6 py-3 w-[140px]"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {renderNoResults()}
                        {renderResults()}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default ExpertSystemVehicles
