import {useActionsStore, useGlobalStore, useThreeDReference} from "../../store/store.ts";
import {AnimatePresence, motion} from "motion/react";
import {ChevronRightIcon, XMarkIcon} from "@heroicons/react/24/outline";
import {MOTION_VARIANTS} from "../../utilities/variants.ts";
import {isIActionWear} from "../../types/typeguards.ts";
import {handleActionTrigger} from "../../utilities/handleActionTrigger.ts";
import returnIcon from "../../utilities/returnIcon.tsx";
import { checkAllConditions } from "../../utilities/utilities.ts";
import { useLayoutEffect, useRef, useState } from "react";
import DATA from "../../data/data.json";

const interactiveObjects = DATA.interactiveObjects;

function InteractiveObjectMenu() {
    const coordinates = useGlobalStore(state => state.lastPointerUpCoordinates);
    const actions = useActionsStore(state => state.actions);
    const activeInteractiveObjectName = useGlobalStore(state => state.activeInteractiveObjectName);
    const activeInteractiveObject = interactiveObjects.find(interactiveObject => interactiveObject.name === activeInteractiveObjectName);
    const actionsOnInteractiveObject = actions.filter((action) => activeInteractiveObject?.actions.includes(action.name));
    const menuRef = useRef<HTMLDivElement>(null);
    const [offsetY, setOffsetY] = useState(0);
    const [offsetX, setOffsetX] = useState(0);

    useLayoutEffect(() => {
        if (activeInteractiveObjectName && menuRef.current) {
            const menuHeight = menuRef.current.offsetHeight;
            const spaceBottom = window.innerHeight - coordinates.y;
            const menuWidth = menuRef.current.offsetWidth;
            const spaceRight = window.innerWidth - coordinates.x;

            // Wenn der Platz unten kleiner ist als das Menü hoch ist:
            if (spaceBottom < menuHeight) {
                setOffsetY(-menuHeight); // Verschiebe es nach oben
            } else {
                setOffsetY(0); // Bleib bei der Standardposition
            }
            if (spaceRight < menuWidth) {
                setOffsetX(-menuWidth);
            } else {
                setOffsetX(0);
            }
        }
    }, [activeInteractiveObjectName, coordinates.x, coordinates.y]);

    return(
        <div className={'fixed z-10 pointer-events-none'} style={{
            left: (coordinates.x + offsetX) + "px",
            top: (coordinates.y + offsetY) + "px",
        }}>
            <AnimatePresence>
                {activeInteractiveObject &&
                    <motion.div
                        ref={menuRef}
                        variants={MOTION_VARIANTS.scaleUpStaggered}
                        initial={'initial'}
                        animate={'animate'}
                        exit={'exit'}
                        className={'flex flex-col bg-white rounded-xl relative shadow-xl overflow-hidden'}>
                        <div className={'w-full flex flex-row items-center justify-between mr-6 text-white bg-sky-700 px-3 py-2'}>
                            <motion.div variants={MOTION_VARIANTS.appearUp} className={'flex flex-row items-center font-bold'}>
                                {activeInteractiveObject.icon ? returnIcon(activeInteractiveObject.icon, {className: 'size-6 mr-2'}) : null}
                                {activeInteractiveObject.displayName}
                            </motion.div>
                            <motion.button
                                variants={MOTION_VARIANTS.appearUp}
                                className={'bg-yellow-500 rounded-full shadow-2xl p-[18px] pointer-events-auto cursor-pointer relative text-black'}
                                onClick={() => {
                                    useGlobalStore.setState({activeInteractiveObjectName: '', activeInspectActionName: ''});
                                }}
                            >
                                <XMarkIcon className={'size-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'}/>
                            </motion.button>
                        </div>
                        <div className={'flex flex-col justify-start items-start'}>
                            <motion.button
                                key={"navigate"}
                                variants={MOTION_VARIANTS.appearUp}
                                onClick={() => {
                                    useThreeDReference.getState().threeD.focusInteractiveObject(activeInteractiveObject.name)
                                    useGlobalStore.setState({activeInteractiveObjectName: ""})
                                }}
                                className={` text-left text-sky-700 cursor-pointer pointer-events-auto px-4 py-2 border-sky-700/20 not-last:border-b-1 w-full`}
                            >
                                <div className={'flex flex-row items-center'}><ChevronRightIcon className={'size-4'}/>Fokussieren</div>
                            </motion.button>
                            {
                                actionsOnInteractiveObject && actionsOnInteractiveObject.map((action, actionIndex) => {
                                    if(isIActionWear(action)) return null;
                                    if(checkAllConditions(action, actions)) {
                                        return(
                                            <motion.button
                                                key={"action" + actionIndex}
                                                variants={MOTION_VARIANTS.appearUp}
                                                onClick={() => {
                                                    handleActionTrigger(action);
                                                    useGlobalStore.setState({activeInteractiveObjectName: ""})
                                                }}
                                                className={` text-left text-sky-700 cursor-pointer pointer-events-auto px-4 py-2 border-sky-700/20 not-last:border-b-1 w-full`}
                                            >
                                                {action.toggle && action.activated && <div className={'flex flex-row items-center'}><ChevronRightIcon className={'size-4'}/> {action.displayNameToggle}</div>}
                                                {action.toggle && !action.activated && <div className={'flex flex-row items-center'}><ChevronRightIcon className={'size-4'}/>{action.displayName}</div>}
                                                {!action.toggle && <div className={'flex flex-row items-center'}><ChevronRightIcon className={'size-4'}/>{action.displayName}</div>}
                                            </motion.button>
                                        )
                                    }
                                })
                            }
                        </div>
                    </motion.div>
                }
            </AnimatePresence>
        </div>
    )

}

export default InteractiveObjectMenu;
