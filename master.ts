import * as net from "net";
import * as fs from 'fs';
import { ClientRequestEnum, Master, port_master, sleep } from './config';

function writeRow(text: string) {
    fs.appendFileSync('output.txt', `${text}\n`);
}

const pendingResponses = new Map<string, { resolve: () => void, reject: (err: any) => void }>();

function waitForResponse(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
        pendingResponses.set(key, { resolve, reject });
    });
}

function resolveResponse(key: string) {
    const promise = pendingResponses.get(key);
    if (promise) {
        promise.resolve();
        pendingResponses.delete(key);
    }
}

async function main(){
    const filePath: string = 'input.txt';
    const content: string = fs.readFileSync(filePath, 'utf-8');
    const lines: string[] = content.split(/\r?\n/).filter(line => line.trim() !== '');
    const client = new Master();
    
    let commandId = 0;
    
    const server = net.createServer(function(socket) {
        console.log("Master server : connection from", socket.remoteAddress, "port", socket.remotePort)
        socket.on("data", (data) => {
            console.log("Request from", socket.remoteAddress, "port", socket.remotePort)
            const response = JSON.parse(data.toString("utf-8"));
            const port_client = response.this_client;
            
            switch(response.action){
                case(ClientRequestEnum.DICTIONARY_SUCCESS):
                    writeRow(response.dict);
                    resolveResponse(`dictionary-${response.commandId}`);
                    break;
                case(ClientRequestEnum.INSERT_SUCCESS):
                    writeRow(`SUCCESS <insert ${response.perm} ${response.grade} ${port_client}>`)
                    resolveResponse(`insert-${response.commandId}`);
                    break;
                case(ClientRequestEnum.LOOKUP_SUCCESS):
                    writeRow(`LOOKUP <${response.perm}, ${response.grade}>`)
                    resolveResponse(`lookup-${response.commandId}`);
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
        const currentCommandId = commandId++;
        
        switch(command[0]){
            case ('insert'):
                await client.INSERT_REQUEST(
                    parseInt(command[3]),
                    parseInt(command[1]),
                    command[2],
                    currentCommandId
                );
                await waitForResponse(`insert-${currentCommandId}`);
                break;
            case ('wait'):
                await sleep(parseInt(command[1]) * 1000);
                break;
            case ('lookup'):
                await client.LOOKUP_REQUEST(
                    parseInt(command[2]),
                    parseInt(command[1]),
                    currentCommandId
                );
                await waitForResponse(`lookup-${currentCommandId}`);
                break;
            case ('dictionary'):
                await client.DICTIONARY_REQUEST(
                    parseInt(command[1]),
                    currentCommandId
                );
                await waitForResponse(`dictionary-${currentCommandId}`);
                break;
            default:
                if (command[0]) {
                    throw Error('Unknown command: ' + command[0]);
                }
        }
    }
    
    console.log("All commands completed");
    process.exit(0);
}

fs.writeFileSync('output.txt', '');
main().catch(console.error);
