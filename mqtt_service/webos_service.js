// eslint-disable-next-line import/no-unresolved
const pkgInfo = require('./package.json');
const Service = require('webos-service');

const service = new Service(pkgInfo.name); // Create service by service name on package.json
const logHeader = "[" + pkgInfo.name + "]";
var status = "test"
const mqtt = require('mqtt');
//const WebSocketServer = require('ws').WebSocketServer;

//const port = 9000;

service.register("mqttServerOn", function(message) {
    
    //------------------------- mqtt 접속 -------------------------
    const options = {
        host: "192.168.38.218", //mqtt broker의 IP
        port: 1883
    };
    const client = mqtt.connect(options) // mqtt broker에 접속
    //------------------------- mqtt 접속 -------------------------

    //------------------------- mqtt topic subscribe -------------------------
    const topic_ls=["subled1", "subled2", "subled3"];
    client.subscribe(topic_ls, {qos:1});
    //------------------------- mqtt topic subscribe -------------------------

    //------------------------- mqtt call back -------------------------
    client.on("message", (topic, message, packet) =>{
        console.log("message is" + message);
        console.log("topic is" + topic);
        status = topic + " : " + message;
    });
    //------------------------- mqtt call back -------------------------

    //------------------------- mqtt publish -------------------------
    client.on("connect", ()=>{
        client.publish("led1", "1");
        console.log("connected"+ client.connected)
    })
    //------------------------- mqtt publish -------------------------

    //------------------------- heartbeat 구독 -------------------------
    const sub = service.subscribe(`luna://${pkgInfo.name}/heartbeat`, {subscribe: true});
    const max = 1000; //heart beat 횟수 /// heart beat가 꺼지면, 5초 정도 딜레이 생김 --> 따라서 이 녀석도 heart beat를 무한히 돌릴 필요가 있어보임.
    let count = 0;
    sub.addListener("response", function(msg) {
        console.log(JSON.stringify(msg.payload));
        if (++count >= max) {
            sub.cancel();
            setTimeout(function(){
                console.log(max+" responses received, exiting...");
                process.exit(0);
            }, 1000);
        }
    });
    //------------------------- heartbeat 구독 -------------------------

    
    message.respond({
        reply: status 
    });
    
});

//----------------------------------------------------------------------heartbeat----------------------------------------------------------------------
// handle subscription requests
const subscriptions = {};
let heartbeatinterval;
let x = 1;
function createHeartBeatInterval() {
    if (heartbeatinterval) {
        return;
    }
    console.log(logHeader, "create_heartbeatinterval");
    heartbeatinterval = setInterval(function() {
        sendResponses();
    }, 1000);
}

// send responses to each subscribed client
function sendResponses() {
    console.log(logHeader, "send_response");
    console.log("Sending responses, subscription count=" + Object.keys(subscriptions).length);
    for (const i in subscriptions) {
        if (Object.prototype.hasOwnProperty.call(subscriptions, i)) {
            const s = subscriptions[i];
            s.respond({
                returnValue: true,
                event: "beat " + x
            });
        }
    }
    x++;
}

var heartbeat = service.register("heartbeat");
heartbeat.on("request", function(message) {
    console.log(logHeader, "SERVICE_METHOD_CALLED:/heartbeat");
    message.respond({event: "beat"}); // initial response 
    if (message.isSubscription) { 
        subscriptions[message.uniqueToken] = message; //add message to "subscriptions" 
        if (!heartbeatinterval) {
            createHeartBeatInterval();
        }
    } 
}); 
heartbeat.on("cancel", function(message) { 
    delete subscriptions[message.uniqueToken]; // remove message from "subscriptions" 
    var keys = Object.keys(subscriptions); 
    if (keys.length === 0) { // count the remaining subscriptions 
        console.log("no more subscriptions, canceling interval"); 
        clearInterval(heartbeatinterval);
        heartbeatinterval = undefined;
    } 
});