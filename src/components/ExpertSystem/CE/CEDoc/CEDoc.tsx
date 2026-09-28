import { useEffect, useState } from "react";
import { ICEUrlProps } from "../CE";
import { useExpertSystemStore } from "../../../../store/store";
import { IVehicle } from "../../../../types/types";

function CEDoc(props: ICEUrlProps) {
    const { url } = props;
    const [content, setContent] = useState('');
    const activeVehicle = useExpertSystemStore((state) => state.activeVehicle) as IVehicle;

    useEffect(() => {
        const loader = async () => {
            try {
                const response = await fetch(`${url}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const text = await response.text();
                setContent(text);
            }
            catch (error) {
                console.error("Error fetching file:", error);
            }
        };
        url && loader();
      }, [url]);

    const renderHeader = () => (
        <div className="mb-4">
            <div className="text-3xl text-sky-800 mb-4">{`QueSI[tronIQ]`}</div>
            <div
                className="text-sky-700 font-bold text-lg border-t-4 border-b-4 border-sky-700 py-4">
                {`${activeVehicle?.Marke} / ${activeVehicle?.Modell} / ${activeVehicle?.Baujahr} / ${activeVehicle?.RbSchluessel} `}
            </div>
        </div>
    );

    return !content ? null : (
        <div className="m-4 pb-4 border-b-4 border-sky-700">
            <div>{renderHeader()}</div>
            <div dangerouslySetInnerHTML={{ __html: content }}/>
        </div>
    );
}

export default CEDoc;
