import { ArrowLeftCircleIcon } from "@heroicons/react/24/solid";
import {useState} from "react";
import CE_CONTENT from "../../data/documentation.json";
import CE from "./CE/CE.tsx";
import {EXPERT_SYSTEM_ROUTES} from "../../types/types.ts";
import {useExpertSystemStore} from "../../store/store.ts";

function ExpertSystemManuals() {
    const vehicle = useExpertSystemStore((state) => state.activeVehicle);
    const [docId, setDocId] = useState<string>();
    const vehicleDocs = CE_CONTENT.find(item => item.RbSchluessel == vehicle.RbSchluessel);
    const docs = docId && vehicleDocs?.routeDocs.filter(doc => doc.id == docId);

    const renderHeader = () => (
        <div className={'bg-sky-700 text-white mb-4 font-bold p-4 w-full sticky top-0 flex items-center gap-4 z-10'}>
            <button className="cursor-pointer" onClick={() => {
                docs ? setDocId(docs[0].parent || undefined) : useExpertSystemStore.setState({activeRoute: EXPERT_SYSTEM_ROUTES.HOME});
            }}>
                <ArrowLeftCircleIcon className={'size-10 text-white'} />
            </button>
            <h1>{`${!docs?.length ? 'Handbücher' : docs[0].title || docs[0].data?.title}`}</h1>
        </div>
    );

    const renderNoData = () => !vehicleDocs && (
        <div className="mx-7 p-2">
            <p>Für dieses Fahrzeug sind keine Handbücher verfügbar.</p>
        </div>
    );

    const renderManuals = () => vehicleDocs && !docId && (
        vehicleDocs?.routeManuals.map((manual, index) => (
            <CE key={index} type={manual.type} data={{ ...manual.data, action: setDocId }} />
        ))
    );

    const renderDocs = () => vehicleDocs && docId && docs.map((item, index) => (
        //@ts-ignore
        <CE key={index} type={item.type} data={{ ...item.data, action: item.type == 'action' ? setDocId : undefined }} />
    ));

    return (
        <div className={'w-full min-h-full flex flex-col justify-start mb-5'}>
            {renderHeader()}
            {renderNoData()}
            {renderManuals()}
            {renderDocs()}
        </div>
    )
}

export default ExpertSystemManuals;
