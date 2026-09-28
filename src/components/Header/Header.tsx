import { ClipboardDocumentCheckIcon, CogIcon, ListBulletIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useActionsStore, useGlobalStore, usePerformanceSettings } from "../../store/store.ts";
import { handleActionTrigger } from "../../utilities/handleActionTrigger.ts";
import { ACTION_NAMES } from "../../utilities/constants.ts";
import { TAction } from "../../types/types.ts";
import { forwardRef } from "react";

// Header direkt als forwardRef definieren, nicht innerhalb einer anderen Funktion
const Header = forwardRef<HTMLElement, any>((props, ref) => {
    const logIsShown = useGlobalStore(state => state.showLog);

    return (
        <header
            ref={ref}
            className={"w-full fixed left-0 top-0 flex flex-row justify-between items-start pointer-events-none"}
        >
            <div className={'shadow-xl p-5 pr-8 flex-column justify-start items-center rounded-br-4xl bg-sky-700 text-white'}>
                <div className={'text-xs font-light text-white/50'}>PH Ludwigsburg</div>
                <div className={'font-bold text-xl'}>Kfz-Simulation</div>
            </div>

            <div className={'shadow-xl p-4 pl-8 flex-row justify-center items-center rounded-bl-4xl bg-white pointer-events-auto'}>
                <ul className={'flex flex-row items-center gap-7 text-sky-700'}>
                    <li>
                        <button
                            className={'flex flex-row items-center cursor-pointer hover:scale-105 transition-transform duration-200'}
                            onClick={() => {
                                const action = useActionsStore.getState().actions.find((action) => action.name === ACTION_NAMES.MISSION_INSPECT) as TAction;
                                if (action) handleActionTrigger(action);
                            }}
                        >
                            <ClipboardDocumentCheckIcon className={'size-6 mr-2'} />
                            <span>Arbeitsauftrag</span>
                        </button>
                    </li>
                    <li>
                        <button
                            className={'flex flex-row items-center cursor-pointer hover:scale-105 transition-transform duration-200'}
                            onClick={() => { useGlobalStore.setState({ showLog: !logIsShown }) }}
                        >
                            <ListBulletIcon className={'size-6 mr-2'} />
                            <span>Aktivitätslog</span>
                        </button>
                    </li>
                    <li>
                        <button
                            className={'flex flex-row items-center cursor-pointer shadow-xl pl-3 pr-4 py-2 flex flex-row bg-yellow-500 rounded-full text-black relative'}
                            onClick={() => {
                                useGlobalStore.setState({ showResult: true });
                            }}
                        >
                            <CheckIcon className={'size-6 mr-2'} />
                            <span>Arbeit für beendet erklären</span>
                        </button>
                    </li>
                    <li>
                        <button
                            className={'flex flex-row items-center cursor-pointer py-2'}
                            onClick={() => {
                                usePerformanceSettings.setState({ showPerformanceSettings: true });
                            }}
                        >
                            <CogIcon className={'size-8'} />
                        </button>
                    </li>
                </ul>
            </div>
        </header>
    );
});
Header.displayName = "Header";

export default Header;