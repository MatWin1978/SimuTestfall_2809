import { ReactNode } from "react";
import { ICEContentProps } from "../CE";
import CEListItem from "./CEListItem.tsx";

export interface ICEListProps {
    content: ICEContentProps[];
    variant?: 'ul' | 'ol';
}

function CEList(props: ICEListProps) {
    const { variant, content } = props;
    const children = () => content.map((item, index) => <CEListItem key={index} contentHtml={item.contentHtml} />);

    return variant == 'ol'
        ? <Ol>{children()}</Ol>
        : <Ul>{children()}</Ul>;
}

function Ol({ children }: { children: ReactNode }) {
    return <ol className={'mb-8 p-2'}>{children}</ol>
}

function Ul({ children }: { children: ReactNode }) {
    return <ul className={'mb-8 p-2'}>{children}</ul>
}

export default CEList;
