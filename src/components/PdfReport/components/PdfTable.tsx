import { StyleSheet, Text, View } from '@react-pdf/renderer';
import { Style } from '@react-pdf/types';
import { PdfStyles } from './styles';

export type ColumnDefinition<DataType, DataKey extends keyof DataType> = {
    id: DataKey;
    label: string;
    align?: 'left' | 'right' | 'center';
    width?: string | number;
    template?: (props: { column: ColumnDefinition<DataType, DataKey>; row: DataType }) => JSX.Element;
};

export const PdfTableStyles = StyleSheet.create({
    tableContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignContent: 'stretch',
        border: '1px solid #0069a8',
    },
    tableHeader: {
        color: '#fff',
        backgroundColor: '#0069a8',
        width: '100%',
    },
    columnHeader: {
        flexGrow: 1,
        backgroundColor: '#e5e5e5',
    },
    header: {
        ...PdfStyles.h3,
        marginBottom: 0,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    column: {
        ...PdfStyles.p3,
        height: '100%',
        lineHeight: 1,
        marginBottom: 0,
        padding: 5,
    },
    borderBottom: {
        borderBottom: '1px solid #0069a8',
    },
});

export type GenericDataType = {
    [key: string]: number | string;
};

export type PdfTableColumnDefinition<DataType, DataKey extends keyof DataType> = Omit<
    ColumnDefinition<DataType, DataKey>,
    'label' | 'sortable' | 'template'
> & {
    label?: string;
    style?: Style | Style[];
    visible?: boolean;
    template?: (props: { column: PdfTableColumnDefinition<DataType, DataKey>; row: DataType }) => JSX.Element;
};

export type PdfTableRowTemplatePros<DataType, DataKey extends keyof DataType> = {
    columns: PdfTableColumnDefinition<DataType, DataKey>[];
    row: DataType;
    index: number;
};

type TableProps<DataType, DataKey extends keyof DataType> = {
    columns: PdfTableColumnDefinition<DataType, DataKey>[];
    data: DataType[];
    tableStyles?: Style;
    tableHeader?: string;
    tableSubTitle?: string;
    columnHeader?: boolean;
    rowTemplate?: (props: PdfTableRowTemplatePros<DataType, DataKey>) => JSX.Element;
};

export function PdfTable<DataType, DataKey extends keyof DataType>(props: TableProps<DataType, DataKey>) {
    const { columns, data, columnHeader, tableHeader, tableSubTitle, tableStyles, rowTemplate } = props;

    const renderTableHeader = (variant: 'tableHeader' | 'columnHeader') => (
        <View style={PdfTableStyles.row}>
            <Text
                style={{
                    ...PdfTableStyles[variant],
                    ...PdfTableStyles.header,
                    ...PdfTableStyles.column,
                    ...PdfTableStyles.borderBottom,
                    width: '100%',
                }}
            >
                {variant == 'tableHeader' ? tableHeader : tableSubTitle}
            </Text>
        </View>
    );

    const renderColumnHeader = () =>
        columns.map((column, index) =>
            column.visible === false ? null : (
                <View style={PdfTableStyles.row} key={index}>
                    <Text
                        style={{
                            textAlign: column.align || 'left',
                            width: column.width,
                            ...PdfTableStyles.header,
                            ...PdfTableStyles.columnHeader,
                            ...PdfTableStyles.column,
                            ...PdfTableStyles.borderBottom,
                        }}
                    >
                        {column.label}
                    </Text>
                </View>
            ),
        );

    const renderBody = () =>
        data.map((row, index) => (rowTemplate ? renderCustomRow(row, index) : renderDefaultRow(row, index)));

    const renderDefaultRow = (row: DataType, index: number) => (
        <View style={PdfTableStyles.row} key={index} wrap={false}>
            {columns.map((column, index) =>
                column.template ? renderCustomColumn(column, row) : renderDefaultColumn(column, row, index),
            )}
        </View>
    );

    const renderCustomRow = (row: DataType, index: number) => {
        return rowTemplate && rowTemplate({ columns, row, index });
    };

    const renderDefaultColumn = (column: PdfTableColumnDefinition<DataType, DataKey>, row: DataType, index: number) => {
        return column.visible === false ? null : (
            <Text
                key={index}
                style={{
                    textAlign: column.align || 'left',
                    width: column.width,
                    ...PdfTableStyles.column,
                    ...column.style,
                }}
            >
                <>{row[column.id]}</>
            </Text>
        );
    };

    const renderCustomColumn = (column: PdfTableColumnDefinition<DataType, DataKey>, row: DataType) =>
        column.template && column.template({ column, row });

    return (
        <View style={{ ...PdfTableStyles.tableContainer, ...tableStyles }}>
            {tableHeader && renderTableHeader('tableHeader')}
            {tableSubTitle && renderTableHeader('columnHeader')}
            {columnHeader && renderColumnHeader()}
            {data.length && renderBody()}
        </View>
    );
}
