import { useEffect, useRef, useState } from "react";
import { EEquipmentCategory, IInteractiveObjectRaw } from "../../types/types.ts";

interface IEquipmentSlotProps {
    category: { key: EEquipmentCategory; label: string; thumbnail: string };
    equippedObject: IInteractiveObjectRaw | null;
    isOpen: boolean;
    onToggle: () => void;
}

function EquipmentSlot(props: IEquipmentSlotProps) {
    const { category, equippedObject, isOpen, onToggle } = props;
    const isEquipped = !!equippedObject;

    // Blink-Effekt nur beim Anlegen: sobald ein Gegenstand angezogen wird 3x blinken, danach stoppen.
    const [isBlinking, setIsBlinking] = useState(false);
    const wasEquippedRef = useRef(isEquipped);

    useEffect(() => {
        // Nur beim Übergang "nicht angelegt" -> "angelegt" starten (nicht beim initialen Mount mit bereits getragener Ausrüstung).
        if (isEquipped && !wasEquippedRef.current) {
            setIsBlinking(true);
            // Robust nach 3 Durchläufen (3 x 2s) zurücksetzen – unabhängig davon, ob die Animation sichtbar
            // durchlief (z.B. wenn der Slot zwischendurch geöffnet wird und die Klasse kurzzeitig entfällt).
            const timer = setTimeout(() => setIsBlinking(false), 3 * 2000 + 100);
            wasEquippedRef.current = isEquipped;
            return () => clearTimeout(timer);
        }
        wasEquippedRef.current = isEquipped;
    }, [isEquipped]);

    // Sobald der Slot geöffnet/ausgewählt wird, ist das Blinken hinfällig. Beenden, damit ein bereits
    // angelegter, nicht ausgewählter Slot beim späteren Schließen nicht erneut zu blinken beginnt.
    useEffect(() => {
        if (isOpen) {
            setIsBlinking(false);
        }
    }, [isOpen]);

    return (
        <div
            className={"flex flex-col items-center flex-1 min-w-0 cursor-pointer select-none"}
            onClick={() => {
                if (isEquipped) {
                    onToggle();
                }
            }}
        >
            <div
                /* WICHTIG: w-[60px] wie im Inventar.
                   h-[46px] sorgt für die rechteckige Form, damit das 80px Bild
                   oben/unten mehr "Überhang" hat (optische Freiheit).
                */
                onAnimationEnd={() => setIsBlinking(false)}
                className={`relative w-[60px] h-[46px] rounded-xl transition-all duration-200 ${isEquipped && isOpen
                    ? 'border-3 border-lime-500 bg-lime-400 cursor-pointer scale-110' // Getragen + geöffnet: kräftiges Hellgrün + Scale
                    : isEquipped
                        ? `border-2 border-lime-400 bg-lime-400 cursor-pointer hover:scale-105 ${isBlinking ? 'animate-blink-3x' : ''}` // Getragen: hellgrün, blinkt beim Anlegen 3x
                        : 'border-2 border-gray-200 bg-gray-300 opacity-70'
                    }`}
            >
                <img
                    src={category.thumbnail}
                    className={`
                    absolute
                    left-1/2 
                    top-1/2
                    -translate-x-1/2
                    -translate-y-[60%]  /* Geändert von 1/2 auf 60%, um es nach oben zu ziehen */
                    w-[80px]
                    h-[80px]
                    max-w-none
                    max-h-none
                    pointer-events-none 
                    transition-all duration-200 
                    ${isEquipped ? '' : 'grayscale opacity-80'}
                `}
                />
            </div>

            <span className={`text-[10px] mt-2 text-center leading-tight ${isEquipped ? 'text-lime-700 font-semibold' : 'text-gray-400'}`}>
                {isEquipped ? equippedObject.displayName : category.label}
            </span>
        </div>
    );
}

export default EquipmentSlot;
