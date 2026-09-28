import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MOTION_VARIANTS } from "../../utilities/variants.ts";

interface IPointerInfoProps {
    text: string | undefined
}

function PointerInfo(props: IPointerInfoProps) {
    const pointerInfoRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handlePointerMove = (event: PointerEvent) => {
            if (pointerInfoRef.current) {
                const element = pointerInfoRef.current;
                const posX = Math.max(0, Math.min(event.clientX + 15, window.innerWidth - element.offsetWidth - 5));
                const posY = Math.max(0, Math.min(event.clientY + 15, window.innerHeight - element.offsetHeight - 5));
                element.style.left = `${posX}px`;
                element.style.top = `${posY}px`;
            }
        };
        window.addEventListener('pointermove', handlePointerMove);
        return () => window.removeEventListener('pointermove', handlePointerMove);
    }, [])

    return (
        <div ref={pointerInfoRef} className={'fixed pointer-events-none z-50'}>
            <AnimatePresence>
                {props.text &&
                    <motion.div
                        initial={"initial"}
                        animate={"animate"}
                        exit={"exit"}
                        variants={MOTION_VARIANTS.scaleUp}
                        className={'shadow-xl pt-2 pb-2 pl-4 pr-4 flex flex-row items-center bg-white text-sky-700 rounded-full border border-sky-100'}
                    >
                        <span className="whitespace-nowrap">{props.text}</span>
                    </motion.div>
                }
            </AnimatePresence>
        </div>
    )
}

export default PointerInfo;
