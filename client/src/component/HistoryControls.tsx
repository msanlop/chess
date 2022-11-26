import {ReactComponent as SingleArrow} from '../res/single-arrow.svg'
import {ReactComponent as DoubleArrow} from '../res/double-arrow.svg'
import '../style/HistoryControls.css'

const HistoryControls = (props:any) => {
    return(
        <div className='history-arrows' >
            <SingleArrow 
                transform='rotate(180)'
                onClick={() => props.onClick('b')}/>
            <SingleArrow 
                onClick={() => props.onClick('f')}/>
            <DoubleArrow 
                transform='scale(1.4)'
                onClick={() => props.onClick('p')}/>
        </div>
    )
}


export default HistoryControls;