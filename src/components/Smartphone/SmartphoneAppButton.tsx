import {ClockIcon, PhoneIcon} from "@heroicons/react/24/solid";

interface ISmartphoneAppButtonProps {
    type: "phone" | "timer";
    onClick: () => void;
}

function SmartphoneAppButton(props: ISmartphoneAppButtonProps) {
    return(
        <button
            onClick={props.onClick}
            className={'w-1/3 aspect-square max-h-min p-[5px] cursor-pointer flex flex-col items-center justify-center'}
        >
            <div className={'bg-white w-full h-full rounded-[10px] flex flex-col items-center justify-center shadow-lg'}>
                {props.type === "phone" && <PhoneIcon className={'text-sky-700 size-12'}/>}
                {props.type === "timer" && <ClockIcon className={'text-sky-700 size-12'}/>}
            </div>
        </button>
    )
}

export default SmartphoneAppButton;
