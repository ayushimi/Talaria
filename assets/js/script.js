//----------Bluetooth-------------------------//
var bluetoothDevice;

var exerciseValue;
var startValue;
var stopValue;
var modeValue;
var resetValue;

var mode = "Voltage";
var idleThreshold = 100;
var numSteps = 0;
var startStep = false;

function connect() {
    var state = true;
    navigator.bluetooth.getDevices()
        .then(devices => {
            for (const device of devices) {
                console.log('  > ' + device.name + ' (' + device.id + ')');
                if (device.name == "Talaria" || device.name == "Arduino" || device.id == "e2D6KSLwZCC8CzY+W+5FjA==") {
                    state = false;
                    connectToBluetoothDevice(device)
                }
            }

        }).catch(error => {
            console.log('Argh! ' + error);
        });

}

function connectToBluetoothDevice(device) {

    let serviceUuid = "e267751a-ae76-11eb-8529-0242ac130003";
    if (serviceUuid.startsWith('0x')) {
        serviceUuid = parseInt(serviceUuid);
    }

    const abortController = new AbortController();

    device.addEventListener('advertisementreceived', (event) => {
        console.log('> Received advertisement from "' + device.name + '"...');

        abortController.abort();
        console.log('Connecting to GATT Server from "' + device.name + '"...');
        return device.gatt.connect()
            .then(server => {
                console.log('Getting Service...');
                return server.getPrimaryService(serviceUuid);
            })
            .then(
                service => {
                    console.log('Getting Characteristic...');
                    return service.getCharacteristics();
                }
            )
            .then(characteristic => {
                exerciseValue = characteristic[0];
                startValue = characteristic[1];
                stopValue = characteristic[2];
                // modeValue = characteristic[3];
                resetValue = characteristic[4];
            })

        .catch(error => {
            console.log('Argh! ' + error);
        });
    }, { once: true });

    console.log('Watching advertisements from "' + device.name + '"...');
    device.watchAdvertisements({ signal: abortController.signal })
        .catch(error => {
            console.log('Argh! ' + error);
        });
}

function requestDevice() {

    let serviceUuid = "e267751a-ae76-11eb-8529-0242ac130003";
    if (serviceUuid.startsWith('0x')) {
        serviceUuid = parseInt(serviceUuid);
    }

    let characteristicUuid = "00002a19-0000-1000-8000-00805f9b34fb";
    if (characteristicUuid.startsWith('0x')) {
        characteristicUuid = parseInt(characteristicUuid);
    }

    navigator.bluetooth.requestDevice({ filters: [{ services: [serviceUuid] }] })
        .then(device => {
            console.log("Chosen device: " + device.name);
            return connect()
        })
}


function start() {
    $("#start").css('background-color', '#e4e1e9');
    $("#stop").css('background-color', '#ad9acc');
    $("#start").css('cursor', 'auto');
    $("#stop").css('cursor', 'pointer');
    numSteps = 0;
    startStep = false;
    var arr = new Int8Array([21, 31]);
    return startValue.writeValueWithResponse(arr).then(response => {
        console.log(exerciseValue)
        return exerciseValue.startNotifications().then(_ => {
            console.log('> Notifications started');
            exerciseValue.addEventListener('characteristicvaluechanged', handleNotifications);
        });
    });

}


function handleNotifications(event) {
    let value = event.target.value.getInt8() * 2;
    console.log("sensor value " + value);
    var voltageConversionFactor = 60.0; // Sample calculation: 120 max sensor value, 2V max output => 120/2 = 60
    var voltage = Math.round(value / voltageConversionFactor * 100) / 100
    if (value >= idleThreshold && !startStep) {
        startStep = true;
    } else if (value < idleThreshold && startStep) {
        startStep = false;
        numSteps++;
    }

    if (mode == "Steps") {
        $("#stat-value").text(numSteps);
    } else {
        $("#stat-value").text(voltage);
    }
    
}

function stop() {
    $("#stop").css('background-color', '#e4e1e9');
    $("#start").css('background-color', '#ad9acc');
    $("#stop").css('cursor', 'auto');
    $("#start").css('cursor', 'pointer');
    numSteps = 0;
    startStep = false;
    var arr = new Int8Array([21, 31]);
    return stopValue.writeValueWithResponse(arr).then(response => {
        return exerciseValue.stopNotifications()
            .then(_ => {
                console.log();
            })
            .catch(error => {
                console.log('Argh! ' + error);
            });
    });

}

function reset() {
    var arr = new Int8Array([21, 31]);
    return resetValue.writeValueWithResponse(arr).then(response => {
        console.log();
    });

}


function trackVoltage() {
    mode = "Voltage";
    $("#stat-name").text("Voltage");
}

function trackSteps() {
    mode = "Steps";
    $("#stat-name").text("Steps");
}