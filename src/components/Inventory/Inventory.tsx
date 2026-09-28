import { useState, useMemo } from 'react';
import { useActionsStore } from "../../store/store.ts";
import InventoryObject from "./InventoryObject.tsx";
import InventoryObjectPlaceholder from "./InventoryObjectPlaceholder.tsx";
import { isIActionPlace, isIActionAutoPlace, isIActionWear } from "../../types/typeguards.ts";
import { WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { AnimatePresence, motion } from 'motion/react';
import DATA from "../../data/data.json";
import { IInteractiveObjectRaw } from "../../types/types.ts";

const interactiveObjects = DATA.interactiveObjects as IInteractiveObjectRaw[];

function Inventory() {
    const [isOpen, setIsOpen] = useState(true);
    const actions = useActionsStore(state => state.actions);
    const objectsInInventory = useMemo(() => interactiveObjects.filter(
        (interactiveObject) => {
            const actionsOnInteractiveObject = actions.filter((action) => interactiveObject.actions.includes(action.name));
            const placeOrAutoPlaceActions = actionsOnInteractiveObject.filter((action) => isIActionPlace(action) || isIActionAutoPlace(action));
            if (placeOrAutoPlaceActions.length === 0) return false;
            if (placeOrAutoPlaceActions.some((action) => action.activated)) return false;

            // Hide items that are currently worn (shown in equipment inventory instead)
            if (interactiveObject.equipmentCategory) {
                const wearAction = actionsOnInteractiveObject.find((action) => isIActionWear(action));
                if (wearAction && wearAction.activated) return false;
            }

            return true;
        }), [actions]);

    const objectsInInventoryJSX = objectsInInventory.map((object, index) => {
        return (
            <InventoryObject key={`inventory-${object.name}`} interactiveObject={object} />
        )
    });

    const objectsInInventoryAmount = objectsInInventoryJSX.length;

    for (let i = 0; i < (6 - objectsInInventoryAmount); i++) {
        objectsInInventoryJSX.push(
            <InventoryObjectPlaceholder key={`inventoryPlaceholder-${i}`} />
        )
    }

    return (
        <div className={"max-h-[60vh] rounded-tr-3xl rounded-br-3xl bg-white shadow-xl flex flex-col justify-start overflow-hidden w-full min-h-0"}>
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className={"cursor-pointer font-bold bg-sky-700 px-5 py-3 text-white flex flex-row items-center rounded-tr-3xl shrink-0"}
            >
                <WrenchScrewdriverIcon className={"size-6 mr-3"} />
                <span className={"flex-1"}>Werkstattwagen</span>
                {isOpen ? <ChevronUpIcon className={"size-5"} /> : <ChevronDownIcon className={"size-5"} />}
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        key="inventory-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={"overflow-hidden"}
                    >
                        <div className={"inventory-scrollbar flex flex-col gap-3 px-5 py-6 max-h-[50vh] overflow-y-auto"}>
                            {objectsInInventoryJSX}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default Inventory;
