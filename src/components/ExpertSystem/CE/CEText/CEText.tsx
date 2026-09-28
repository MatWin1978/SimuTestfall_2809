import { ICEContentProps } from "../CE";

function CEText(props: ICEContentProps) {
    const { contentHtml } = props;

    const renderContent = (content: string, index?: number) => (
        <div className="mb-3" key={index} dangerouslySetInnerHTML={{ __html: content }} />
    );

    return (
        <div className="mx-7 p-2">
            {typeof contentHtml == 'string'
                ? renderContent(contentHtml)
                : (contentHtml as string[]).map(renderContent)}
        </div>
    );
}

export default CEText;
