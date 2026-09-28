import {IMission} from "../../types/types.ts";
import MissionListItem from "./MissionListItem.tsx";


interface IMissionListProps {
    missions: IMission[];
    selectedMissionName?: string;
    onMissionSelect?: (missionName: string) => void;
}

function MissionList(props: IMissionListProps) {
    return (
        <div className={'w-full flex flex-col gap-2'}>
            {props.missions.map((mission, missionIndex) => {
                return <MissionListItem key={missionIndex} mission={mission} missionIndex={missionIndex} onMissionSelect={props.onMissionSelect} selectedMissionName={props.selectedMissionName}/>
            })}
        </div>
    );
}

export default MissionList;
