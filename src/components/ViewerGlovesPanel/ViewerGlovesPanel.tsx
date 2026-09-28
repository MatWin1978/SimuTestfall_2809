import Viewer from 'react-viewer';

function ViewerGlovesPanel(props: any) {
    return (
        <Viewer
            {...props}
            images={[{src: `./images/gloves-panel/gloves-panel.png`}]}
            attribute={false}
            downloadable={false}
            noToolbar={true}
            noImgDetails={true}
            noFooter={true}
            changeable={false}
            zoomSpeed={0.12}
            noClose={true}
        />)
}

export default ViewerGlovesPanel;
