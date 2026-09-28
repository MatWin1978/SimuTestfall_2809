import {GiCarDoor, GiSteeringWheel} from "react-icons/gi";
import {BoltIcon, BriefcaseIcon, KeyIcon, LinkIcon, WrenchScrewdriverIcon} from "@heroicons/react/24/solid";
import {MdElectricalServices, MdOutlineElectricMeter, MdOutlineWindow} from "react-icons/md";
import {PiEngine} from "react-icons/pi";
import {FiAlertTriangle} from "react-icons/fi";
import {StopIcon} from "@heroicons/react/24/outline";
import {IoCogOutline} from "react-icons/io5";

interface IIconProps {
    className?: string;
    [key : string]: any;
}

function returnIcon(name: string, props?) {
    switch(name) {
        case 'carDoor':
            return <GiCarDoor {...props}/>
        case 'cockpit':
            return <GiSteeringWheel {...props}/>
        case 'chargingCable':
            return <MdElectricalServices {...props}/>
        case 'chargingPort':
            return <MdOutlineElectricMeter {...props}/>
        case 'carTrunk':
            return <BriefcaseIcon {...props}/>
        case 'carHood':
            return <PiEngine {...props}/>
        case 'ignition':
            return <BoltIcon {...props}/>
        case 'tools':
            return <WrenchScrewdriverIcon {...props}/>
        case 'disconnect':
            return <LinkIcon {...props}/>
        case 'keySafe':
            return <KeyIcon {...props}/>
        case 'windshield':
            return <MdOutlineWindow {...props}/>
        case 'sign':
            return <FiAlertTriangle {...props}/>
        case 'roof':
            return <StopIcon {...props}/>
        case 'engineRoom':
            return <IoCogOutline {...props}/>
        default: {
            console.warn("Icon " + name + " not found");
            return null;
        }
    }
}

export default returnIcon;
