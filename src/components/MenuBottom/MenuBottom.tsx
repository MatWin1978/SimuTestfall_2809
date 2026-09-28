import {ArrowLeftIcon, ArrowRightIcon, ArrowsPointingOutIcon} from "@heroicons/react/24/outline";
import {PiMouseLeftClickFill, PiMouseMiddleClickFill, PiMouseRightClickFill} from "react-icons/pi";
import Toggle from "../Toggle/Toggle.tsx";
import {useGlobalStore} from "../../store/store.ts";
import {useEffect} from "react";
import QuickNav from "../QuickNav/QuickNav.tsx";

function MenuBottom() {
    const fullscreenIsActive = useGlobalStore(state => state.fullscreenIsActive);
    const isLoading = useGlobalStore(state => state.isLoading);

    useEffect(() => {
        function onFullscreenChange() {
            useGlobalStore.setState({ fullscreenIsActive: document.fullscreenElement !== null });
        }
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    return(
        <div className={'fixed w-full bottom-0 left-0 pointer-events-none flex flex-row justify-between ml-auto mr-auto'}>
            <div className={'p-5 pb-4 pr-8 bottom-0 left-0 flex flex-col items-start bg-white rounded-tr-4xl pointer-events-auto text-xs w-[250px]'}>
                <div>© 2026 PH Ludwigsburg</div>
                <div className={'text-gray-500'}>v.{__APP_VERSION__}</div>
            </div>
            <div className={`absolute left-1/2 -translate-x-1/2 bottom-4 p-2 flex flex-row items-center bg-white/40 rounded-full text-black/50 text-xs font-bold ${isLoading ? "opacity-0" : "opacity-100"}`}>
                <div className={'flex flex-row items-center py-1 px-4 py-2 mr-2'}>
                    <div className={'flex flex-row items-center mr-2'}>
                        <ArrowLeftIcon className={'size-3 -mr-1'}/>
                        <PiMouseLeftClickFill size={'22px'}/>
                        <ArrowRightIcon className={'size-3 -ml-1'}/>
                    </div>
                    <span>Kamera drehen</span>
                </div>
                <div className={'flex flex-row items-center py-1 px-4 py-2 mr-2'}>
                    <div className={'flex flex-row items-center mr-2'}>
                        <ArrowLeftIcon className={'size-3 -mr-1'}/>
                        <PiMouseRightClickFill size={'22px'}/>
                        <ArrowRightIcon className={'size-3 -ml-1'}/>
                    </div>
                    <span>Kamera bewegen</span>
                </div>
                <div className={'flex flex-row items-center py-1 px-4 py-2'}>
                    <div className={'flex flex-row items-center mr-2'}>
                        <PiMouseMiddleClickFill size={'22px'}/>
                    </div>
                    <span>Kamera Zoom</span>
                </div>
            </div>
            <div className={'text-sky-700 p-5 pb-4 pl-8 flex flex-row items-center bg-white rounded-tl-4xl'}>
                <div
                    onClick={() => {
                        if (fullscreenIsActive) {
                            document.exitFullscreen();
                        }
                        else {
                            document.documentElement.requestFullscreen();
                        }
                    }}
                    className={'flex flex-row items-center pointer-events-auto'}
                >
                    <ArrowsPointingOutIcon className={'size-6 mr-2'}/>
                    <span>{fullscreenIsActive ? "Vollbildmodus beenden" : "Vollbildmodus"}</span>
                </div>
            </div>
        </div>
    )
}

export default MenuBottom;
