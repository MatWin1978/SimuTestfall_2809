import ThreeDCanvas from "./components/ThreeDCanvas/ThreeDCanvas";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useActionsStore, useGlobalStore, usePerformanceSettings } from "./store/store.ts";
import DATA from "./data/data.json";
import InteractiveObjectMenu from "./components/InteractiveObjectMenu/InteractiveObjectMenu.tsx";
import PointerInfo from "./components/PointerInfo/PointerInfo.tsx";
import Lightbox from "./components/Lightbox/Lightbox.tsx";
import Spinner from "./components/Spinner/Spinner.tsx";
import MenuBottom from "./components/MenuBottom/MenuBottom.tsx";
import Header from "./components/Header/Header.tsx";
import LightboxContentWelcome from "./components/Lightbox/LightboxContentWelcome.tsx";
import { AnimatePresence } from "motion/react";
import ViewerMissionDetail from "./components/ViewerMissionDetail/ViewerMissionDetail.tsx";
import Inventory from "./components/Inventory/Inventory.tsx";
import EquipmentInventory from "./components/Inventory/EquipmentInventory.tsx";
import Smartphone from "./components/Smartphone/Smartphone.tsx";
import LightboxContentMessage from "./components/Lightbox/LightboxContentMessage.tsx";
import QuickNav from "./components/QuickNav/QuickNav.tsx";
import ModeInfo from "./components/ModeInfo/ModeInfo.tsx";
import Log from "./components/Log/Log.tsx";
import Result from "./components/Result/Result.tsx";
import Computer from "./components/Computer/Computer.tsx";
import ConnectDisconnectDuspolModeInfo from "./components/ConnectDisconnectDuspolModeInfo/ConnectDisconnectDuspolModeInfo.tsx";
import { EActionType } from "./types/types.ts";
import { handleActionTrigger } from "./utilities/handleActionTrigger.ts";
import ViewerGlovesPanel from "./components/ViewerGlovesPanel/ViewerGlovesPanel.tsx";
import ViewerWrapper from "./components/ViewerWrapper/ViewerWrapper.tsx";
import PerformanceSettings from "./components/PerformanceSettings/PerformanceSettings.tsx";
import { findActionByType } from "./utilities/utilities.ts";
import ConnectDisconnectMultimeterModeInfo from "./components/ConnectDisconnectMultimeterModeInfo/ConnectDisconnectMultimeterModeInfo.tsx";
import LightboxContentTermsOfUse from "./components/Lightbox/LightboxContentTermsOfUse.tsx";
import {ComputerDesktopIcon} from "@heroicons/react/24/outline";

// O(1) lookup map for interactive object display names
const interactiveObjectDisplayNames = new Map(
    DATA.interactiveObjects.map(obj => [obj.name, obj.displayName])
);

function App() {
    const resizeTimeoutId = useRef<undefined | ReturnType<typeof setTimeout>>();
    const resizeHandler = () => {
        clearTimeout(resizeTimeoutId.current);
        resizeTimeoutId.current = setTimeout(() => {
            useGlobalStore.setState({
                viewport: {
                    width: document.body.clientWidth,
                    height: window.innerHeight,
                },
            });
        }, 20);
    }

    // Targeted selectors — App only re-renders when these specific values change
    const hoveredInteractiveObjectName = useGlobalStore(state => state.hoveredInteractiveObjectName);
    const hoveredPinName = useGlobalStore(state => state.hoveredPinName);
    const activeLightboxMessage = useGlobalStore(state => state.activeLightboxMessage);
    const isLoading = useGlobalStore(state => state.isLoading);
    const showWelcomeScreen = useGlobalStore(state => state.showWelcomeScreen);
    const showTermsOfUse = useGlobalStore(state => state.showTermsOfUse);
    const showLog = useGlobalStore(state => state.showLog);
    const showResult = useGlobalStore(state => state.showResult);
    const showPerformanceSettings = usePerformanceSettings(state => state.showPerformanceSettings);
    const showSmartphone = useGlobalStore(state => state.showSmartphone);
    const computerIsMinimized = useGlobalStore(state => state.computerIsMinimized);

    // Derived from actions — targeted per action type so App only re-renders when these toggle
    const showComputer = useActionsStore(state => findActionByType(state.actions, EActionType.LAPTOP)?.activated ?? false);
    const showMissionDetail = useActionsStore(state => findActionByType(state.actions, EActionType.MISSION_INSPECT)?.activated ?? false);
    const showGlovesPanel = useActionsStore(state => findActionByType(state.actions, EActionType.GLOVES_PANEL_INSPECT)?.activated ?? false);

    const showPlaceModeInfo = useGlobalStore(state => state.activePlaceActionName);
    const showUseModeInfo = useGlobalStore(state => state.activeUseActionName);
    const showInspectModeInfo = useGlobalStore(state => state.activeInspectActionName);
    const showEquipmentTestModeInfo = useGlobalStore(state => state.activeEquipmentTestActionName);
    const showConnectDisconnectDuspolModeInfo = useGlobalStore(state => state.activeConnectDisconnectDuspolActionName);
    const showConnectDisconnectMultimeterModeInfo = useGlobalStore(state => state.activeConnectDisconnectMultimeterActionName);

    //Header-Größe holen und speichern
    const headerRef = useRef<HTMLElement>(null);
    const [headerHeight, setHeaderHeight] = useState(0);
    const gapSize = 10;

    useEffect(() => {
        useGlobalStore.setState({
            viewport: {
                width: document.body.clientWidth,
                height: window.innerHeight,
            }
        });
        window.addEventListener('resize', resizeHandler);

        return () => {
            window.removeEventListener('resize', resizeHandler);
        }
    }, []);

    useLayoutEffect(() => {
        if (headerRef.current) {
            // Wir messen die Höhe der blauen Box (links)
            const blueBox = headerRef.current.querySelector('.bg-sky-700');
            if (blueBox) {
                setHeaderHeight(blueBox.getBoundingClientRect().height);
            }
        }
    }, [isLoading]);

    return (
        <>
            <ThreeDCanvas />
            {isLoading &&
                <Spinner />
            }
            {!isLoading &&
                <>
                    <div ref={headerRef as any}>
                        <Header />
                    </div>
                    {/* The display name of an interactive object wins over the pin name - it is the more specific label */}        
                    {/*<PointerInfo text={interactiveObjectDisplayNames.get(hoveredInteractiveObjectName) ?? (hoveredPinName || undefined)} /> */}   
                            
                    <PointerInfo text={hoveredPinName || interactiveObjectDisplayNames.get(hoveredInteractiveObjectName)} />
                    <InteractiveObjectMenu />
                    <MenuBottom />
                    <AnimatePresence>
                        {showPerformanceSettings &&
                            <PerformanceSettings />
                        }
                        {showGlovesPanel &&
                            <ViewerWrapper key={'glovesPanelViewer'} buttonText={'Schutzklassentafel schließen'} onClose={() => {
                                const glovesPanelAction = findActionByType(useActionsStore.getState().actions, EActionType.GLOVES_PANEL_INSPECT);
                                if (glovesPanelAction) {
                                    handleActionTrigger(glovesPanelAction);
                                }
                            }}>
                                <ViewerGlovesPanel />
                            </ViewerWrapper>
                        }
                        {showMissionDetail &&
                            <ViewerWrapper key={'missionInspectViewer'} buttonText={'Arbeitsauftrag schließen'} onClose={() => {
                                const missionInspectAction = findActionByType(useActionsStore.getState().actions, EActionType.MISSION_INSPECT);
                                if (missionInspectAction) {
                                    handleActionTrigger(missionInspectAction);
                                }
                            }}>
                                <ViewerMissionDetail />
                            </ViewerWrapper>
                        }
                        {showInspectModeInfo &&
                            <ModeInfo key={'inspectModeInfo'} buttonText={"Inspizieren beenden"} callback={
                                () => {
                                    const inspectAction = useActionsStore.getState().actions.find(action => action.type === EActionType.INSPECT && action.activated);
                                    if (inspectAction) {
                                        handleActionTrigger(inspectAction);
                                    }
                                }
                            } />
                        }
                        {showEquipmentTestModeInfo &&
                            <ModeInfo key={'equipmentTestInfo'} buttonText={"Test beenden"} callback={
                                () => {
                                    const testAction = useActionsStore.getState().actions.find(action => action.type === EActionType.EQUIPMENT_TEST && action.activated);
                                    if (testAction) {
                                        handleActionTrigger(testAction);
                                    }
                                }
                            } />
                        }
                        {showPlaceModeInfo &&
                            <ModeInfo key={'placeModeInfo'} buttonText={"Abbrechen"} text={"Wähle einen Ort / Verbindungspunkt aus."} callback={
                                () => {
                                    useGlobalStore.setState({ activePlaceActionName: "" });
                                }
                            } />
                        }
                        {showUseModeInfo &&
                            <ModeInfo key={'useModeInfo'} buttonText={"Abbrechen"} text={"Wähle ein Objekt zum Benutzen aus."} callback={
                                () => {
                                    useGlobalStore.setState({ activeUseActionName: "" });
                                }
                            } />
                        }
                        {showConnectDisconnectDuspolModeInfo &&
                            <ConnectDisconnectDuspolModeInfo />
                        }
                        {showConnectDisconnectMultimeterModeInfo &&
                            <ConnectDisconnectMultimeterModeInfo />
                        }
                        {showSmartphone &&
                            <Smartphone />
                        }
                        {showComputer &&
                            <Computer />
                        }
                        {showComputer && computerIsMinimized &&
                            <button
                                key={'computer-restore'}
                                onClick={() => {useGlobalStore.setState({computerIsMinimized: false});}}
                                className={'fixed left-[255px] bottom-0 z-30 shadow-xl px-4 py-5 flex flex-row items-center bg-sky-700 text-white rounded-t-2xl cursor-pointer pointer-events-auto hover:scale-105 transition-transform'}
                            >
                                <ComputerDesktopIcon className={'size-5 mr-2'}/>
                                Laptop wiederherstellen
                            </button>
                        }
                        {showWelcomeScreen &&
                            <Lightbox key={'welcomeLightbox'} hasCloseButton={false}>
                                <LightboxContentWelcome />
                            </Lightbox>
                        }
                        {showTermsOfUse &&
                            <Lightbox key={'termsOfUseLightbox'} hasCloseButton={false}>
                                <LightboxContentTermsOfUse />
                            </Lightbox>
                        }
                        {showLog &&
                            <Lightbox key={'logLightbox'} hasCloseButton={true} onClose={() => { useGlobalStore.setState({ showLog: false }) }}>
                                <Log />
                            </Lightbox>
                        }
                        {activeLightboxMessage.length > 0 &&
                            <Lightbox key={'generalLightbox'}>
                                <LightboxContentMessage />
                            </Lightbox>
                        }
                        {showResult &&
                            <Result />
                        }
                    </AnimatePresence>
                    <div
                        className={'absolute left-0 flex flex-col items-stretch justify-start text-xs w-[250px] h-fit'}
                        style={{
                            // Startpunkt = Header-Höhe + Wunschabstand
                            top: `${headerHeight + gapSize}px`,
                            // Abstand zwischen den Boxen = Wunschabstand
                            gap: `${gapSize}px`
                        }}
                    >  <EquipmentInventory />
                        <Inventory />
                    </div>
                    <div className={'absolute right-0 bottom-0 text-xs'}>
                        <QuickNav />
                    </div>
                </>
            }
        </>
    )
}

export default App
