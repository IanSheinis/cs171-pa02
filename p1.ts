import * as net from "net";
import { Client, ClientRequestEnum, MasterRequestEnum, port_p1, port_p2, port_p3, sleep } from "./config";
const this_client = 1; //TODO: change when copying over
let local_clock = 0;
const dict = new Map<number,string>();
let temp_perm: number = -1;
let temp_grade: string = "NAN";
let lamport_success_counter = 0;
let lamport_reply_counter = 0;


function initiateClockServer() {
    const server = net.createServer(function(socket) {
        console.log("P1 : connection from", socket.remoteAddress, "port", socket.remotePort)//TODO

        socket.on("data", async (data) => {
            console.log("Request from", socket.remoteAddress, "port", socket.remotePort)
            const response = JSON.parse(data.toString("utf-8"));
            if (response.id == "client") {
                await sleep(3000); // "You should add a 3 second delay before processing a received message."
                const client = new Client();
                const client_number = response.this_client;
                switch(response.action){
                    case(ClientRequestEnum.LAMPORT_REQUEST):
                        local_clock = Math.max(local_clock, response.timestamp) + 1;;
                        await client.Lamport.LAMPORT_REPLY(this_client, client_number);
                        break;
                    case(ClientRequestEnum.LAMPORT_REPLY):
                        lamport_reply_counter++;
                        if (lamport_reply_counter == 2) {
                            await client.Lamport.LAMPORT_INSERT(this_client, (this_client % 3) + 1, temp_perm, temp_grade);
                            await client.Lamport.LAMPORT_INSERT(this_client, ((this_client + 1) % 3) + 1, temp_perm, temp_grade);
                            dict.set(temp_perm, temp_grade);
                            lamport_reply_counter = 0;
                        }
                        break;
                    case(ClientRequestEnum.LAMPORT_INSERT):
                        dict.set(response.perm, response.grade);
                        await client.Lamport.LAMPORT_SUCCESS(this_client, client_number);
                        break;
                    case(ClientRequestEnum.LAMPORT_SUCCESS):
                        await client.Lamport.LAMPORT_RELEASE(this_client, client_number);
                        lamport_success_counter+=1;
                        if (lamport_success_counter == 2) {
                            const perm = temp_perm;
                            const grade = dict.get(temp_perm);
                            if(!grade) throw Error('INSERT_SUCCESS failed, grade undefined for: ' + perm);
                            await client.Master.INSERT_SUCCESS(this_client, temp_perm,grade);
                            lamport_success_counter = 0;
                        }
                        break;
                    case(ClientRequestEnum.LAMPORT_RELEASE):
                        console.log("Received release");
                        break;
                }
            }
            else if (response.id == "master") {
                const client = new Client();
                switch(response.action){
                    case(MasterRequestEnum.INSERT_REQUEST):
                        temp_perm = response.perm;
                        temp_grade = response.grade;
                        local_clock++;
                        await client.Lamport.LAMPORT_REQUEST(this_client, (this_client % 3) + 1, local_clock);
                        await client.Lamport.LAMPORT_REQUEST(this_client, ((this_client + 1) % 3) + 1, local_clock);
                        break;
                    case(MasterRequestEnum.LOOKUP_REQUEST):
                        const perm = response.perm;
                        const grade = dict.get(perm);
                        if (!grade) throw Error('No perm in dict');
                        await client.Master.LOOKUP_SUCCESS(this_client, perm, grade);
                        break;
                    case(MasterRequestEnum.DICTIONARY_REQUEST):
                        await client.Master.DICTIONARY_SUCCESS(this_client, dict);
                        break;
                }
            }
            else {
                throw Error("Invalid response id");
            }
        })

        socket.on("end", () => {
            console.log("Closed", socket.remoteAddress, "port", socket.remotePort)
        })
    });

    server.listen(port_p1, function() { // TODO when copying change each to right port
        console.log("Socket is listening...");
    });
}

if (require.main === module) {
    // Trigger the Clock Server    
    initiateClockServer();
}