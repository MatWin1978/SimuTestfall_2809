import { ICEContentProps } from "../CE";

function CEListItem(props: ICEContentProps ) {
    const { contentHtml } = props;
    return (
        <li className={'px-4 py-2 mx-2 '} dangerouslySetInnerHTML={{__html: contentHtml}}/>
    );
}

export default CEListItem;
