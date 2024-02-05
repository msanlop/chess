import { ReactComponent as DoubleArrow } from "../res/double-arrow.svg";
import { ReactComponent as SingleArrow } from "../res/single-arrow.svg";
import { ReactComponent as SingleBackArrow } from "../res/single-back-arrow.svg";
import { ReactComponent as DoubleBackArrow } from "../res/double-back-arrow.svg";
import "../style/HistoryControls.css";

const HistoryControls = (props: any) => {
  //TODO: svg not rotating on mobile
  //TODO: style the buttons better
  return (
    <div className="history-arrows">
      <button onClick={() => props.onClick("start")}>
        <DoubleArrow transform="scale(1.4), rotate(180)" />
      </button>
      <button onClick={() => props.onClick("step-back")}>
        <SingleArrow transform="rotate(180)" />
      </button>
      <button onClick={() => props.onClick("step")}>
        <SingleArrow />
      </button>
      <button onClick={() => props.onClick("present")}>
        <DoubleArrow transform="scale(1.4)" />
      </button>
    </div>
  );
};

export default HistoryControls;
