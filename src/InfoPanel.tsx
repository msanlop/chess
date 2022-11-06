import HistoryControls from "./HistoryControls";
import Timer from "./Timer";




const InfoPanel = (props:any) =>{

    return(
        <>
            <Timer timerValue={props.timers.b} color="b"/>
            <HistoryControls onClick={props.onClick}/>
            <Timer timerValue={props.timers.w} color="w"/>
        </>
    )
}


export default InfoPanel;