import { WrenchIcon } from "@heroicons/react/24/solid";
import {EActionType, IInteractiveObjectRaw, TAction} from "../../types/types.ts";
import {memo, useState} from "react";
import {MOTION_VARIANTS} from "../../utilities/variants.ts";
import {AnimatePresence, motion} from "motion/react";
import {isIActionInspect, isIActionWear} from "../../types/typeguards.ts";
import {handleActionTrigger} from "../../utilities/handleActionTrigger.ts";
import {IoShirt} from "react-icons/io5";
import {useActionsStore} from "../../store/store.ts";
import {checkAllConditions} from "../../utilities/utilities.ts";
import {ChevronRightIcon} from "@heroicons/react/24/outline";

interface IInventoryObjectSubMenuProps {
    actions: TAction[]
    hideBorder?: boolean
}

const InventoryObjectSubMenu = memo(function InventoryObjectSubMenu(props: IInventoryObjectSubMenuProps) {
    const actions = useActionsStore((state) => state.actions);

    const actionsJSX = props.actions.map((action, actionIndex) => {
        if(isIActionInspect(action)) {return null}
        
        if(checkAllConditions(action, actions)) {
            return(
                <motion.div
                    variants={MOTION_VARIANTS.linklistItemAppearDown}
                    key={actionIndex}
                    className={'text-nowrap cursor-pointer px-2 mt-2 first:mt-3 whitespace-break-spaces'}
                    onClick={() => {
                        handleActionTrigger(action);
                    }}
                >
                    {action.toggle && action.activated && <div className={'flex flex-row items-center'}><ChevronRightIcon className={'size-4'}/> {action.displayNameToggle}</div>}
                    {action.toggle && !action.activated && <div className={'flex flex-row items-center'}><ChevronRightIcon className={'size-4'}/>{action.displayName}</div>}
                    {!action.toggle && <div className={'flex flex-row items-center'}><ChevronRightIcon className={'size-4'}/>{action.displayName}</div>}
                </motion.div>
            )
        }
    });

    return(
        <motion.div
            initial={'initial'}
            animate={'animate'}
            exit={'exit'}
            variants={MOTION_VARIANTS.toHeightAutoContainer}
            className={`text-sm text-sky-700 rounded-bl-lg rounded-br-lg z-0 ${props.hideBorder ? '' : 'bg-black/2 shadow-md border-black/5 border-1 -translate-y-[8px]'}`}>
            {actionsJSX.length > 0 && (
                <div className={'py-2'}>
                    {actionsJSX}
                </div>
            )}
        </motion.div>
    )
});

export default InventoryObjectSubMenu;
