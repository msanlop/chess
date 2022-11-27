import { useState } from 'react';
import '../style/ChatBox.css'

interface ChatProps {
    messages : string[];
}



//DO NOT LOOK AT THIS CODE !!!! I JUST WANT TO GET THIS DONE FAST
export const ChatBox = (props:ChatProps) =>  {
    const [message, setMessage] = useState("")

    const sendMessage = (form : any) => {
        console.log(message);
        
        if(form) {
            form.preventDefault();
            form.target[0].value = ""
        } 
        setMessage("")
    }
    
    // const onInputPress = (keyPressEvent : React.KeyboardEvent<HTMLInputElement>) => {
    //     if(keyPressEvent.code === 'Enter' && !keyPressEvent.shiftKey){
    //         // sendMessage(undefined)
    //     }
    // }

    return(
        <div className="chat-feed">
            {props.messages.map(msg => 
                <p>msg</p>    
            )}

            <form onSubmit={sendMessage} className="chat-form">
                {/* <input className='chat-input'
                    type={"text"}></input> */}
                <input onInput={(e : any) => setMessage(e.target.value)}></input>
                <input type="submit" value="Send" />
            </form>
        </div>
    )
}