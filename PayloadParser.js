//Test: 01BB0124097A151F020C01
function parseUplink(device, payload) {

    var payloadb = payload.asBytes();
    var decoded = Decoder(payloadb, payload.port)
    env.log(decoded);

    // Store battery
    if (decoded.battery != null) {
        var sensor1 = device.endpoints.byAddress("1");

        if (sensor1 != null)
            sensor1.updateVoltageSensorStatus(decoded.battery);
            device.updateDeviceBattery({ voltage: decoded.battery });
    };

    // Store CO2
    if (decoded.co2 != null) {
        var sensor2 = device.endpoints.byAddress("2");

        if (sensor2 != null)
            sensor2.updatePpmConcentrationSensorStatus(decoded.co2);
    };

    // Store Temp
    if (decoded.temperature != null) {
        var sensor3 = device.endpoints.byAddress("3");

        if (sensor3 != null)
            sensor3.updateTemperatureSensorStatus(decoded.temperature);
    };
    
    // Store Hum
    if (decoded.humidity != null) {
        var sensor4 = device.endpoints.byAddress("4");

        if (sensor4 != null)
            sensor4.updateHumiditySensorStatus(decoded.humidity);
    };        
}


function Decoder(bytes, fport) {
    var decoded = {};
    if (fport === 6) { // then its ReportDataCmd
        if (bytes[2] === 0x00) { // version report
            decoded.devicetype = "ALL";
            decoded.softwareversion = bytes[3];
            decoded.hardwareversion = bytes[4];
            decoded.datecode = bcdtonumber(bytes.slice(5, 9));
            return decoded;
        } else if ((bytes[0] === 0x01) && (bytes[1] === 0xBB) && (bytes[2] === 0x01)) { // device type 57 (R718PA5)
            decoded.devicetype = "R718UBB";
            decoded.battery = bytes[3] / 10;
            decoded.temperature = ((bytes[4] << 8) | bytes[5]) / 100;
            decoded.humidity = ((bytes[6] << 8) | bytes[7]) / 100;
            decoded.co2 = ((bytes[8] << 8) | bytes[9]);
            return decoded;
        }
    } else if (fport === 7) { // then its a ConfigureCmd response
        if ((bytes[0] === 0x82) && (bytes[1] === 0x01)) { // R711 or R712
            decoded.mintime = ((bytes[2] << 8) + bytes[3]);
            decoded.maxtime = ((bytes[4] << 8) + bytes[5]);
            decoded.battchange = bytes[6] / 10;
            decoded.tempchange = ((bytes[7] << 8) + bytes[8]) / 100;
            decoded.humidchange = ((bytes[9] << 8) + bytes[10]) / 100;
        } else if ((bytes[0] === 0x81) && (bytes[1] === 0x01)) { // R711 or R712
            decoded.success = bytes[2];
        }
    }
    return decoded;
}


function bcdtonumber(bytes) {
    var num = 0;
    var m = 1;
    var i;
    for (i = 0; i < bytes.length; i++) {
        num += (bytes[bytes.length - 1 - i] & 0x0F) * m;
        num += ((bytes[bytes.length - 1 - i] >> 4) & 0x0F) * m * 10;
        m *= 100;
    }
    return num;
}

function bytestofloat16(bytes) {
    var sign = (bytes & 0x8000) ? -1 : 1;
    var exponent = ((bytes >> 7) & 0xFF) - 127;
    var significand = (bytes & ~(-1 << 7));

    if (exponent == 128)
        return 0.0;

    if (exponent == -127) {
        if (significand == 0) return sign * 0.0;
        exponent = -126;
        significand /= (1 << 6);
    } else significand = (significand | (1 << 7)) / (1 << 7);

    return sign * significand * Math.pow(2, exponent);
}