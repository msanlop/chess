import { useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from '../hook/useSocket';
import { RECONNECTION_ATTEMPTS, RECONNECTION_DELAY, SocketContext, SocketProvider } from '../SocketProvider';
import '../style/ChatBox.css'

interface ChatProps {
    connected : boolean;
}


export const ChatBox = (props:ChatProps) =>  {
    const [message, setMessage] = useState("")
    const [messages, setMessages] = useState<string[][]>([])
    const messagesRef = useRef<string[][]>([])
    const socket = useSocket()

    messagesRef.current = messages

    
    useEffect(() => {
        socket?.on("newChat", (msg : string) => {setMessages([...messagesRef.current, ['chat', msg]])})
        socket?.on("newInfo", (msg : string) => setMessages([...messagesRef.current, ['info', msg]]))
    }, [props.connected])

    const sendMessage = (form : any) => {
        socket?.emit('chatMessage', message)
        if(form) {
            form.preventDefault();
            form.target[0].value = ""
        } 
        setMessage("")
    }

    useEffect(() => {
        // if(!socket.active && !socket.connected){
        //     setMessages([...messagesRef.current, ['info', "Could not reach the server. Try reloading the page or creating a new game."]])
        // }
        if(socket.active && !socket.connected){
            setMessages([...messagesRef.current, ['info', "Trying to connect to the server..."]])
        }
        
    }, [socket, props.connected])
    
    useEffect(() => scrollToBottom(), [messages])
    
    let endOfFeed : HTMLDivElement | null;
    //scroll to invisible last element (https://stackoverflow.com/questions/37620694/how-to-scroll-to-bottom-in-react)
    const scrollToBottom = () => {
        endOfFeed?.scrollIntoView({ behavior: "smooth" });
    }

    return(
        <div>
            <div className="chat-feed">
                {messages.map((msg, index) => 
                    <p key={index} 
                        id={msg[0]} 
                        className={msg[1].startsWith("black") ? "chat-black" : "chat-white"}>
                            {msg[1]}
                    </p>)}
                <div style={{ float:"left", clear: "both" }}
                    ref={(el) => {endOfFeed = el}}>
                </div>
            </div>

            <form onSubmit={sendMessage} className="chat-form">
                <input onInput={(e : any) => setMessage(e.target.value)}
                    style={{marginRight:"5px"}}></input>
                <input type="submit" value="Send" />
            </form>
        </div>
    )
}