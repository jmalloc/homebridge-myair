import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { Client } from './myair/client';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { ThermostatAccessory } from './thermostat';

export class MyAirPlatform implements DynamicPlatformPlugin {
    private readonly accessories: PlatformAccessory[] = [];
    private readonly client: Client
    private intervalID;

    constructor(
        public readonly log: Logger,
        public readonly config: PlatformConfig,
        public readonly api: API,
    ) {
        this.client = new Client(
            this.config.address,
            this.config.port || 2025,
        )

        this.api.on('didFinishLaunching', () => {
            this.discoverDevices();
            this.intervalID = setInterval(this.poll.bind(this), 3000)
        });

        this.api.on('shutdown', () => {
            clearInterval(this.intervalID);
        })
    }

    /**
     * This function is invoked when homebridge restores cached accessories from disk at startup.
     * It should be used to setup event handlers for characteristics and update respective values.
     */
    configureAccessory(accessory: PlatformAccessory) {
        this.accessories.push(accessory);
    }

    /**
     * This is an example method showing how to register discovered accessories.
     * Accessories must only be registered once, previously created accessories
     * must not be registered again to prevent "duplicate UUID" errors.
     */
    async discoverDevices() {
        const root = await this.client.read();
        const unregistered: PlatformAccessory[] = [];

        for (const acID in root.aircons) {
            const ac = root.aircons[acID]

            for (const zoneID in ac.zones) {
                const zone = ac.zones[zoneID];
                const uuid = this.api.hap.uuid.generate(`myair.${acID}.${zoneID}`);

                let accessory = this.accessories.find(
                    (acc) => acc.UUID === uuid,
                );

                const context = {
                    acID,
                    zoneID,
                    zoneName: zone.name,
                }

                if (accessory) {
                    this.log.info(`Loaded '${accessory.displayName}' accessory from cache`);
                    accessory.context = context
                    this.api.updatePlatformAccessories([accessory]);
                } else {
                    const name = `${zone.name} Thermostat`;
                    this.log.info(`Discovered '${name}' accessory`);

                    accessory = new this.api.platformAccessory(name, uuid);
                    accessory.context = context
                    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
                }

                new ThermostatAccessory(
                    this.log,
                    this.api,
                    this.client,
                    accessory,
                    root,
                );
            }
        }
    }

    async poll() {
        this.client.read(); // trigger listeners
    }
}
