import { API, Service, PlatformAccessory, Characteristic, CharacteristicValue, Logger } from 'homebridge';
import { Client } from './myair/client';
import { Root, AirCon, Zone } from './myair/model';

export class ThermostatAccessory {
    private thermostat: Service;
    private currentHeatingCoolingState: Characteristic;
    private currentTemperature: Characteristic;
    private targetHeatingCoolingState: Characteristic;
    private targetTemperature: Characteristic;

    private airCon: AirCon;
    private zone: Zone;

    constructor(
        private readonly log: Logger,
        private readonly api: API,
        private readonly client: Client,
        private readonly accessory: PlatformAccessory,
        private root: Root,
    ) {
        this.accessory.getService(this.api.hap.Service.AccessoryInformation)!
            .setCharacteristic(this.api.hap.Characteristic.Manufacturer, 'Advantage Air')
            .setCharacteristic(this.api.hap.Characteristic.Model, 'MyAir')
            .setCharacteristic(this.api.hap.Characteristic.SerialNumber, `${accessory.context.acID}.${accessory.context.zoneID} (${accessory.context.zoneName})`)

        this.thermostat = this.accessory.getService(this.api.hap.Service.Thermostat) ||
            this.accessory.addService(this.api.hap.Service.Thermostat);

        this.currentHeatingCoolingState = this.thermostat.getCharacteristic(this.api.hap.Characteristic.CurrentHeatingCoolingState);
        this.currentTemperature = this.thermostat.getCharacteristic(this.api.hap.Characteristic.CurrentTemperature);

        this.targetHeatingCoolingState = this.thermostat.getCharacteristic(this.api.hap.Characteristic.TargetHeatingCoolingState);
        this.targetHeatingCoolingState.onSet(this.setTargetHeatingCoolingState.bind(this));

        this.targetTemperature = this.thermostat.getCharacteristic(this.api.hap.Characteristic.TargetTemperature);
        this.targetTemperature.onSet(this.setTargetTemperature.bind(this));

        this.thermostat.getCharacteristic(this.api.hap.Characteristic.TemperatureDisplayUnits)
            .onGet(() => this.api.hap.Characteristic.TemperatureDisplayUnits.CELSIUS);

        this.client.onStateChange(
            (root: Root) => {
                this.root = root;
                this.airCon = this.root.aircons[this.accessory.context.acID];
                this.zone = this.airCon.zones[this.accessory.context.zoneID];
                this.handleStateChange();
            }
        );

        this.root = root;
        this.airCon = this.root.aircons[this.accessory.context.acID];
        this.zone = this.airCon.zones[this.accessory.context.zoneID];
        this.handleStateChange();

        // this.targetHeatingCoolingState.updateValue(
        //     this.currentHeatingCoolingState.value == this.api.hap.Characteristic.CurrentHeatingCoolingState.OFF
        //         ? this.api.hap.Characteristic.TargetHeatingCoolingState.OFF
        //         : this.api.hap.Characteristic.TargetHeatingCoolingState.AUTO,
        // );

        // TODO: remove
        this.targetHeatingCoolingState.updateValue(
            this.api.hap.Characteristic.TargetHeatingCoolingState.OFF
        );
    }

    private handleStateChange() {
        const state = this.computeCurrentHeatingCoolingState();
        this.currentHeatingCoolingState.updateValue(state);
        this.currentTemperature.updateValue(this.zone.measuredTemp);
        this.targetTemperature.updateValue(this.zone.setTemp);
    }

    private computeCurrentHeatingCoolingState(): CharacteristicValue {
        if (this.airCon.info.state === 'on' && this.zone.state === 'open') {
            switch (this.airCon.info.mode) {
                case 'cool':
                    return this.api.hap.Characteristic.CurrentHeatingCoolingState.COOL;
                case 'heat':
                    return this.api.hap.Characteristic.CurrentHeatingCoolingState.HEAT;
            }
        }

        return this.api.hap.Characteristic.CurrentHeatingCoolingState.OFF;
    }

    /**
     * Handle requests to set the "Target Heating Cooling State" characteristic
     */
    private async setTargetHeatingCoolingState(value: CharacteristicValue) {
        // TODO: remove
        this.targetHeatingCoolingState.updateValue(
            this.api.hap.Characteristic.TargetHeatingCoolingState.OFF
        );

        // const zoneIsOn = value === this.api.hap.Characteristic.TargetHeatingCoolingState.AUTO;
        // const [mode, myZone, acIsOn] = this.decideModeAndMyZone(zoneIsOn);

        // await this.client.setAirConPower(this.accessory.context.acID, acIsOn);

        // if (acIsOn) {
        //     await this.client.setAirConMode(this.accessory.context.acID, mode)
        //     await this.client.setMyZone(this.accessory.context.acID, myZone.number)
        //     await this.client.setZoneMode(this.accessory.context.acID, this.accessory.context.zoneID, zoneIsOn)
        // }
    }

    /**
     * Handle requests to set the "Target Temperature" characteristic
     */
    private async setTargetTemperature(value: CharacteristicValue) {
        await this.client.setZoneTargetTemp(
            this.accessory.context.acID,
            this.accessory.context.zoneID,
            <number>value,
        )
    }

    private decideModeAndMyZone(includeSelf: boolean): ['cool' | 'heat', Zone, boolean] {
        let needsCool: Zone[] = [];
        let needsHeat: Zone[] = [];

        for (const zoneID in this.airCon.zones) {
            const zone = this.airCon.zones[zoneID];

            if (zone.number === this.zone.number) {
                if (!includeSelf) {
                    continue;
                }
            } else if (zone.state !== 'open') {
                continue;
            }
 
            const error = zone.measuredTemp - zone.setTemp;

            if (error > 0.5) {
                console.log(zone.name, " needs cooling from ", zone.measuredTemp, " to ", zone.setTemp);
                needsCool.push(zone)
            } else if (error < -0.5) {
                console.log(zone.name, " needs heating from ", zone.measuredTemp, " to ", zone.setTemp);
                needsHeat.push(zone)
            }
        }

        if (needsCool.length === 0 && needsHeat.length === 0) {
            return ['cool', this.zone, false];
        }

        if (needsHeat.length > needsCool.length) {
            needsHeat.sort((a, b) => a.measuredTemp - b.measuredTemp)
            console.log("heating, myzone is ", needsHeat[0].name);
            return ['heat', needsHeat[0], true];
        }

        needsCool.sort((a, b) => b.measuredTemp - a.measuredTemp)
        console.log("cooling, myzone is ", needsHeat[0].name);
        return ['cool', needsCool[0], true];
    }
}
