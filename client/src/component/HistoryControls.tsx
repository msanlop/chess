import {ReactComponent as DoubleArrow} from '../res/double-arrow.svg'
import {ReactComponent as SingleArrow} from '../res/single-arrow.svg'
import {ReactComponent as SingleBackArrow} from '../res/single-back-arrow.svg'
import {ReactComponent as DoubleBackArrow} from '../res/double-back-arrow.svg'
import '../style/HistoryControls.css'

const HistoryControls = (props:any) => {
    return(
        <div className='history-arrows' >
            <DoubleArrow
                transform='scale(1.4), rotate(180)'
                onClick={() => props.onClick('start')}/>
            <SingleArrow 
                transform='rotate(180)'
                onClick={() => props.onClick('step-back')}/>
            <SingleArrow 
                onClick={() => props.onClick('step')}/>
            <DoubleArrow 
                transform='scale(1.4)'
                onClick={() => props.onClick('present')}/>
        </div>
    )
}


export default HistoryControls;