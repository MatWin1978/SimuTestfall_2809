import { ICEContentProps } from "../CE";

export interface ICEActionProps extends ICEContentProps {
    id: string;
    action?: (id: string) => void;
}

function CEAction(props: ICEActionProps) {
    const { id, action, contentHtml } = props;
    return (
        <div className="mx-2 p-2 cursor-pointer" onClick={() => action(id)}>
            <div className={'border-sky-700 border-1 px-4 py-2 bg-white shadow-md'} dangerouslySetInnerHTML={{__html: contentHtml}} />
        </div>
    );
}

export default CEAction;
