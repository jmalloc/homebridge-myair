import fetch from 'node-fetch'
import sleep from 'sleep-promise';
import HumanDiff from 'human-object-diff'

import { URL, URLSearchParams } from 'url'
import { Root } from './model'

type Listener = (root: Root) => void;

export class Client {
    private listeners: Listener[] = [];
    private rootText: string = '';
    private root?: Root;

    constructor(
        private readonly host: string,
        private readonly port: string,
    ) {
    }

    onStateChange(fn: Listener) {
        this.listeners.push(fn);
    }

    async read(): Promise<Root> {
        await this.update()
        return this.root!;
    }

    async setAirConPower(acID: string, on: boolean) {
        await this.sendCommand({
            [acID]: {
                info: {
                    state: (on ? 'on' : 'off'),
                },
            },
        })
    }

    async setAirConMode(acID: string, mode: 'cool' | 'heat') {
        await this.sendCommand({
            [acID]: {
                info: {
                    mode: mode,
                },
            },
        })
    }

    async setMyZone(acID: string, zoneNumber: number) {
        await this.sendCommand({
            [acID]: {
                info: {
                    myZone: zoneNumber,
                },
            },
        })
    }

    async setZoneMode(acID: string, zoneID: string, open: boolean) {
        await this.sendCommand({
            [acID]: {
                zones: {
                    [zoneID]: {
                        state: (open ? 'open' : 'close'),
                    },
                },
            },
        })
    }

    async setZoneTargetTemp(acID: string, zoneID: string, temp: number) {
        await this.sendCommand({
            [acID]: {
                zones: {
                    [zoneID]: {
                        setTemp: temp,
                    },
                },
            },
        })
    }


    private async sendCommand(command) {
        const url = new URL("http://host")
        url.host = this.host;
        url.port = this.port;
        url.pathname = "/setAircon";

        const json = JSON.stringify(command);
        url.searchParams.set('json', json)

        console.log("command:", json);
        await fetch(url.toString());

        while (true) {
            if (await this.update()) {
                return;
            }
        }
    }

    private async update(): Promise<boolean> {
        const url = new URL("http://host")
        url.host = this.host;
        url.port = this.port;
        url.pathname = "/getSystemData";

        while (true) {
            const res = await fetch(url.toString());
            const text = await res.text();

            if (this.rootText === text) {
                return false;
            }

            const root = JSON.parse(text);

            if (Object.keys(root).length === 0) {
                // An empty result was returned.
                // This happens (deliberately, apparently) after a successful update.
                // We keep reading until we see a result.
                await sleep(50);
                continue;
            }

            const diff = new HumanDiff();

            if (this.root)  {
                console.log(diff.diff(this.root, root));
            }

            this.rootText = text;
            this.root = root;

            for (const fn of this.listeners) {
                fn(this.root!);
            }

            return true;
        }
    }
}
