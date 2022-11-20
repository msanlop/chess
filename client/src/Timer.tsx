

const Timer = (props:any) => {

    const msToMin = (ms:number) => {
        const min = Math.floor((ms/ (1000 *60)));
        const sec = Math.floor((ms/1000) % 60);
        const secString = sec < 10 ? '0' + String(sec) : String(sec)
        return min.toString() + ":" + secString
      }


    return(
        <div className={props.color + "-timer"}>{msToMin(props.timerValue)} </div>
    )
}



export default Timer;