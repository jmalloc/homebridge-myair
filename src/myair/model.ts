export interface Root {
    system: System;
    aircons: { [key: string]: AirCon };
}

export interface System {
    // aaServiceRev: string;
    // allTspErrorCodes: object;
    // country: string;
    // deviceIds: string[];
    // deviceIdsV2: Record<string, string>;
    // drawLightsTab: boolean;
    // drawThingsTab: boolean;
    // garageDoorReminderWaitTime: number;
    // garageDoorSecurityPinEnabled: boolean;
    // hasAircons: boolean;
    // hasLights: boolean;
    // hasSensors: boolean;
    // hasThings: boolean;
    // hasThingsBOG: boolean;
    // hasThingsLight: boolean;
    // latitude: number;
    // longitude: number;
    // mid: string;
    // myAppRev: string;
    // name: string;
    // needsUpdate: boolean;
    // noOfAircons: number;
    // noOfSnapshots: number;
    // postCode: string;
    // rid: string;
    // showMeasuredTemp: boolean;
    // sysType: string;
    // tspErrorCode: string;
    // tspIp: string;
    // tspModel: string;
    // versions: object;
}

export interface AirCon {
    info: AirConInfo;
    zones: { [key: string]: Zone };
}

export interface AirConInfo {
    uid: string;
    state: 'on' | 'off';
    mode: 'cool' | 'heat' | 'vent' | 'dry';
    myZone: number;
    // aaAutoFanModeEnabled: boolean;
    // activationCodeStatus: string;
    // airconErrorCode: string;
    // cbFWRevMajor: number;
    // cbFWRevMinor: number;
    // cbType: number;
    // climateControlModeEnabled: boolean;
    // climateControlModeIsRunning: boolean;
    // constant1: number;
    // constant2: number;
    // constant3: number;
    // countDownToOff: number;
    // countDownToOn: number;
    // fan: string;
    // filterCleanStatus: number;
    // freshAirStatus: string;
    // myAutoModeCurrentSetMode: string;
    // myAutoModeEnabled: boolean;
    // myAutoModeIsRunning: boolean;
    // name: string;
    // noOfConstants: number;
    // noOfZones: number;
    // quietNightModeEnabled: boolean;
    // quietNightModeIsRunning: boolean;
    // rfFWRevMajor: number;
    // rfSysID: number;
    // setTemp: number;
    // unitType: number;
}

export interface Zone {
    number: number;
    name: string;
    state: 'open' | 'close';
    setTemp: number;
    measuredTemp: number;
    // error: number;
    // maxDamper: number;
    // minDamper: number;
    // motion: number;
    // motionConfig: number;
    // rssi: number;
    // tempSensorClash: boolean;
    // type: number;
    // value: number;
}
