import PerformedActionList from "../PerformedActionList/PerformedActionList.tsx";
import React from "react";
import {useLoggedActionsStore} from "../../store/store.ts";

function Log() {
    const performedActions = useLoggedActionsStore(state => state.loggedActions);


    return(
        <div className={'p-16 flex flex-col items-start'}>
            <h1 className={'font-bold mb-2'}>Bisher erfolgte Aktionen:</h1>
            <PerformedActionList performedActions={performedActions} />
        </div>
    )
}

export default Log;
