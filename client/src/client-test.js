import { io } from 'socket.io-client'
import 'readline'
import { createInterface } from 'readline'


const socket = io('http://localhost:8080')
const readline = createInterface({
    input: process.stdin,
    output: process.stdout  
})


while(true) {
    readline.question("new message : ", string => {
        socket.emit('msg', string, res => {
            console.log(res);
        })
    })
}