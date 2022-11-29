import { createContext } from "react";
import { io } from "socket.io-client";

export const RECONNECTION_ATTEMPTS = 3;
export const RECONNECTION_DELAY = 1000;

const socket = io('http://localhost:8080', {
    autoConnect: false,
    query: {
    token : "",
    },
    reconnectionAttempts : RECONNECTION_ATTEMPTS,
    reconnectionDelay : RECONNECTION_DELAY
})
console.log("context ", socket);

export const SocketContext = createContext(socket)

//inspired from https://thenable.io/building-a-use-socket-hook-in-react
export const SocketProvider = (props : any) => {
    
    return (
        <SocketContext.Provider value={socket}>
            {props.children}
        </SocketContext.Provider>
    )
}