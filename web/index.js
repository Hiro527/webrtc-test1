/**
 * @type {HTMLVideoElement}
 */
const videoEl = document.getElementById('camera_video');

/**
 * @type {HTMLVideoElement}
 */
const remoteVideoEl = document.getElementById('remote_video');

/**
 * @type {HTMLAudioElement}
 */
const remoteAudioEl = document.getElementById('remote_audio');

const mediaStatus = {
    video: false,
    audio: false,
};

let cameraOptions = null;

window.onload = async () => {
    let devices = null;
    if (navigator.userAgent.match(/iPhone|Android.+Mobile/)) {
        devices = [
            {
                label: '内カメラ',
                deviceId: 'user',
            },
            {
                label: '外カメラ',
                deviceId: 'environment',
            },
        ];
    } else {
        devices = (await navigator.mediaDevices.enumerateDevices()).filter(
            (d) => d.kind === 'videoinput'
        );
    }
    /**
     * @type {HTMLSelectElement}
     */
    const selectEl = document.getElementById('camera_select');
    devices.forEach((d) => {
        const option = new Option(d.label, d.deviceId);
        selectEl.appendChild(option);
    });
    selectEl.firstElementChild.remove();
    selectEl.firstElementChild.selected = true;
};

const toggleMedia = (elId) => {
    const stream = videoEl.srcObject;

    let video = null;
    let audio = null;

    switch (elId) {
        case 'btn_camera':
            mediaStatus.video = !mediaStatus.video;
            break;
        case 'btn_mic':
            mediaStatus.audio = !mediaStatus.audio;
            break;
    }

    document
        .getElementById('btn_camera')
        .setAttribute('value', `カメラ: ${mediaStatus.video ? 'ON' : 'OFF'}`);
    document
        .getElementById('btn_mic')
        .setAttribute('value', `マイク: ${mediaStatus.audio ? 'ON' : 'OFF'}`);

    if (stream) {
        video = stream.getVideoTracks()[0];
        audio = stream.getAudioTracks()[0];
    }

    if (!mediaStatus.video && video) {
        console.log('[INFO] Video stopped.');
        video.stop();
    }
    if (!mediaStatus.audio && audio) {
        console.log('[INFO] Mic stopped.');
        audio.stop();
    }

    // ストリームの解除
    setStream(videoEl, null);

    // カメラ、マイクともにオフの場合
    if (!mediaStatus.audio && !mediaStatus.video) return;

    // ストリームを設定
    console.log('[INFO] Setting streams...');
    navigator.mediaDevices
        .getUserMedia({
            video: mediaStatus.video ? cameraOptions : false,
            audio: mediaStatus.audio,
        })
        .then((stream) => {
            setStream(videoEl, stream);
            console.log('[INFO] Stream set successful.');
        })
        .catch((err) => {
            console.error(err);
            mediaStatus.video = false;
            mediaStatus.audio = false;
            document
                .getElementById('btn_camera')
                .setAttribute(
                    'value',
                    `カメラ: ${mediaStatus.video ? 'Enabled' : 'Disabled'}`
                );
            document
                .getElementById('btn_mic')
                .setAttribute(
                    'value',
                    `マイク: ${mediaStatus.audio ? 'Enabled' : 'Disabled'}`
                );
        });
};

const setStream = (element, stream) => {
    element.srcObject = stream;

    if (!stream) {
        return;
    }

    if ('VIDEO' === element.tagName) {
        element.volume = 0.0;
        element.muted = true;
    } else if ('AUDIO' === element.tagName) {
        element.volume = 1.0;
        element.muted = false;
    }
};

let rtcConnection = null;

const connect = () => {
    // OfferSDPの生成
    console.log('[INFO] Connecting...');
    if (rtcConnection) {
        alert('[ERR] Connection already exists');
        return;
    }
    rtcConnection = createConnection(videoEl.srcObject);
    createOfferSDP(rtcConnection);
};

/**
 *
 * @param {MediaProvider} stream
 * @returns
 */
const createConnection = (stream) => {
    const config = {
        iceServers: [],
    };
    const connection = new RTCPeerConnection(config);

    setupConnectionHandler(connection);

    if (stream) {
        stream.getTracks().forEach((track) => {
            connection.addTrack(track, stream);
        });
    } else {
        console.log('[INFO] No stream available');
    }

    return connection;
};

/**
 *
 * @param {RTCPeerConnection} connection
 */
const setupConnectionHandler = (connection) => {
    connection.onnegotiationneeded = () => {
        console.log('[EVENT] Negotiation needed');
    };
    connection.onicecandidate = (event) => {
        console.log('[EVENT] ICE candidate');
        if (event.candidate) {
            console.log(` - ICE candidate: ${event.candidate}`);
        } else {
            console.log(' - ICE candidate: Empty');
        }
    };
    connection.onicecandidateerror = (event) => {
        console.error(`[EVENT] Error on ICE candidate: ${event.errorCode}`);
    };
    connection.onicegatheringstatechange = () => {
        console.log('[EVENT] ICE gathering state change');
        console.log(` - ICE gathering state: ${connection.iceGatheringState}`);
        if ('complete' === connection.iceGatheringState) {
            if ('offer' === connection.localDescription.type) {
                console.log(' - Sending OfferSDP');
                socket.emit('signaling', {
                    type: 'offer',
                    data: connection.localDescription,
                });
            } else if ('answer' === connection.localDescription.type) {
                console.log(' - Sending Answer');
                socket.emit('signaling', {
                    type: 'answer',
                    data: connection.localDescription,
                });
            }
        }
    };
    connection.oniceconnectionstatechange = () => {
        console.log('[EVENT] ICE connection state change');
        console.log(
            ` - ICE connection state: ${connection.iceConnectionState}`
        );
    };
    connection.onsignalingstatechange = () => {
        console.log('[EVENT] Signaling state change');
        console.log(` - Signaling state: ${connection.signalingState}`);
    };
    connection.ontrack = (event) => {
        console.log('[EVENT] Track');
        console.log(` - Stream: ${event.streams[0]}`);
        console.log(` - Track: ${event.track}`);
        const stream = event.streams[0];
        const track = event.track;
        if ('video' === track.kind) {
            console.log('[INFO] Enabling remote video...');
            setStream(remoteVideoEl, stream);
        } else if ('audio' === track.kind) {
            console.log('[INFO] Enabling remote audio...');
            setStream(remoteAudioEl, stream);
        }
    };
};

/**
 *
 * @param {RTCPeerConnection} connection
 */
const createOfferSDP = (connection) => {
    connection
        .createOffer()
        .then((desc) => {
            return connection.setLocalDescription(desc);
        })
        .catch(console.error);
};

const setOfferSDP = () => {
    console.log('[INFO] Setting OfferSDP...');
    if (rtcConnection) {
        alert('[ERR] Connection already exists.');
        return;
    }

    if (!offerSDP) {
        alert('[ERR] OfferSDP is empty.');
        return;
    }

    console.log('[INFO] Creating peer connection.');
    rtcConnection = createConnection(videoEl.srcObject);

    const sessionDesc = new RTCSessionDescription({
        type: 'offer',
        sdp: offerSDP,
    });

    console.log('[INFO] Creating AnswerSDP');
    createAnswerSDP(rtcConnection, sessionDesc);
};

/**
 *
 * @param {RTCPeerConnection} connection
 * @param {RTCSessionDescription} sessionDesc
 */
const createAnswerSDP = (connection, sessionDesc) => {
    connection
        .setRemoteDescription(sessionDesc)
        .then(() => {
            return connection.createAnswer();
        })
        .then((sessionDesc) => {
            return connection.setLocalDescription(sessionDesc);
        })
        .then(() => {
            // pass
        })
        .catch(console.error);
};

/**
 *
 * @param {RTCPeerConnection} connection
 * @param {RTCSessionDescription} sessionDesc
 */
const setAnswerSDP = (connection, sessionDesc) => {
    connection.setRemoteDescription(sessionDesc).catch(console.error);
};

const socket = io.connect();

socket.on('connect', () => {
    console.log('[INFO] Connected to server.');
});

socket.on('signaling', (data) => {
    console.log('[INFO] Received signal.');
    console.log(` - Type: ${data.type}`);
    console.log(` - Data: ${data.data}`);

    if ('offer' === data.type) {
        if (rtcConnection) {
            alert('[ERR] Connection already exists.');
            return;
        }
        console.log('[INFO] Creating connection...');
        rtcConnection = createConnection(videoEl.srcObject);

        console.log('[INFO] Setting OfferSDP and creating AnswerSDP...');
        createAnswerSDP(rtcConnection, data.data);
    } else if ('answer' === data.type) {
        if (!rtcConnection) {
            alert('[ERR] Connection does not exist.');
            return;
        }

        console.log('[INFO] Setting AnswerSDP...');
        setAnswerSDP(rtcConnection, data.data);
    }
});

/**
 *
 * @param {HTMLSelectElement} selectEl
 */
const changeCamera = (selectEl) => {
    if (navigator.userAgent.match(/iPhone|Android.+Mobile/)) {
        cameraOptions =
            selectEl.selectedOptions[0].value === 'user'
                ? {
                      facingMode: 'user',
                  }
                : {
                      facingMode: {
                          exact: 'environment',
                      },
                  };
    } else {
        const deviceId = selectEl.selectedOptions[0].value;
        cameraOptions = {
            deviceId: deviceId,
        };
    }

    const stream = videoEl.srcObject;

    let video = null;

    if (!stream || !mediaStatus.video) {
        return;
    } else {
        video = stream.getVideoTracks()[0];
    }

    if (video) {
        console.log('[INFO] Video stopped.');
        video.stop();
    }
    // ストリームの解除
    setStream(videoEl, null);

    // カメラ、マイクともにオフの場合
    if (!mediaStatus.audio && !mediaStatus.video) return;

    // ストリームを設定
    console.log('[INFO] Setting streams...');
    navigator.mediaDevices
        .getUserMedia({
            video: mediaStatus.video ? cameraOptions : false,
            audio: mediaStatus.audio,
        })
        .then((stream) => {
            setStream(videoEl, stream);
            console.log('[INFO] Stream set successful.');
        })
        .catch((err) => {
            console.error(err);
            mediaStatus.video = false;
            mediaStatus.audio = false;
            document
                .getElementById('btn_camera')
                .setAttribute(
                    'value',
                    `カメラ: ${mediaStatus.video ? 'Enabled' : 'Disabled'}`
                );
            document
                .getElementById('btn_mic')
                .setAttribute(
                    'value',
                    `マイク: ${mediaStatus.audio ? 'Enabled' : 'Disabled'}`
                );
        });
};
