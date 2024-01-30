import { createContext } from "react";
import { io } from "socket.io-client";

export const RECONNECTION_ATTEMPTS = 3;
export const RECONNECTION_DELAY = 1000;

const PLAYER_ID_TOKEN = document.cookie.substring("token=".length) ?? 'tokenw' //TODO: remove default
// const PLAYER_ID_TOKEN = localStorage.getItem('token') ?? 'tokenw' //TODO: remove default
const SERVER_URL = 'http://localhost:8080' 

const socket = io(SERVER_URL, {
    autoConnect: false,
    query: {
    token : PLAYER_ID_TOKEN,
    },
    reconnectionAttempts : RECONNECTION_ATTEMPTS,
    reconnectionDelay : RECONNECTION_DELAY
})
export const SocketContext = createContext(socket)

//inspired from https://thenable.io/building-a-use-socket-hook-in-react
export const SocketProvider = (props : any) => {
    
    return (
        <SocketContext.Provider value={socket}>
            {props.children}
        </SocketContext.Provider>
    )
}