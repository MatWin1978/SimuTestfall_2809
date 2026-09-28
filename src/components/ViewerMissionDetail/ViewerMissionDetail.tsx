import Viewer from 'react-viewer';
import {useGlobalStore} from "../../store/store.ts";
import DATA from "../../data/data.json";
import {IMission} from "../../types/types.ts";
import {useEffect, useMemo} from "react";

// Click-zoom bounds — shared by the click handler and the Viewer's min/max scale props
// (so the mouse wheel honours the same limits). Start zoom = fitted scale 1.
const ZOOM_FACTOR = 1.5;                              // perceived zoom multiplier per click
const MAX_ZOOM_CLICKS = 4;                            // max zoom reachable in 4 in-clicks from start
const MIN_SCALE = 1;                                  // never zoom out past the start zoom
const MAX_SCALE = ZOOM_FACTOR ** MAX_ZOOM_CLICKS;    // ≈ 5.06

// Computed once at module load — stable for the entire session
const dateFormatter = new Intl.DateTimeFormat('de-DE', {year: 'numeric', month: '2-digit', day: '2-digit'});
const currentDateString = dateFormatter.format(new Date());
const deadlineDateString = dateFormatter.format(new Date().setDate(new Date().getDate() + 7));

function createMissionTextSVG(content: string, maxLength: number) {
    const words = content.split(' ');
    let currentLine = '';
    const lines: string[] = [];
    for (let i = 0; i < words.length; i++) {
        if (currentLine.length + words[i].length < maxLength) {
            currentLine += words[i] + ' ';
        } else {
            lines.push(currentLine);
            currentLine = words[i] + ' ';
        }
        if (i === words.length - 1) lines.push(currentLine);
    }
    return lines.map((line, i) => `<tspan x="0" y="${24 * i}">${line}</tspan>`).join('');
}

function ViewerMissionDetail(props: any) {
    const userName = useGlobalStore(state => state.userName);
    const activeMissionName = useGlobalStore(state => state.activeMissionName);

    // Click-to-zoom on top of react-viewer's built-in wheel zoom (additive).
    // react-viewer exposes no imperative zoom API, but its wheel handler — registered on
    // the outer .react-viewer element — only reads the *sign* of deltaY plus the cursor
    // position. So a synthesized, bubbling WheelEvent at the click point drives the same zoom.
    //
    // The scale is *additive* (~+0.12 per notch). react-viewer rebinds the wheel handler on
    // every render, capturing the current scale in its closure, so firing all notches in one
    // synchronous tick makes them all read the same stale scale → only ~one step lands. We
    // therefore spread the notches across ticks (setTimeout 0): React commits and rebinds the
    // handler between each, so every notch reads the updated scale and they truly accumulate.
    const container: HTMLElement | undefined = props.container;
    const visible: boolean = props.visible;

    useEffect(() => {
        if (!container || !visible) return;

        const NOTCH = 0.12;         // react-viewer's additive scale step per wheel notch (= zoomSpeed prop)
        const DRAG_THRESHOLD = 5;   // px; beyond this a click is treated as a drag-pan
        let downX = 0, downY = 0, dragged = false;
        let zoomTimer: ReturnType<typeof setTimeout> | undefined;

        // react-viewer's scale is *additive* (+NOTCH per notch), but zoom feels multiplicative, so
        // a fixed notch count gets weaker the further you're zoomed in. Read the live scaleX and
        // convert a constant multiplicative factor into the matching number of additive notches.
        const readScale = () => {
            const img = container.querySelector('.react-viewer-image') as HTMLElement | null;
            const m = img?.style.transform.match(/scaleX\(\s*(-?[\d.]+)\s*\)/);
            return m ? Math.abs(parseFloat(m[1])) || 1 : 1;
        };

        // Reflect the available direction in the cursor: plus-only at min, minus-only at max,
        // "+/−" in between. Driven by the live scale so it stays correct for wheel zoom too.
        const updateCursor = (scale: number) => {
            const canvas = container.querySelector('.react-viewer-canvas');
            canvas?.classList.toggle('at-min', scale <= MIN_SCALE + 0.001);
            canvas?.classList.toggle('at-max', scale >= MAX_SCALE - 0.001);
        };

        const fireNotch = (deltaY: number, x: number, y: number) => {
            container.querySelector('.react-viewer-image')?.dispatchEvent(
                new WheelEvent('wheel', {deltaY, clientX: x, clientY: y, bubbles: true, cancelable: true})
            );
        };

        const animateZoom = (steps: number, deltaY: number, x: number, y: number) => {
            clearTimeout(zoomTimer);
            let remaining = steps;
            const tick = () => {
                if (remaining-- <= 0) return;
                fireNotch(deltaY, x, y);
                zoomTimer = setTimeout(tick, 0); // yield so React commits + rebinds before next notch
            };
            tick();
        };

        // Left-click → zoom in, right-click → zoom out. deltaY sign is all react-viewer reads.
        const zoom = (zoomIn: boolean, e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.react-viewer-image')) return; // ignore clicks on chrome/buttons
            if (dragged) return;                                 // panned, not a click

            const current = readScale();
            const raw = zoomIn ? current * ZOOM_FACTOR : current / ZOOM_FACTOR;
            const targetScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw));
            const steps = Math.round(Math.abs(targetScale - current) / NOTCH);
            if (steps < 1) return; // already at the min/max bound

            updateCursor(targetScale); // reflect the scale we're heading to right away
            animateZoom(steps, zoomIn ? -100 : 100, e.clientX, e.clientY);
        };

        const onPointerDown = (e: PointerEvent) => {
            downX = e.clientX;
            downY = e.clientY;
            dragged = false;
        };
        const onPointerMove = (e: PointerEvent) => {
            if (Math.abs(e.clientX - downX) > DRAG_THRESHOLD || Math.abs(e.clientY - downY) > DRAG_THRESHOLD) {
                dragged = true;
            }
            updateCursor(readScale()); // keep cursor correct after wheel zoom too
        };
        const onClick = (e: MouseEvent) => zoom(true, e);        // left click → zoom in
        const onContextMenu = (e: MouseEvent) => {               // right click → zoom out
            if ((e.target as HTMLElement).closest('.react-viewer-image')) e.preventDefault();
            zoom(false, e);
        };

        container.addEventListener('pointerdown', onPointerDown);
        container.addEventListener('pointermove', onPointerMove);
        container.addEventListener('click', onClick);
        container.addEventListener('contextmenu', onContextMenu);
        const initTimer = setTimeout(() => updateCursor(readScale()), 0); // start at plus-only (min zoom)
        return () => {
            clearTimeout(initTimer);
            clearTimeout(zoomTimer);
            container.removeEventListener('pointerdown', onPointerDown);
            container.removeEventListener('pointermove', onPointerMove);
            container.removeEventListener('click', onClick);
            container.removeEventListener('contextmenu', onContextMenu);
        };
    }, [container, visible]);

    const missionStatement = useMemo(
        () => (DATA.missions as IMission[]).find(m => m.name === activeMissionName)?.missionStatement,
        [activeMissionName]
    );
    const carData = useMemo(
        () => (DATA.missions as IMission[]).find(m => m.name === activeMissionName)?.carData,
        [activeMissionName]
    );

    // Memoize the SVG — only rebuilds when mission or user changes, not on every render
    const encodedSvg = useMemo(() => {
        let svg = `
        <svg xmlns="http://www.w3.org/2000/svg" height="1200" viewBox="0 0 595.276 841.89">
            <g id="shapes">
                <rect id="b" data-name="BG" width="595.276" height="841.89" fill="#fff"/>
            </g>
            <g id="names">
                <text transform="translate(395.862 808)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="6"><tspan x="0" y="0">Kein Arbeitsauftrag vorhanden</tspan></text>
            </g>
        </svg>
    `;

        if (missionStatement && carData) {
            svg = `
        <svg xmlns="http://www.w3.org/2000/svg" height="1200" viewBox="0 0 595.276 841.89">
            <g id="shapes">
                <rect id="b" data-name="BG" width="595.276" height="841.89" fill="#fff"/>
                <rect x="42.405" y="305.682" width="510.865" height="24.201" fill="#d8d8d8"/>
                <rect x="46.674" y="474.799" width="497.465" height="12.101" fill="#d8d8d8"/>
                <line x1="49.432" y1="505.781" x2="168.472" y2="505.781" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="189.676" y1="505.781" x2="418.099" y2="505.781" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="434.332" y1="505.781" x2="473.021" y2="505.781" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="486.684" y1="505.781" x2="513.781" y2="505.781" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="523.409" y1="505.781" x2="544.14" y2="505.781" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="49.432" y1="529.156" x2="168.472" y2="529.156" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="189.676" y1="529.156" x2="418.099" y2="529.156" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="434.332" y1="529.156" x2="473.021" y2="529.156" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="486.684" y1="529.156" x2="513.781" y2="529.156" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="523.409" y1="529.156" x2="544.14" y2="529.156" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="49.432" y1="554.766" x2="168.472" y2="554.766" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="189.676" y1="554.766" x2="418.099" y2="554.766" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="434.332" y1="554.766" x2="473.021" y2="554.766" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="486.684" y1="554.766" x2="513.781" y2="554.766" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="523.409" y1="554.766" x2="544.14" y2="554.766" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="49.432" y1="578.141" x2="168.472" y2="578.141" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="189.676" y1="578.141" x2="418.099" y2="578.141" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="434.332" y1="578.141" x2="473.021" y2="578.141" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="486.684" y1="578.141" x2="513.781" y2="578.141" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="523.409" y1="578.141" x2="544.14" y2="578.141" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="49.432" y1="601.515" x2="168.472" y2="601.515" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="189.676" y1="601.515" x2="418.099" y2="601.515" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="434.332" y1="601.515" x2="473.021" y2="601.515" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="486.684" y1="601.515" x2="513.781" y2="601.515" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="523.409" y1="601.515" x2="544.14" y2="601.515" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="49.432" y1="624.889" x2="168.472" y2="624.889" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="189.676" y1="624.889" x2="418.099" y2="624.889" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="434.332" y1="624.889" x2="473.021" y2="624.889" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="486.684" y1="624.889" x2="513.781" y2="624.889" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="523.409" y1="624.889" x2="544.14" y2="624.889" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="49.432" y1="650.5" x2="168.472" y2="650.5" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="189.676" y1="650.5" x2="418.099" y2="650.5" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="434.332" y1="650.5" x2="473.021" y2="650.5" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="486.684" y1="650.5" x2="513.781" y2="650.5" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="523.409" y1="650.5" x2="544.14" y2="650.5" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="49.432" y1="673.874" x2="168.472" y2="673.874" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="189.676" y1="673.874" x2="418.099" y2="673.874" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="434.332" y1="673.874" x2="473.021" y2="673.874" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="486.684" y1="673.874" x2="513.781" y2="673.874" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="523.409" y1="673.874" x2="544.14" y2="673.874" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="49.432" y1="695.249" x2="168.472" y2="695.249" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="189.676" y1="695.249" x2="418.099" y2="695.249" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="434.332" y1="695.249" x2="473.021" y2="695.249" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="486.684" y1="695.249" x2="513.781" y2="695.249" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="523.409" y1="695.249" x2="544.14" y2="695.249" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width=".5"/>
                <line x1="375.232" y1="800.595" x2="518.536" y2="800.595" fill="none" stroke="#000" stroke-miterlimit="10"/>
                <rect x="124.249" y="312.392" width="20.791" height="11.921" fill="#fff" stroke="#1d1d1b" stroke-miterlimit="10"/>
                <rect x="215.994" y="312.392" width="20.791" height="11.921" fill="#fff" stroke="#1d1d1b" stroke-miterlimit="10"/>
                <rect x="84.648" y="354.304" width="20.791" height="11.921" fill="#fff" stroke="#1d1d1b" stroke-miterlimit="10"/>
                <rect x="191.738" y="361.894" width="20.791" height="11.921" fill="#fff" stroke="#1d1d1b" stroke-miterlimit="10"/>
                <rect x="182.756" y="739.592" width="15.24" height="11.006" fill="#fff" stroke="#1d1d1b" stroke-miterlimit="10" stroke-width=".823"/>
                <rect x="241.829" y="739.592" width="15.24" height="11.006" fill="#fff" stroke="#1d1d1b" stroke-miterlimit="10" stroke-width=".823"/>
                <rect x="182.756" y="753.995" width="15.24" height="11.006" fill="#fff" stroke="#1d1d1b" stroke-miterlimit="10" stroke-width=".823"/>
                <rect x="284.472" y="361.894" width="20.791" height="11.921" fill="#fff" stroke="#1d1d1b" stroke-miterlimit="10"/>
                <rect x="42.405" y="305.682" width="510.865" height="143.447" fill="none" stroke="#1d1d1b" stroke-miterlimit="10"/>
                <line x1="42.405" y1="329.883" x2="553.27" y2="329.883" fill="none" stroke="#1d1d1b" stroke-miterlimit="10"/>
                <line x1="42.405" y1="382.025" x2="553.27" y2="382.025" fill="none" stroke="#1d1d1b" stroke-miterlimit="10"/>
                <line x1="42.405" y1="423.607" x2="553.27" y2="423.607" fill="none" stroke="#1d1d1b" stroke-miterlimit="10"/>
                <line x1="150.321" y1="305.682" x2="150.321" y2="449.129" fill="none" stroke="#1d1d1b" stroke-miterlimit="10"/>
                <line x1="242.065" y1="305.682" x2="242.065" y2="449.129" fill="none" stroke="#1d1d1b" stroke-miterlimit="10"/>
                <line x1="341.4" y1="305.682" x2="341.4" y2="449.129" fill="none" stroke="#1d1d1b" stroke-miterlimit="10"/>
                <line x1="461.856" y1="305.682" x2="461.856" y2="449.129" fill="none" stroke="#1d1d1b" stroke-miterlimit="10"/>
                <path d="M406.242,794.824l28.069-.369-9.767,7.689M454.825,790.438c-.222,3.198,1.169,3.955,4.07,4.382h18.631M442.795,791.587c-.871,3.042-.322,3.395,2.565,2.547,4.972-1.46,10.642-4.949,14.082-8.805M445.931,787.957c1.836-1.703,3.996-5.997-.191-3.965-4.601,2.233-7.404,6.911-10.863,10.364,2.76-2.244,8.643-4.163,11.054-6.399Z" fill="none" stroke="#3560ab" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.097"/>
            </g>
            <g id="names">
                <text transform="translate(50.752 51.885)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="15" font-weight="800"><tspan x="0" y="0">${userName}</tspan><tspan x="0" y="18">Automobile</tspan></text>
                <text transform="translate(203.879 132.501)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="15" font-weight="800"><tspan x="0" y="0">Auftrag</tspan></text>
                <text transform="translate(49.432 132.884)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">${userName} Automobile GmbH</tspan><tspan x="0" y="10.8">Industriestr. 3</tspan><tspan x="0" y="21.6">70259 Stuttgart</tspan></text>
                <text transform="translate(203.88 146.617)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">${userName} Automobile GmbH</tspan><tspan x="0" y="10.8">Industriestr. 3</tspan><tspan x="0" y="21.6">70259 Stuttgart</tspan><tspan x="0" y="32.4">Telefon +49(0)711 498456-0</tspan><tspan x="0" y="43.2">Telefax +49(0)711 498456-85</tspan><tspan x="0" y="54">www.${userName}.de</tspan><tspan x="0" y="75.6">USt.-IdNr. DE985642874</tspan><tspan x="0" y="86.4">Sitz: Stuttgart, AG Stuttgart HRA 13986</tspan><tspan x="0" y="97.2">PhG: ${userName} Automobile</tspan><tspan x="0" y="108">Verwaltungs-GmbH, Stuttgart</tspan><tspan x="0" y="118.8">AG Stuttgart HRB 25103</tspan><tspan x="0" y="129.6">Geschäftsführer: ${userName}</tspan></text>
                <text transform="translate(437.675 132.713)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">Annahmetag</tspan></text>
                <text transform="translate(437.675 141.837)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">${currentDateString}</tspan></text>
                <text transform="translate(437.675 271.94)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">${currentDateString}</tspan></text>
                <text transform="translate(49.432 321.302)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Kfz-Schein</tspan></text>
                <text transform="translate(49.432 346.001)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Gewährleistung</tspan></text>
                <text transform="translate(49.432 398.757)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Amtl. Kennzeichen</tspan></text>
                <text transform="translate(49.432 715.848)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Die Auftragsbestätigung ist Ausweis für die Rückgabe des</tspan><tspan x="0" y="10.8">Fahrzeugs.</tspan></text>
                <text transform="translate(49.432 747.859)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Bezahlung bei Abholung</tspan></text>
                <text transform="translate(204.539 747.859)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">bar</tspan></text>
                <text transform="translate(264.933 747.859)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Bankeinzug</tspan></text>
                <text transform="translate(204.97 761.806)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Maestro-Karte (ex-Karte)</tspan></text>
                <text transform="translate(351.726 715.848)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Es gelten die umseitigen Kfz-</tspan><tspan x="0" y="10.8">Reparaturbedingungen.</tspan></text>
                <text transform="translate(156.474 438.999)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Getriebe KB</tspan></text>
                <text transform="translate(248.332 438.999)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Leitzahl</tspan></text>
                <text transform="translate(156.474 398.757)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Typ / Modell</tspan></text>
                <text transform="translate(248.937 398.757)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Schlüsselnummer</tspan></text>
                <text transform="translate(346.508 398.757)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Erstzulassung</tspan></text>
                <text transform="translate(469.126 398.757)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">KM-Stand</tspan></text>
                <text transform="translate(467.396 346.001)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Kundennummer</tspan></text>
                <text transform="translate(155.264 346.001)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Kulanzantrag</tspan><tspan x="0" y="10.8" xml:space="preserve">wird  gestellt</tspan></text>
                <text transform="translate(248.332 346.001)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Ersatzteile</tspan><tspan x="0" y="10.8">aufheben</tspan></text>
                <text transform="translate(348.832 346.001)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Vorauss. Rep.-Kosten</tspan><tspan x="0" y="10.8">einschl. MwSt.</tspan></text>
                <text transform="translate(155.264 321.302)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Serviceplan</tspan></text>
                <text transform="translate(249.423 321.302)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">Lack-Nr.</tspan></text>
                <text transform="translate(348.428 321.302)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">HU fällig</tspan></text>
                <text transform="translate(468.806 321.302)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">AU</tspan></text>
                <text transform="translate(437.675 174.625)" fill="#1d1d1b" font-family="Inter18pt-Black, &apos;Inter 18pt&apos;" font-size="9" font-weight="800"><tspan x="0" y="0">${deadlineDateString}</tspan></text>
                <text transform="translate(437.675 165.067)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">Abholtermin</tspan></text>
                <text transform="translate(437.355 197.1)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">Telefon gesch.</tspan><tspan x="0" y="10.8">0711/784523444</tspan></text>
                <text transform="translate(467.568 362.043)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">${carData.clientNumber}</tspan></text>
                <text transform="translate(49.836 415.066)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">${carData.licensePlateNumber}</tspan></text>
                <text transform="translate(49.836 483.422)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">Arbeitsposition-/Paket-Nr.</tspan></text>
                <text transform="translate(49.634 736.953)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">Verwahren Sie diese gut.</tspan></text>
                <text transform="translate(49.634 782.749)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">Bitte haben Sie Verständnis, dass wir für in Ihrem Fahrzeug</tspan><tspan x="0" y="10.8">befindliche Gegenstände von Wert keine Haftung übernehmen</tspan><tspan x="0" y="21.6">können. Entfernen Sie deshalb bitte solche Gegenstände aus</tspan><tspan x="0" y="32.4">Ihrem Fahrzeug.</tspan></text>
                <text transform="translate(351.061 734.903)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="6"><tspan x="0" y="0">Für den Fall, dass eine Kulanz- oder Garantieleistung</tspan><tspan x="0" y="7.2">seitens des Herstellers abgelehnt wird, ist die</tspan><tspan x="0" y="14.4">Auftragsnehmerin berechtigt, die anfallenden Arbeits-</tspan><tspan x="0" y="21.6">und Materialkosten dem Auftraggeber in Rechnung zu</tspan><tspan x="0" y="28.8">stellen. Eine Kopie des Auftrages wurde ausgehändigt,</tspan><tspan x="0" y="36">Erhalt wird mit Unterschrift bestätigt.</tspan></text>
                <text transform="translate(395.862 808)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="6"><tspan x="0" y="0">Unterschrift des Auftraggebers</tspan></text>
                <text transform="translate(192.16 483.422)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">Reparaturhinweise-Kundenbeanstandungen/Ölsorte</tspan></text>
                <text transform="translate(444.227 483.422)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">ZE</tspan></text>
                <text transform="translate(490.612 483.422)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">Erf.</tspan></text>
                <text transform="translate(525.373 483.422)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">Kul.</tspan></text>
                <text transform="translate(156.771 415.066)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">${carData.model}</tspan></text>
                <text transform="translate(248.48 415.066)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">${carData.kbaNumber}</tspan></text>
                <text transform="translate(348.99 415.066)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">${carData.registrationDate}</tspan></text>
                <text transform="translate(468.805 415.066)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">${carData.mileage}</tspan></text>
                <text transform="translate(437.355 261.488)" fill="#1d1d1b" font-family="Inter18pt-Regular, &apos;Inter 18pt&apos;" font-size="9"><tspan x="0" y="0">Datum</tspan></text>
                <text transform="translate(190.252 520.519)" fill="#1d1d1b" font-family="Roboto-Regular, Roboto" font-size="12">
                    ${createMissionTextSVG(missionStatement, 35)}
                </text>
            </g>
        </svg>
    `;
        }

        return encodeURIComponent(svg).replace(/%20/g, " ").replace(/%3D/g, "=").replace(/%3A/g, ":").replace(/%2F/g, "/").replace(/%22/g, "'");
    }, [userName, missionStatement, carData]);

    return (
        <Viewer
            {...props}
            images={[{src: `data:image/svg+xml,${encodedSvg}`}]}
            attribute={false}
            downloadable={false}
            noToolbar={true}
            noImgDetails={true}
            noFooter={true}
            changeable={false}
            zoomSpeed={0.12}
            minScale={MIN_SCALE}
            maxScale={MAX_SCALE}
            noClose={true}
        />
    );
}

export default ViewerMissionDetail;
