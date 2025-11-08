import * as net from "net";
export let port_p1 = 3100;
export let port_p2 = 3101;
export let port_p3 = 3102;
export let port_master = 3103;

const args = process.argv.slice(2); // Skip node and script name
for (let i = 0; i < args.length; i += 2) {
  const key = args[i];
  const value = args[i + 1];

  switch (key) {
    case "-port":
      port_master = parseInt(value);
      break;
    case "-port1":
      port_p1 = parseInt(value);
      break;
    case "-port2":
      port_p2 = parseInt(value);
      break;
    case "-port3":
      port_p3 = parseInt(value);
      break;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export enum MasterRequestEnum {
    INSERT_REQUEST,
    LOOKUP_REQUEST,
    DICTIONARY_REQUEST
}

export enum ClientRequestEnum {
    INSERT_SUCCESS,
    LOOKUP_SUCCESS,
    DICTIONARY_SUCCESS,
    LAMPORT_REQUEST,
    LAMPORT_REPLY,
    LAMPORT_INSERT,
    LAMPORT_SUCCESS,
    LAMPORT_RELEASE
}

export function findPort(client: number): number{
    let port = -1;
    switch(client) {
        case 1:
            port = port_p1;
            break;
        case 2:
            port = port_p2;
            break;
        case 3:
            port = port_p3;
            break;
        default:
            throw Error('Port undefined');
    }
    return port
}

/**
 * Send request to client or process
 * @returns servertime and round trip time 
 */
async function sendRequest(obj: any, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    
    // Send to port the obj
    client.connect({ port, host: "127.0.0.1" }, () => {
      const message = JSON.stringify(obj);
      client.write(message);
      client.end();
      resolve();
    });
    
    client.on("error", reject);
  });
}

export class Master {
    private id = "master"
    constructor() {}
    public async INSERT_REQUEST(client: number, perm: number, grade: string, commandId: number){
        let port = findPort(client);
        console.log(`[MASTER → C${client}] INSERT_REQUEST(perm=${perm}, grade=${grade}, commandId=${commandId})`);
        await sendRequest({
            id: this.id,
            action: MasterRequestEnum.INSERT_REQUEST,
            perm,
            grade,
            commandId
        }, port)
    }
    public async LOOKUP_REQUEST(client: number, perm: number, commandId: number){
        let port = findPort(client);
        console.log(`[MASTER → C${client}] LOOKUP_REQUEST(perm=${perm}, commandId=${commandId})`);
        await sendRequest({
            id: this.id,
            action: MasterRequestEnum.LOOKUP_REQUEST,
            perm,
            commandId
        }, port)
    }
    public async DICTIONARY_REQUEST(client: number, commandId: number){
        let port = findPort(client);
        console.log(`[MASTER → C${client}] DICTIONARY_REQUEST(commandId=${commandId})`);
        await sendRequest({
            id: this.id,
            action: MasterRequestEnum.DICTIONARY_REQUEST,
            commandId
        }, port)
    }
}

class Client_Master {
    private id: string;
    constructor(id: string) {
        this.id = id
    }
    public async INSERT_SUCCESS(this_client: number, perm: number, grade: string, commandId: number){
        console.log(`[C${this_client} → MASTER] INSERT_SUCCESS(perm=${perm}, grade=${grade}, commandId=${commandId})`);
        await sendRequest(
            {
                id: this.id,
                action: ClientRequestEnum.INSERT_SUCCESS,
                perm,
                grade,
                this_client,
                commandId
            }, port_master
        )
    }
    public async LOOKUP_SUCCESS(this_client: number, perm: number, grade: string, commandId: number){
        console.log(`[C${this_client} → MASTER] LOOKUP_SUCCESS(perm=${perm}, grade=${grade}, commandId=${commandId})`);
        await sendRequest(
            {
                id: this.id,
                action: ClientRequestEnum.LOOKUP_SUCCESS,
                perm,
                grade,
                this_client,
                commandId
            }, port_master
        )
    }
    public async DICTIONARY_SUCCESS(this_client: number, dict: any, commandId: number){
        console.log(`[C${this_client} → MASTER] DICTIONARY_SUCCESS(dict=${JSON.stringify(dict)}, commandId=${commandId})`);
        await sendRequest(
            {
                id: this.id,
                action: ClientRequestEnum.DICTIONARY_SUCCESS,
                dict: dict,  
                this_client,
                commandId
            }, port_master
        )
    }
}

class Client_Lamport {
    private id: string;
    constructor(id: string) {
        this.id = id
    }
    public async LAMPORT_REQUEST(this_client: number, client: number, timestamp: number){
        let port = findPort(client);
        console.log(`[C${this_client} → C${client}] LAMPORT_REQUEST(timestamp=${timestamp})`);
        await sendRequest(
            {
                id: this.id,
                action: ClientRequestEnum.LAMPORT_REQUEST,
                timestamp,
                this_client
            }, port
        )
    }
    public async LAMPORT_REPLY(this_client: number, client: number){
        let port = findPort(client);
        console.log(`[C${this_client} → C${client}] LAMPORT_REPLY`);
        await sendRequest(
            {
                id: this.id,
                action: ClientRequestEnum.LAMPORT_REPLY,
                this_client
            }, port
        )
    }
    public async LAMPORT_INSERT(this_client: number, client: number, perm: number, grade: string){
        let port = findPort(client);
        console.log(`[C${this_client} → C${client}] LAMPORT_INSERT(perm=${perm}, grade=${grade})`);
        await sendRequest(
            {
                id: this.id,
                action: ClientRequestEnum.LAMPORT_INSERT,
                perm,
                grade,
                this_client
            }, port
        )
    }
    public async LAMPORT_SUCCESS(this_client: number, client: number){
        let port = findPort(client);
        console.log(`[C${this_client} → C${client}] LAMPORT_SUCCESS`);
        await sendRequest(
            {
                id: this.id,
                action: ClientRequestEnum.LAMPORT_SUCCESS,
                this_client
            }, port
        )
    }
    public async LAMPORT_RELEASE(this_client: number, client: number){
        let port = findPort(client);
        console.log(`[C${this_client} → C${client}] LAMPORT_RELEASE`);
        await sendRequest(
            {
                id: this.id,
                action: ClientRequestEnum.LAMPORT_RELEASE,
                this_client
            }, port
        )
    }
}

export class Client {
    private id = "client";
    public readonly Master: Client_Master;
    public readonly Lamport: Client_Lamport;
    constructor() {
        this.Master = new Client_Master(this.id);
        this.Lamport = new Client_Lamport(this.id);
    }
}