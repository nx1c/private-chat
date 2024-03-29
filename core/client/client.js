"use strict";

/**
 *
 */
class ClientEnvironment {

    socket;
    privateKey;
    clientColor = "";
    clientConfigPath = './configuration/client-config.json';
    previousConnectionsPath = './configuration/previous-connections.json';
    isFocused = true;
    unreadMessages = 0;

    constructor () {
        this.clientConfig = fileTools.loadJson(this.clientConfigPath);
        this.privateKey = encKey.random(this.clientConfig.publicKeyLength);
        this.previousConnections = fileTools.loadJson(this.previousConnectionsPath);
        this.localisationJSON = fileTools.loadJson(`./localisation/${this.clientConfig.language}.json`);
    }

    /**
     *
     * @returns {Promise<void>}
     */
    async slowOrNoConnection () {
        setTimeout(() => {
            $("#alert-text")
                .text(this.localisationJSON.runtimeData.alerts.connPossibleFailure
                    + this.serverProtocol
                    + this.serverHost);
        }, 10000);
    }

    /**
     *
     */
    connectToServer () {
        this.serverProtocol = $("#protocol").val();
        this.serverHost = $("#server-host").val();
        this.username = $("#username").val();
        if (this.serverHost !== null && this.username !== null) {
            this.socket = io.connect(this.serverProtocol + this.serverHost);
            $("#alert-text").text(this.localisationJSON.runtimeData.alerts.waitingForConn);
            $("#alert").fadeIn(500);
            $("head").append(
                $("<script>")
                    .attr("type", "text/javascript")
                    .attr("src", "core/client/client-socket-handler.js")
            );
            this.slowOrNoConnection();
        }
    }

    /**
     *
     */
    submitServerPassword () {
        this.socket.emit("advance-through-queue", {
            password: $("#password-text").val(),
            username: encrypter.encrypt(this.privateKey, this.username),
            color: this.clientColor
        });
    }

    /**
     *
     */
    sendMessage () {
        let messageComposerElement = document.getElementById("message-box");
        if (messageComposerElement.value !== "" && messageComposerElement.value.length <= 500) {
            this.socket.emit("new message", {
                username: encrypter.encrypt(this.privateKey, this.username),
                message: encrypter.encrypt(this.privateKey, messageComposerElement.value),
                color: encrypter.encrypt(this.privateKey, this.clientColor)
            });
            messageComposerElement.value = "";
        }
    }

    /**
     *
     * @param currentPages
     * @param targetPages
     */
    transitionBetweenPages (currentPages, targetPages) {
        currentPages.forEach(page => {
            $(page).fadeOut(500);
        });
        setTimeout(() => {
            targetPages.forEach(page => {
                $(page).fadeIn(500);
            });
        }, 500);
    }

    /**
     *
     */
    showHome () {
        this.transitionBetweenPages(["#kicked"], ["#login", "#recent-connections"]);
    }

    /**
     *
     */
    loadRecentConnections () {
        for (let address in this.previousConnections) {
            let connectionData = {
                protocol: this.previousConnections[address].protocol,
                username: this.previousConnections[address].username,
                color: this.previousConnections[address].color,
                privateKey: this.previousConnections[address].privateKey
            }
            $("#connections").append(
                $("<div>")
                    .addClass("connection")
                    .click(() => {
                        $("#protocol").val(connectionData.protocol);
                        $("#server-host").val(address);
                        $("#username").val(connectionData.username);
                        this.clientColor = connectionData.color;
                        this.privateKey = connectionData.privateKey;
                        this.connectToServer();
                    })
                    .append(
                        $("<p>")
                            .html(`<strong>${this.localisationJSON.runtimeData.address}:</strong> ${connectionData.protocol + address}`),
                        $("<p>")
                            .html(`<strong>${this.localisationJSON.runtimeData.username}:</strong> ${connectionData.username}`),
                        $("<p>")
                            .html(`<strong>${this.localisationJSON.runtimeData.color}:</strong> ${connectionData.color}`)
                    )
            );
        }
    }

    /**
     *
     */
    updatePrivateKey () {
        this.previousConnections[this.serverHost].privateKey = this.privateKey = $("#private-key-field").val();
        fileTools.saveJson(this.previousConnectionsPath, this.previousConnections);
        $("#key-modifier").fadeOut(200);
        setTimeout(() => {
            $("#private-key-field").val("");
        }, 200);
    }

    /**
     *
     * @param messageData
     * @param position
     */
    createMessageElement (messageData, position = "post") {
        let message = {
            username: encrypter.decrypt(client.privateKey, messageData.username),
            text: encrypter.decrypt(client.privateKey, messageData.message),
            color: encrypter.decrypt(client.privateKey, messageData.color)
        }
        let newMessageElement = $("<div>")
            .addClass("message")
            .append(
                $("<div>")
                    .addClass("user-icon")
                    .css("background-color", message.color)
                    .text(message.username[0].toUpperCase()),
                $("<div>")
                    .addClass("message-wrapper")
                    .css("background-color", message.color)
                    .append(
                        $("<h4>").text(message.username),
                        $("<p>").text(message.text)
                    )
            );
        if (position !== "pre") {
            $("#message-list").append(newMessageElement);
        } else {
            $("#message-list").prepend(newMessageElement);
        }
        $("#message-characters").text(`${this.localisationJSON.runtimeData.messageCharacters}0/500`);
        this.scrollToBottom();
        this.markUnreadMessages();
    }

    /**
     *
     * @param userData
     * @param position
     * @param type
     */
    createUserActiveElement (userData, position = "post", type = "joined") {
        let decryptedUsername = encrypter.decrypt(client.privateKey, userData.username);
        let userJoinedMessage = this.localisationJSON.runtimeData.userAlerts.joined;
        if (type === "quit") userJoinedMessage = this.localisationJSON.runtimeData.userAlerts.quit;
        let userJoinedWrapper = $("<div>")
            .addClass("user-joined-wrapper")
            .append(
                $("<div>")
                    .addClass("username-wrapper")
                    .text(`${decryptedUsername} ${userJoinedMessage}`)
        );
        if (position !== "pre") {
            $("#message-list").append(userJoinedWrapper);
        } else {
            $("#message-list").prepend(userJoinedWrapper);
        }
        this.scrollToBottom();
    }

    /**
     *
     */
    scrollToBottom () {
        $('#message-list').scrollTop($('#message-list')[0].scrollHeight);
    }

    /**
     *
     */
    localise () {
        let localisationKeys = Object.keys(this.localisationJSON.launchData);
        localisationKeys.forEach(key => {
            let currentFocusElements = document.getElementsByName(key);
            if (this.localisationJSON.launchData[key].type === "innerText") {
                currentFocusElements.forEach(element => {
                    element.innerText = this.localisationJSON.launchData[key].text;
                });
            } else {
                currentFocusElements.forEach(element => {
                    element.setAttribute(this.localisationJSON.launchData[key].type, this.localisationJSON.launchData[key].text);
                });
            }
        });
    }

    markUnreadMessages () {
        if (this.isFocused) {
            nwWin.setBadgeLabel("");
            this.unreadMessages = 0;
        } else {
            this.unreadMessages += 1;
            nwWin.setBadgeLabel(`${this.unreadMessages}`);
        }
    }

}