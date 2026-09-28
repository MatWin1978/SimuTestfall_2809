import { Document, Font, Page, Text, View } from '@react-pdf/renderer';
import { PdfStyles } from './components/styles';
import robotoBold from '../../assets/Roboto-Bold.ttf';
import robotoRegular from '../../assets/Roboto-Regular.ttf';
import {ILoggedActionRaw} from '../../types/types';
import { PdfTable, PdfTableColumnDefinition, PdfTableStyles } from './components/PdfTable';

type Action = ILoggedActionRaw & { isCorrect?: boolean; }
type Action2 = {
    action: string;
    performed: boolean;
    successful: boolean;
};

type Props = {
    date: Date;
    user: string;
    mission: string;
    actions: Action2[];
}

function PdfReport(props: Props) {
    const { date, user, mission, actions } = props;
    const dateStr = date.toLocaleString('de', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })

    // Use 'own' font to bypass unicode problems
    Font.register({ family: 'Roboto', src: robotoRegular });
    Font.register({ family: 'Roboto', src: robotoBold, fontWeight: 'bold' });

    const columns: PdfTableColumnDefinition<Action2, keyof Action2>[] = [
        {
            id: 'action',
            label: 'Aktion',
            width: '70%',
        },
        {
            id: 'performed',
            label: 'Durchgeführt',
            width: '15%',
            align: 'center',
            template: props => (
                <Text key={props.column.id} style={{
                    textAlign: props.column.align || 'center',
                    fontWeight: props.row[props.column.id] ? 'normal' : 'bold',
                    width: props.column.width,
                    ...PdfTableStyles.column,
                    ...props.column.style,
                }}>
                    {props.row[props.column.id] ? 'durchgeführt' : '' }
                </Text>
            )
        },
        {
            id: 'successful',
            label: 'Ergebnis',
            width: '15%',
            align: 'center',
            template: props => (
                <Text key={props.column.id} style={{
                    textAlign: props.column.align || 'center',
                    fontWeight: props.row[props.column.id] ? 'normal' : 'bold',
                    width: props.column.width,
                    ...PdfTableStyles.column,
                    ...props.column.style,
                }}>
                    {props.row['performed'] ? (props.row[props.column.id] ? 'OK' : 'fehlerhaft') : '' }
                </Text>
            )
        },
    ];

    return (
        <Document>
            <Page size='A4' style={PdfStyles.page}>
                <View style={PdfStyles.section}>
                    <Text style={PdfStyles.h2}>PH Ludwigsburg</Text>
                    <Text style={PdfStyles.h1}>Auswertung Kfz-Simulation:</Text>
                    <Text style={PdfStyles.h1}>{decodeURI(mission)}</Text>
                </View>
                <View style={PdfStyles.section}>
                    <Text style={PdfStyles.h3}>Ausgeführt am {dateStr} von {decodeURI(user)}</Text>
                </View>
                <View style={PdfStyles.section}>
                    <PdfTable
                        tableHeader='Durchzuführende Aktionen'
                        columnHeader={true}
                        columns={columns} data={actions} />
                </View>
            </Page>
        </Document>
    );
}

export default PdfReport;
