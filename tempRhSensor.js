(function() {
    'use strict';

    // Custom Bluetooth service UUID
    const SENSIRION_DEVICE_INFO_SERVICE_UUID = 0x2800;// 180A; // 0x02010//0x180A;
    const SENSIRION_LOGGER_SERVICE_UUID = 0xF234; // 0000F234-B38D-4985-720E-0F993A68EE41;
    const SENSIRION_TEMP_SERVICE_UUID = 00002234-B38D-4985-720E-0F993A68EE41;//0x2234; //
    const SENSIRION_RH_SERVICE_UUID = 0x1234; // 00001234-B38D-4985-720E-0F993A68EE41;

    // Custom Bluetooth Characteristic UUIDs
    const SENSIRION_DEVICE_NAME_UUID = 0x2A00;
    const SyncTimeMs_UUID = 0xF235; // 0000F235-B38D-4985-720E-0F993A68EE41;
    const OldestTimestampMs_UUID = 0xF236; //0000F236-B38D-4985-720E-0F993A68EE41;
    const NewestTimestampMs_UUID = 0xF237; //0000F237-B38D-4985-720E-0F993A68EE41;
    const StartLoggerDownload_UUID = 0xF238; //0000F238-B38D-4985-720E-0F993A68EE41;
    const LoggerIntervalMs_UUID = 0xF239; //0000F239-B38D-4985-720E-0F993A68EE41;

    const SENSIRION_TEMP_UUID =0x2235; //00001235-B38D-4985-720E-0F993A68EE41; or maybe 0x1235????
    const SENSIRION_RH_UUID = 0x1235; //00002235-B38D-4985-720E-0F993A68EE41; or maybe 0x2235???????


    class TempRhSensor {
        constructor() {
            this.device = null;
            this.server = null;
            this._characteristics = new Map();
        }
        connect() {
            return navigator.bluetooth.requestDevice({ 
                filters: [{ 
                    name: 'Smart Humigadget'}],
                // optionalServices: [SENSIRION_TEMP_SERVICE_UUID] 
            })
                .then(device => {
                    this.device = device;
                    return device.gatt.connect();
                })
                .then(server => {
                    this.server = server;
                    return server.getPrimaryService(SENSIRION_TEMP_SERVICE_UUID);
                })
                .then(service => {
                    return this._cacheCharacteristic(service, SENSIRION_TEMP_UUID);
                })
                .then(value => {
                    console.log(`Temp is ${value.getUint8(0)}`);
                })
        }

        /* Temp Service */

        startNotificationsTempRhMeasurement() {
            return this._startNotifications(SENSIRION_TEMP_UUID);
        }
        stopNotificationsTempRhMeasurement() {
            return this._stopNotifications(SENSIRION_TEMP_UUID);
        }
        parseTempRh(value) {
            // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
            value = value.buffer ? value : new DataView(value);
            let flags = value.getUint8(0);
            let rate16Bits = flags & 0x1;
            let result = {};
            let index = 1;
            if (rate16Bits) {
                result.tempRh = value.getUint16(index, /*littleEndian=*/ true);
                index += 2;
            } else {
                result.tempRh = value.getUint8(index);
                index += 1;
            }
            let contactDetected = flags & 0x2;
            let contactSensorPresent = flags & 0x4;
            if (contactSensorPresent) {
                result.contactDetected = !!contactDetected;
            }
            let energyPresent = flags & 0x8;
            if (energyPresent) {
                result.energyExpended = value.getUint16(index, /*littleEndian=*/ true);
                index += 2;
            }
            let rrIntervalPresent = flags & 0x10;
            if (rrIntervalPresent) {
                let rrIntervals = [];
                for (; index + 1 < value.byteLength; index += 2) {
                    rrIntervals.push(value.getUint16(index, /*littleEndian=*/ true));
                }
                result.rrIntervals = rrIntervals;
            }
            return result;
        }

        /* Utils */

        _cacheCharacteristic(service, characteristicUuid) {
            return service.getCharacteristic(characteristicUuid)
                .then(characteristic => {
                    this._characteristics.set(characteristicUuid, characteristic);
                });
        }
        _readCharacteristicValue(characteristicUuid) {
            let characteristic = this._characteristics.get(characteristicUuid);
            return characteristic.readValue()
                .then(value => {
                    // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
                    value = value.buffer ? value : new DataView(value);
                    return value;
                });
        }
        _writeCharacteristicValue(characteristicUuid, value) {
            let characteristic = this._characteristics.get(characteristicUuid);
            return characteristic.writeValue(value);
        }
        _startNotifications(characteristicUuid) {
            let characteristic = this._characteristics.get(characteristicUuid);
            // Returns characteristic to set up characteristicvaluechanged event
            // handlers in the resolved promise.
            return characteristic.startNotifications()
                .then(() => characteristic);
        }
        _stopNotifications(characteristicUuid) {
            let characteristic = this._characteristics.get(characteristicUuid);
            // Returns characteristic to remove characteristicvaluechanged event
            // handlers in the resolved promise.
            return characteristic.stopNotifications()
                .then(() => characteristic);
        }
    }

    window.tempRhSensor = new TempRhSensor();

})();