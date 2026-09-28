import { StyleSheet } from '@react-pdf/renderer';

export const pageMargin = 50;

export const PdfStyles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        alignContent: 'center',
        justifyContent: 'flex-start',
        fontFamily: 'Roboto',
        color: '#000',
        backgroundColor: '#FFF',
        padding: pageMargin,
        paddingTop: pageMargin + 10,
        paddingBottom: pageMargin + 10,
    },
    section: {
        paddingBottom: pageMargin / 2,
    },
    left: {
        textAlign: 'left',
    },
    right: {
        textAlign: 'right',
    },
    center: {
        textAlign: 'center',
    },
    header: {
        position: 'absolute',
        fontSize: 8,
        top: pageMargin * 0.7,
        left: pageMargin,
        right: pageMargin,
    },
    footer: {
        position: 'absolute',
        fontSize: 8,
        bottom: pageMargin * 0.7,
        left: pageMargin,
        right: pageMargin,
    },
    h1: {
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 1.5,
    },
    h2: {
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 1.3,
        marginBottom: 15,
    },
    h3: {
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    p2: {
        fontSize: 13,
        marginBottom: 10,
    },
    p3: {
        fontSize: 10,
        lineHeight: 1.33,
        marginBottom: 6,
    },
    p4: {
        fontSize: 9,
        lineHeight: 1.33,
        marginBottom: 0,
    },
    link: {
        color: '#000',
        textDecoration: 'none',
    },
});
