

const Timer = (props:any) => {
    const BLACK_TIMER_COLOR = "white"
    const BLACK_TIMER_BG_COLOR = "black"
    const WHITE_TIMER_COLOR = "black"
    const WHITE_TIMER_BG_COLOR = "white"

    const msToMin = (ms:number) => {
        const min = Math.floor((ms/ (1000 *60)));
        const sec = Math.floor((ms/1000) % 60);
        const secString = sec < 10 ? '0' + String(sec) : String(sec)
        return min.toString() + ":" + secString
    }
    
    let colorStyles
    if(props.color === "b") {
        colorStyles = {
            color: BLACK_TIMER_COLOR, 
            backgroundColor: BLACK_TIMER_BG_COLOR}
    } else {
        colorStyles = {
            color: WHITE_TIMER_COLOR, 
            backgroundColor: WHITE_TIMER_BG_COLOR}
    }

    return(
        <div className={"timer"} style={colorStyles}>
                {msToMin(props.timerValue)} 
        </div>
    )
}



export default Timer;