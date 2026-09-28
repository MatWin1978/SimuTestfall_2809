import {WrenchScrewdriverIcon} from "@heroicons/react/24/solid";
import {IoShirt} from "react-icons/io5";
import {AnimatePresence} from "motion/react";
import InventoryObjectSubMenu from "./InventorySubMenu.tsx";


function InventoryObjectPlaceholder() {
    return(
        <>
            <div>
                <div className={'cursor-pointer relative'}                >
                    <div className={'flex flex-col rounded-xl shadow-md overflow-hidden'}>
                        <div className={'flex flex-row justify-start'}>
                            <div className={'bg-gray-200 w-[60px] h-auto p-2 shrink-0 flex items-center justify-center'}>
                                <WrenchScrewdriverIcon className={'size-7 text-gray-300'}/>
                            </div>
                            <div className={'flex flex-row items-center bg-white text-gray-300 px-2 py-2 min-h-[50px]'}>
                                <span>Werkzeugablage</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default InventoryObjectPlaceholder;
