import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useActionsStore } from "../../store/store.ts";
import { isIActionWear } from "../../types/typeguards.ts";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { EEquipmentCategory, IInteractiveObjectRaw } from "../../types/types.ts";
import DATA from "../../data/data.json";
import EquipmentSlot from "./EquipmentSlot.tsx";
import InventoryObjectSubMenu from "./InventorySubMenu.tsx";

export const EQUIPMENT_CATEGORIES: { key: EEquipmentCategory; label: string; thumbnail: string }[] = [
    { key: EEquipmentCategory.GLASSES, label: "Schutzbrille", thumbnail: "./images/thumbnails/thumbnails-assets/thumbnail-glasses.png" },
    { key: EEquipmentCategory.VISOR, label: "Visier", thumbnail: "./images/thumbnails/thumbnails-assets/thumbnail-visor.png" },
    { key: EEquipmentCategory.GLOVES, label: "Handschuhe", thumbnail: "./images/thumbnails/thumbnails-assets/thumbnail-gloves.png" },
];

const interactiveObjects = DATA.interactiveObjects as IInteractiveObjectRaw[];

function EquipmentInventory() {
    const actions = useActionsStore(state => state.actions);
    const [openSlot, setOpenSlot] = useState<EEquipmentCategory | null>(null);
    const [isOpen, setIsOpen] = useState(true);

    // Find which item is currently worn for each category
    const equippedItems = useMemo(() => EQUIPMENT_CATEGORIES.map((category) => {
        const equippedObject = interactiveObjects.find((obj) => {
            if (obj.equipmentCategory !== category.key) return false;
            return actions.some((a) => obj.actions.includes(a.name) && isIActionWear(a) && a.activated);
        });
        return { category, equippedObject: equippedObject || null };
    }), [actions]);

    // Get the actions for the currently open slot
    const openEquippedItem = useMemo(
        () => equippedItems.find(({ category }) => category.key === openSlot),
        [equippedItems, openSlot]
    );
    const openActions = useMemo(() => {
        const obj = openEquippedItem?.equippedObject;
        if (!obj) return [];
        return actions.filter((action) => obj.actions.includes(action.name));
    }, [actions, openEquippedItem]);
    return (
        <div className={"rounded-tr-3xl rounded-br-3xl bg-white shadow-xl flex flex-col justify-start overflow-visible w-full"}>
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className={'cursor-pointer font-bold bg-sky-700 px-5 py-3 text-white flex flex-row items-center rounded-tr-3xl'}
            >
                <ShieldCheckIcon className={'size-6 mr-3'} />
                <span className={'flex-1 text-left'}>Schutzausrüstung</span>
                {isOpen ? <ChevronUpIcon className={'size-5'} /> : <ChevronDownIcon className={'size-5'} />}
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        key="equipment-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={"overflow-hidden"}
                    >
                        <div className={"flex flex-col px-4 pt-7 pb-4"}>
                            <div className={"flex flex-row gap-2 justify-center items-end"}>
                                {equippedItems.map(({ category, equippedObject }) => {
                                    const isActive = openSlot === category.key && !!equippedObject;
                                    return (
                                        <div
                                            key={category.key}
                                            className={`flex-1 min-w-0 flex justify-center transition-colors duration-200 ${isActive ? 'bg-lime-100 rounded-t-xl pt-2 pb-2' : ''}`}
                                        >
                                            <EquipmentSlot
                                                category={category}
                                                equippedObject={equippedObject}
                                                isOpen={openSlot === category.key}
                                                onToggle={() => setOpenSlot(openSlot === category.key ? null : category.key)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                            <AnimatePresence>
                                {openSlot && openEquippedItem?.equippedObject && openActions.length > 0 &&
                                    <div className={'bg-lime-100 rounded-b-xl px-3 py-2'}>
                                        <InventoryObjectSubMenu actions={openActions} hideBorder={true} />
                                    </div>
                                }
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default EquipmentInventory;
