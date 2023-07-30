client.socket.on("joined-server-queue", (passwordData) => {
    if (!passwordData.password) {
        client.socket.emit("advance-through-queue", {
            username: encrypt(client.privateKey, client.username),
            password: null
        });
    } else {
        client.transitionBetweenPages(["#recent-connections", "#login", "#alert"], ["#password"]);
    }
});

client.socket.on("advance-client-ui", (data) => {
    if (data.color) {
        client.clientColor = data.color;
    }
    if (!Object.keys(client.previousConnections).includes(client.serverHost)) {
        client.previousConnections[client.serverHost] = {
            "protocol": client.serverProtocol,
            "username": client.username,
            "color": client.clientColor,
            "privateKey": client.privateKey
        }
        fileTools.saveJson(client.previousConnectionsPath, client.previousConnections);
    }
    client.transitionBetweenPages(["#password"], ["#chat", "#key-button"]);
    client.socket.emit("load-messages-from-backlog", { quantity: client.clientConfig.messagesToLoadFromBacklog });
});

client.socket.on("message", (messageData) => {
    client.createMessageElement(messageData);
});

client.socket.on("user-advanced-to-active", (userData) => {
    client.createUserActiveElement(userData);
});

client.socket.on("user-kicked-from-queue", (reason) => {
    client.socket.disconnect();
    client.transitionBetweenPages(["#password"], ["#kicked"]);
    document.getElementById("kick-reason").innerText = "Reason: " + reason.reason;
});

client.socket.on("backlogged-message", (messageData) => {
    console.log(messageData);
    switch (messageData.subjectToBroadcast) {
        case "message":
            client.createMessageElement(messageData.dataToBroadcast, "pre");
            break;
        case "user-advanced-to-active":
            client.createUserActiveElement(messageData.dataToBroadcast, "pre");
            break;
    }
});