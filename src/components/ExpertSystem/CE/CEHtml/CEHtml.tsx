import { useEffect, useState } from "react";
import { ICEUrlProps } from "../CE";

function CEHtml(props: ICEUrlProps) {
    const { url } = props;
    const [content, setContent] = useState('');

    useEffect(() => {
        const loader = async () => {
            const response = await fetch(url);
            const text = await response.text();
            setContent(text);
        };
        url && loader();
      }, [url]);

    return !content ? null : (
        <div dangerouslySetInnerHTML={{ __html: content }}/>
    );
}

export default CEHtml;
