/**
 * @type {HTMLVideoElement}
 */
const videoEl = document.getElementById('camera_video');

const mediaStatus = {
    video: false,
    audio: false,
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
            video: mediaStatus.video,
            audio: mediaStatus.audio,
        })
        .then((stream) => {
            setStream(videoEl, stream);
            console.log('[INFO] Stream set successful.');
        })
        .catch((err) => {
            console.error(err);
            document
                .getElementById('btn_camera')
                .setAttribute(
                    'value',
                    `[INFO] Camera: ${
                        mediaStatus.video ? 'Enabled' : 'Disabled'
                    }`
                );
            document
                .getElementById('btn_mic')
                .setAttribute(
                    'value',
                    `[INFO] Mic: ${mediaStatus.audio ? 'Enabled' : 'Disabled'}`
                );
            mediaStatus.video = false;
            mediaStatus.audio = false;
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
    const offerSDP = createOfferSDP(rtcConnection);
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
    // ICE関係のイベントは実装しない予定
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
            // OfferSDPの表示
            console.log(` - Offer SDP:\n${connection.localDescription.sdp}`);
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
