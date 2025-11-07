import * as net from "net"; // Socket library
import * as fs from 'fs';
import { ClientRequestEnum, Master, port_master, sleep } from './config';

function writeRow(text: string) {
    fs.appendFileSync('output.txt', `${text}\n`);
}

async function main(){
    const filePath: string = 'input.txt';
    const content: string = fs.readFileSync(filePath, 'utf-8');
    const lines: string[] = content.split(/\r?\n/);
    const client = new Master();
    
    const server = net.createServer(function(socket) {
        console.log("Master server : connection from", socket.remoteAddress, "port", socket.remotePort)
        socket.on("data", (data) => {
            console.log("Request from", socket.remoteAddress, "port", socket.remotePort)
            const response = JSON.parse(data.toString("utf-8"));
            const port_client = response.this_client
            switch(response.action){
                case(ClientRequestEnum.DICTIONARY_SUCCESS):
                    writeRow(JSON.stringify(response.dict));
                    break;
                case(ClientRequestEnum.INSERT_SUCCESS):
                    writeRow(`SUCCESS <insert ${response.perm} ${response.grade} ${port_client}>`)
                    break;
                case(ClientRequestEnum.LOOKUP_SUCCESS):
                    writeRow(`LOOKUP <${response.perm}, ${response.grade}>`)
                    break;
                default:
                    throw Error('Invalid master request');
            }
        })
    })

    await new Promise<void>((resolve) => {
        server.listen(port_master, function() {
            console.log("Master socket is listening...");
            resolve();
        });
    });
    
    for (const line of lines) {
        const command: string[] = line.split(' ');
        switch(command[0]){
            case ('insert'):
                await client.INSERT_REQUEST(
                    parseInt(command[3]),
                    parseInt(command[1]),
                    command[2],
                )
                break;
            case ('wait'):
                await sleep(parseInt(command[1]) * 1000)
                break;
            case ('lookup'):
                await client.LOOKUP_REQUEST(
                    parseInt(command[2]),
                    parseInt(command[1])
                )
                break;
            case ('dictionary'):
                await client.DICTIONARY_REQUEST(parseInt(command[1]))
                break;
            default:
                throw Error('Unknown command');
        }
    }
}

fs.writeFileSync('output.txt', '');
main().catch(console.error);