(function() {
    'use strict';

    class TempRhSensor {
        constructor() {
            this.device = null;
            this.server = null;
            this._characteristics = new Map();
        }
        connect() {
            return navigator.bluetooth.requestDevice({ filters: [{ services: [00002234 - B38D - 4985 - 720E-0 F993A68EE41] }] })
                .then(device => {
                    this.device = device;
                    return device.gatt.connect();
                })
                .then(server => {
                    this.server = server;
                    return server.getPrimaryService(00002234 - B38D - 4985 - 720E-0 F993A68EE41);
                })
                .then(service => {
                    return this._cacheCharacteristic(service, 'temp_measurement');
                })
        }

        /* Temp Rh Service */

        startNotificationsTempRhMeasurement() {
            return this._startNotifications('temp_measurement');
        }
        stopNotificationsTempRhMeasurement() {
            return this._stopNotifications('temp_measurement');
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