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
        socket?.on("newChat", (msg : string) => {setMessages([['chat', msg], ...messagesRef.current])})
        socket?.on("newInfo", (msg : string) => setMessages([['info', msg], ...messagesRef.current]))
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
            setMessages([['info', "Trying to connect to the server..."], ...messagesRef.current])
        }
        
    }, [socket, props.connected])
    
    useEffect(() => scrollToBottom(), [messages])
    
    let endOfFeed : HTMLDivElement | null;
    //scroll to invisible last element (https://stackoverflow.com/questions/37620694/how-to-scroll-to-bottom-in-react)
    const scrollToBottom = () => {
        // endOfFeed?.scrollIntoView({ behavior: "smooth" });
        if (endOfFeed) endOfFeed.scrollTop = endOfFeed.scrollHeight;

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