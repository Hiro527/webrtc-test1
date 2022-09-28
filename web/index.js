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
        console.log('カメラ停止');
        video.stop();
    }
    if (!mediaStatus.audio && audio) {
        console.log('マイク停止');
        audio.stop();
    }

    // ストリームの解除
    setStream(videoEl, null);

    // カメラ、マイクともにオフの場合
    if (!mediaStatus.audio && !mediaStatus.video) return;

    // ストリームを設定
    console.log('ストリームを設定中');
    navigator.mediaDevices
        .getUserMedia({
            video: mediaStatus.video,
            audio: mediaStatus.audio,
        })
        .then((stream) => {
            console.log('ストリームの設定完了');
            setStream(videoEl, stream);
        })
        .catch((err) => {
            console.error(err);
            document
                .getElementById('btn_camera')
                .setAttribute(
                    'value',
                    `カメラ: ${mediaStatus.video ? 'ON' : 'OFF'}`
                );
            document
                .getElementById('btn_mic')
                .setAttribute(
                    'value',
                    `マイク: ${mediaStatus.audio ? 'ON' : 'OFF'}`
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
