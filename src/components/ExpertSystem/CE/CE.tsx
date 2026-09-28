import CEText from "./CEText/CEText";
import CEList, {ICEListProps} from "./CEList/CEList.tsx";
import CEAction, {ICEActionProps} from "./CEAction/CEAction";
import CEHtml from "./CEHtml/CEHtml";
import CEDoc from "./CEDoc/CEDoc";

export interface ICEContentProps {
    contentHtml: string;
}

export interface ICEUrlProps extends ICEContentProps {
    url: string;
}

export interface ICEProps {
    type: string;
    data: ICEContentProps | ICEListProps | ICEActionProps;
}

function CE(props: ICEProps) {
    const { type, data } = props;
    return (
        type == "action" && <CEAction {...data as ICEActionProps} /> ||
        type == "text" && <CEText {...data as ICEContentProps} /> ||
        type == "list" && <CEList {...data as ICEListProps} /> ||
        type == "html" && <CEHtml {...data as ICEUrlProps} /> ||
        type == "doc" && <CEDoc {...data as ICEUrlProps} /> ||
        null
    );
}

export default CE;
