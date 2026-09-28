import {MOTION_VARIANTS} from "../../utilities/variants.ts";
import {motion} from "motion/react";
import React from "react";
import {useGlobalStore, usePerformanceSettings} from "../../store/store.ts";
import Toggle from "../Toggle/Toggle.tsx";
import {ICollection, OCCLUSION_PERFORMANCE_PRESET} from "../../types/types.ts";
import {CogIcon, WrenchScrewdriverIcon} from "@heroicons/react/24/outline";
import DATA from "../../data/data.json";

const COLLECTIONS = DATA.collections as ICollection[];

function toggleCollection(collectionName: string) {
    useGlobalStore.setState((state) => ({
        hiddenCollectionNames: state.hiddenCollectionNames.includes(collectionName)
            ? state.hiddenCollectionNames.filter((name) => name !== collectionName)
            : [...state.hiddenCollectionNames, collectionName]
    }));
}

export function PerformanceSettings() {
    const resolutionLimited = usePerformanceSettings(state => state.maxResolutionToggle);
    const occlusion = usePerformanceSettings(state => state.occlusion);
    const occlusionPerformancePreset = usePerformanceSettings(state => state.occlusionPerformance);
    const occlusionHighRes = usePerformanceSettings(state => state.occlusionHighRes);
    const hiddenCollectionNames = useGlobalStore(state => state.hiddenCollectionNames);
    return(
        <div className={'absolute top-30 right-0 rounded-tl-3xl rounded-bl-3xl bg-white shadow-2xl'}>
            <div className={"max-h-[52vh] rounded-tl-3xl rounded-bl-3xl bg-white shadow-xl flex flex-col justify-start overflow-hidden w-full"}>
                <div className={'font-bold bg-sky-700 px-5 py-3 text-white flex flex-row items-center rounded-tl-3xl'}>
                    <CogIcon className={'size-6 mr-3'}/>
                    <span>Einstellungen</span>
                </div>
                <div className={'p-4 text-sm max-h-full overflow-hidden overflow-y-scroll'}>
                    <h1 className={'font-bold mb-3'}>Darstellung</h1>
                    <div className={'flex flex-col gap-4'}>
                        {COLLECTIONS.map((collection) => (
                            <Toggle
                                key={collection.name}
                                className={'px-4'}
                                label={collection.displayName}
                                checked={!hiddenCollectionNames.includes(collection.name)}
                                onChange={() => {toggleCollection(collection.name)}}
                            />
                        ))}
                    </div>
                    <h1 className={'font-bold mt-6 mb-3 pt-4 border-t border-gray-300'}>Performance</h1>
                    <div className={'flex flex-col gap-4'}>
                        <Toggle className={'px-4'} label={'Hohe Render-Auflösung'} checked={resolutionLimited} onChange={() => {
                            usePerformanceSettings.setState((state) => ({ maxResolutionToggle: !state.maxResolutionToggle }));
                        }}/>
                        <div className={`flex flex-col gap-4 px-4 rounded-2xl ${occlusion ? "bg-gray-200 py-4" : ""}`}>
                            <Toggle label={'Ambient Occlusion'} checked={occlusion} onChange={() => {
                                usePerformanceSettings.setState((state) => ({occlusion: !state.occlusion}));
                            }}/>
                            {occlusion &&
                                <div className={`border-t-1 pt-4 border-gray-400`}>
                                    <Toggle className={'mb-4'} label={'Hohe Auflösung'} checked={occlusionHighRes} onChange={() => {
                                        usePerformanceSettings.setState((state) => ({occlusionHighRes: !state.occlusionHighRes}));
                                    }}/>
                                    <h1 className={'mb-1'}>Performance Preset</h1>
                                    <ul className="text-xs font-medium">
                                        <li className="w-full border-b border-gray-200">
                                            <div className="flex items-center">
                                                <input
                                                    id="occlusion-preset-performance"
                                                    type="radio"
                                                    value={OCCLUSION_PERFORMANCE_PRESET.PERFORMANCE}
                                                    name="occlusion-performance-preset"
                                                    className="w-4 h-4 text-blue-600 bg-gray-100"
                                                    checked={occlusionPerformancePreset === OCCLUSION_PERFORMANCE_PRESET.PERFORMANCE}
                                                    onChange={() => {
                                                        usePerformanceSettings.setState({occlusionPerformance: OCCLUSION_PERFORMANCE_PRESET.PERFORMANCE});
                                                    }}
                                                />
                                                <label htmlFor="occlusion-preset-performance" className="w-full py-1 ms-2 font-medium cursor-pointer">Performance</label>
                                            </div>
                                        </li>
                                        <li className="w-full border-b border-gray-200">
                                            <div className="flex items-center">
                                                <input
                                                    id="occlusion-preset-low"
                                                    type="radio"
                                                    value={OCCLUSION_PERFORMANCE_PRESET.LOW}
                                                    name="occlusion-performance-preset"
                                                    className="w-4 h-4 text-blue-600 bg-gray-100"
                                                    checked={occlusionPerformancePreset === OCCLUSION_PERFORMANCE_PRESET.LOW}
                                                    onChange={() => {
                                                        usePerformanceSettings.setState({occlusionPerformance: OCCLUSION_PERFORMANCE_PRESET.LOW});
                                                    }}
                                                />
                                                <label htmlFor="occlusion-preset-low" className="w-full py-1 ms-2 font-medium cursor-pointer">Low</label>
                                            </div>
                                        </li>
                                        <li className="w-full border-b border-gray-200">
                                            <div className="flex items-center">
                                                <input
                                                    id="occlusion-preset-medium"
                                                    type="radio"
                                                    value={OCCLUSION_PERFORMANCE_PRESET.MEDIUM}
                                                    name="occlusion-performance-preset"
                                                    className="w-4 h-4 text-blue-600 bg-gray-100"
                                                    checked={occlusionPerformancePreset === OCCLUSION_PERFORMANCE_PRESET.MEDIUM}
                                                    onChange={() => {
                                                        usePerformanceSettings.setState({occlusionPerformance: OCCLUSION_PERFORMANCE_PRESET.MEDIUM});
                                                    }}
                                                />
                                                <label htmlFor="occlusion-preset-medium" className="w-full py-1 ms-2 font-medium cursor-pointer">Medium</label>
                                            </div>
                                        </li>
                                        <li className="w-full border-b border-gray-200">
                                            <div className="flex items-center">
                                                <input
                                                    id="occlusion-preset-high"
                                                    type="radio"
                                                    value={OCCLUSION_PERFORMANCE_PRESET.HIGH} name="occlusion-performance-preset"
                                                    className="w-4 h-4 text-blue-600 bg-gray-100"
                                                    checked={occlusionPerformancePreset === OCCLUSION_PERFORMANCE_PRESET.HIGH}
                                                    onChange={() => {
                                                        usePerformanceSettings.setState({occlusionPerformance: OCCLUSION_PERFORMANCE_PRESET.HIGH});
                                                    }}
                                                />
                                                <label htmlFor="occlusion-preset-high" className="w-full py-1 ms-2 font-medium cursor-pointer">High</label>
                                            </div>
                                        </li>
                                        <li className="w-full">
                                            <div className="flex items-center">
                                                <input
                                                    id="occlusion-preset-ultra"
                                                    type="radio" value={OCCLUSION_PERFORMANCE_PRESET.ULTRA}
                                                    name="occlusion-performance-preset"
                                                    className="w-4 h-4 text-blue-600 bg-gray-100"
                                                    checked={occlusionPerformancePreset === OCCLUSION_PERFORMANCE_PRESET.ULTRA}
                                                    onChange={() => {
                                                        usePerformanceSettings.setState({occlusionPerformance: OCCLUSION_PERFORMANCE_PRESET.ULTRA});
                                                    }}
                                                />
                                                <label htmlFor="occlusion-preset-ultra" className="w-full py-1 ms-2 font-medium cursor-pointer">Ultra</label>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            }
                        </div>
                    </div>
                    <motion.button
                        variants={MOTION_VARIANTS.scaleUp}
                        onClick={() => {
                            usePerformanceSettings.setState({
                                maxResolutionToggle: true,
                                occlusion: true,
                                occlusionHighRes: false,
                                occlusionPerformance: OCCLUSION_PERFORMANCE_PRESET.PERFORMANCE
                            })
                        }}
                        className={'w-full shadow-xl px-3 py-2 flex flex-row items-center justify-center rounded-full relative cursor-pointer pointer-events-auto mt-4 bg-yellow-500 text-black'}
                    >
                        Auf Standard zurücksetzen
                    </motion.button>
                    <motion.button
                        variants={MOTION_VARIANTS.scaleUp}
                        onClick={() => {
                            usePerformanceSettings.setState({showPerformanceSettings: false})
                        }}
                        className={'w-full shadow-xl px-3 py-2 flex flex-row items-center justify-center bg-sky-700 rounded-full text-white relative cursor-pointer pointer-events-auto mt-4'}
                    >
                        Schließen
                    </motion.button>
                </div>
            </div>
        </div>
    )
}

export default PerformanceSettings;
