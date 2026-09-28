import { WrenchIcon } from "@heroicons/react/24/solid";
import { EActionType, IInteractiveObjectRaw } from "../../types/types.ts";
import { memo, useState } from "react";
import { MOTION_VARIANTS } from "../../utilities/variants.ts";
import { AnimatePresence, motion } from "motion/react";
import { useActionsStore } from "../../store/store.ts";
import { useShallow } from "zustand/react/shallow";
import InventoryObjectSubMenu from "./InventorySubMenu.tsx";
import { ArrowDownRightIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

function returnThumbnail(iconName: string) {
    const classNames = 'w-[80px] h-[80px]';
    switch (iconName) {
        case "hvOff": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-hv-off.png'} className={classNames} />
        case "hvOn": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-hv-on.png'} className={classNames} />
        case "glasses": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-glasses.png'} className={classNames} />
        case "visor": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-visor.png'} className={classNames} />
        case "charger": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-charger.png'} className={classNames} />
        case "duspol": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-duspol.png'} className={classNames} />
        case "carKey": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-carkey.png'} className={classNames} />
        case "lockHV": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-lockHV.png'} className={classNames}/>
        case "lockNV": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-lockNV.png'} className={classNames} />
        case "keyLockHV": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-key-lockHV.png'} className={classNames} />
        case "keyLockNV": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-key-lockNV.png'} className={classNames} />
        case "hvOffCone": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-hv-off-cone.png'} className={classNames} />
        case "hvOnCone": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-hv-on-cone.png'} className={classNames} />
        case "gloves": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-gloves.png'} className={classNames} />
        case "inverterCap": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-inverter-cap.png'} className={classNames} />
        case "minusCap": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-minus-cap.png'} className={classNames} />
        case "plusCap": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-plus-cap.png'} className={classNames} />
        case "wrench": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-wrench.png'} className={classNames} />
        case "laptop": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-laptop.png'} className={classNames} />
        case "smartphone": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-phone.png'} className={classNames} />
        case "disconnect": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-disconnect.png'} className={classNames} />
        case "postsRed": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-posts-red.png'} className={classNames} />
        case "postsYellow": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-posts-yellow.png'} className={classNames} />
        case "multimeter": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-multimeter.png'} className={classNames} />
        case "hvCap": return <img src={'./images/thumbnails/thumbnails-assets/thumbnail-hv-cap.png'} className={classNames} />
        default: {
            return <WrenchIcon />
        }
    }
}

interface IInventoryObjectProps {
    interactiveObject?: IInteractiveObjectRaw
}

const InventoryObject = memo(function InventoryObject({ interactiveObject }: IInventoryObjectProps) {
    const actionsOnInteractiveObject = useActionsStore(
        useShallow((state) => state.actions.filter((action) => interactiveObject!.actions.includes(action.name)))
    );
    if (!interactiveObject) {
        console.warn("InventoryObject: interactiveObject is missing!");
        return null;
    }
    const [subMenuIsOpen, setSubMenuIsOpen] = useState(false);
    const placeActions = actionsOnInteractiveObject.filter((action) => action.type === EActionType.PLACE || action.type === EActionType.AUTOPLACE);
    const placeActionActivated = placeActions.some((action) => action.activated);

    return (
        <motion.div variants={MOTION_VARIANTS.scaleUp} initial={'initial'} animate={'animate'} exit={'exit'}>
            <div
                className={'cursor-pointer relative hover:scale-105 transition-transform duration-200 z-1'}
                onClick={() => setSubMenuIsOpen(state => !state)}
            >
                <div className={'flex flex-col rounded-xl shadow-lg overflow-hidden'}>
                    <div className={'flex flex-row justify-start'}>
                        <div className={'bg-sky-700 w-[60px] h-auto p-2 shrink-0'}></div>
                        <div className={'flex flex-row justify-between items-center bg-white text-sky-700 px-2 py-2 min-h-[46px] w-full'}>
                            <span>{interactiveObject.displayName}</span>
                            <ChevronRightIcon className={`size-4 transition-transform duration-200 ${subMenuIsOpen ? '-rotate-90' : "rotate-90"}`} />
                        </div>
                    </div>
                </div>
                {interactiveObject.icon &&
                    <div className={'absolute -left-[10px] top-0 bottom-0 flex items-center'}>
                        {returnThumbnail(interactiveObject.icon)}
                    </div>
                }
                {placeActionActivated &&
                    <div className={'absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full p-1 bg-green-600'}>
                        <ArrowDownRightIcon className={'text-white size-4'} />
                    </div>
                }
            </div>
            <AnimatePresence>
                {subMenuIsOpen &&
                    <InventoryObjectSubMenu actions={actionsOnInteractiveObject} />
                }
            </AnimatePresence>
        </motion.div>
    )
});

export default InventoryObject;
