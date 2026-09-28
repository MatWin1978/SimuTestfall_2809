import {useLoggedActionsStore} from "../../store/store.ts";
import {returnLoggedActionText} from "../../utilities/returnLoggedActionText.ts";
import {ILoggedAction} from "../../types/types.ts";

interface IPerformedActionListProps {
    performedActions: ILoggedAction[];
}

function performedActionList(props: IPerformedActionListProps) {
    return props.performedActions.map((loggedAction) => {
            return(
                <div key={loggedAction.uid}>{returnLoggedActionText(loggedAction)}</div>
            )
        })
}

export default performedActionList;
